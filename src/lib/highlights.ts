/**
 * Sniply highlight detection — real signal processing, runs in the browser on the user's file.
 *
 * Signals (each normalised 0..1 per time bin):
 *  - energy:  short-time RMS loudness of the audio track
 *  - flux:    spectral-flux proxy (positive change in band energies) → onsets, laughs, impacts
 *  - excite:  energy relative to a rolling local baseline → "louder than usual here", not just loud
 *  - scene:   mean absolute frame-difference of downsampled video frames → cuts / big visual change
 *
 * A fused score is computed per bin, smoothed, then windows of the configured length are
 * ranked with non-maximum suppression. Pure functions below are unit-tested (src/lib/highlights.test.ts).
 */

export type Signals = { binSec: number; energy: number[]; flux: number[]; excite: number[]; scene: number[] };
export type Candidate = { startSec: number; endSec: number; score: number; reasons: string[] };
export type DetectOptions = { minSec: number; maxSec: number; count: number };

export const WEIGHTS = { energy: 0.2, flux: 0.3, excite: 0.3, scene: 0.2 };

export function normalize(xs: number[]): number[] {
  if (!xs.length) return xs;
  const sorted = [...xs].sort((a, b) => a - b);
  // robust: 5th–98th percentile so a single spike doesn't flatten everything
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.98))];
  const span = hi - lo || 1;
  return xs.map((x) => Math.max(0, Math.min(1, (x - lo) / span)));
}

export function movingAverage(xs: number[], radius: number): number[] {
  const out = new Array(xs.length).fill(0);
  // centered window via prefix sums
  const pre = [0];
  for (const x of xs) pre.push(pre[pre.length - 1] + x);
  for (let i = 0; i < xs.length; i++) {
    const a = Math.max(0, i - radius);
    const b = Math.min(xs.length, i + radius + 1);
    out[i] = (pre[b] - pre[a]) / (b - a);
  }
  return out;
}

/** energy relative to a ~30s local baseline */
export function excitement(energy: number[], binSec: number): number[] {
  const base = movingAverage(energy, Math.max(1, Math.round(15 / binSec)));
  return energy.map((e, i) => Math.max(0, e - base[i]));
}

export function fuse(s: Signals): number[] {
  const n = Math.min(s.energy.length, s.flux.length, s.excite.length, s.scene.length || Infinity);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      WEIGHTS.energy * s.energy[i] +
        WEIGHTS.flux * s.flux[i] +
        WEIGHTS.excite * s.excite[i] +
        WEIGHTS.scene * (s.scene.length ? s.scene[i] : 0),
    );
  }
  return movingAverage(out, 1);
}

/** Rank non-overlapping windows. Window length adapts within [minSec,maxSec] to the activity burst. */
export function pickCandidates(s: Signals, opts: DetectOptions): Candidate[] {
  const score = fuse(s);
  const n = score.length;
  if (!n) return [];
  const minBins = Math.max(1, Math.round(opts.minSec / s.binSec));
  const maxBins = Math.max(minBins + 1, Math.round(opts.maxSec / s.binSec));
  const pre = [0];
  for (const x of score) pre.push(pre[pre.length - 1] + x);
  const meanOf = (a: number, b: number) => (pre[b] - pre[a]) / (b - a);

  // peak = best centre; then grow window while activity stays above 60% of peak
  const order = score.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  const taken = new Uint8Array(n);
  const out: Candidate[] = [];
  for (const [, peak] of order) {
    if (out.length >= opts.count) break;
    if (taken[peak]) continue;
    let a = peak;
    let b = peak + 1;
    const thresh = score[peak] * 0.6;
    while (b - a < maxBins) {
      const canL = a > 0 && !taken[a - 1] && score[a - 1] >= thresh;
      const canR = b < n && !taken[b] && score[b] >= thresh;
      if (!canL && !canR) break;
      if (canL && (!canR || score[a - 1] >= score[b])) a--;
      else b++;
    }
    // pad to minimum length, with lead-in context before the peak
    while (b - a < minBins) {
      if (a > 0 && !taken[a - 1] && (peak - a) < (b - peak) * 1.5) a--;
      else if (b < n && !taken[b]) b++;
      else if (a > 0 && !taken[a - 1]) a--;
      else break;
    }
    if (b - a < minBins) continue;
    for (let i = Math.max(0, a - 2); i < Math.min(n, b + 2); i++) taken[i] = 1;

    const seg = (arr: number[]) => (arr.length ? arr.slice(a, b).reduce((x, y) => x + y, 0) / (b - a) : 0);
    const reasons: string[] = [];
    if (seg(s.excite) > 0.25) reasons.push("Audio excitement above local baseline");
    if (seg(s.flux) > 0.35) reasons.push("Rapid sound onsets (reactions, impacts)");
    if (seg(s.scene) > 0.3) reasons.push("Significant visual change");
    if (seg(s.energy) > 0.6) reasons.push("Sustained high intensity");
    if (!reasons.length) reasons.push("Highest relative activity in this section");
    out.push({
      startSec: +(a * s.binSec).toFixed(2),
      endSec: +(b * s.binSec).toFixed(2),
      score: +Math.min(1, meanOf(a, b) / (Math.max(...score) || 1)).toFixed(3),
      reasons,
    });
  }
  return out.sort((x, y) => y.score - x.score);
}

/* ───────────── Browser-only extraction ───────────── */

/** Decode audio and compute energy + flux bins. */
export async function extractAudioSignals(file: Blob, binSec = 0.5, onProgress?: (p: number) => void) {
  const buf = await file.arrayBuffer();
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(buf);
  } finally {
    ctx.close();
  }
  const sr = audio.sampleRate;
  const ch0 = audio.getChannelData(0);
  const ch1 = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
  const binLen = Math.floor(sr * binSec);
  const bins = Math.floor(ch0.length / binLen);
  const energy: number[] = [];
  const flux: number[] = [];
  // crude 3-band split via one-pole filters → band energies → positive spectral flux
  const prevBands = [0, 0, 0];
  let lp1 = 0;
  let lp2 = 0;
  const a1 = Math.exp((-2 * Math.PI * 300) / sr);
  const a2 = Math.exp((-2 * Math.PI * 2500) / sr);
  for (let b = 0; b < bins; b++) {
    let sum = 0;
    const bands = [0, 0, 0];
    const off = b * binLen;
    for (let i = 0; i < binLen; i += 2) {
      const x = ch1 ? (ch0[off + i] + ch1[off + i]) * 0.5 : ch0[off + i];
      sum += x * x;
      lp1 = (1 - a1) * x + a1 * lp1; // < 300 Hz
      lp2 = (1 - a2) * x + a2 * lp2; // < 2.5 kHz
      const low = lp1;
      const mid = lp2 - lp1;
      const high = x - lp2;
      bands[0] += low * low;
      bands[1] += mid * mid;
      bands[2] += high * high;
    }
    energy.push(Math.sqrt(sum / (binLen / 2)));
    let f = 0;
    for (let k = 0; k < 3; k++) {
      const v = Math.sqrt(bands[k]);
      f += Math.max(0, v - prevBands[k]);
      prevBands[k] = v;
    }
    flux.push(f);
    if (b % 200 === 0) onProgress?.(b / bins);
  }
  return { durationSec: audio.duration, energy, flux };
}

/** Sample frames at ~1fps on a tiny canvas and compute mean abs difference. */
export async function extractSceneSignal(
  url: string,
  durationSec: number,
  binSec: number,
  onProgress?: (p: number) => void,
): Promise<number[]> {
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    video.onloadeddata = () => res();
    video.onerror = () => rej(new Error("Could not decode video frames"));
  });
  const W = 48;
  const H = 27;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const step = Math.max(1, durationSec / 600); // cap at ~600 samples
  const samples: { t: number; d: number }[] = [];
  let prev: Uint8ClampedArray | null = null;
  for (let t = 0; t < durationSec; t += step) {
    video.currentTime = t;
    await new Promise<void>((res) => {
      const done = () => {
        video.removeEventListener("seeked", done);
        res();
      };
      video.addEventListener("seeked", done);
      setTimeout(done, 1500);
    });
    ctx.drawImage(video, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    let d = 0;
    if (prev) for (let i = 0; i < px.length; i += 4) d += Math.abs(px[i] - prev[i]) + Math.abs(px[i + 1] - prev[i + 1]) + Math.abs(px[i + 2] - prev[i + 2]);
    samples.push({ t, d: prev ? d / (W * H * 3 * 255) : 0 });
    prev = new Uint8ClampedArray(px);
    onProgress?.(t / durationSec);
  }
  // resample onto audio bins
  const bins = Math.floor(durationSec / binSec);
  const out = new Array(bins).fill(0);
  for (const s of samples) {
    const i = Math.min(bins - 1, Math.floor(s.t / binSec));
    const span = Math.max(1, Math.round(step / binSec));
    for (let k = 0; k < span && i + k < bins; k++) out[i + k] = Math.max(out[i + k], s.d);
  }
  return out;
}

export function heuristicTitle(c: Candidate, filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const tag = c.reasons[0]?.includes("excitement") ? "The reaction" : c.reasons[0]?.includes("visual") ? "The turn" : "The moment";
  return `${tag} at ${mm(c.startSec)}${base ? ` — ${base.slice(0, 30)}` : ""}`;
}

/** Capture a JPEG thumbnail at time t. */
export async function captureThumbnail(url: string, t: number, aspect: "9:16" | "16:9" | "1:1"): Promise<Blob> {
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    video.onloadeddata = () => res();
    video.onerror = () => rej(new Error("thumb load failed"));
  });
  video.currentTime = t;
  await new Promise<void>((res) => (video.onseeked = () => res()));
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const ratio = aspect === "9:16" ? 9 / 16 : aspect === "1:1" ? 1 : 16 / 9;
  let sw = vw;
  let sh = vw / ratio;
  if (sh > vh) {
    sh = vh;
    sw = vh * ratio;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(Math.min(720, sw));
  canvas.height = Math.round(canvas.width / ratio);
  canvas.getContext("2d")!.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.82));
}
