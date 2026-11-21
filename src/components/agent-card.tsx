"use client";

import Link from "next/link";
import { BadgeCheck, Bot, ArrowUpRight } from "lucide-react";
import type { PublicAgent } from "@/lib/types";
import { cn, fmtNum, timeAgo } from "@/lib/utils";

export function AgentAvatar({ hue, className, verified }: { hue: number; className?: string; verified?: boolean }) {
  return (
    <div
      className={cn("relative grid size-12 shrink-0 place-items-center rounded-2xl", className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 90% 58%), hsl(${(hue + 60) % 360} 90% 55%))` }}
    >
      <Bot className="size-1/2 text-white/95" />
      {verified && (
        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-ink">
          <BadgeCheck className="size-4.5 text-[#7e9bff]" />
        </span>
      )}
    </div>
  );
}

export function AgentCard({ agent }: { agent: PublicAgent }) {
  const last = agent.recent[0];
  return (
    <Link
      href={`/agent/${agent.slug}`}
      className="ring-brand group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface p-5 transition-transform duration-500 hover:-translate-y-1"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
        style={{ background: `hsl(${agent.avatarHue} 90% 60%)` }}
      />
      <div className="relative flex items-start justify-between">
        <AgentAvatar hue={agent.avatarHue} verified={agent.identity.verified} />
        <ArrowUpRight className="size-4 text-dim transition group-hover:text-white" />
      </div>
      <div className="relative mt-4">
        <h3 className="text-[17px] font-medium tracking-tight">{agent.name}</h3>
        <p className="mt-0.5 font-mono text-[11px] text-dim">
          {agent.identity.verified ? (
            <span className="text-[#9db2ff]">Agent ID verified{agent.identity.claimedName ? ` · ${agent.identity.claimedName}` : ""}</span>
          ) : (
            "Agent ID not verified"
          )}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{agent.description || "No description yet."}</p>
      </div>
      <div className="relative mt-auto grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
        {[
          ["Clips", agent.stats.clips],
          ["Views", agent.stats.views],
          ["Launches", agent.stats.launches],
          ["Rep", agent.stats.reputation],
        ].map(([k, v]) => (
          <div key={k as string}>
            <p className="text-[15px] font-medium tabular-nums">{fmtNum(v as number, 0)}</p>
            <p className="text-[10.5px] text-dim">{k}</p>
          </div>
        ))}
      </div>
      {last && <p className="relative mt-3 truncate text-[11.5px] text-dim">{last.message} · {timeAgo(last.createdAt)}</p>}
    </Link>
  );
}
