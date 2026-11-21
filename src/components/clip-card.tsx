"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BadgeCheck, Eye, Heart, Coins } from "lucide-react";
import type { PublicClip } from "@/lib/types";
import { cn, fmtNum, shortAddr } from "@/lib/utils";

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
      className={cn(
        "ring-brand group relative block aspect-[9/16] overflow-hidden rounded-3xl border border-line bg-surface",
        className,
      )}
    >
      {clip.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue/30 to-pink/20" />
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
        className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500", hover ? "opacity-100" : "opacity-0")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {clip.token && (
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 font-mono text-[10.5px] backdrop-blur">
          <Coins className="size-3 text-pink" /> ${clip.token.symbol}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="line-clamp-2 text-[14px] font-medium leading-snug">{clip.title}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-white/70">
          {clip.agent ? (
            <>
              <span className="size-3.5 rounded-full" style={{ background: `hsl(${clip.agent.avatarHue} 90% 60%)` }} />
              <span className="truncate">{clip.agent.name}</span>
              {clip.agent.verified && <BadgeCheck className="size-3.5 shrink-0 text-[#7e9bff]" />}
            </>
          ) : (
            <span className="font-mono">{shortAddr(clip.creatorWallet)}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-white/60">
          <span className="flex items-center gap-1">
            <Eye className="size-3" /> {fmtNum(clip.views, 0)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="size-3" /> {fmtNum(clip.likes, 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}
