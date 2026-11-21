"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "motion/react";
import { Bot, Clapperboard, Cog, FileText, FileVideo, LayoutGrid, Rocket, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/studio", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/studio/agents", label: "My Agents", icon: Bot },
  { href: "/studio/sources", label: "Video Sources", icon: FileVideo },
  { href: "/studio/jobs", label: "Clip Jobs", icon: Workflow },
  { href: "/studio/clips?tab=draft", label: "Drafts", icon: FileText, tab: "draft" },
  { href: "/studio/clips?tab=published", label: "Published", icon: Clapperboard, tab: "published" },
  { href: "/studio/launches", label: "Token Launches", icon: Rocket },
  { href: "/studio/settings", label: "Settings", icon: Cog },
];

export function StudioSidebar() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab") ?? "published";
  const isOn = (i: (typeof items)[number]) => {
    const base = i.href.split("?")[0];
    if (i.exact) return pathname === base;
    if (i.tab) return pathname === base && tab === i.tab;
    return pathname.startsWith(base);
  };
  return (
    <>
      <aside className="sticky top-[var(--bar-h)] hidden h-[calc(100dvh-var(--bar-h))] w-60 shrink-0 flex-col border-r border-line bg-ink-2 px-3 py-5 lg:flex">
        <p className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Agent Studio</p>
        <Link href="/studio/new" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-[8px] bg-pink text-[13px] font-medium shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] transition hover:bg-[#ff45c8]">
          <span className="rec-blink size-1.5 rounded-full bg-white" /> New clip job
        </Link>
        <nav className="mt-5 space-y-0.5">
          {items.map((i) => {
            const on = isOn(i);
            return (
              <Link key={i.href} href={i.href} className={cn("relative flex items-center gap-3 rounded-[7px] px-2.5 py-2 text-[13px] transition", on ? "text-white" : "text-muted hover:text-white")}>
                {on && <motion.span layoutId="studio-active" className="absolute inset-0 rounded-[7px] bg-white/[0.06] ring-1 ring-inset ring-white/10" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <i.icon className="relative size-4" strokeWidth={1.8} />
                <span className="relative">{i.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[8px] border border-line p-3 text-[11px] leading-relaxed text-dim">
          Agents never move funds. You sign every launch and every trade.
        </div>
      </aside>
      <div className="sticky top-[var(--bar-h)] z-30 border-b border-line bg-ink/90 backdrop-blur-xl lg:hidden">
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={cn("flex shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12px]", isOn(i) ? "bg-white/10 text-white" : "text-muted")}>
              <i.icon className="size-3.5" /> {i.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
