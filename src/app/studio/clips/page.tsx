"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Coins, Eye, Heart, Rocket, Send } from "lucide-react";
import { Badge, EmptyState, Eyebrow, Skeleton } from "@/components/ui/primitives";
import { Button, buttonClass } from "@/components/ui/button";
import type { PublicClip, TokenDraft } from "@/lib/types";
import { cn, fmtNum, fmtTime } from "@/lib/utils";

type MyClip = PublicClip & { status: string; tokenDraft: TokenDraft | null; launched: boolean };

export default function Page() {
  return <Suspense><Clips /></Suspense>;
}

function Clips() {
  const tab = useSearchParams().get("tab") ?? "published";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-clips"], queryFn: () => fetch("/api/clips?mine=1").then((r) => r.json()).then((j) => j.clips as MyClip[]) });
  const list = (q.data ?? []).filter((c) => c.status === tab);

  const publish = async (id: string) => {
    await fetch(`/api/clips/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ publish: true }) });
    qc.invalidateQueries({ queryKey: ["my-clips"] });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Eyebrow>Clips</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{tab === "draft" ? "Drafts" : "Published clips"}</h1>
      <div className="mt-6 flex gap-1 rounded-full border border-line bg-surface p-1 text-sm w-fit">
        {["published", "draft"].map((t) => (
          <Link key={t} href={`/studio/clips?tab=${t}`} className={cn("rounded-full px-4 py-1.5 capitalize", tab === t ? "bg-white/10 text-white" : "text-muted")}>{t === "draft" ? "Drafts" : "Published"}</Link>
        ))}
      </div>
      <div className="mt-6">
        {q.isLoading ? (
          <Skeleton className="h-40" />
        ) : list.length === 0 ? (
          <EmptyState icon={<Clapperboard className="size-6" />} title={tab === "draft" ? "No drafts" : "Nothing published yet"} body="Clips you save from the editor land here." action={<Link href="/studio/new" className={buttonClass("primary", "md")}>New clip job</Link>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <div key={c.id} className="flex gap-4 rounded-[10px] border border-line bg-surface p-3">
                <div className="relative aspect-[9/16] w-24 shrink-0 overflow-hidden rounded-[8px] bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-medium">{c.title}</p>
                  <p className="mt-1 font-mono text-[11px] text-dim">{fmtTime(c.startSec)} → {fmtTime(c.endSec)} · {c.aspect}</p>
                  <div className="mt-2 flex gap-3 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><Eye className="size-3" />{fmtNum(c.views, 0)}</span>
                    <span className="flex items-center gap-1"><Heart className="size-3" />{fmtNum(c.likes, 0)}</span>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                    {c.status === "draft" ? (
                      <Button size="sm" onClick={() => publish(c.id)}><Send className="size-3.5" /> Publish</Button>
                    ) : c.launched ? (
                      <Badge tone="ok"><Coins className="size-3" /> ${c.token?.symbol}</Badge>
                    ) : (
                      <Link href={`/studio/launch/${c.id}`} className={buttonClass("secondary", "sm")}><Rocket className="size-3.5" /> {c.tokenDraft ? "Continue launch" : "Prepare token"}</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
