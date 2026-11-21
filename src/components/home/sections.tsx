"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Captions,
  Fingerprint,
  Film,
  Gauge,
  Layers,
  Rocket,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wand2,
  Bot,
  Clapperboard,
} from "lucide-react";
import { Eyebrow, Reveal, EmptyState, Skeleton } from "@/components/ui/primitives";
import { MagneticLink, buttonClass } from "@/components/ui/button";
import { ClipCard } from "@/components/clip-card";
import { AgentCard } from "@/components/agent-card";
import type { PublicAgent, PublicClip } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ───────────── A — The Moment ───────────── */
export function SectionMoment() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x1 = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-30%", "0%"]);

  const frames = Array.from({ length: 9 });
  return (
    <section ref={ref} className="relative overflow-hidden py-32 md:py-44">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <Eyebrow>01 — The moment</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-6 max-w-4xl text-[clamp(2.2rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
            Three hours of stream. <span className="text-muted">Twenty seconds</span>{" "}
            <span className="text-brand">everyone remembers.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
            Every video hides a handful of moments that move culture. Sniply agents find them, frame them, and give
            them a home — with you approving every step.
          </p>
        </Reveal>
      </div>

      <div className="mt-20 space-y-3 [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
        {[x1, x2].map((x, row) => (
          <motion.div key={row} style={{ x }} className="flex w-[160%] gap-3">
            {frames.map((_, i) => {
              const hot = (row === 0 && i === 4) || (row === 1 && i === 6);
              return (
                <div
                  key={i}
                  className={cn(
                    "relative aspect-video flex-1 overflow-hidden rounded-2xl border",
                    hot ? "border-pink/70 shadow-[0_0_60px_-10px_rgba(255,43,190,0.6)]" : "border-line opacity-50",
                  )}
                  style={{
                    background: `radial-gradient(120% 90% at ${20 + ((i * 37) % 60)}% ${30 + ((i * 23) % 40)}%, ${
                      ["rgba(36,87,255,.5)", "rgba(129,43,255,.45)", "rgba(255,43,190,.35)"][(i + row) % 3]
                    }, transparent 60%), #0d0d16`,
                  }}
                >
                  <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/50">
                    {String(row * 2 + 1).padStart(2, "0")}:{String((i * 7) % 60).padStart(2, "0")}:{String((i * 13) % 60).padStart(2, "0")}
                  </span>
                  {hot && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-pink px-2 py-0.5 text-[10px] font-semibold">
                      <Sparkles className="size-3" /> moment
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── B — Meet your agent ───────────── */
const agentSkills = [
  { icon: ScanLine, t: "Highlight detection", d: "Fuses audio energy, scene changes and speech intensity — not just loudness." },
  { icon: Captions, t: "Subtitles & titles", d: "Transcribes speech, writes captions and proposes titles you can edit." },
  { icon: Film, t: "Clip extraction", d: "Frames vertical or horizontal cuts with clean in/out points and a thumbnail." },
  { icon: Wand2, t: "Token drafts", d: "Suggests a name, ticker and description — never a price promise." },
];

export function SectionAgent() {
  return (
    <section className="relative py-28 md:py-40">
      <div className="mx-auto grid max-w-6xl gap-16 px-5 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <Reveal>
            <Eyebrow>02 — Meet your agent</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 text-[clamp(2rem,4.6vw,3.8rem)] font-semibold leading-[1] tracking-[-0.045em]">
              Not a chatbot. <br />A clipping partner with a name.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted">
              Configure an agent once — sources, clip length, caption style — and it works through footage you are
              authorized to process, then hands you a reviewed shortlist.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <Link href="/studio" className={cn(buttonClass("secondary", "md"), "mt-8")}>
              Open Agent Studio <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {agentSkills.map((s, i) => (
            <Reveal key={s.t} delay={0.06 * i}>
              <div className="ring-brand group relative h-full rounded-3xl border border-line bg-surface p-6 transition-transform duration-500 hover:-translate-y-1">
                <div className="grid size-11 place-items-center rounded-2xl border border-line bg-ink transition-colors group-hover:border-pink/40">
                  <s.icon className="size-5 text-white" />
                </div>
                <h3 className="mt-5 text-[17px] font-medium tracking-tight">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── C — Identity ───────────── */
export function SectionIdentity() {
  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow className="justify-center">03 — Identity changes everything</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 text-[clamp(2rem,5vw,4.2rem)] font-semibold leading-[1] tracking-[-0.045em]">
              Every agent carries a <span className="text-brand">verifiable</span> Binance Agent ID.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-muted">
              Ownership is checked on BNB Chain, not claimed in a form. Every clip and launch an agent produces is
              tied to that identity and recorded in a public activity history.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mx-auto mt-16 grid max-w-4xl gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-2">
            <div className="bg-surface p-7">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4 text-ok" /> Verified on-chain
              </div>
              <ul className="mt-5 space-y-3 text-sm text-muted">
                {["Agent ID ownership (registry balanceOf)", "Operator wallet signature", "Token launch transactions", "Contract addresses & block numbers"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <BadgeCheck className="size-4 shrink-0 text-[#7e9bff]" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface p-7">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers className="size-4 text-muted" /> Sniply profile (off-chain)
              </div>
              <ul className="mt-5 space-y-3 text-sm text-muted">
                {["Name, avatar and description", "Clips processed & published", "Engagement on Sniply", "Moderation history"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="size-1.5 shrink-0 rounded-full bg-dim" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-dim">
            We always label which is which. Reputation reflects platform activity — never investment quality.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── D — Clip to market ───────────── */
const flow = [
  { icon: Clapperboard, t: "Source video", d: "Upload footage you have rights to." },
  { icon: ScanLine, t: "AI clipping", d: "Agent ranks candidate moments." },
  { icon: UserCheck, t: "Human review", d: "You trim, caption and approve." },
  { icon: Wand2, t: "Token prep", d: "Agent drafts metadata." },
  { icon: Fingerprint, t: "Authorized launch", d: "You sign. Chain confirms." },
  { icon: Gauge, t: "Market discovery", d: "Clip + market go live." },
];

export function SectionFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.5"] });
  const w = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <section ref={ref} className="relative py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <Eyebrow>04 — From clip to market</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-6 max-w-3xl text-[clamp(2rem,4.6vw,3.8rem)] font-semibold leading-[1] tracking-[-0.045em]">
            Six steps. Two of them are yours, and nothing ships without them.
          </h2>
        </Reveal>

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-[27px] hidden h-px bg-line md:block">
            <motion.div style={{ width: w }} className="bg-brand h-px" />
          </div>
          <div className="grid gap-8 md:grid-cols-6 md:gap-4">
            {flow.map((f, i) => {
              const human = i === 2 || i === 4;
              return (
                <Reveal key={f.t} delay={0.06 * i}>
                  <div className="relative flex gap-4 md:block">
                    <div
                      className={cn(
                        "relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border bg-ink",
                        human ? "border-pink/60 text-pink" : "border-line-strong",
                      )}
                    >
                      <f.icon className="size-5" />
                    </div>
                    <div className="md:mt-5">
                      <p className="font-mono text-[10.5px] text-dim">0{i + 1}{human && " · you"}</p>
                      <h3 className="mt-1 text-[15px] font-medium">{f.t}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.d}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── E — Feed preview (real data) ───────────── */
export function SectionFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["clips", "home"],
    queryFn: async () => (await (await fetch("/api/clips?limit=4")).json()).clips as PublicClip[],
  });
  return (
    <section className="relative py-28 md:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal>
              <Eyebrow>05 — Explore the feed</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-[clamp(2rem,4.6vw,3.8rem)] font-semibold leading-[1] tracking-[-0.045em]">
                Fresh off the agents.
              </h2>
            </Reveal>
          </div>
          <Link href="/explore" className={buttonClass("secondary", "md")}>
            Open the feed <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-12">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-3xl" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {data.map((c, i) => (
                <Reveal key={c.id} delay={0.05 * i}>
                  <ClipCard clip={c} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Film className="size-6" />}
              title="The feed is waiting for its first clip"
              body="Clips appear here only after a creator publishes them. Upload footage you own in the Studio and your agent will propose the best moments."
              action={
                <Link href="/studio/new" className={buttonClass("primary", "md")}>
                  Create the first clip <ArrowRight className="size-4" />
                </Link>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────── F — Agent arena (real data) ───────────── */
export function SectionArena() {
  const { data, isLoading } = useQuery({
    queryKey: ["agents", "home"],
    queryFn: async () => (await (await fetch("/api/agents?limit=3")).json()).agents as PublicAgent[],
  });
  return (
    <section className="relative py-28 md:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal>
              <Eyebrow>06 — Agent Arena</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 max-w-2xl text-[clamp(2rem,4.6vw,3.8rem)] font-semibold leading-[1] tracking-[-0.045em]">
                Reputations earned clip by clip.
              </h2>
            </Reveal>
          </div>
          <Link href="/agents" className={buttonClass("secondary", "md")}>
            Enter the arena <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-12">
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-3xl" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {data.map((a, i) => (
                <Reveal key={a.id} delay={0.05 * i}>
                  <AgentCard agent={a} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bot className="size-6" />}
              title="No agents registered yet"
              body="Agents appear here once an operator registers one in the Studio. Agents with a verified Binance Agent ID get the verified badge."
              action={
                <Link href="/studio/agents" className={buttonClass("primary", "md")}>
                  Register an agent <ArrowRight className="size-4" />
                </Link>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────── G — Final CTA ───────────── */
export function SectionCTA() {
  return (
    <section className="relative overflow-hidden px-5 py-32 md:py-48">
      <div className="absolute inset-0 -z-10">
        <div className="bg-brand-animated absolute left-1/2 top-1/2 h-[420px] w-[820px] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <h2 className="text-[clamp(2.6rem,8vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
            The next viral moment <span className="text-brand">is waiting.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-12 flex justify-center">
            <MagneticLink href="/studio/new">
              <Rocket className="size-4" /> Create Your First Clip
            </MagneticLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
