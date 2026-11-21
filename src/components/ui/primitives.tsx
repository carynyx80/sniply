"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "brand" | "blue";
  className?: string;
}) {
  const tones = {
    neutral: "bg-white/[0.05] text-muted ring-white/10",
    ok: "bg-ok/10 text-ok ring-ok/25",
    warn: "bg-warn/10 text-warn ring-warn/25",
    bad: "bg-bad/10 text-bad ring-bad/25",
    brand: "bg-pink/10 text-pink ring-pink/30",
    blue: "bg-blue/15 text-blue-soft ring-blue/35",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ tone = "ok" }: { tone?: "ok" | "pink" | "warn" }) {
  const c = tone === "ok" ? "bg-ok" : tone === "pink" ? "bg-pink" : "bg-warn";
  return (
    <span className="relative inline-flex size-2">
      <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", c)} />
      <span className={cn("relative size-2 rounded-full", c)} />
    </span>
  );
}

/** Panel: the base surface. Hairline border, sharp radius, optional viewfinder brackets. */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[10px] border border-line bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

/** Panel header strip: mono label left, slot right. */
export function PanelHead({ label, right, className }: { label: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-9 items-center justify-between border-b border-line px-3.5", className)}>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">{label}</span>
      {right}
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
  y = 20,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Mono "channel" label, e.g.  CH.03 — IDENTITY */
export function Eyebrow({ children, className, ch }: { children: React.ReactNode; className?: string; ch?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted", className)}>
      {ch ? (
        <span className="rounded-[3px] bg-pink px-1.5 py-[2px] text-[9.5px] font-semibold tracking-[0.1em] text-white">CH.{ch}</span>
      ) : (
        <span className="size-1.5 rounded-full bg-pink" />
      )}
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "viewfinder relative flex flex-col items-center justify-center overflow-hidden rounded-[10px] border border-line bg-ink-2 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="dot-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(circle_at_center,black,transparent_65%)]" />
      <div className="relative mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">No signal</div>
      <div className="relative mb-5 grid size-12 place-items-center rounded-[8px] border border-line-strong bg-surface text-white">{icon}</div>
      <h3 className="relative text-xl font-semibold tracking-[-0.03em]">{title}</h3>
      <div className="relative mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</div>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[8px]", className)} />;
}

export function PageHeader({
  eyebrow,
  ch,
  title,
  sub,
  right,
}: {
  eyebrow: string;
  ch?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-10 border-b border-line pb-8">
      <Eyebrow ch={ch}>{eyebrow}</Eyebrow>
      <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="max-w-3xl text-[clamp(2.3rem,5.5vw,4.4rem)] font-semibold leading-[0.95] tracking-[-0.05em]">{title}</h1>
          {sub && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{sub}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-dim">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[8px] border border-line-strong bg-ink px-3 py-2.5 text-sm text-white placeholder:text-dim outline-none transition focus:border-pink focus:shadow-[0_0_0_3px_rgba(255,43,190,0.15)]";

/** Big mono stat used in HUD rows */
export function Stat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-[-0.03em]">{value}</p>
    </div>
  );
}
