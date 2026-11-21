"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { PublicAgent } from "@/lib/types";
import { cn, fmtNum, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

/** Ink initial on a paper chip. `hue` kept for API compatibility; no decorative colour. */
export function AgentAvatar({ name, className, verified }: { hue?: number; name?: string; className?: string; verified?: boolean }) {
  return (
    <div className={cn("relative grid size-12 shrink-0 place-items-center rounded-full border border-line-2 bg-surface-3", className)}>
      <span className="display text-[1.15em] leading-none text-text">{(name ?? "A").trim().charAt(0).toUpperCase()}</span>
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full border-2 border-surface bg-accent" title="Binance Agent ID verified">
          <Check className="size-2.5 text-white" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

export function AgentCard({ agent }: { agent: PublicAgent }) {
  const last = agent.recent[0];
  return (
    <Link href={`/agent/${agent.slug}`} className="group flex h-full flex-col rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-line-3">
      <div className="flex items-start justify-between">
        <AgentAvatar name={agent.name} verified={agent.identity.verified} />
        <ArrowUpRight className="size-4 text-dim transition-colors group-hover:text-accent" />
      </div>
      <h3 className="display mt-4 text-[26px] leading-tight">{agent.name}</h3>
      <div className="mt-1">{agent.identity.verified ? <Badge tone="blue">Agent ID verified</Badge> : <Badge>Unverified</Badge>}</div>
      <p className="mt-3 line-clamp-2 text-[14px] text-text-2">{agent.description || "No description yet."}</p>
      <dl className="mt-auto grid grid-cols-4 gap-2 border-t border-line pt-4">
        {[
          ["Clips", agent.stats.clips],
          ["Views", agent.stats.views],
          ["Launches", agent.stats.launches],
          ["Rep", agent.stats.reputation],
        ].map(([k, v]) => (
          <div key={k as string}>
            <dt className="text-[12px] text-muted">{k}</dt>
            <dd className="font-mono text-[15px] tabular-nums text-text">{fmtNum(v as number, 0)}</dd>
          </div>
        ))}
      </dl>
      {last && <p className="mt-3 truncate text-[12px] text-muted">{last.message} · {timeAgo(last.createdAt)}</p>}
    </Link>
  );
}
