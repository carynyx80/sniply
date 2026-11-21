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
    neutral: "bg-white/[0.06] text-muted ring-white/10",
    ok: "bg-ok/10 text-ok ring-ok/25",
    warn: "bg-warn/10 text-warn ring-warn/25",
    bad: "bg-bad/10 text-bad ring-bad/25",
    brand: "bg-pink/10 text-pink ring-pink/25",
    blue: "bg-blue/15 text-[#8aa6ff] ring-blue/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset",
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

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted", className)}>
      <span className="h-px w-6 bg-brand" />
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
        "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      <div className="relative mb-5 grid size-14 place-items-center rounded-2xl border border-line bg-ink text-white">
        {icon}
      </div>
      <h3 className="relative text-lg font-medium tracking-tight">{title}</h3>
      <div className="relative mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</div>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 pb-10 md:flex-row md:items-end md:justify-between">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-6xl">{title}</h1>
        {sub && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-white/90">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-dim">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-white placeholder:text-dim outline-none transition focus:border-pink/50 focus:ring-4 focus:ring-pink/10";
