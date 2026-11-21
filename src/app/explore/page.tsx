"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BadgeCheck, Coins, Film, Flag, Heart, Share2, Volume2, VolumeX } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import type { PublicClip } from "@/lib/types";
import { cn, fmtNum, shortAddr } from "@/lib/utils";

const FILTERS = [
  ["trending", "Trending"],
  ["new", "New"],
  ["gaming", "Gaming"],
  ["livestreams", "Livestreams"],
  ["podcasts", "Podcasts"],
  ["entertainment", "Entertainment"],
  ["agent", "Agent Created"],
  ["tokenized", "Tokenized"],
] as const;

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
    queryFn: async ({ pageParam }) => (await fetch(`/api/clips?filter=${filter}&limit=6&offset=${pageParam}`)).json() as Promise<{ clips: PublicClip[]; nextOffset: number | null }>,
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
    <div className="relative">
      {/* filter bar */}
      <div className="fixed inset-x-0 top-[68px] z-40 flex justify-center px-3 md:top-[76px]">
        <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-line-strong bg-ink/70 p-1 backdrop-blur-xl">
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={cn("relative shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors", filter === k ? "text-white" : "text-muted hover:text-white")}>
              {filter === k && <motion.span layoutId="feed-filter" className="absolute inset-0 rounded-full bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <div className="flex h-dvh items-center justify-center px-4 pt-24">
          <Skeleton className="aspect-[9/16] h-[78dvh] max-w-full rounded-3xl" />
        </div>
      ) : clips.length === 0 ? (
        <div className="mx-auto flex min-h-dvh max-w-xl items-center px-5 pt-28">
          <EmptyState
            className="w-full"
            icon={<Film className="size-6" />}
            title={filter === "trending" || filter === "new" ? "No clips published yet" : "Nothing in this category yet"}
            body="The feed only shows clips creators have actually published — no placeholders. Be the first."
            action={<Link href="/studio/new" className={buttonClass("primary", "md")}>Create a clip</Link>}
          />
        </div>
      ) : (
        <div className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-scroll">
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
  const ref = useRef<HTMLDivElement>(null);
  const vref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [likes, setLikes] = useState(clip.likes);
  const [liked, setLiked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const viewed = useRef(false);

  // autoplay the visible clip only
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

  return (
    <section ref={ref} id={`clip-${clip.id}`} className="relative flex h-dvh snap-start snap-always items-center justify-center px-0 pt-0 md:px-4 md:pb-6 md:pt-28">
      <div className="relative h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:h-full md:w-auto md:rounded-[28px] md:border md:border-line">
        <video
          ref={vref}
          src={`${clip.videoUrl}#t=${clip.startSec},${clip.endSec}`}
          poster={clip.thumbnailUrl ?? undefined}
          muted={muted}
          playsInline
          loop={false}
          preload={active ? "auto" : "metadata"}
          onTimeUpdate={(e) => e.currentTarget.currentTime >= clip.endSec && (e.currentTarget.currentTime = clip.startSec)}
          onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
          className="size-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
        {clip.caption && (
          <div className="pointer-events-none absolute inset-x-6 bottom-[30%] text-center">
            <span className="rounded-lg bg-black/60 px-2.5 py-1 text-base font-semibold [box-decoration-break:clone]">{clip.caption}</span>
          </div>
        )}

        {/* actions rail */}
        <div className="absolute bottom-28 right-3 flex flex-col items-center gap-4 md:bottom-8">
          <RailBtn label={fmtNum(likes, 0)} onClick={like} active={liked}><Heart className={cn("size-6", liked && "fill-pink text-pink")} /></RailBtn>
          <RailBtn label="Share" onClick={share}><Share2 className="size-6" /></RailBtn>
          <RailBtn label={muted ? "Sound" : "Mute"} onClick={onToggleMute}>{muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}</RailBtn>
          <Link href={`/report?clip=${clip.id}`} className="flex flex-col items-center gap-1 text-[11px] text-white/70" aria-label="Report clip">
            <span className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur"><Flag className="size-4" /></span>
          </Link>
        </div>

        {/* meta */}
        <div className="absolute inset-x-0 bottom-0 p-5 pr-20 pb-8">
          <div className="flex items-center gap-2 text-sm">
            {clip.agent ? (
              <Link href={`/agent/${clip.agent.slug}`} className="flex items-center gap-2 font-medium hover:underline">
                <span className="size-6 rounded-full" style={{ background: `linear-gradient(135deg,hsl(${clip.agent.avatarHue} 90% 60%),hsl(${(clip.agent.avatarHue + 60) % 360} 90% 55%))` }} />
                {clip.agent.name}
                {clip.agent.verified && <BadgeCheck className="size-4 text-[#7e9bff]" />}
              </Link>
            ) : null}
            <Link href={`/profile/${clip.creatorWallet}`} className="font-mono text-xs text-white/60 hover:text-white">by {shortAddr(clip.creatorWallet)}</Link>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight">{clip.title}</h2>
          <p className="mt-1 text-xs capitalize text-white/60">{clip.category} · {fmtNum(clip.views, 0)} views</p>
          {clip.token ? (
            <Link href={`/market/${clip.token.address}`} className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 py-1.5 pl-1.5 pr-3.5 text-sm backdrop-blur hover:border-pink/50">
              <span className="bg-brand grid size-6 place-items-center rounded-full"><Coins className="size-3.5" /></span>
              ${clip.token.symbol} <span className="text-white/50">· View market</span>
            </Link>
          ) : (
            <span className="mt-3 inline-block text-[11px] text-white/40">Not tokenized</span>
          )}
        </div>
        {toast && <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-white px-3 py-1.5 text-xs text-ink">{toast}</div>}
      </div>
    </section>
  );
}

function RailBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={onClick} className="flex flex-col items-center gap-1 text-[11px] text-white/80">
      <span className={cn("grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur", active && "bg-pink/20")}>{children}</span>
      {label}
    </motion.button>
  );
}
