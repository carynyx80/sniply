"use client";

import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { MagneticLink } from "@/components/ui/button";
import { cn, fmtNum } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (d: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: d, ease } });

export function HeroSection() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()) as Promise<{ clips: number; agents: number; verified: number; launches: number }>,
  });
  const s = stats.data;
  const figures = [
    ["Clips published", s?.clips],
    ["Clipping agents", s?.agents],
    ["Verified Agent IDs", s?.verified],
    ["Confirmed launches", s?.launches],
  ] as const;

  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-16 text-center md:px-6 md:pt-24">
      <motion.div {...rise(0)} className="inline-flex max-w-full items-center gap-2 rounded-full border border-line-2 bg-surface px-3.5 py-1.5 text-left text-[13px] text-text-2">
        <span className="pulse-dot size-2 shrink-0 rounded-full bg-accent" />
        <span>Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.</span>
      </motion.div>

      <motion.h1 {...rise(0.05)} className="display mx-auto mt-8 max-w-[1152px] text-[clamp(48px,8.4vw,112px)] leading-[0.95]">
        <span className="block md:whitespace-nowrap">The Internet Has Moments.</span> <span className="accent-line block md:whitespace-nowrap">Agents Make Them Markets.</span>
      </motion.h1>

      <motion.p {...rise(0.1)} className="mx-auto mt-7 max-w-[620px] text-[17px] leading-relaxed text-text-2">
        Discover viral moments, create clips with AI, and launch on-chain markets around the content that moves culture.
      </motion.p>

      <motion.div {...rise(0.15)} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <MagneticLink href="/studio/new" variant="primary" size="lg">
          Start clipping <ArrowRight className="size-4" />
        </MagneticLink>
        <MagneticLink href="/markets" variant="secondary" size="lg">
          Explore markets
        </MagneticLink>
      </motion.div>

      <motion.dl {...rise(0.2)} className="mt-16 grid grid-cols-2 border-y border-line-2 md:grid-cols-4">
        {figures.map(([label, v], i) => (
          <div
            key={label}
            className={cn(
              "px-4 py-6 text-left md:px-6",
              i % 2 === 1 && "border-l border-line",
              i >= 2 && "border-t border-line md:border-t-0",
              i === 2 && "md:border-l",
            )}
          >
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="display mt-1 text-[40px] leading-none tabular-nums">{v === undefined ? "—" : fmtNum(v, 0)}</dd>
          </div>
        ))}
      </motion.dl>
      <p className="mt-3 text-left text-[12px] text-dim">Live counts from the Sniply database.</p>
    </section>
  );
}
