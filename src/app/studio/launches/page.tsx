"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { Badge, EmptyState, Eyebrow, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import type { TokenDraft } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function Launches() {
  const q = useQuery({ queryKey: ["my-drafts"], queryFn: () => fetch("/api/tokens/drafts").then((r) => r.json()).then((j) => j.drafts as TokenDraft[]) });
  return (
    <div className="mx-auto max-w-5xl">
      <Eyebrow>Token launches</Eyebrow>
      <h1 className="mt-3 display text-[clamp(36px,4.6vw,52px)]">Drafts & launches</h1>
      <div className="mt-8">
        {q.isLoading ? <Skeleton className="h-40" /> : !q.data?.length ? (
          <EmptyState icon={<Rocket className="size-6" />} title="No token drafts" body="Publish a clip, then prepare a token for it. Every launch is reviewed and signed by you." action={<Link href="/studio/clips?tab=published" className={buttonClass("primary", "md")}>Choose a clip</Link>} />
        ) : (
          <div className="space-y-2">
            {q.data.map((d) => (
              <Link key={d.id} href={`/studio/launch/${d.clipId}`} className="flex items-center gap-4 rounded-[14px] border border-line bg-surface p-4 hover:border-line-2">
                <span className="bg-ink text-paper grid size-10 place-items-center rounded-[8px] text-sm font-bold">{d.symbol[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{d.name} <span className="font-mono text-muted">${d.symbol}</span></p>
                  <p className="text-xs text-dim">{timeAgo(d.createdAt)}</p>
                </div>
                <Badge tone={d.status === "confirmed" ? "ok" : d.status === "failed" ? "bad" : d.status === "submitted" ? "warn" : "neutral"}>{d.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
