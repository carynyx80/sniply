"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Scissors, Sparkles, Captions, Rocket, ScanLine, Play } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * Original animated product illustration (no third-party footage).
 * Stages loop: scan → detect → lock → extract → tokenize → market.
 * Figures shown inside are illustrative and labelled as such.
 */
const STAGES = [
  { key: "scan", label: "Agent scanning stream", icon: ScanLine, ms: 2600 },
  { key: "detect", label: "Highlight detected", icon: Sparkles, ms: 1800 },
  { key: "extract", label: "Clip extracted + captioned", icon: Scissors, ms: 2200 },
  { key: "token", label: "Token draft prepared", icon: Captions, ms: 2200 },
  { key: "market", label: "Approved → market live", icon: Rocket, ms: 2800 },
] as const;

const BARS = 72;
const HL_START = 0.58;
const HL_END = 0.7;

export function HeroDemo() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0); // playhead 0..1 during scan

  useEffect(() => {
    if (reduce) {
      setStage(4);
      setProgress(HL_END);
      return;
    }
    const t = setTimeout(() => setStage((s) => (s + 1) % STAGES.length), STAGES[stage].ms);
    return () => clearTimeout(t);
  }, [stage, reduce]);

  useEffect(() => {
    if (reduce) return;
    if (stage !== 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / STAGES[0].ms);
      setProgress(p * HL_END);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, reduce]);

  // Deterministic "audio energy" bars, with a spike inside the highlight window
  const bars = useMemo(
    () =>
      Array.from({ length: BARS }, (_, i) => {
        const x = i / BARS;
        const base = 0.22 + 0.18 * Math.abs(Math.sin(i * 1.7)) + 0.12 * Math.abs(Math.sin(i * 0.31));
        const spike = x > HL_START && x < HL_END ? 0.45 * Math.sin(((x - HL_START) / (HL_END - HL_START)) * Math.PI) : 0;
        return Math.round(Math.min(1, base + spike) * 1000) / 1000;
      }),
    [],
  );

  const s = STAGES[stage].key;
  const detected = stage >= 1;
  const extracted = stage >= 2;
  const tokenized = stage >= 3;
  const live = stage >= 4;

  return (
    <div className="relative w-full">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -inset-x-20 -top-10 bottom-0 -z-10 opacity-70 blur-3xl">
        <div className="absolute left-[10%] top-[20%] h-64 w-64 rounded-full bg-blue/30" />
        <div className="absolute right-[12%] top-[30%] h-64 w-64 rounded-full bg-pink/25" />
      </div>

      <div className="relative overflow-hidden rounded-[14px] border border-line-strong bg-surface/80 p-2 viewfinder scanlines shadow-[0_40px_120px_-40px_rgba(36,87,255,0.4)]">
        {/* window chrome */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] text-dim">
            <LogoMark className="size-3.5" /> sniply studio — stream_0419.mp4
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-dim">illustration</span>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_300px]">
          {/* VIDEO + TIMELINE */}
          <div className="overflow-hidden rounded-[10px] border border-line bg-ink">
            <div className="relative aspect-video overflow-hidden">
              <StreamScene excited={detected && !extracted} />

              {/* scan line */}
              {s === "scan" && !reduce && (
                <motion.div
                  className="absolute inset-y-0 w-[2px] bg-gradient-to-b from-transparent via-pink to-transparent shadow-[0_0_24px_4px_rgba(255,43,190,0.6)]"
                  animate={{ left: ["0%", "100%"] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* detection box */}
              <AnimatePresence>
                {detected && !extracted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.15 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-[30%] top-[18%] h-[58%] w-[40%] rounded-[8px] border-2 border-pink/90 shadow-[0_0_0_9999px_rgba(8,8,13,0.45)]"
                  >
                    <span className="absolute -top-7 left-0 flex items-center gap-1.5 rounded-full bg-pink px-2.5 py-1 text-[10.5px] font-semibold text-white">
                      <Sparkles className="size-3" /> Reaction spike · 0.94
                    </span>
                    {["-left-1 -top-1", "-right-1 -top-1", "-left-1 -bottom-1", "-right-1 -bottom-1"].map((p) => (
                      <span key={p} className={cn("absolute size-2.5 rounded-sm bg-white", p)} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* top HUD */}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur">
                  <span className="size-1.5 rounded-full bg-bad" /> REC 02:47:13
                </span>
              </div>

              {/* caption */}
              <AnimatePresence>
                {extracted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 bottom-4 flex justify-center"
                  >
                    <span className="rounded-lg bg-black/70 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur">
                      no way that <span className="text-pink">actually</span> worked
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* timeline */}
            <div className="border-t border-line px-3 pb-3 pt-2.5">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-dim">
                <span className="flex items-center gap-1.5">
                  <Play className="size-3" /> audio energy · scene delta · speech
                </span>
                <span>{detected ? "2:41:08 → 2:41:28" : "analyzing…"}</span>
              </div>
              <div className="relative flex h-14 items-end gap-[2px]">
                {bars.map((h, i) => {
                  const x = i / BARS;
                  const inHL = x >= HL_START && x < HL_END;
                  const passed = x <= progress;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-[1.5px] transition-colors duration-500",
                        detected && inHL ? "bg-brand" : passed ? "bg-white/35" : "bg-white/10",
                      )}
                      style={{ height: `${h * 100}%` }}
                    />
                  );
                })}
                {/* highlight window */}
                <AnimatePresence>
                  {detected && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0.4 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute -inset-y-1 rounded-md border-2 border-pink bg-pink/10"
                      style={{ left: `${HL_START * 100}%`, width: `${(HL_END - HL_START) * 100}%` }}
                    >
                      <span className="absolute -left-[5px] top-1/2 h-6 w-2 -translate-y-1/2 rounded-sm bg-pink" />
                      <span className="absolute -right-[5px] top-1/2 h-6 w-2 -translate-y-1/2 rounded-sm bg-pink" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* playhead */}
                <div
                  className="absolute -inset-y-1 w-px bg-white shadow-[0_0_8px_white]"
                  style={{ left: `${progress * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="flex flex-col gap-2">
            {/* agent identity */}
            <div className="rounded-[10px] border border-line bg-ink p-3.5">
              <div className="flex items-center gap-3">
                <div className="relative grid size-10 place-items-center rounded-[8px] bg-gradient-to-br from-blue to-violet">
                  <ScanLine className="size-5" />
                  <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-ink">
                    <BadgeCheck className="size-4 text-[#7e9bff]" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Highlight Hound</p>
                  <p className="truncate font-mono text-[10.5px] text-dim">hound.ai · Agent ID</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {STAGES.map((st, i) => {
                  const Icon = st.icon;
                  const done = i < stage;
                  const cur = i === stage;
                  return (
                    <div
                      key={st.key}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors duration-500",
                        cur ? "bg-white/[0.06] text-white" : done ? "text-muted" : "text-dim/60",
                      )}
                    >
                      <Icon className={cn("size-3.5", cur && "text-pink")} />
                      <span className="flex-1">{st.label}</span>
                      {done && <span className="size-1.5 rounded-full bg-ok" />}
                      {cur && <span className="size-1.5 animate-pulse rounded-full bg-pink" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* clip + token */}
            <div className="relative min-h-[170px] flex-1 overflow-hidden rounded-[10px] border border-line bg-ink p-3">
              <AnimatePresence mode="wait">
                {!extracted ? (
                  <motion.div
                    key="wait"
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center gap-2 text-center text-[11.5px] text-dim"
                  >
                    <div className="h-14 w-10 rounded-lg border border-dashed border-line-strong" />
                    Waiting for a moment worth clipping
                  </motion.div>
                ) : (
                  <motion.div
                    key="clip"
                    initial={{ opacity: 0, x: -30, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-3"
                  >
                    <div className="relative h-[120px] w-[68px] shrink-0 overflow-hidden rounded-[8px] border border-line-strong">
                      <StreamScene compact />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 font-mono text-[8.5px]">0:20</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium leading-snug">“No way that actually worked”</p>
                      <AnimatePresence>
                        {tokenized && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2.5 rounded-[8px] border border-line-strong bg-surface p-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="bg-brand grid size-6 place-items-center rounded-md text-[10px] font-bold">
                                N
                              </span>
                              <div>
                                <p className="text-[11.5px] font-semibold">$NOWAY</p>
                                <p className="text-[9.5px] text-dim">BEP-20 draft</p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[10px]">
                              {live ? (
                                <span className="flex items-center gap-1 text-ok">
                                  <span className="size-1.5 rounded-full bg-ok" /> Market live
                                </span>
                              ) : (
                                <span className="text-warn">Awaiting creator approval</span>
                              )}
                              <span className="font-mono text-dim">BSC</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {live && (
                <motion.svg
                  viewBox="0 0 200 40"
                  className="absolute inset-x-3 bottom-2 h-9 w-[calc(100%-24px)]"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <defs>
                    <linearGradient id="spark" x1="0" x2="1">
                      <stop offset="0" stopColor="#2457FF" />
                      <stop offset="1" stopColor="#FF2BBE" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M0 34 L20 30 L38 32 L56 24 L74 26 L92 18 L112 20 L132 12 L150 15 L170 7 L200 4"
                    fill="none"
                    stroke="url(#spark)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </motion.svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Procedural, original "stream" scene: abstract streamer silhouette + game HUD. */
function StreamScene({ excited = false, compact = false }: { excited?: boolean; compact?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0b1a]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 70% 20%, rgba(129,43,255,0.55), transparent 55%), radial-gradient(90% 70% at 15% 90%, rgba(36,87,255,0.55), transparent 60%), radial-gradient(60% 50% at 85% 85%, rgba(255,43,190,0.35), transparent 60%)",
        }}
      />
      {/* game world: perspective grid */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
          backgroundSize: compact ? "10px 10px" : "36px 36px",
          transform: "perspective(300px) rotateX(60deg)",
          transformOrigin: "bottom",
        }}
      />
      {/* floating shapes */}
      <motion.div
        className="absolute left-[18%] top-[28%] size-[14%] rounded-full bg-gradient-to-br from-pink to-violet blur-[1px]"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[20%] top-[18%] size-[9%] rotate-45 rounded-md bg-blue"
        animate={{ rotate: [45, 135, 45] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* streamer cam */}
      {!compact && (
        <div className="absolute bottom-[8%] right-[4%] aspect-[4/3] w-[24%] overflow-hidden rounded-lg border border-white/20 bg-[#141428]">
          <motion.div
            className="absolute bottom-0 left-1/2 h-[70%] w-[55%] -translate-x-1/2 rounded-t-full bg-gradient-to-t from-[#2a2a55] to-[#4a4a8a]"
            animate={excited ? { y: [0, -6, 0, -4, 0], scale: [1, 1.06, 1] } : { y: 0 }}
            transition={{ duration: 0.6, repeat: excited ? Infinity : 0 }}
          />
          <motion.div
            className="absolute left-1/2 top-[14%] size-[34%] -translate-x-1/2 rounded-full bg-[#5a5aa0]"
            animate={excited ? { y: [0, -5, 0] } : { y: 0 }}
            transition={{ duration: 0.5, repeat: excited ? Infinity : 0 }}
          />
        </div>
      )}
      {/* chat burst */}
      {excited && !compact && (
        <div className="absolute left-[4%] top-[14%] space-y-1">
          {["LMAOOO", "CLIP IT", "no shot 😭", "W"].map((m, i) => (
            <motion.div
              key={m}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="w-fit rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-white/90"
            >
              {m}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
