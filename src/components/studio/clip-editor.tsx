"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Download, Loader2, Pause, Play, Save, Send, Sparkles, Wand2 } from "lucide-react";
import { Card, Field, inputClass } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { captureThumbnail } from "@/lib/highlights";
import type { Clip, ClipCandidate, VideoAsset } from "@/lib/types";
import { cn, fmtTime } from "@/lib/utils";

const CATEGORIES = ["gaming", "livestreams", "podcasts", "entertainment", "sports", "music", "other"];
const ASPECTS = ["9:16", "16:9", "1:1"] as const;
type Aspect = (typeof ASPECTS)[number];

export function ClipEditor({
  asset,
  videoUrl,
  candidate,
  agentId,
  defaultAspect,
  category: defaultCategory,
  onBack,
  onSaved,
}: {
  asset: VideoAsset;
  videoUrl: string;
  candidate: ClipCandidate;
  agentId: string | null;
  defaultAspect: Aspect;
  category: string;
  onBack: () => void;
  onSaved: (clip: Clip, published: boolean) => void;
}) {
  const duration = asset.durationSec ?? Math.max(candidate.endSec, 1);
  const vref = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(candidate.startSec);
  const [end, setEnd] = useState(candidate.endSec);
  const [t, setT] = useState(candidate.startSec);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState(candidate.suggestedTitle);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState(CATEGORIES.includes(defaultCategory) ? defaultCategory : "gaming");
  const [aspect, setAspect] = useState<Aspect>(defaultAspect);
  const [thumbAt, setThumbAt] = useState<number>(candidate.startSec + (candidate.endSec - candidate.startSec) / 2);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "publish" | "ai" | "export">(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "muted"; text: string } | null>(null);
  const [titles, setTitles] = useState<string[]>([]);

  // Visible window on the timeline: zoom around the clip for precise trimming
  const pad = Math.max(10, (end - start) * 1.5);
  const viewStart = Math.max(0, Math.min(start, end) - pad);
  const viewEnd = Math.min(duration, Math.max(start, end) + pad);
  const toPct = (s: number) => ((s - viewStart) / (viewEnd - viewStart)) * 100;

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const onTime = () => {
      setT(v.currentTime);
      if (v.currentTime >= end) {
        v.currentTime = start;
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [start, end]);

  useEffect(() => {
    let cancelled = false;
    captureThumbnail(videoUrl, thumbAt, aspect)
      .then((b) => !cancelled && setThumbPreview(URL.createObjectURL(b)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thumbAt, aspect, videoUrl]);

  const seek = (s: number) => {
    if (vref.current) vref.current.currentTime = s;
    setT(s);
  };

  const toggle = () => {
    const v = vref.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const drag = useCallback(
    (which: "start" | "end" | "head") => (e: React.PointerEvent) => {
      e.preventDefault();
      const el = trackRef.current;
      if (!el) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const s = viewStart + Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * (viewEnd - viewStart);
        const v = Math.round(s * 10) / 10;
        if (which === "start") {
          const nv = Math.max(0, Math.min(v, end - 2));
          setStart(nv);
          seek(nv);
        } else if (which === "end") {
          const nv = Math.min(duration, Math.max(v, start + 2));
          setEnd(nv);
          seek(Math.max(start, nv - 1));
        } else seek(v);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [viewStart, viewEnd, start, end, duration],
  );

  const nudge = (which: "start" | "end", d: number) => {
    if (which === "start") setStart((s) => Math.max(0, Math.min(+(s + d).toFixed(1), end - 2)));
    else setEnd((s) => Math.min(duration, Math.max(+(s + d).toFixed(1), start + 2)));
  };

  const suggest = async () => {
    setBusy("ai");
    setMsg(null);
    const r = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "clip_title", context: { filename: asset.filename, category, title, caption, reasons: candidate.reasons } }),
    });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) return setMsg({ tone: "muted", text: j.error });
    setTitles(j.suggestion.titles);
    if (!caption) setCaption(j.suggestion.caption);
  };

  const exportClip = async () => {
    // Real export: re-encode the trimmed segment in the browser via MediaRecorder.
    const src = vref.current;
    if (!src) return;
    setBusy("export");
    setMsg({ tone: "muted", text: "Recording segment in real time…" });
    try {
      const v = document.createElement("video");
      v.src = videoUrl;
      v.crossOrigin = "anonymous";
      v.playsInline = true;
      await new Promise((r) => (v.onloadeddata = r));
      v.currentTime = start;
      await new Promise((r) => (v.onseeked = r));
      const stream = (v as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<void>((r) => (rec.onstop = () => r()));
      rec.start(250);
      await v.play();
      await new Promise<void>((r) => {
        const tick = () => (v.currentTime >= end || v.ended ? r() : requestAnimationFrame(tick));
        tick();
      });
      v.pause();
      rec.stop();
      await done;
      const blob = new Blob(chunks, { type: "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "sniply-clip"}.webm`;
      a.click();
      setMsg({ tone: "ok", text: "Exported. Server-side FFmpeg export (MP4, burned captions) runs in the production worker." });
    } catch (e) {
      setMsg({ tone: "bad", text: `Export failed: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  const save = async (publish: boolean) => {
    setBusy(publish ? "publish" : "draft");
    setMsg(null);
    try {
      let thumbnailPath: string | null = null;
      try {
        const blob = await captureThumbnail(videoUrl, thumbAt, aspect);
        const tr = await fetch("/api/thumbnails", { method: "POST", body: blob, headers: { "content-type": "image/jpeg" } });
        if (tr.ok) thumbnailPath = (await tr.json()).key;
      } catch {}
      const r = await fetch("/api/clips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          candidateId: candidate.id || null,
          agentId,
          title,
          caption,
          category,
          startSec: start,
          endSec: end,
          aspect,
          thumbnailPath,
          publish,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      onSaved(j.clip, publish);
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const len = end - start;
  const frame = aspect === "9:16" ? "aspect-[9/16] max-h-[62vh]" : aspect === "1:1" ? "aspect-square max-h-[62vh]" : "aspect-video";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
          <ArrowLeft className="size-4" /> All candidates
        </button>
        <Card className="overflow-hidden p-3">
          <div className="flex justify-center rounded-[10px] bg-black">
            <div className={cn("relative mx-auto overflow-hidden", frame)}>
              <video ref={vref} src={videoUrl} playsInline className="size-full object-cover" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
              {caption && (
                <div className="pointer-events-none absolute inset-x-3 bottom-[12%] text-center">
                  <span className="rounded-lg bg-black/70 px-2.5 py-1 text-[15px] font-semibold leading-snug [box-decoration-break:clone]">{caption}</span>
                </div>
              )}
            </div>
          </div>

          {/* transport */}
          <div className="mt-3 flex items-center gap-3 px-1">
            <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid size-10 place-items-center rounded-full bg-white text-ink">
              {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
            </button>
            <span className="font-mono text-xs text-muted">{fmtTime(t)}</span>
            <span className="ml-auto font-mono text-xs">
              <span className="text-dim">clip</span> {len.toFixed(1)}s
            </span>
          </div>

          {/* timeline with trim handles */}
          <div className="mt-3 px-1 pb-1">
            <div
              ref={trackRef}
              className="relative h-14 touch-none select-none rounded-[8px] bg-ink"
              onPointerDown={(e) => {
                if (e.target === trackRef.current) drag("head")(e);
              }}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center gap-px overflow-hidden rounded-[8px] px-1 opacity-50">
                {Array.from({ length: 80 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-white/15" style={{ height: `${30 + 40 * Math.abs(Math.sin(i * 0.9 + start))}%` }} />
                ))}
              </div>
              <div className="absolute inset-y-0 rounded-lg border-2 border-pink bg-pink/15" style={{ left: `${toPct(start)}%`, width: `${toPct(end) - toPct(start)}%` }} />
              {(["start", "end"] as const).map((w) => (
                <div
                  key={w}
                  role="slider"
                  aria-label={w === "start" ? "Clip start" : "Clip end"}
                  aria-valuenow={w === "start" ? start : end}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") nudge(w, -0.1);
                    if (e.key === "ArrowRight") nudge(w, 0.1);
                  }}
                  onPointerDown={drag(w)}
                  className="absolute inset-y-0 z-10 -ml-3 flex w-6 cursor-ew-resize items-center justify-center"
                  style={{ left: `${toPct(w === "start" ? start : end)}%` }}
                >
                  <div className="h-10 w-2.5 rounded-full bg-pink shadow-[0_0_12px_rgba(255,43,190,0.8)]" />
                </div>
              ))}
              <div className="pointer-events-none absolute -inset-y-1 z-20 w-0.5 bg-white" style={{ left: `${toPct(t)}%` }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10.5px] text-dim">
              <span>{fmtTime(viewStart)}</span>
              <span>{fmtTime(viewEnd)}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["start", "end"] as const).map((w) => (
                <div key={w} className="flex items-center gap-1.5 rounded-[8px] border border-line bg-ink px-2 py-1.5">
                  <span className="w-9 text-[11px] capitalize text-dim">{w}</span>
                  <button className="rounded-md px-2 py-1 text-xs hover:bg-white/5" onClick={() => nudge(w, -0.5)}>−.5</button>
                  <input
                    className="w-full bg-transparent text-center font-mono text-xs outline-none"
                    type="number"
                    step={0.1}
                    value={(w === "start" ? start : end).toFixed(1)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (w === "start") setStart(Math.max(0, Math.min(v, end - 2)));
                      else setEnd(Math.min(duration, Math.max(v, start + 2)));
                    }}
                  />
                  <button className="rounded-md px-2 py-1 text-xs hover:bg-white/5" onClick={() => nudge(w, 0.5)}>+.5</button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-5 p-5 lg:mt-9">
        <Field label="Title">
          <input className={inputClass} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {titles.length > 0 && (
          <div className="-mt-3 flex flex-wrap gap-1.5">
            {titles.map((x) => (
              <button key={x} onClick={() => setTitle(x)} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted hover:border-pink/40 hover:text-white">
                {x}
              </button>
            ))}
          </div>
        )}
        <Field label="Caption" hint="Shown over the clip. Burned-in captions are produced by the FFmpeg export worker.">
          <textarea className={cn(inputClass, "min-h-20 resize-none")} value={caption} maxLength={300} onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Format">
            <div className="flex gap-1 rounded-[8px] border border-line bg-ink p-1">
              {ASPECTS.map((a) => (
                <button key={a} onClick={() => setAspect(a)} className={cn("flex-1 rounded-lg py-1.5 text-xs", aspect === a ? "bg-white/10 text-white" : "text-dim")}>
                  {a}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="Thumbnail">
          <div className="flex items-center gap-3">
            <div className={cn("w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-ink", aspect === "9:16" ? "aspect-[9/16]" : aspect === "1:1" ? "aspect-square" : "aspect-video")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumbPreview && <img src={thumbPreview} alt="Thumbnail preview" className="size-full object-cover" />}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setThumbAt(t)}>
              <Camera className="size-3.5" /> Use current frame
            </Button>
          </div>
        </Field>

        <Button variant="secondary" size="sm" onClick={suggest} disabled={busy !== null} className="self-start">
          {busy === "ai" ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} Suggest titles with AI
        </Button>

        {msg && <p className={cn("text-xs", msg.tone === "ok" ? "text-ok" : msg.tone === "bad" ? "text-bad" : "text-muted")}>{msg.text}</p>}

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4">
          <Button variant="ghost" size="md" onClick={exportClip} disabled={busy !== null}>
            {busy === "export" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export
          </Button>
          <Button variant="secondary" size="md" onClick={() => save(false)} disabled={busy !== null || title.trim().length < 2}>
            {busy === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Draft
          </Button>
          <Button size="md" onClick={() => save(true)} disabled={busy !== null || title.trim().length < 2}>
            {busy === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publish
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-dim">
          <Sparkles className="size-3" /> Publishing is always your decision — agents never publish without approval in Manual/Assisted mode.
        </p>
      </Card>
    </div>
  );
}
