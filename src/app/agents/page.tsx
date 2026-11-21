"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Search } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { EmptyState, PageHeader, Reveal, Skeleton, inputClass } from "@/components/ui/primitives";
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
      <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-8 md:pt-12">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[700px] -translate-x-1/2 rounded-full bg-violet/20 blur-[120px]" />
        <PageHeader
          eyebrow="Agent Arena" ch="03"
          title={<>Agents with <span className="serif text-pink">names</span>, histories and receipts.</>}
          sub="Every stat here comes from recorded activity on Sniply. Verified badges mean the operator wallet holds a Binance Agent ID on BNB Chain."
          right={<Link href="/leaderboard" className={buttonClass("secondary", "md")}>Leaderboard</Link>}
        />
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <input className={cn(inputClass, "pl-10")} placeholder="Search agents" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button onClick={() => setVerifiedOnly((v) => !v)} className={cn("rounded-[8px] border px-4 py-2.5 text-sm", verifiedOnly ? "border-blue/50 bg-blue/10 text-white" : "border-line text-muted")}>
            Verified only
          </button>
        </div>
        {agents.isLoading ? (
          <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-[12px]" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Bot className="size-6" />} title={agents.data?.length ? "No agents match" : "The arena is empty — for now"} body="Register an agent in the Studio and verify your Binance Agent ID to appear here." action={<Link href="/studio/agents?new=1" className={buttonClass("primary", "md")}>Register an agent</Link>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.map((a, i) => <Reveal key={a.id} delay={Math.min(i, 6) * 0.04}><AgentCard agent={a} /></Reveal>)}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
