"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, Bot, Clapperboard, Flag, Rocket, ShieldAlert, Users, Video } from "lucide-react";
import { Logo } from "@/components/logo";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/studio/auth-gate";
import type { AuditLog, Clip, ContentReport, LaunchAttempt, ProcessingJob } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

type Overview = {
  counts: Record<string, number>;
  jobs: ProcessingJob[];
  clips: Clip[];
  failedAttempts: LaunchAttempt[];
  reports: ContentReport[];
  audit: AuditLog[];
  health: { database: string };
  error?: string;
};

export default function AdminPage() {
  return (
    <div className="min-h-dvh px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Badge tone="warn">Admin</Badge>
      </div>
      <div className="mx-auto mt-8 max-w-7xl">
        <AuthGate>
          <Admin />
        </AuthGate>
      </div>
    </div>
  );
}

function Admin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"reports" | "clips" | "jobs" | "tx" | "audit">("reports");
  // Authorization is enforced server-side (ADMIN_WALLETS); this UI just renders what the API allows.
  const q = useQuery({ queryKey: ["admin"], queryFn: async () => { const r = await fetch("/api/admin/overview"); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j as Overview; }, retry: false });
  const health = useQuery({ queryKey: ["health"], queryFn: () => fetch("/api/health").then((r) => r.json()) });

  if (q.isLoading) return <Skeleton className="h-80" />;
  if (q.error) return <EmptyState icon={<ShieldAlert className="size-6" />} title="Access denied" body="This wallet isn’t on the server-side admin list (ADMIN_WALLETS)." />;
  const d = q.data!;

  const moderate = async (id: string, action: "remove" | "restore") => {
    const reason = action === "remove" ? prompt("Reason for removal (audit-logged):") ?? "" : "restored";
    if (action === "remove" && !reason) return;
    await fetch(`/api/admin/clips/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason }) });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const resolve = async (id: string, status: "actioned" | "dismissed") => {
    await fetch(`/api/admin/reports/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const stats = [
    ["Users", d.counts.users, Users],
    ["Agents", d.counts.agents, Bot],
    ["Verified agents", d.counts.verifiedAgents, Bot],
    ["Videos", d.counts.videos, Video],
    ["Confirmed launches", d.counts.launches, Rocket],
    ["Open reports", d.counts.openReports, Flag],
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-[-0.04em]">Platform administration</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {stats.map(([k, v, Icon]) => (
          <Card key={k} className="p-4"><Icon className="size-4 text-muted" /><p className="mt-3 text-2xl font-semibold tabular-nums">{v}</p><p className="text-[11px] text-dim">{k}</p></Card>
        ))}
      </div>
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-xs">
        <span className="flex items-center gap-2 font-medium"><Activity className="size-4 text-ok" /> Platform health</span>
        {health.data && (
          <>
            <span>DB: <span className="text-muted">{health.data.database}</span></span>
            <span>Network: <span className="text-muted">{health.data.network}</span></span>
            <span>Launchpad: <span className="text-muted">{health.data.launchpad}</span></span>
            <span>AI text: <span className="text-muted">{health.data.ai.textModel}</span></span>
          </>
        )}
      </Card>

      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {([["reports", "Reports", Flag], ["clips", "Clips", Clapperboard], ["jobs", "Processing", Activity], ["tx", "Failed transactions", AlertTriangle], ["audit", "Audit log", ShieldAlert]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm", tab === k ? "bg-white/10" : "text-muted")}><I className="size-3.5" />{l}</button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {tab === "reports" && (d.reports.length === 0 ? <p className="p-6 text-sm text-muted">No reports.</p> : d.reports.map((r) => (
          <div key={r.id} className="flex flex-col gap-3 border-b border-line p-4 last:border-0 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2"><Badge tone={r.reason === "copyright" ? "warn" : "neutral"}>{r.reason}</Badge><Badge tone={r.status === "open" ? "brand" : "neutral"}>{r.status}</Badge><span className="text-xs text-dim">{timeAgo(r.createdAt)}</span></div>
              <p className="mt-2 text-sm">{r.details}</p>
              {r.clipId && <Link href={`/explore?clip=${r.clipId}`} className="font-mono text-xs text-muted hover:text-white">clip {r.clipId.slice(0, 8)}</Link>}
            </div>
            {r.status === "open" && (
              <div className="flex gap-2">
                {r.clipId && <Button size="sm" variant="danger" onClick={async () => { await moderate(r.clipId!, "remove"); await resolve(r.id, "actioned"); }}>Remove clip</Button>}
                <Button size="sm" variant="secondary" onClick={() => resolve(r.id, "dismissed")}>Dismiss</Button>
              </div>
            )}
          </div>
        )))}
        {tab === "clips" && (d.clips.length === 0 ? <p className="p-6 text-sm text-muted">No clips.</p> : d.clips.map((c) => (
          <div key={c.id} className="flex items-center gap-4 border-b border-line p-4 last:border-0">
            <div className="min-w-0 flex-1"><p className="truncate text-sm">{c.title}</p><p className="text-xs text-dim">{c.category} · {timeAgo(c.createdAt)}</p></div>
            <Badge tone={c.status === "removed" ? "bad" : c.status === "published" ? "ok" : "neutral"}>{c.status}</Badge>
            {c.status === "removed" ? <Button size="sm" variant="secondary" onClick={() => moderate(c.id, "restore")}>Restore</Button> : <Button size="sm" variant="danger" onClick={() => moderate(c.id, "remove")}>Remove</Button>}
          </div>
        )))}
        {tab === "jobs" && (d.jobs.length === 0 ? <p className="p-6 text-sm text-muted">No jobs.</p> : d.jobs.map((j) => (
          <div key={j.id} className="flex items-center gap-4 border-b border-line p-4 text-sm last:border-0">
            <span className="font-mono text-xs">{j.id.slice(0, 8)}</span>
            <Badge tone={j.status === "failed" ? "bad" : j.status === "completed" ? "ok" : "brand"}>{j.status}</Badge>
            <span className="flex-1 truncate text-muted">{j.error ?? j.stage}</span>
            <span className="text-xs text-dim">{timeAgo(j.updatedAt)}</span>
          </div>
        )))}
        {tab === "tx" && (d.failedAttempts.length === 0 ? <p className="p-6 text-sm text-muted">No failed or uncertain transactions.</p> : d.failedAttempts.map((a) => (
          <div key={a.id} className="flex items-center gap-4 border-b border-line p-4 text-sm last:border-0">
            <Badge tone="bad">{a.status}</Badge>
            <span className="font-mono text-xs">{a.txHash.slice(0, 14)}…</span>
            <span className="flex-1 truncate text-muted">{a.error}</span>
          </div>
        )))}
        {tab === "audit" && (d.audit.length === 0 ? <p className="p-6 text-sm text-muted">No audit entries.</p> : d.audit.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_2fr_auto] gap-4 border-b border-line p-3 font-mono text-xs last:border-0">
            <span>{l.action}</span><span className="truncate text-muted">{l.target}</span><span className="text-dim">{timeAgo(l.createdAt)}</span>
          </div>
        )))}
      </Card>
      <p className="text-xs text-dim">To shut off a compromised integration, unset its environment variable (e.g. NEXT_PUBLIC_LAUNCHPAD=none) and redeploy. Launch and AI routes fail closed when they aren’t configured.</p>
    </div>
  );
}
