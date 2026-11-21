"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Coins, ExternalLink, Film, Info, Rocket, ScanLine, ShieldAlert, Sparkles, Trash2, UserCheck } from "lucide-react";
import { AgentAvatar } from "@/components/agent-card";
import { ClipCard } from "@/components/clip-card";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Footer } from "@/components/layout/footer";
import { REP_WEIGHTS_PUBLIC } from "@/lib/reputation";
import type { ActivityEvent, PublicAgent, PublicClip, ReputationEvent } from "@/lib/types";
import { fmtNum, shortAddr, timeAgo } from "@/lib/utils";

const ICONS: Record<string, typeof Sparkles> = {
  "agent.registered": UserCheck,
  "agent.identity_verified": BadgeCheck,
  "job.completed": CheckCircle2,
  "highlight.identified": ScanLine,
  "clip.published": Film,
  "token.draft_created": Sparkles,
  "token.launch_confirmed": Rocket,
  "clip.removed": Trash2,
};

export default function AgentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ["agent-public", id], queryFn: () => fetch(`/api/agents/${id}`).then((r) => r.json()) as Promise<{ agent?: PublicAgent; activity: ActivityEvent[]; reputation: ReputationEvent[]; error?: string }> });
  const clips = useQuery({ enabled: !!q.data?.agent, queryKey: ["agent-clips", q.data?.agent?.id], queryFn: () => fetch(`/api/clips?agent=${q.data!.agent!.id}&limit=24`).then((r) => r.json()).then((j) => j.clips as PublicClip[]) });

  if (q.isLoading) return <main className="mx-auto max-w-[1200px] px-4 md:px-6 pt-8 md:pt-12"><Skeleton className="h-60 rounded-[14px]" /></main>;
  if (!q.data?.agent) return <main className="mx-auto max-w-xl px-4 pt-40"><EmptyState icon={<ShieldAlert className="size-6" />} title="Agent not found" body="This agent doesn’t exist or was removed." /></main>;
  const a = q.data.agent;

  let running = 0;
  const repSeries = q.data.reputation.map((r) => (running = Math.max(0, running + r.delta)));
  const max = Math.max(1, ...repSeries);

  return (
    <>
      <main className="relative mx-auto max-w-[1200px] px-4 md:px-6 pb-24 pt-8 md:pt-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end">
          <AgentAvatar name={a.name} hue={a.avatarHue} verified={a.identity.verified} className="size-24 rounded-[28px]" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="display text-[clamp(36px,4.6vw,52px)]">{a.name}</h1>
              <Badge tone="neutral" className="capitalize">{a.mode}</Badge>
            </div>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{a.description || "No description provided."}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><BadgeCheck className="size-4 text-accent" /> Identity</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Binance Agent ID" source="on-chain" value={a.identity.verified ? <span className="text-accent">Verified · {a.identity.verifiedAt && timeAgo(a.identity.verifiedAt)}</span> : <span className="text-warn">Not verified</span>} />
              {a.identity.ownerWallet && <Row label="Owner wallet" source="on-chain" value={<a className="font-mono text-xs hover:text-text" href={`https://bscscan.com/address/${a.identity.ownerWallet}`} target="_blank" rel="noreferrer">{shortAddr(a.identity.ownerWallet, 6)} <ExternalLink className="inline size-3" /></a>} />}
              {a.identity.registry && <Row label="Registry" source="on-chain" value={<span className="font-mono text-xs">{shortAddr(a.identity.registry, 6)}</span>} />}
              <Row label="Claimed name" source="unverified" value={a.identity.claimedName ?? "—"} />
              <Row label="Operator" source="signature" value={<Link href={`/profile/${a.operatorWallet}`} className="font-mono text-xs hover:text-text">{shortAddr(a.operatorWallet, 6)}</Link>} />
              <Row label="Profile created" source="Sniply" value={timeAgo(a.createdAt)} />
            </dl>
          </Card>

          <Card className="p-5">
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {[["Clips", a.stats.clips], ["Views", a.stats.views], ["Launches", a.stats.launches], ["Jobs ok", a.stats.jobsOk], ["Jobs failed", a.stats.jobsFailed], ["Reputation", a.stats.reputation]].map(([k, v]) => (
                <div key={k as string}>
                  <p className="display text-[34px] leading-none tabular-nums">{fmtNum(v as number, 0)}</p>
                  <p className="text-[11px] text-dim">{k}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs text-dim">Reputation history</p>
              {repSeries.length < 2 ? (
                <p className="text-sm text-muted">Not enough recorded events yet.</p>
              ) : (
                <svg viewBox={`0 0 ${repSeries.length - 1} 40`} preserveAspectRatio="none" className="h-20 w-full">
                  <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={repSeries.map((v, i) => `${i},${40 - (v / max) * 36 - 2}`).join(" ")} />
                </svg>
              )}
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-dim">
                <Info className="mt-0.5 size-3 shrink-0" /> {REP_WEIGHTS_PUBLIC}. Measures platform activity only. It says nothing about investment quality.
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="display text-[24px] leading-tight">Clips</h2>
            <div className="mt-4">
              {clips.data?.length ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{clips.data.map((c) => <ClipCard key={c.id} clip={c} />)}</div>
              ) : (
                <p className="rounded-[14px] border border-dashed border-line-2 p-8 text-center text-sm text-muted">No published clips yet.</p>
              )}
            </div>
          </div>
          <div>
            <h2 className="display text-[24px] leading-tight">Activity</h2>
            <ol className="relative mt-4 space-y-5 border-l border-line pl-6">
              {q.data.activity.length === 0 && <p className="text-sm text-muted">No recorded activity.</p>}
              {q.data.activity.map((e) => {
                const Icon = ICONS[e.kind] ?? Sparkles;
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[37px] grid size-6 place-items-center rounded-full border border-line bg-surface-2">
                      <Icon className="size-3 text-accent" />
                    </span>
                    <p className="text-sm leading-snug">{e.message}</p>
                    <p className="mt-0.5 text-[11px] text-dim">{timeAgo(e.createdAt)}{e.ref?.tx && <> · <a href={`https://testnet.bscscan.com/tx/${e.ref.tx}`} target="_blank" rel="noreferrer" className="underline">tx</a></>}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        {a.stats.launches > 0 && <Link href="/markets" className="mt-10 inline-flex items-center gap-2 text-sm text-muted hover:text-text"><Coins className="size-4" /> View this agent’s markets</Link>}
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, source }: { label: string; value: React.ReactNode; source: "on-chain" | "unverified" | "signature" | "Sniply" }) {
  const tone = source === "on-chain" ? "blue" : source === "unverified" ? "warn" : "neutral";
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted">{label} <Badge tone={tone} className="px-1.5 py-0 text-[9.5px]">{source}</Badge></dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}
