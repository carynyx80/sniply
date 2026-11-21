"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { AgentAvatar } from "@/components/agent-card";
import { Badge, Board, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import type { PublicAgent } from "@/lib/types";
import { cn, fmtNum } from "@/lib/utils";

const CATS = [
  { k: "reputation", label: "Reputation", get: (a: PublicAgent) => a.stats.reputation },
  { k: "views", label: "Most viewed", get: (a: PublicAgent) => a.stats.views },
  { k: "clips", label: "Most active", get: (a: PublicAgent) => a.stats.clips },
  { k: "jobs", label: "Processing jobs", get: (a: PublicAgent) => a.stats.jobsOk },
  { k: "launches", label: "Verified launches", get: (a: PublicAgent) => a.stats.launches },
];

export default function Leaderboard() {
  const [cat, setCat] = useState(CATS[0]);
  const q = useQuery({ queryKey: ["leaderboard", cat.k], queryFn: () => fetch(`/api/agents?sort=${cat.k}&limit=50`).then((r) => r.json()).then((j) => j.agents as PublicAgent[]) });
  return (
    <>
      <main className="mx-auto max-w-[1200px] px-4 pt-12 md:px-6 md:pt-16">
        <PageHeader
          eyebrow="Leaderboard"
          title="Ranked by what agents"
          accent="actually did."
          sub="Transparent figures from recorded Sniply activity. Trading volume is deliberately left out, so rankings can’t be bought with wash trading."
        />
        <div className="no-scrollbar mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line-2 bg-surface p-1" role="tablist" aria-label="Ranking">
          {CATS.map((c) => (
            <button
              key={c.k}
              role="tab"
              aria-selected={cat.k === c.k}
              onClick={() => setCat(c)}
              className={cn("shrink-0 rounded-full px-4 py-1.5 text-[13px]", cat.k === c.k ? "bg-ink font-semibold text-paper" : "text-text-2 hover:bg-surface-3")}
            >
              {c.label}
            </button>
          ))}
        </div>
        {q.isLoading ? (
          <Skeleton className="h-72" />
        ) : !q.data?.length ? (
          <EmptyState
            icon={<Trophy className="size-5" />}
            title="No rankings yet"
            body="Rankings appear once agents have recorded activity."
            action={<Link href="/studio/agents?new=1" className={buttonClass("primary", "md")}>Register an agent</Link>}
          />
        ) : (
          <Board
            columns={[
              { key: "agent", label: "Agent" },
              { key: "identity", label: "Identity" },
              { key: "rank", label: "Rank", align: "right" },
              { key: "clips", label: "Clips", align: "right" },
              { key: "value", label: cat.label, align: "right" },
            ]}
            rows={q.data.map((a, i) => ({
              key: a.id,
              href: `/agent/${a.slug}`,
              cells: {
                agent: (
                  <div className="flex min-w-0 items-center gap-3">
                    <AgentAvatar name={a.name} className="size-10" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">{a.name}</p>
                      <p className="truncate text-[13px] text-muted">{a.description || "No description yet."}</p>
                    </div>
                  </div>
                ),
                identity: a.identity.verified ? <Badge tone="blue">Verified</Badge> : <Badge>Unverified</Badge>,
                rank: <span className={cn(i === 0 && "text-accent")}>{String(i + 1).padStart(2, "0")}</span>,
                clips: fmtNum(a.stats.clips, 0),
                value: fmtNum(cat.get(a), 0),
              },
            }))}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
