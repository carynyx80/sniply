"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, FileVideo, Loader2, ScanLine, Sparkles, Upload } from "lucide-react";
import { Badge, Card, Eyebrow, Field, inputClass } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ClipEditor } from "@/components/studio/clip-editor";
import {
  excitement,
  extractAudioSignals,
  extractSceneSignal,
  heuristicTitle,
  normalize,
  pickCandidates,
} from "@/lib/highlights";
import type { Agent, ClipCandidate, ProcessingJob, PublicAgent, VideoAsset } from "@/lib/types";
import { cn, fmtTime } from "@/lib/utils";

type Asset = VideoAsset & { url: string };

export default function Page() {
  return (
    <Suspense>
      <NewJob />
    </Suspense>
  );
}

function NewJob() {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const jobParam = params.get("job");

  const agents = useQuery({ queryKey: ["my-agents"], queryFn: () => fetch("/api/agents?mine=1").then((r) => r.json()).then((j) => j.agents as PublicAgent[]) });
  const [agentId, setAgentId] = useState<string>("");
  const [prefs, setPrefs] = useState<Agent["preferences"] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [rights, setRights] = useState(false);
  const [phase, setPhase] = useState<"pick" | "uploading" | "analyzing" | "review" | "failed">(jobParam ? "review" : "pick");
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [candidates, setCandidates] = useState<ClipCandidate[]>([]);
  const [selected, setSelected] = useState<ClipCandidate | null>(null);
  const [signals, setSignals] = useState<number[] | null>(null);
  const dropRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!agentId && agents.data?.length) setAgentId(agents.data[0].id);
  }, [agents.data, agentId]);

  useEffect(() => {
    if (!agentId) return setPrefs(null);
    fetch(`/api/agents/${agentId}`).then((r) => r.json()).then((j) => setPrefs(j.preferences));
  }, [agentId]);

  // Resume an existing job from the URL
  useEffect(() => {
    if (!jobParam) return;
    (async () => {
      const j = await fetch(`/api/jobs/${jobParam}`).then((r) => r.json());
      if (!j.job) return setPhase("pick");
      setJob(j.job);
      setCandidates(j.candidates);
      const assets = await fetch("/api/videos").then((r) => r.json());
      setAsset(assets.assets.find((a: Asset) => a.id === j.job.assetId) ?? null);
      setPhase(j.job.status === "failed" ? "failed" : "review");
      if (j.job.error) setError(j.job.error);
    })();
  }, [jobParam]);

  const onFile = (f: File | null) => {
    setError(null);
    if (!f) return;
    if (!/^video\/(mp4|quicktime|webm|x-matroska)$/.test(f.type)) return setError("Use MP4, MOV, WebM or MKV.");
    setFile(f);
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(URL.createObjectURL(f));
  };

  const report = (jobId: string, body: object) =>
    fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const start = useCallback(async () => {
    if (!file || !rights || !localUrl) return;
    setError(null);
    setPhase("uploading");
    setStage("Uploading securely");
    try {
      // 1) Probe duration locally
      const durationSec = await new Promise<number>((res) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => res(v.duration);
        v.onerror = () => res(0);
        v.src = localUrl;
      });
      // 2) Upload with server-side validation
      const fd = new FormData();
      fd.set("file", file);
      fd.set("rightsAttested", "true");
      fd.set("durationSec", String(durationSec || ""));
      if (agentId) fd.set("agentId", agentId);
      const up = await new Promise<{ asset: Asset; error?: string }>((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/videos");
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
        xhr.onload = () => {
          const j = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 300) rej(new Error(j.error ?? "Upload failed"));
          else res(j);
        };
        xhr.onerror = () => rej(new Error("Network error during upload"));
        xhr.send(fd);
      });
      setAsset(up.asset);

      // 3) Create job (idempotent)
      const jr = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: up.asset.id, idempotencyKey: `job-${up.asset.id}` }),
      }).then((r) => r.json());
      if (!jr.job) throw new Error(jr.error ?? "Could not create job");
      setJob(jr.job);
      router.replace(`/studio/new?job=${jr.job.id}`, { scroll: false });

      // 4) Analyze
      setPhase("analyzing");
      try {
        const binSec = 0.5;
        setStage("Decoding audio track");
        setProgress(0);
        const audio = await extractAudioSignals(file, binSec, (p) => setProgress(p * 0.45));
        await report(jr.job.id, { type: "progress", stage: "audio", progress: 0.45 });
        setStage("Detecting scene changes");
        let scene: number[] = [];
        try {
          scene = await extractSceneSignal(localUrl, audio.durationSec, binSec, (p) => setProgress(0.45 + p * 0.4));
        } catch {
          scene = [];
        }
        await report(jr.job.id, { type: "progress", stage: "scenes", progress: 0.85 });
        setStage("Ranking candidate moments");
        const energy = normalize(audio.energy);
        const flux = normalize(audio.flux);
        const excite = normalize(excitement(energy, binSec));
        const sceneN = scene.length ? normalize(scene) : [];
        const sig = { binSec, energy, flux, excite, scene: sceneN };
        const p = prefs ?? { clipMinSec: 10, clipMaxSec: 30, suggestions: 5 };
        const found = pickCandidates(sig, { minSec: p.clipMinSec, maxSec: Math.min(p.clipMaxSec, audio.durationSec), count: p.suggestions });
        setSignals(energy.map((e, i) => 0.25 * e + 0.3 * (flux[i] ?? 0) + 0.3 * (excite[i] ?? 0) + 0.15 * (sceneN[i] ?? 0)));
        const done = await report(jr.job.id, {
          type: "complete",
          durationSec: audio.durationSec,
          signalsSummary: {
            bins: energy.length,
            meanEnergy: +(energy.reduce((a, b) => a + b, 0) / energy.length).toFixed(3),
            sceneSamples: scene.length,
            candidates: found.length,
          },
          candidates: found.map((c) => ({ ...c, suggestedTitle: heuristicTitle(c, file.name) })),
        }).then((r) => r.json());
        if (done.error) throw new Error(done.error);
        const j2 = await fetch(`/api/jobs/${jr.job.id}`).then((r) => r.json());
        setJob(j2.job);
        setCandidates(j2.candidates);
        setPhase("review");
        qc.invalidateQueries({ queryKey: ["my-jobs"] });
      } catch (e) {
        const msg = (e as Error).message || "Analysis failed";
        await report(jr.job.id, { type: "fail", error: msg.slice(0, 280) });
        throw new Error(
          msg.includes("decode") || msg.includes("Decoding")
            ? "This browser couldn't decode the audio track (try MP4/H.264 + AAC). The production FFmpeg worker handles more codecs."
            : msg,
        );
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("failed");
    }
  }, [file, rights, localUrl, agentId, prefs, router, qc]);

  const videoUrl = localUrl ?? asset?.url ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <Eyebrow>New clip job</Eyebrow>
      <h1 className="mt-3 display text-[clamp(36px,4.6vw,52px)]">
        {phase === "review" ? "Review your agent’s picks" : "Turn footage into moments"}
      </h1>

      <Stepper phase={phase} />

      <AnimatePresence mode="wait">
        {phase === "pick" && (
          <motion.div key="pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <label
              ref={dropRef}
              onDragOver={(e) => {
                e.preventDefault();
                dropRef.current?.classList.add("border-accent/60");
              }}
              onDragLeave={() => dropRef.current?.classList.remove("border-accent/60")}
              onDrop={(e) => {
                e.preventDefault();
                dropRef.current?.classList.remove("border-accent/60");
                onFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className="group relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[14px] border-2 border-dashed border-line-2 bg-surface p-6 text-center transition-colors hover:border-accent/40"
            >
              <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              {localUrl ? (
                <video src={localUrl} className="max-h-[300px] w-full rounded-[14px] object-contain" controls muted playsInline />
              ) : (
                <>
                  <div className="relative grid size-16 place-items-center rounded-[14px] border border-line bg-surface-2 transition group-hover:scale-105">
                    <Upload className="size-6" />
                  </div>
                  <p className="relative mt-5 text-lg font-semibold">Drop a video or click to browse</p>
                  <p className="relative mt-1 text-sm text-muted">MP4, MOV, WebM, MKV · up to 500 MB</p>
                </>
              )}
            </label>

            <Card className="flex flex-col gap-5 p-6">
              <Field label="Agent" hint={agents.data?.length === 0 ? "No agents yet — the job will run without agent attribution." : "Clip length & suggestion count come from this agent’s preferences."}>
                <select className={inputClass} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="">No agent</option>
                  {agents.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.identity.verified ? "· verified" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {prefs && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[["Length", `${prefs.clipMinSec}–${prefs.clipMaxSec}s`], ["Picks", prefs.suggestions], ["Format", prefs.aspect]].map(([k, v]) => (
                    <div key={k as string} className="rounded-[8px] border border-line bg-surface-2 py-2.5">
                      <p className="font-semibold">{v}</p>
                      <p className="text-dim">{k}</p>
                    </div>
                  ))}
                </div>
              )}
              {file && (
                <div className="flex items-center gap-3 rounded-[8px] border border-line bg-surface-2 p-3 text-sm">
                  <FileVideo className="size-4 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-dim">{(file.size / 1048576).toFixed(1)} MB</span>
                </div>
              )}
              <label className="flex cursor-pointer gap-3 rounded-[8px] border border-line bg-surface-2 p-3.5 text-[13px] leading-relaxed text-muted">
                <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 accent-[#FF2BBE]" />
                <span>
                  I own this video or have permission to clip and publish it. I won’t upload DRM-protected or unauthorized
                  content. <span className="text-text">Required.</span>
                </span>
              </label>
              {error && (
                <p className="flex items-start gap-2 text-sm text-bad">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}
              <Button size="lg" disabled={!file || !rights} onClick={start} className="mt-auto w-full">
                <ScanLine className="size-4" /> Analyze with agent
              </Button>
              <p className="text-center text-[11px] text-dim">
                Audio & scene analysis runs on your device; the file is stored privately for your clips.
              </p>
            </Card>
          </motion.div>
        )}

        {(phase === "uploading" || phase === "analyzing") && (
          <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8">
            <Card className="relative overflow-hidden p-8 md:p-12">
              <div className="bg-line-2 absolute inset-x-0 top-0 h-px" />
              <div className="flex flex-col items-center text-center">
                <div className="relative grid size-20 place-items-center rounded-[14px] border border-line bg-surface-2">
                  <Loader2 className="size-7 animate-spin text-accent" />
                </div>
                <p className="mt-6 text-xl font-semibold tracking-tight">{stage}…</p>
                <p className="mt-1 text-sm text-muted">{phase === "uploading" ? "Validating the container and storing your file." : "Measuring audio energy, onsets, excitement and visual change."}</p>
                <div className="mt-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-surface-3">
                  <motion.div className="bg-ink text-paper h-full" animate={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <p className="mt-2 font-mono text-xs text-dim">{Math.round(progress * 100)}%</p>
              </div>
            </Card>
          </motion.div>
        )}

        {phase === "failed" && (
          <motion.div key="fail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
            <Card className="p-8 text-center">
              <AlertTriangle className="mx-auto size-8 text-bad" />
              <p className="mt-4 text-lg font-semibold">The job couldn’t finish</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">{error}</p>
              <Button className="mt-6" variant="secondary" onClick={() => { setPhase("pick"); router.replace("/studio/new"); }}>
                Try another file
              </Button>
            </Card>
          </motion.div>
        )}

        {phase === "review" && asset && videoUrl && (
          <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6">
            {!selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <CheckCircle2 className="size-4 text-ok" />
                  {candidates.length} candidate moment{candidates.length === 1 ? "" : "s"} from <span className="text-text">{asset.filename}</span>
                  {job?.signalsSummary && <Badge>{job.signalsSummary.bins} bins analyzed</Badge>}
                </div>
                {signals && <SignalStrip signals={signals} candidates={candidates} duration={asset.durationSec ?? 1} />}
                {candidates.length === 0 ? (
                  <Card className="p-8 text-center text-sm text-muted">
                    No moment stood out enough. You can still cut a clip manually.
                    <div className="mt-4">
                      <Button variant="secondary" onClick={() => setSelected({ id: "", jobId: job!.id, assetId: asset.id, startSec: 0, endSec: Math.min(20, asset.durationSec ?? 20), score: 0, reasons: ["Manual selection"], suggestedTitle: "", status: "suggested", createdAt: "" })}>
                        Open editor
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {candidates.map((c, i) => (
                      <CandidateCard key={c.id} c={c} rank={i + 1} url={videoUrl} onEdit={() => setSelected(c)} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <ClipEditor
                asset={asset}
                videoUrl={videoUrl}
                candidate={selected}
                agentId={asset.agentId}
                defaultAspect={prefs?.aspect ?? "9:16"}
                category={prefs?.category ?? "gaming"}
                onBack={() => setSelected(null)}
                onSaved={(clip, published) => {
                  qc.invalidateQueries({ queryKey: ["my-clips"] });
                  setCandidates((cs) => cs.map((x) => (x.id === selected.id ? { ...x, status: published ? "published" : "draft" } : x)));
                  setSelected(null);
                  if (published) router.push(`/studio/clips?tab=published&new=${clip.id}`);
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ phase }: { phase: string }) {
  const steps = ["Upload", "Analyze", "Review & edit", "Publish"];
  const idx = phase === "pick" ? 0 : phase === "uploading" || phase === "analyzing" ? 1 : phase === "review" ? 2 : 1;
  return (
    <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
      {steps.map((s, i) => (
        <div key={s} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs", i === idx ? "border-accent/40 bg-accent/10 text-white" : i < idx ? "border-line text-muted" : "border-line text-dim")}>
          <span className={cn("grid size-4 place-items-center rounded-full text-[9px]", i < idx ? "bg-ok text-ink" : i === idx ? "bg-accent" : "bg-surface-3")}>{i < idx ? "✓" : i + 1}</span>
          {s}
        </div>
      ))}
    </div>
  );
}

function SignalStrip({ signals, candidates, duration }: { signals: number[]; candidates: ClipCandidate[]; duration: number }) {
  const N = 160;
  const step = Math.max(1, Math.floor(signals.length / N));
  const bars = Array.from({ length: Math.ceil(signals.length / step) }, (_, i) => Math.max(...signals.slice(i * step, (i + 1) * step)));
  return (
    <Card className="p-4">
      <p className="mb-3 font-mono text-[10.5px] text-dim">fused signal · energy + onsets + excitement + scene change</p>
      <div className="relative flex h-16 items-end gap-px">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-[1px] bg-white/20" style={{ height: `${Math.max(4, b * 100)}%` }} />
        ))}
        {candidates.map((c, i) => (
          <div key={c.id} className="absolute -inset-y-1 rounded border border-accent bg-accent/15" style={{ left: `${(c.startSec / duration) * 100}%`, width: `${((c.endSec - c.startSec) / duration) * 100}%` }}>
            <span className="absolute -top-4 left-0 font-mono text-[9px] text-accent">#{i + 1}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CandidateCard({ c, rank, url, onEdit }: { c: ClipCandidate; rank: number; url: string; onEdit: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <Card className="group overflow-hidden">
      <div
        className="relative aspect-video bg-surface-2"
        onMouseEnter={() => {
          const v = ref.current;
          if (!v) return;
          v.currentTime = c.startSec;
          v.play().catch(() => {});
        }}
        onMouseLeave={() => ref.current?.pause()}
      >
        <video
          ref={ref}
          src={`${url}#t=${c.startSec}`}
          muted
          playsInline
          preload="metadata"
          onTimeUpdate={(e) => e.currentTarget.currentTime >= c.endSec && (e.currentTarget.currentTime = c.startSec)}
          className="size-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10.5px] backdrop-blur">#{rank}</span>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-accent/90 px-2 py-0.5 text-[10.5px] font-semibold">
          <Sparkles className="size-3" /> {Math.round(c.score * 100)}
        </span>
        <span className="absolute bottom-3 left-3 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10.5px]">
          {fmtTime(c.startSec)} → {fmtTime(c.endSec)}
        </span>
      </div>
      <div className="p-4">
        <p className="line-clamp-1 text-sm font-semibold">{c.suggestedTitle}</p>
        <ul className="mt-2 space-y-1">
          {c.reasons.slice(0, 2).map((r) => (
            <li key={r} className="text-xs text-muted">• {r}</li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <Badge tone={c.status === "published" ? "ok" : c.status === "draft" ? "blue" : "neutral"}>{c.status}</Badge>
          <Button size="sm" onClick={onEdit}>Edit clip</Button>
        </div>
      </div>
    </Card>
  );
}
