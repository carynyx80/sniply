"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileVideo, Link2, Radio } from "lucide-react";
import { Badge, Card, EmptyState, Eyebrow, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import type { VideoAsset } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function Sources() {
  const q = useQuery({ queryKey: ["my-videos"], queryFn: () => fetch("/api/videos").then((r) => r.json()).then((j) => j.assets as (VideoAsset & { url: string })[]) });
  return (
    <div className="mx-auto max-w-5xl">
      <Eyebrow>Video sources</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Your footage</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Card className="p-4"><FileVideo className="size-4 text-ok" /><p className="mt-3 text-sm font-medium">File upload</p><p className="text-xs text-muted">MP4, MOV, WebM, MKV — available</p></Card>
        <Card className="p-4 opacity-70"><Link2 className="size-4 text-dim" /><p className="mt-3 text-sm font-medium">Authorized URLs</p><p className="text-xs text-muted">Needs provider APIs with terms that permit it. Not enabled.</p></Card>
        <Card className="p-4 opacity-70"><Radio className="size-4 text-dim" /><p className="mt-3 text-sm font-medium">Livestream recordings</p><p className="text-xs text-muted">Via platform OAuth (e.g. VOD export). Not enabled.</p></Card>
      </div>
      <div className="mt-6">
        {q.isLoading ? <Skeleton className="h-40" /> : !q.data?.length ? (
          <EmptyState icon={<FileVideo className="size-6" />} title="No videos uploaded" body="Every upload requires a rights attestation and is validated server-side." action={<Link href="/studio/new" className={buttonClass("primary", "md")}>Upload video</Link>} />
        ) : (
          <div className="space-y-2">
            {q.data.map((a) => (
              <div key={a.id} className="flex items-center gap-4 rounded-[10px] border border-line bg-surface p-3">
                <video src={`${a.url}#t=1`} className="aspect-video w-28 rounded-lg bg-ink object-cover" muted preload="metadata" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{a.filename}</p>
                  <p className="text-xs text-dim">{(a.bytes / 1048576).toFixed(1)} MB · {a.durationSec ? `${Math.round(a.durationSec)}s` : "—"} · {timeAgo(a.createdAt)}</p>
                </div>
                <Badge tone={a.status === "ready" ? "ok" : a.status === "failed" ? "bad" : "neutral"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
