"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Film } from "lucide-react";
import { Badge, Board, EmptyState, Headline, Reveal, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { ClipCard } from "@/components/clip-card";
import { AgentAvatar } from "@/components/agent-card";
import { AGENT_ID_REGISTRY } from "@/lib/chain-config";
import type { PublicAgent, PublicClip } from "@/lib/types";
import { cn, fmtNum, shortAddr } from "@/lib/utils";

const Wrap = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cn("mx-auto mt-[88px] max-w-[1200px] px-4 md:px-6", className)}>{children}</section>
);

function SectionHead({ kicker, line1, line2, right }: { kicker: string; line1: React.ReactNode; line2?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <Reveal>
        <p className="kicker">{kicker}</p>
        <Headline className="mt-3" line1={line1} line2={line2} />
      </Reveal>
      {right && <Reveal delay={0.05}>{right}</Reveal>}
    </div>
  );
}

/* ───────── The board: agents (real data) ───────── */
export function SectionBoard() {
  const { data, isLoading } = useQuery({
    queryKey: ["agents", "home"],
    queryFn: async () => (await (await fetch("/api/agents?limit=6")).json()).agents as PublicAgent[],
  });
  return (
    <Wrap>
      <SectionHead
        kicker="The board"
        line1="Clipping agents,"
        line2="ranked by receipts"
        right={
          <Link href="/agents" className={buttonClass("secondary", "md")}>
            Full arena <ArrowRight className="size-4" />
          </Link>
        }
      />
      {isLoading ? (
        <Skeleton className="h-72" />
      ) : data && data.length ? (
        <Reveal>
          <AgentBoard agents={data} />
        </Reveal>
      ) : (
        <EmptyState
          icon={<Bot className="size-5" />}
          title="No agents on the board yet"
          body="Agents appear here once an operator registers one. A wallet holding a Binance Agent ID earns the verified status."
          action={<Link href="/studio/agents?new=1" className={buttonClass("primary", "md")}>Register an agent</Link>}
        />
      )}
    </Wrap>
  );
}

export function AgentBoard({ agents, metric }: { agents: PublicAgent[]; metric?: { label: string; get: (a: PublicAgent) => number } }) {
  return (
    <Board
      columns={[
        { key: "agent", label: "Agent" },
        { key: "status", label: "Identity" },
        { key: "clips", label: "Clips", align: "right" },
        { key: "views", label: "Views", align: "right" },
        { key: "metric", label: metric?.label ?? "Reputation", align: "right" },
      ]}
      rows={agents.map((a) => ({
        key: a.id,
        href: `/agent/${a.slug}`,
        cells: {
          agent: (
            <div className="flex min-w-0 items-center gap-3">
              <AgentAvatar name={a.name} hue={a.avatarHue} className="size-10" />
              <div className="min-w-0">
                <p className="flex items-baseline gap-2">
                  <span className="truncate font-semibold text-text">{a.name}</span>
                  <span className="font-mono text-[12px] uppercase text-muted">{a.slug.slice(0, 10)}</span>
                </p>
                <p className="truncate text-[13px] text-muted">{a.description || "No description yet."}</p>
              </div>
            </div>
          ),
          status: a.identity.verified ? <Badge tone="blue">Verified</Badge> : <Badge>Unverified</Badge>,
          clips: fmtNum(a.stats.clips, 0),
          views: fmtNum(a.stats.views, 0),
          metric: fmtNum(metric ? metric.get(a) : a.stats.reputation, 0),
        },
      }))}
    />
  );
}

/* ───────── How it works: timeline ───────── */
const steps = [
  ["Source video", "Upload footage you have the rights to."],
  ["AI clipping", "Your agent ranks the strongest moments."],
  ["Human review", "You trim, caption and approve."],
  ["Token preparation", "The agent drafts a name and ticker."],
  ["Authorized launch", "You sign. The chain confirms.", true],
  ["Market discovery", "The clip and its market go live."],
] as const;

export function SectionTimeline() {
  return (
    <Wrap>
      <SectionHead kicker="How it works" line1="From clip to market," line2="in six steps" />
      <ol className="relative grid gap-8 md:grid-cols-6 md:gap-4">
        <span aria-hidden className="absolute bottom-5 left-5 top-5 w-px bg-line-3 md:bottom-auto md:left-5 md:right-5 md:top-5 md:h-px md:w-auto" />
        {steps.map(([t, d, key], i) => (
          <motion.li
            key={t}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex gap-4 md:block"
          >
            <span
              className={cn(
                "relative z-10 grid size-10 shrink-0 place-items-center rounded-full border font-mono text-[13px] tabular-nums",
                key ? "border-accent bg-accent text-white" : "border-line-3 bg-surface text-text",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="md:mt-5">
              <h3 className="display text-[24px] leading-tight">{t}</h3>
              <p className="mt-1.5 text-[14px] text-text-2">{d}</p>
              {(i === 2 || i === 4) && <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Your decision</p>}
            </div>
          </motion.li>
        ))}
      </ol>
    </Wrap>
  );
}

/* ───────── Editorial list: what the agent does ───────── */
const features = [
  ["Highlight detection", "Combines loudness, sudden sound changes, excitement against the surrounding minute, and scene changes. Volume alone never picks a moment."],
  ["Subtitles and titles", "Writes captions and proposes titles you can edit or replace. Nothing is published until you approve it."],
  ["A real clip editor", "Trim handles, keyboard nudging, vertical or horizontal formats, a thumbnail from any frame, and export."],
  ["Token drafts, not promises", "The agent suggests a name, ticker and description. Drafts that promise returns are rejected."],
  ["Permissions you control", "Manual, assisted or autonomous modes, an emergency pause, and an audit log. Agents can never spend funds."],
];

export function SectionFeatures() {
  return (
    <Wrap>
      <div className="grid gap-10 border-t border-line-2 pt-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="md:sticky md:top-[calc(var(--header-h)+var(--ticker-h)+32px)] md:self-start">
          <p className="kicker">What your agent does</p>
          <Headline className="mt-3" line1="Not a chatbot." line2="A clipping partner." />
          <p className="mt-5 max-w-sm text-[15px] text-text-2">
            Configure an agent once with its sources, clip length and caption style. It works through footage you’re authorized to process and hands you a shortlist to review.
          </p>
          <Link href="/studio" className={cn(buttonClass("secondary", "md"), "mt-6")}>
            Open the Studio
          </Link>
        </div>
        <ol>
          {features.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.04}>
              <li className="grid grid-cols-[44px_1fr] gap-4 border-b border-line py-6 first:pt-0 last:border-0">
                <span className="font-mono text-[14px] text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[19px] font-semibold text-text">{t}</h3>
                  <p className="mt-1.5 text-[15px] text-text-2">{d}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </Wrap>
  );
}

/* ───────── Identity ───────── */
export function SectionIdentity() {
  return (
    <Wrap>
      <SectionHead kicker="Identity" line1="Every agent can prove who it is." line2="Binance Agent ID, checked on-chain." />
      <Reveal>
        <div className="grid overflow-hidden rounded-[14px] border border-line bg-surface shadow-[var(--shadow-feature)] md:grid-cols-[1fr_1fr_1fr]">
          <div className="border-b border-line p-6 md:border-b-0 md:border-r">
            <p className="kicker">How verification works</p>
            <p className="mt-4 text-[15px] text-text-2">
              The operator signs in with their wallet. Sniply then asks the Agent ID registry on BNB Chain whether that wallet holds an Agent ID, and records the block it checked.
            </p>
            <dl className="mt-6 space-y-2 font-mono text-[13px]">
              {[
                ["Registry", shortAddr(AGENT_ID_REGISTRY.address, 4)],
                ["Chain", "BNB Smart Chain"],
                ["Check", "balanceOf(wallet) > 0"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-line pb-2 last:border-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-text">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="border-b border-line p-6 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between">
              <p className="kicker">Verified on-chain</p>
              <Badge tone="blue">Proven</Badge>
            </div>
            <ul className="mt-4 divide-y divide-line text-[15px] text-text">
              {["Agent ID ownership", "Operator wallet signature", "Token launch transactions", "Contract addresses and blocks"].map((t) => (
                <li key={t} className="py-3">{t}</li>
              ))}
            </ul>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <p className="kicker">Sniply profile</p>
              <Badge>Off-chain</Badge>
            </div>
            <ul className="mt-4 divide-y divide-line text-[15px] text-text-2">
              {["Name, avatar and description", "Clips processed and published", "Engagement on Sniply", "Moderation history"].map((t) => (
                <li key={t} className="py-3">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
      <p className="mt-3 text-[13px] text-muted">Every profile labels which facts are on-chain. Reputation measures activity on Sniply, never investment quality.</p>
    </Wrap>
  );
}

/* ───────── Feed (real data) ───────── */
export function SectionFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["clips", "home"],
    queryFn: async () => (await (await fetch("/api/clips?limit=4&filter=trending")).json()).clips as PublicClip[],
  });
  return (
    <Wrap>
      <SectionHead
        kicker="The feed"
        line1="Fresh off the agents,"
        line2="approved by people"
        right={
          <Link href="/explore" className={buttonClass("secondary", "md")}>
            Open the feed <ArrowRight className="size-4" />
          </Link>
        }
      />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[9/16]" />)}</div>
      ) : data && data.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.05}>
              <ClipCard clip={c} />
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Film className="size-5" />}
          title="No clips published yet"
          body="Clips appear here only after a creator publishes them. Upload footage you own and your agent will propose the best moments."
          action={<Link href="/studio/new" className={buttonClass("primary", "md")}>Create the first clip</Link>}
        />
      )}
    </Wrap>
  );
}

/* ───────── Closing CTA: the one inverted moment ───────── */
export function SectionCTA() {
  return (
    <Wrap>
      <Reveal>
        <div className="rounded-[24px] bg-ink px-6 py-16 text-center md:px-12 md:py-24">
          <h2 className="display mx-auto max-w-3xl text-[clamp(40px,6vw,76px)] leading-[0.98] text-paper">
            The next viral moment <span className="accent-line block text-periwinkle">is waiting.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[520px] text-[16px] text-paper/70">
            Upload footage you own, let your agent find the moment, and decide what happens next.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/studio/new" className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-[15px] font-semibold text-text transition-colors hover:bg-white">
              Create your first clip <ArrowRight className="size-4" />
            </Link>
            <Link href="/markets" className="inline-flex h-12 items-center rounded-full border border-paper/25 px-6 text-[15px] font-semibold text-paper transition-colors hover:bg-paper/10">
              Explore markets
            </Link>
          </div>
        </div>
      </Reveal>
    </Wrap>
  );
}
