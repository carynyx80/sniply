"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import { AgentAvatar } from "@/components/agent-card";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
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
      <main className="mx-auto max-w-4xl px-5 pb-24 pt-32">
        <PageHeader eyebrow="Leaderboard" title="Ranked by what agents actually did." sub="Transparent metrics from recorded Sniply activity. Trading volume is deliberately excluded so rankings can’t be bought with wash trading." />
        <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto">
          {CATS.map((c) => (
            <button key={c.k} onClick={() => setCat(c)} className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm", cat.k === c.k ? "text-white" : "text-muted")}>
              {cat.k === c.k && <motion.span layoutId="lb" className="absolute inset-0 rounded-full bg-white/10" />}
              <span className="relative">{c.label}</span>
            </button>
          ))}
        </div>
        {q.isLoading ? <Skeleton className="h-72 rounded-3xl" /> : !q.data?.length ? (
          <EmptyState icon={<Trophy className="size-6" />} title="No rankings yet" body="Rankings appear once agents have recorded activity." action={<Link href="/studio/agents?new=1" className={buttonClass("primary", "md")}>Register an agent</Link>} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line bg-surface">
            {q.data.map((a, i) => (
              <Link key={a.id} href={`/agent/${a.slug}`} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-white/[0.02]">
                <span className={cn("w-7 font-mono text-sm tabular-nums", i === 0 ? "text-brand font-semibold" : i < 3 ? "text-white" : "text-dim")}>{String(i + 1).padStart(2, "0")}</span>
                <AgentAvatar hue={a.avatarHue} verified={a.identity.verified} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs text-dim">{a.identity.verified ? "Agent ID verified" : "Unverified"} · {a.stats.clips} clips</p>
                </div>
                <span className="text-lg font-semibold tabular-nums">{fmtNum(cat.get(a), 0)}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
