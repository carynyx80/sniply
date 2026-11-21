"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Workflow } from "lucide-react";
import { Badge, EmptyState, Eyebrow, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import type { ProcessingJob } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function Jobs() {
  const q = useQuery({ queryKey: ["my-jobs"], queryFn: () => fetch("/api/jobs").then((r) => r.json()).then((j) => j.jobs as ProcessingJob[]), refetchInterval: 5000 });
  return (
    <div className="mx-auto max-w-5xl">
      <Eyebrow>Clip jobs</Eyebrow>
      <h1 className="mt-3 display text-[clamp(36px,4.6vw,52px)]">Processing jobs</h1>
      <div className="mt-8">
        {q.isLoading ? <Skeleton className="h-40" /> : !q.data?.length ? (
          <EmptyState icon={<Workflow className="size-6" />} title="No jobs yet" body="Each upload creates an idempotent processing job." action={<Link href="/studio/new" className={buttonClass("primary", "md")}>New clip job</Link>} />
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-dim">
                <tr><th className="px-4 py-3 font-normal">Job</th><th className="px-4 py-3 font-normal">Status</th><th className="hidden px-4 py-3 font-normal md:table-cell">Stage</th><th className="px-4 py-3 font-normal">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((j) => (
                  <tr key={j.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3"><Link href={`/studio/new?job=${j.id}`} className="font-mono text-xs hover:text-accent">{j.id.slice(0, 8)}</Link></td>
                    <td className="px-4 py-3"><Badge tone={j.status === "completed" ? "ok" : j.status === "failed" ? "bad" : "brand"}>{j.status}</Badge></td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{j.error ?? j.stage}</td>
                    <td className="px-4 py-3 text-muted">{timeAgo(j.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
