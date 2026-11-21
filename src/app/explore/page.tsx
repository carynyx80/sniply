"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUpRight, Film, Flag, Heart, Share2, Volume2, VolumeX } from "lucide-react";
import { Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { AgentAvatar } from "@/components/agent-card";
import type { PublicClip } from "@/lib/types";
import { cn, fmtNum, shortAddr } from "@/lib/utils";

const FILTERS = [
  ["trending", "Trending"],
  ["new", "New"],
  ["gaming", "Gaming"],
  ["livestreams", "Livestreams"],
  ["podcasts", "Podcasts"],
  ["entertainment", "Entertainment"],
  ["agent", "Agent created"],
  ["tokenized", "Tokenized"],
] as const;

/** Feed viewport = screen minus header, ticker and the filter row. */
const FEED_H = "h-[calc(100dvh-var(--header-h)-var(--ticker-h)-56px)]";

export default function Page() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const params = useSearchParams();
  const [filter, setFilter] = useState<string>("trending");
  const [muted, setMuted] = useState(true);
  const focusId = params.get("clip");

  const q = useInfiniteQuery({
    queryKey: ["feed", filter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (await fetch(`/api/clips?filter=${filter}&limit=6&offset=${pageParam}`)).json() as Promise<{ clips: PublicClip[]; nextOffset: number | null }>,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
  const clips = q.data?.pages.flatMap((p) => p.clips) ?? [];

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [q]);

  useEffect(() => {
    if (focusId) document.getElementById(`clip-${focusId}`)?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [focusId, clips.length]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6">
      <div className="flex h-14 items-center">
        <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-line-2 bg-surface p-1" role="tablist" aria-label="Feed filters">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={cn("shrink-0 rounded-full px-3.5 py-1 text-[13px] transition-colors", filter === k ? "bg-ink font-semibold text-paper" : "text-text-2 hover:bg-surface-3")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <div className={cn(FEED_H, "flex items-center justify-center")}>
          <Skeleton className="aspect-[9/16] h-full max-h-[76dvh]" />
        </div>
      ) : clips.length === 0 ? (
        <div className={cn(FEED_H, "flex items-center")}>
          <EmptyState
            className="w-full"
            icon={<Film className="size-5" />}
            title={filter === "trending" || filter === "new" ? "No clips published yet" : "Nothing in this category yet"}
            body="The feed only shows clips creators have actually published. There are no placeholders, so be the first."
            action={<Link href="/studio/new" className={buttonClass("primary", "md")}>Create a clip</Link>}
          />
        </div>
      ) : (
        <div className={cn(FEED_H, "no-scrollbar snap-y snap-mandatory overflow-y-scroll")}>
          {clips.map((c) => (
            <FeedItem key={c.id} clip={c} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
          ))}
          <div ref={sentinel} className="h-px" />
        </div>
      )}
    </div>
  );
}

function FeedItem({ clip, muted, onToggleMute }: { clip: PublicClip; muted: boolean; onToggleMute: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const vref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [likes, setLikes] = useState(clip.likes);
  const [liked, setLiked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const viewed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.intersectionRatio > 0.65), { threshold: [0, 0.65, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (active) {
      if (v.currentTime < clip.startSec || v.currentTime > clip.endSec) v.currentTime = clip.startSec;
      v.play().catch(() => {});
      if (!viewed.current) {
        viewed.current = true;
        fetch(`/api/clips/${clip.id}/engage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "view" }) });
      }
    } else v.pause();
  }, [active, clip]);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  };
  const like = async () => {
    const r = await fetch(`/api/clips/${clip.id}/engage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "like" }) });
    const j = await r.json();
    if (!r.ok) return flash(j.error ?? "Couldn’t like");
    setLikes(j.likes);
    setLiked(true);
  };
  const share = async () => {
    const url = `${location.origin}/explore?clip=${clip.id}`;
    fetch(`/api/clips/${clip.id}/engage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "share" }) });
    if (navigator.share) navigator.share({ title: clip.title, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    }
  };

  const round = "grid size-11 place-items-center rounded-full border border-line-2 bg-surface text-text transition-colors hover:border-line-3 hover:bg-surface-3";

  return (
    <section ref={ref} id={`clip-${clip.id}`} className="flex h-full snap-start snap-always flex-col gap-3 py-3 md:flex-row md:items-stretch md:justify-center md:gap-6">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border border-line bg-ink md:aspect-[9/16] md:flex-none">
        <video
          ref={vref}
          src={`${clip.videoUrl}#t=${clip.startSec},${clip.endSec}`}
          poster={clip.thumbnailUrl ?? undefined}
          muted={muted}
          playsInline
          preload={active ? "auto" : "metadata"}
          onTimeUpdate={(e) => e.currentTarget.currentTime >= clip.endSec && (e.currentTarget.currentTime = clip.startSec)}
          onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
          className="size-full object-contain"
        />
        {clip.caption && (
          <div className="pointer-events-none absolute inset-x-4 bottom-5 text-center">
            <span className="rounded-[8px] bg-ink/85 px-2.5 py-1 text-[15px] font-semibold text-paper [box-decoration-break:clone]">{clip.caption}</span>
          </div>
        )}
        {toast && <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-surface px-3 py-1.5 text-[13px] text-text">{toast}</div>}
      </div>

      <aside className="flex shrink-0 flex-col rounded-[14px] border border-line bg-surface p-4 md:w-[320px] md:p-5">
        <div className="flex items-center gap-3">
          {clip.agent ? (
            <Link href={`/agent/${clip.agent.slug}`} className="flex min-w-0 items-center gap-2.5">
              <AgentAvatar name={clip.agent.name} verified={clip.agent.verified} className="size-9" />
              <span className="truncate font-semibold text-text hover:text-accent">{clip.agent.name}</span>
            </Link>
          ) : (
            <span className="text-[13px] text-muted">No agent</span>
          )}
          <Link href={`/profile/${clip.creatorWallet}`} className="ml-auto font-mono text-[12px] text-muted hover:text-accent">
            {shortAddr(clip.creatorWallet)}
          </Link>
        </div>
        <h2 className="display mt-3 text-[26px] leading-[1.1] md:mt-5 md:text-[32px]">{clip.title}</h2>
        <p className="mt-1.5 text-[13px] capitalize text-muted">
          {clip.category} · <span className="font-mono">{fmtNum(clip.views, 0)}</span> views
        </p>
        <div className="mt-3">
          {clip.token ? (
            <Link href={`/market/${clip.token.address}`} className="inline-flex items-center gap-2 rounded-full border border-line-2 px-3 py-1.5 text-[13px] hover:border-accent">
              <span className="font-mono font-semibold text-text">${clip.token.symbol}</span>
              <span className="text-accent">View market</span>
              <ArrowUpRight className="size-3.5 text-accent" />
            </Link>
          ) : (
            <Badge>Not tokenized</Badge>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 md:mt-auto">
          <button onClick={like} aria-label="Like" className={cn(round, liked && "border-accent text-accent")}>
            <Heart className={cn("size-[18px]", liked && "fill-accent")} />
          </button>
          <span className="mr-2 font-mono text-[13px] tabular-nums text-text">{fmtNum(likes, 0)}</span>
          <button onClick={share} aria-label="Share" className={round}>
            <Share2 className="size-[18px]" />
          </button>
          <button onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"} className={round}>
            {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
          </button>
          <Link href={`/report?clip=${clip.id}`} aria-label="Report clip" className={cn(round, "ml-auto")}>
            <Flag className="size-4" />
          </Link>
        </div>
      </aside>
    </section>
  );
}
