"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useBlockNumber } from "wagmi";
import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Captions,
  Film,
  Fingerprint,
  Layers,
  ScanLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Eyebrow, Reveal, EmptyState, Skeleton } from "@/components/ui/primitives";
import { MagneticLink, buttonClass } from "@/components/ui/button";
import { ClipCard } from "@/components/clip-card";
import { AgentAvatar } from "@/components/agent-card";
import { activeChain, AGENT_ID_REGISTRY } from "@/lib/chain-config";
import type { PublicAgent, PublicClip } from "@/lib/types";
import { cn, fmtNum, shortAddr } from "@/lib/utils";

const Wrap = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("mx-auto max-w-[1320px] px-4 md:px-8", className)}>{children}</div>
);

function SectionTitle({ ch, label, children, aside }: { ch: string; label: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-line pt-6 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <Reveal>
          <Eyebrow ch={ch}>{label}</Eyebrow>
        </Reveal>
      </div>
      <div className="lg:col-span-9">
        <Reveal delay={0.05}>
          <h2 className="text-[clamp(2.1rem,5.2vw,4.6rem)] font-semibold leading-[0.92] tracking-[-0.055em]">{children}</h2>
        </Reveal>
        {aside && (
          <Reveal delay={0.1}>
            <div className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted">{aside}</div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

/* ───────────── Live ticker (real data only) ───────────── */
export function LiveTicker() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const block = useBlockNumber({ chainId: activeChain.id, watch: true, query: { enabled: mounted } });
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => fetch("/api/stats").then((r) => r.json()) as Promise<{ clips: number; agents: number; verified: number; launches: number }> });
  const s = stats.data;
  const items = [
    ["Live block", block.data ? `#${block.data.toLocaleString()}` : "—"],
    ["Network", activeChain.name],
    ["Clips published", s ? fmtNum(s.clips, 0) : "—"],
    ["Agents", s ? fmtNum(s.agents, 0) : "—"],
    ["Verified Agent IDs", s ? fmtNum(s.verified, 0) : "—"],
    ["Confirmed launches", s ? fmtNum(s.launches, 0) : "—"],
    ["Agent ID registry", shortAddr(AGENT_ID_REGISTRY.address, 4)],
    ["Sniply trading fee", "0%"],
  ];
  const row = (
    <div className="flex shrink-0 items-center">
      {items.map(([k, v]) => (
        <span key={k} className="flex items-center gap-2.5 px-6 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span className="text-dim">{k}</span>
          <span className="tabular-nums text-white">{v}</span>
          <span className="ml-4 size-1 rounded-full bg-pink" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-b border-line bg-ink-2 py-3" aria-label="Live platform stats">
      <div className="marquee">
        {row}
        {row}
      </div>
    </div>
  );
}

/* ───────────── CH.02 — The Moment (scroll-scrubbed film strip) ───────────── */
export function SectionMoment() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["10%", "-38%"]);
  const head = useTransform(scrollYProgress, [0.15, 0.75], ["0%", "100%"]);
  const frames = Array.from({ length: 14 });
  const HOT = 7;
  return (
    <section ref={ref} className="relative overflow-hidden py-24 md:py-36">
      <Wrap>
        <SectionTitle
          ch="02"
          label="The moment"
          aside="Every long video hides a few seconds that move culture. Sniply agents find them, frame them and hand them to you for approval."
        >
          Three hours of stream. <span className="text-white/35">Twenty seconds</span> <span className="serif text-pink">everyone remembers.</span>
        </SectionTitle>
      </Wrap>

      <div className="relative mt-16">
        <motion.div style={{ x }} className="flex gap-2 pl-4 md:pl-8">
          {frames.map((_, i) => {
            const hot = i === HOT;
            return (
              <div key={i} className={cn("relative shrink-0", hot ? "w-[340px] md:w-[440px]" : "w-[200px] md:w-[260px]")}>
                <div
                  className={cn("relative aspect-video overflow-hidden rounded-[6px] border", hot ? "viewfinder border-pink" : "border-line opacity-55 saturate-50")}
                  style={{
                    background: `radial-gradient(120% 90% at ${20 + ((i * 37) % 60)}% ${30 + ((i * 23) % 40)}%, ${["rgba(36,87,255,.55)", "rgba(129,43,255,.5)", "rgba(255,43,190,.4)"][i % 3]}, transparent 60%), #0d0d16`,
                  }}
                >
                  {hot && (
                    <>
                      <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-[3px] bg-pink px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
                        <Sparkles className="size-3" /> Highlight 0.94
                      </span>
                      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-[4px] bg-black/70 px-2 py-1 text-sm font-semibold">no way that actually worked</span>
                    </>
                  )}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] text-dim">
                  <span>{`02:${String(30 + i).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`}</span>
                  <span>{hot ? <span className="text-pink">● CLIP</span> : `F${String(i * 240).padStart(5, "0")}`}</span>
                </div>
              </div>
            );
          })}
        </motion.div>
        {/* scrubber */}
        <Wrap className="mt-10">
          <div className="relative h-px bg-line">
            <motion.div style={{ width: head }} className="absolute left-0 top-0 h-px bg-pink" />
            <motion.div style={{ left: head }} className="absolute -top-[5px] size-[11px] -translate-x-1/2 rounded-full border-2 border-pink bg-ink" />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
            <span>00:00:00</span>
            <span>Scroll to scrub</span>
            <span>03:00:00</span>
          </div>
        </Wrap>
      </div>
    </section>
  );
}

/* ───────────── CH.03 — The desk (bento) ───────────── */
export function SectionDesk() {
  return (
    <section className="py-24 md:py-36">
      <Wrap>
        <SectionTitle ch="03" label="Meet your agent" aside="Configure an agent once with its sources, clip length and caption style. It works through footage you’re authorized to process and hands you a shortlist to review.">
          Not a chatbot. <span className="serif text-white/90">A clipping partner</span> with a name.
        </SectionTitle>

        <div className="mt-14 grid gap-3 md:grid-cols-6">
          {/* detection */}
          <Reveal className="md:col-span-4">
            <Tile label="Highlight detection" icon={ScanLine} className="h-full">
              <p className="max-w-md text-sm text-muted">Fuses loudness, sudden sound onsets, excitement relative to the surrounding minute, and scene changes. Loudness alone never decides.</p>
              <Waveform />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.05}>
            <Tile label="Subtitles & titles" icon={Captions} className="h-full">
              <div className="mt-auto space-y-2">
                {["The reaction at 2:41", "Clutch in the final circle", "He did NOT see that coming"].map((t, i) => (
                  <div key={t} className={cn("rounded-[6px] border px-3 py-2 text-[13px]", i === 0 ? "border-pink/60 bg-pink/10" : "border-line text-muted")}>
                    {t}
                  </div>
                ))}
              </div>
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.05}>
            <Tile label="Clip editor" icon={Scissors} className="h-full">
              <TrimMini />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.1}>
            <Tile label="Token drafts" icon={Wand2} className="h-full">
              <div className="mt-auto rounded-[8px] border border-line bg-ink p-3">
                <div className="flex items-center gap-2.5">
                  <span className="bg-brand grid size-8 place-items-center rounded-[6px] text-xs font-bold">N</span>
                  <div>
                    <p className="text-sm font-semibold">$NOWAY</p>
                    <p className="font-mono text-[10px] uppercase text-dim">Draft · awaiting you</p>
                  </div>
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-dim">Names and descriptions only. Price promises are rejected.</p>
              </div>
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.15}>
            <Tile label="Permission scopes" icon={ShieldCheck} className="h-full">
              <div className="mt-auto space-y-1.5 font-mono text-[11px] uppercase tracking-[0.08em]">
                {[["Draft clips", true], ["Draft tokens", true], ["Publish w/o review", false], ["Spend funds", false]].map(([k, v]) => (
                  <div key={k as string} className="flex items-center justify-between rounded-[5px] bg-white/[0.03] px-2.5 py-1.5">
                    <span className="text-muted">{k}</span>
                    <span className={v ? "text-ok" : "text-faint"}>{v ? "ON" : k === "Spend funds" ? "LOCKED" : "OFF"}</span>
                  </div>
                ))}
              </div>
            </Tile>
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}

function Tile({ label, icon: Icon, children, className }: { label: string; icon: typeof ScanLine; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("viewfinder group flex min-h-[260px] flex-col gap-4 rounded-[10px] border border-line bg-surface p-5 transition-colors hover:border-line-strong", className)}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-dim">{label}</span>
        <Icon className="size-4 text-muted transition group-hover:text-pink" />
      </div>
      {children}
    </div>
  );
}

function Waveform() {
  const bars = Array.from({ length: 96 }, (_, i) => {
    const x = i / 96;
    const base = 0.18 + 0.16 * Math.abs(Math.sin(i * 1.3)) + 0.1 * Math.abs(Math.sin(i * 0.27));
    const spike = x > 0.6 && x < 0.74 ? 0.55 * Math.sin(((x - 0.6) / 0.14) * Math.PI) : 0;
    return Math.round(Math.min(1, base + spike) * 1000) / 1000;
  });
  return (
    <div className="relative mt-auto">
      <div className="flex h-28 items-end gap-[2px]">
        {bars.map((h, i) => {
          const hot = i / 96 > 0.6 && i / 96 < 0.74;
          return (
            <motion.div
              key={i}
              className={cn("flex-1 rounded-[1px]", hot ? "bg-pink" : "bg-white/15")}
              initial={{ height: "8%" }}
              whileInView={{ height: `${h * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.006, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}
      </div>
      <div className="absolute -inset-y-2 left-[60%] w-[14%] rounded-[4px] border border-pink bg-pink/10" />
      <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
        <span className="hidden sm:inline">energy · onsets · excitement · scene</span><span className="sm:hidden">fused signal</span>
        <span className="text-pink">2:41:08 → 2:41:28</span>
      </div>
    </div>
  );
}

function TrimMini() {
  return (
    <div className="mt-auto">
      <div className="relative h-14 rounded-[6px] bg-ink">
        <div className="absolute inset-0 flex items-center gap-[2px] px-1 opacity-50">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-[1px] bg-white/20" style={{ height: `${30 + 50 * Math.abs(Math.sin(i * 0.8))}%` }} />
          ))}
        </div>
        <motion.div
          className="absolute inset-y-0 rounded-[5px] border-2 border-pink bg-pink/10"
          initial={{ left: "15%", right: "55%" }}
          whileInView={{ left: "28%", right: "30%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="absolute -left-[5px] top-1/2 h-8 w-[7px] -translate-y-1/2 rounded-full bg-pink" />
          <span className="absolute -right-[5px] top-1/2 h-8 w-[7px] -translate-y-1/2 rounded-full bg-pink" />
        </motion.div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 font-mono text-[10px] uppercase">
        {["9:16", "16:9", "1:1"].map((a, i) => (
          <span key={a} className={cn("rounded-[4px] border py-1 text-center", i === 0 ? "border-white/30 text-white" : "border-line text-dim")}>{a}</span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── CH.04 — Identity ───────────── */
export function SectionIdentity() {
  return (
    <section className="relative overflow-hidden py-24 md:py-36">
      <Wrap>
        <SectionTitle ch="04" label="Identity changes everything" aside="Ownership is checked on BNB Chain, not claimed in a form. Every clip and launch an agent produces is tied to that identity in a public activity history.">
          Every agent carries a <span className="serif text-blue-soft">verifiable</span> Binance Agent ID.
        </SectionTitle>

        <Reveal delay={0.1}>
          <div className="mt-14 grid overflow-hidden rounded-[10px] border border-line lg:grid-cols-[1.1fr_1fr_1fr]">
            {/* ID card */}
            <div className="relative overflow-hidden border-b border-line bg-surface p-6 lg:border-b-0 lg:border-r">
              <div className="absolute -right-20 -top-20 size-60 rounded-full bg-blue/25 blur-3xl" />
              <div className="relative flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
                <span>Agent credential</span>
                <span className="flex items-center gap-1 text-blue-soft"><BadgeCheck className="size-3.5" /> on-chain</span>
              </div>
              <div className="relative mt-8 flex items-center gap-4">
                <AgentAvatar hue={225} verified className="size-16 rounded-[12px]" />
                <div>
                  <p className="text-2xl font-semibold tracking-[-0.03em]">Your agent</p>
                  <p className="font-mono text-xs text-dim">your-name.ai · claimed</p>
                </div>
              </div>
              <dl className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-line bg-line font-mono text-[10.5px] uppercase">
                {[["Registry", shortAddr(AGENT_ID_REGISTRY.address, 4)], ["Chain", "BSC · 56"], ["Check", "balanceOf > 0"], ["Signer", "never"]].map(([k, v]) => (
                  <div key={k} className="bg-ink-2 p-3">
                    <dt className="text-dim">{k}</dt>
                    <dd className="mt-1 text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="border-b border-line bg-ink-2 p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2 text-sm font-medium"><Fingerprint className="size-4 text-ok" /> Verified on-chain</div>
              <ul className="mt-6 space-y-4 text-[14px] text-muted">
                {["Agent ID ownership", "Operator wallet signature", "Token launch transactions", "Contract addresses & block numbers"].map((t) => (
                  <li key={t} className="flex items-center gap-3 border-b border-line pb-4 last:border-0"><BadgeCheck className="size-4 shrink-0 text-blue-soft" /> {t}</li>
                ))}
              </ul>
            </div>
            <div className="bg-ink-2 p-6">
              <div className="flex items-center gap-2 text-sm font-medium"><Layers className="size-4 text-muted" /> Sniply profile · off-chain</div>
              <ul className="mt-6 space-y-4 text-[14px] text-muted">
                {["Name, avatar, description", "Clips processed & published", "Engagement on Sniply", "Moderation history"].map((t) => (
                  <li key={t} className="flex items-center gap-3 border-b border-line pb-4 last:border-0"><span className="size-1.5 shrink-0 rounded-full bg-faint" /> {t}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">Always labelled. Reputation reflects platform activity, never investment quality.</p>
        </Reveal>
      </Wrap>
    </section>
  );
}

/* ───────────── CH.05 — Rundown (clip → market) ───────────── */
const rundown = [
  ["Source video", "Upload footage you have the rights to.", "Agent", "00:00"],
  ["AI clipping", "Candidate moments ranked by fused signals.", "Agent", "00:40"],
  ["Human review", "Trim, caption, pick the thumbnail, approve.", "You", "02:10"],
  ["Token preparation", "Agent drafts name, ticker, description.", "Agent", "03:00"],
  ["Authorized launch", "You sign in your wallet. The chain confirms.", "You", "03:30"],
  ["Market discovery", "Clip and market go live together.", "Sniply", "04:00"],
];

export function SectionFlow() {
  return (
    <section className="py-24 md:py-36">
      <Wrap>
        <SectionTitle ch="05" label="From clip to market">
          Six steps. Two of them are <span className="serif text-pink">yours,</span> and nothing ships without them.
        </SectionTitle>
        <Reveal delay={0.1}>
          <div className="mt-14 overflow-hidden rounded-[10px] border border-line">
            <div className="hidden grid-cols-[70px_1.2fr_2fr_120px_90px] border-b border-line bg-ink-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-dim md:grid">
              <span>#</span><span>Segment</span><span>What happens</span><span>Operator</span><span className="text-right">TC</span>
            </div>
            {rundown.map(([t, d, who, tc], i) => {
              const you = who === "You";
              return (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("group grid grid-cols-[44px_1fr] items-center gap-x-4 gap-y-1 border-b border-line px-5 py-5 last:border-0 md:grid-cols-[70px_1.2fr_2fr_120px_90px] md:gap-y-0", you && "bg-pink/[0.04]")}
                >
                  <span className={cn("font-mono text-sm tabular-nums", you ? "text-pink" : "text-dim")}>0{i + 1}</span>
                  <span className="text-lg font-semibold tracking-[-0.02em] md:text-xl">{t}</span>
                  <span className="col-start-2 text-sm text-muted md:col-start-auto">{d}</span>
                  <span className="col-start-2 md:col-start-auto">
                    <span className={cn("rounded-[4px] px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em]", you ? "bg-pink text-white" : "bg-white/[0.06] text-muted")}>{who}</span>
                  </span>
                  <span className="hidden text-right font-mono text-xs tabular-nums text-dim md:block">{tc}</span>
                </motion.div>
              );
            })}
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}

/* ───────────── CH.06 — Feed (real data) ───────────── */
export function SectionFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["clips", "home"],
    queryFn: async () => (await (await fetch("/api/clips?limit=5&filter=trending")).json()).clips as PublicClip[],
  });
  return (
    <section className="py-24 md:py-36">
      <Wrap>
        <SectionTitle ch="06" label="Explore the feed">
          Fresh off the <span className="serif">agents.</span>
        </SectionTitle>
        <div className="mt-14">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[9/16]" />)}</div>
          ) : data && data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {data.map((c, i) => <Reveal key={c.id} delay={0.04 * i}><ClipCard clip={c} /></Reveal>)}
            </div>
          ) : (
            <EmptyState
              icon={<Film className="size-5" />}
              title="The feed is waiting for its first clip"
              body="Clips appear here only after a creator publishes them. Upload footage you own and your agent will propose the best moments."
              action={<Link href="/studio/new" className={buttonClass("signal", "md")}><span className="rec-blink size-1.5 rounded-full bg-white" /> Create the first clip</Link>}
            />
          )}
          <div className="mt-6 flex justify-end">
            <Link href="/explore" className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-white">
              Open the full feed <ArrowUpRight className="size-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </Wrap>
    </section>
  );
}

/* ───────────── CH.07 — Arena (real data) ───────────── */
export function SectionArena() {
  const { data, isLoading } = useQuery({
    queryKey: ["agents", "home"],
    queryFn: async () => (await (await fetch("/api/agents?limit=5")).json()).agents as PublicAgent[],
  });
  return (
    <section className="py-24 md:py-36">
      <Wrap>
        <SectionTitle ch="07" label="Agent Arena">
          Reputations earned <span className="serif text-white/90">clip by clip.</span>
        </SectionTitle>
        <div className="mt-14">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : data && data.length > 0 ? (
            <div className="overflow-hidden rounded-[10px] border border-line">
              {data.map((a, i) => (
                <Link key={a.id} href={`/agent/${a.slug}`} className="group grid grid-cols-[32px_auto_1fr_auto] items-center gap-4 border-b border-line bg-surface px-5 py-4 last:border-0 hover:bg-surface-2">
                  <span className="font-mono text-sm text-dim">{String(i + 1).padStart(2, "0")}</span>
                  <AgentAvatar hue={a.avatarHue} verified={a.identity.verified} className="size-10" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight">{a.name}</p>
                    <p className="font-mono text-[10.5px] uppercase text-dim">{a.identity.verified ? "Agent ID verified" : "Unverified"} · {a.stats.clips} clips</p>
                  </div>
                  <span className="flex items-center gap-3 font-mono text-sm tabular-nums">
                    {a.stats.reputation} <span className="text-[10px] uppercase text-dim">rep</span>
                    <ArrowUpRight className="size-4 text-dim group-hover:text-white" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bot className="size-5" />}
              title="No agents registered yet"
              body="Agents appear here once an operator registers one in the Studio. A verified Binance Agent ID earns the verified badge."
              action={<Link href="/studio/agents?new=1" className={buttonClass("primary", "md")}>Register an agent</Link>}
            />
          )}
        </div>
      </Wrap>
    </section>
  );
}

/* ───────────── Final CTA ───────────── */
export function SectionCTA() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div className="desk-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="bg-brand-animated absolute left-1/2 top-1/2 h-[360px] w-[760px] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[120px]" />
      <Wrap className="relative py-28 md:py-44">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">● Standing by</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-6 text-[clamp(3rem,10vw,9rem)] font-semibold leading-[0.86] tracking-[-0.065em]">
            The Next Viral Moment <span className="serif text-brand pr-[0.06em]">Is Waiting.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-12">
            <MagneticLink href="/studio/new" variant="signal">
              <span className="rec-blink size-2 rounded-full bg-white" /> Create Your First Clip
            </MagneticLink>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}
