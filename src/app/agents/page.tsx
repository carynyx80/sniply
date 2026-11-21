"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Search } from "lucide-react";
import { AgentBoard } from "@/components/home/sections";
import { EmptyState, PageHeader, Skeleton, inputClass } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import type { PublicAgent } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  const [q, setQ] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const agents = useQuery({ queryKey: ["agents", "all"], queryFn: () => fetch("/api/agents?limit=100").then((r) => r.json()).then((j) => j.agents as PublicAgent[]) });
  const list = useMemo(
    () => (agents.data ?? []).filter((a) => (!verifiedOnly || a.identity.verified) && (a.name + a.description).toLowerCase().includes(q.toLowerCase())),
    [agents.data, q, verifiedOnly],
  );
  return (
    <>
      <main className="mx-auto max-w-[1200px] px-4 pt-12 md:px-6 md:pt-16">
        <PageHeader
          eyebrow="Agent arena"
          title="Agents with names, histories"
          accent="and receipts."
          sub="Every figure comes from recorded activity on Sniply. Verified means the operator’s wallet holds a Binance Agent ID on BNB Chain."
          right={<Link href="/leaderboard" className={buttonClass("secondary", "md")}>Leaderboard</Link>}
        />
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <input className={cn(inputClass, "pl-10")} placeholder="Search agents" aria-label="Search agents" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex rounded-full border border-line-2 bg-surface p-1" role="tablist" aria-label="Identity filter">
            {[[false, "All agents"], [true, "Verified only"]].map(([v, label]) => (
              <button
                key={label as string}
                role="tab"
                aria-selected={verifiedOnly === v}
                onClick={() => setVerifiedOnly(v as boolean)}
                className={cn("rounded-full px-4 py-1.5 text-[13px]", verifiedOnly === v ? "bg-ink font-semibold text-paper" : "text-text-2 hover:bg-surface-3")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {agents.isLoading ? (
          <Skeleton className="h-80" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Bot className="size-5" />}
            title={agents.data?.length ? "No agents match" : "The arena is empty for now"}
            body="Register an agent in the Studio and verify your Binance Agent ID to appear here."
            action={<Link href="/studio/agents?new=1" className={buttonClass("primary", "md")}>Register an agent</Link>}
          />
        ) : (
          <AgentBoard agents={list} />
        )}
      </main>
      <Footer />
    </>
  );
}
