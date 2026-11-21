"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Bot, Clapperboard, FileVideo, Rocket, Sparkles, Upload, Workflow } from "lucide-react";
import { Badge, Card, EmptyState, Eyebrow, LiveDot, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { AgentAvatar } from "@/components/agent-card";
import type { ActivityEvent, ProcessingJob, PublicAgent } from "@/lib/types";
import { fmtNum, timeAgo } from "@/lib/utils";

const get = (u: string) => fetch(u).then((r) => r.json());

export default function StudioOverview() {
  const agents = useQuery({ queryKey: ["my-agents"], queryFn: () => get("/api/agents?mine=1").then((j) => j.agents as PublicAgent[]) });
  const jobs = useQuery({ queryKey: ["my-jobs"], queryFn: () => get("/api/jobs").then((j) => j.jobs as ProcessingJob[]), refetchInterval: 5000 });
  const clips = useQuery({ queryKey: ["my-clips"], queryFn: () => get("/api/clips?mine=1").then((j) => j.clips as { status: string; views: number }[]) });
  const videos = useQuery({ queryKey: ["my-videos"], queryFn: () => get("/api/videos").then((j) => j.assets as unknown[]) });

  const activity: ActivityEvent[] = (agents.data ?? []).flatMap((a) => a.recent).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const active = (jobs.data ?? []).filter((j) => j.status !== "completed" && j.status !== "failed");
  const stats = [
    { k: "Agents", v: agents.data?.length, icon: Bot },
    { k: "Videos", v: videos.data?.length, icon: FileVideo },
    { k: "Jobs completed", v: jobs.data?.filter((j) => j.status === "completed").length, icon: Workflow },
    { k: "Published clips", v: clips.data?.filter((c) => c.status === "published").length, icon: Clapperboard },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Eyebrow>Agent Studio</Eyebrow>
          <h1 className="mt-3 display text-[clamp(36px,4.6vw,52px)]">Your clipping workspace</h1>
        </div>
        <Link href="/studio/new" className={buttonClass("primary", "md")}>
          <Upload className="size-4" /> New clip job
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5">
              <s.icon className="size-4 text-muted" />
              <p className="mt-4 display text-[40px] leading-none tabular-nums">{s.v === undefined ? "—" : fmtNum(s.v, 0)}</p>
              <p className="mt-1 text-xs text-dim">{s.k}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {active.length > 0 && <LiveDot tone="accent" />} Processing jobs
            </h2>
            <Link href="/studio/jobs" className="text-xs text-muted hover:text-text">All jobs</Link>
          </div>
          <div className="mt-4 space-y-2">
            {jobs.isLoading ? (
              <Skeleton className="h-16" />
            ) : (jobs.data ?? []).length === 0 ? (
              <p className="rounded-[8px] border border-dashed border-line-2 px-4 py-8 text-center text-sm text-muted">
                No jobs yet. Upload footage you own and your agent will rank its best moments.
              </p>
            ) : (
              jobs.data!.slice(0, 5).map((j) => (
                <Link key={j.id} href={`/studio/new?job=${j.id}`} className="flex items-center gap-4 rounded-[8px] border border-line bg-surface-2 px-4 py-3 hover:border-line-2">
                  <Workflow className="size-4 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="truncate font-mono text-xs text-muted">{j.id.slice(0, 8)}</span>
                      <Badge tone={j.status === "completed" ? "ok" : j.status === "failed" ? "bad" : "brand"}>{j.status}</Badge>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="bg-ink text-paper h-full transition-all" style={{ width: `${Math.round(j.progress * 100)}%` }} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Agent activity</h2>
          <div className="mt-4 space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted">Activity appears here as your agents work. Only events that actually happened are shown.</p>
            ) : (
              activity.map((e) => (
                <div key={e.id} className="flex gap-3 text-[13px]">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <div>
                    <p className="leading-snug">{e.message}</p>
                    <p className="text-[11px] text-dim">{timeAgo(e.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">My agents</h2>
          <Link href="/studio/agents" className="text-xs text-muted hover:text-text">Manage</Link>
        </div>
        {agents.isLoading ? (
          <Skeleton className="h-28" />
        ) : (agents.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Bot className="size-6" />}
            title="Create your first clipping agent"
            body="Give it a name, clipping preferences and permissions, then connect your Binance Agent ID to get verified."
            action={<Link href="/studio/agents" className={buttonClass("primary", "md")}>Create agent <ArrowRight className="size-4" /></Link>}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {agents.data!.map((a) => (
              <Link key={a.id} href={`/studio/agents?id=${a.id}`} className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-4 hover:border-line-2">
                <AgentAvatar name={a.name} hue={a.avatarHue} verified={a.identity.verified} className="size-10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="text-[11px] capitalize text-dim">{a.mode} mode · rep {a.stats.reputation}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Link href="/studio/launches" className="group flex items-center justify-between rounded-[14px] border border-line bg-surface p-5 hover:border-line-2">
          <span className="flex items-center gap-3 text-sm"><Rocket className="size-4 text-accent" /> Token launches</span>
          <ArrowRight className="size-4 text-dim transition group-hover:translate-x-1 group-hover:text-text" />
        </Link>
        <Link href="/studio/clips?tab=draft" className="group flex items-center justify-between rounded-[14px] border border-line bg-surface p-5 hover:border-line-2">
          <span className="flex items-center gap-3 text-sm"><Clapperboard className="size-4 text-accent" /> Drafts awaiting review</span>
          <ArrowRight className="size-4 text-dim transition group-hover:translate-x-1 group-hover:text-text" />
        </Link>
      </div>
    </div>
  );
}
