"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "ok" | "warn" | "bad" | "brand" | "blue";

/** Status pill: tinted state background, full-colour text, 5px dot, fully rounded. */
export function Badge({ children, tone = "neutral", className, dot = true }: { children: React.ReactNode; tone?: Tone; className?: string; dot?: boolean }) {
  const tones: Record<Tone, string> = {
    neutral: "bg-text/[0.06] text-muted",
    ok: "bg-green/[0.09] text-green",
    warn: "bg-amber/[0.09] text-amber",
    bad: "bg-red/[0.09] text-red",
    brand: "bg-accent-soft text-accent",
    blue: "bg-accent-soft text-accent",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", tones[tone], className)}>
      {dot && <span className="size-[5px] shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function LiveDot({ tone = "ok" }: { tone?: "ok" | "pink" | "accent" | "warn" }) {
  const c = tone === "ok" ? "bg-green" : tone === "warn" ? "bg-amber" : "bg-accent";
  return <span className={cn("pulse-dot inline-flex size-2 rounded-full", c)} />;
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[14px] border border-line bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelHead({ label, right, className }: { label: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-11 items-center justify-between rounded-t-[14px] border-b border-line bg-surface-2 px-4", className)}>
      <span className="kicker">{label}</span>
      {right}
    </div>
  );
}

/** Fade-and-rise on scroll. */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Mono uppercase section kicker. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string; ch?: string }) {
  return <div className={cn("kicker", className)}>{children}</div>;
}

/** Two-line serif headline: upright ink, then italic ink-blue. */
export function Headline({
  as: As = "h2",
  line1,
  line2,
  className,
  size = "section",
}: {
  as?: "h1" | "h2" | "h3";
  line1: React.ReactNode;
  line2?: React.ReactNode;
  className?: string;
  size?: "hero" | "section" | "page";
}) {
  const sizes = {
    hero: "text-[clamp(48px,8.4vw,112px)] leading-[0.95]",
    section: "text-[clamp(34px,4.4vw,54px)] leading-[1.02]",
    page: "text-[clamp(36px,4.6vw,52px)] leading-[1.02]",
  };
  return (
    <As className={cn("display", sizes[size], className)}>
      {line1}
      {line2 && (
        <>
          {" "}
          <span className="accent-line block">{line2}</span>
        </>
      )}
    </As>
  );
}

export function EmptyState({ icon, title, body, action, className }: { icon: React.ReactNode; title: string; body: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-16 text-center", className)}>
      <div className="mb-5 grid size-11 place-items-center rounded-full border border-line-2 bg-surface-2 text-text">{icon}</div>
      <h3 className="display text-[30px]">{title}</h3>
      <div className="mt-2 max-w-md text-[15px] text-text-2">{body}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[14px]", className)} />;
}

/** Inner-page header: kicker, two-line serif h1, lede, optional actions. */
export function PageHeader({ eyebrow, title, accent, sub, right }: { eyebrow: string; ch?: string; title: React.ReactNode; accent?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-10 border-b border-line-2 pb-8">
      <div className="kicker">{eyebrow}</div>
      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Headline as="h1" size="page" line1={title} line2={accent} />
          {sub && <p className="mt-4 max-w-[620px] text-[15px] text-text-2">{sub}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-text">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[12px] border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-dim outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]";

/** Big statistic: small sans label above a 40px serif figure. */
export function Stat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="display mt-1 truncate text-[40px] leading-none tabular-nums">{value}</p>
    </div>
  );
}

/** Note / alert box tinted by state. */
export function Note({ tone = "neutral", children, className }: { tone?: "neutral" | "ok" | "warn" | "bad" | "accent"; children: React.ReactNode; className?: string }) {
  const tones = {
    neutral: "border-line-2 bg-surface-2 text-text-2",
    ok: "border-green/30 bg-green/[0.06] text-text-2",
    warn: "border-amber/30 bg-amber/[0.07] text-text-2",
    bad: "border-red/30 bg-red/[0.06] text-text-2",
    accent: "border-accent/25 bg-accent-soft text-text-2",
  };
  return <div className={cn("rounded-[12px] border px-4 py-3 text-[14px]", tones[tone], className)}>{children}</div>;
}

/* ───────── Data board ───────── */
export type BoardColumn = { key: string; label: string; className?: string; align?: "left" | "right" };

/** Table inside a surface card. Header row mono uppercase on surface-2; rows link; stacks on mobile. */
export function Board({ columns, rows, className }: { columns: BoardColumn[]; rows: { href?: string; key: string; cells: Record<string, React.ReactNode> }[]; className?: string }) {
  const grid = { gridTemplateColumns: columns.map((c) => (c.key === columns[0].key ? "minmax(0,2.4fr)" : "minmax(0,1fr)")).join(" ") };
  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-line bg-surface", className)}>
      <div className="hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 md:grid" style={grid}>
        {columns.map((c) => (
          <span key={c.key} className={cn("font-mono text-[11px] uppercase tracking-[0.08em] text-muted", c.align === "right" && "text-right")}>
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((r) => {
        const inner = (
          <>
            {columns.map((c, i) => (
              <div key={c.key} className={cn("min-w-0", i > 0 && "flex items-center justify-between gap-4 md:block", c.align === "right" && "md:text-right", c.className)}>
                {i > 0 && <span className="text-[13px] text-muted md:hidden">{c.label}</span>}
                <div className={cn(i > 0 && "font-mono text-[14px] tabular-nums text-text")}>{r.cells[c.key]}</div>
              </div>
            ))}
          </>
        );
        const cls = "flex flex-col gap-2.5 border-b border-line px-5 py-4 last:border-0 transition-colors hover:bg-surface-2 md:grid md:items-center md:gap-4";
        return r.href ? (
          <Link key={r.key} href={r.href} className={cls} style={grid}>
            {inner}
          </Link>
        ) : (
          <div key={r.key} className={cls} style={grid}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
