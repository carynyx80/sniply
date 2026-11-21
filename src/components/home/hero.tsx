"use client";

import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, Scissors } from "lucide-react";
import { MagneticLink } from "@/components/ui/button";
import { HeroDemo } from "./hero-demo";

const ease = [0.16, 1, 0.3, 1] as const;

export function HeroSection() {
  const words = ["The", "Internet", "Has", "Moments."];
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pt-40">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute left-1/2 top-[-260px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(36,87,255,0.35),transparent)]" />
        <div className="absolute right-[-120px] top-[120px] h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(255,43,190,0.18),transparent)]" />
      </div>

      <div className="mx-auto max-w-6xl px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] py-1 pl-1 pr-3.5 text-[12.5px] text-muted backdrop-blur"
        >
          <span className="flex items-center gap-1 rounded-full bg-blue/20 px-2 py-0.5 text-[11px] font-medium text-[#9db2ff]">
            <BadgeCheck className="size-3" /> Agent ID
          </span>
          Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.
        </motion.div>

        <h1 className="mx-auto mt-8 max-w-5xl text-[clamp(2.8rem,8.4vw,7.2rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
          <span className="block">
            {words.map((w, i) => (
              <motion.span
                key={w}
                className="mr-[0.22em] inline-block"
                initial={{ opacity: 0, y: "0.4em", filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, delay: 0.1 + i * 0.07, ease }}
              >
                {w}
              </motion.span>
            ))}
          </span>
          <motion.span
            className="text-brand block pb-[0.08em]"
            initial={{ opacity: 0, y: "0.4em", filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, delay: 0.45, ease }}
          >
            Agents Make Them Markets.
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease }}
          className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-muted"
        >
          Discover viral moments, create clips with AI, and launch on-chain markets around the content that moves
          culture.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85, ease }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <MagneticLink href="/studio/new">
            <Scissors className="size-4" /> Start Clipping
          </MagneticLink>
          <MagneticLink href="/markets" variant="secondary">
            Explore Markets <ArrowRight className="size-4" />
          </MagneticLink>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.9, ease }}
        className="mt-20 px-3 md:px-5"
      >
        <HeroDemo />
      </motion.div>
    </section>
  );
}
