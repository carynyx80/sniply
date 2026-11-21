"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { MagneticLink } from "@/components/ui/button";
import { HeroDemo } from "./hero-demo";

const ease = [0.16, 1, 0.3, 1] as const;

function useTimecode() {
  const [t, setT] = useState("00:00:00:00");
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const ms = performance.now() - start;
      const f = Math.floor((ms / 1000) * 24) % 24;
      const s = Math.floor(ms / 1000);
      setT(`${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

const line = (delay: number) => ({
  initial: { y: "105%" },
  animate: { y: "0%" },
  transition: { duration: 1.1, delay, ease },
});

export function HeroSection() {
  const tc = useTimecode();
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="desk-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_30%,transparent_95%)]" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,43,190,0.16),transparent)]" />
      <div className="pointer-events-none absolute -left-40 top-[40%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(36,87,255,0.2),transparent)]" />

      <div className="relative mx-auto max-w-[1320px] px-4 pt-6 md:px-8 md:pt-10">
        {/* slate strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted"
        >
          <span className="flex items-center gap-2">
            <span className="rec-blink size-2 rounded-full bg-pink" />
            <span className="text-white">REC</span>
            <span className="text-faint">·</span>
            Sniply broadcast
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <BadgeCheck className="size-3.5 text-blue-soft" /> Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.
          </span>
          <span className="tabular-nums text-white">TC {tc}</span>
        </motion.div>

        <div className="grid gap-10 pb-12 pt-12 md:pt-16 lg:grid-cols-12 lg:gap-8">
          <h1 aria-label="The Internet Has Moments. Agents Make Them Markets." className="text-[clamp(2.9rem,7vw,8.4rem)] font-semibold leading-[0.88] tracking-[-0.065em] lg:col-span-9 lg:whitespace-nowrap">
            <span aria-hidden className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block" {...line(0.05)}>
                The Internet Has
              </motion.span>
            </span>
            <span aria-hidden className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block" {...line(0.15)}>
                <span className="serif pr-[0.06em] text-pink">Moments.</span>
              </motion.span>
            </span>
            <span aria-hidden className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block text-white/35" {...line(0.25)}>
                Agents Make Them
              </motion.span>
            </span>
            <span aria-hidden className="block overflow-hidden pb-[0.1em]">
              <motion.span className="block" {...line(0.35)}>
                <span className="serif text-brand pr-[0.08em]">Markets.</span>
              </motion.span>
            </span>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease }}
            className="flex flex-col justify-end gap-8 lg:col-span-3 lg:pb-4"
          >
            <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-pink md:hidden">
              Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.
            </p>
            <p className="text-[17px] leading-relaxed text-muted">
              Discover viral moments, create clips with AI, and launch on-chain markets around the content that moves culture.
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
              <MagneticLink href="/studio/new" variant="signal" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <span className="rec-blink size-2 rounded-full bg-white" /> Start Clipping
                </span>
                <ArrowUpRight className="size-4" />
              </MagneticLink>
              <MagneticLink href="/markets" variant="secondary" className="w-full justify-between">
                Explore Markets <ArrowUpRight className="size-4" />
              </MagneticLink>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.7, ease }}
          className="pb-14 md:pb-20"
        >
          <HeroDemo />
        </motion.div>
      </div>
    </section>
  );
}
