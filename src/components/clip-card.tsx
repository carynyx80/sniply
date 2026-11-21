"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Eye, Heart } from "lucide-react";
import type { PublicClip } from "@/lib/types";
import { cn, fmtNum, shortAddr } from "@/lib/utils";

/** Paper card with the clip as a framed print, caption set below in ink. */
export function ClipCard({ clip, className }: { clip: PublicClip; className?: string }) {
  const vref = useRef<HTMLVideoElement>(null);
  const [hover, setHover] = useState(false);

  const play = () => {
    const v = vref.current;
    if (!v) return;
    setHover(true);
    v.currentTime = clip.startSec;
    v.play().catch(() => {});
  };
  const stop = () => {
    setHover(false);
    vref.current?.pause();
  };

  return (
    <Link
      href={`/explore?clip=${clip.id}`}
      onMouseEnter={play}
      onMouseLeave={stop}
      className={cn("group block overflow-hidden rounded-[14px] border border-line bg-surface transition-colors hover:border-line-3", className)}
    >
      <div className="relative aspect-[4/5] overflow-hidden border-b border-line bg-surface-3">
        {clip.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        )}
        <video
          ref={vref}
          src={`${clip.videoUrl}#t=${clip.startSec},${clip.endSec}`}
          muted
          playsInline
          preload="none"
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.currentTime >= clip.endSec) v.currentTime = clip.startSec;
          }}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", hover ? "opacity-100" : "opacity-0")}
        />
        {clip.token && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-text">${clip.token.symbol}</span>
        )}
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-surface/90 px-2 py-0.5 font-mono text-[11px] text-text">
          {Math.round(clip.endSec - clip.startSec)}s
        </span>
      </div>
      <div className="p-3.5">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-text">{clip.title}</p>
        <p className="mt-1 truncate text-[13px] text-muted">
          {clip.agent ? (
            <>
              {clip.agent.name}
              {clip.agent.verified && <span className="text-accent"> · verified</span>}
            </>
          ) : (
            <span className="font-mono">{shortAddr(clip.creatorWallet)}</span>
          )}
        </p>
        <div className="mt-2.5 flex items-center gap-3 font-mono text-[12px] text-muted">
          <span className="flex items-center gap-1"><Eye className="size-3" /> {fmtNum(clip.views, 0)}</span>
          <span className="flex items-center gap-1"><Heart className="size-3" /> {fmtNum(clip.likes, 0)}</span>
        </div>
      </div>
    </Link>
  );
}
