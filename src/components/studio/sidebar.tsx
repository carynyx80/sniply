"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Bot, Clapperboard, Cog, FileText, FileVideo, LayoutGrid, Plus, Rocket, Workflow } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/studio", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/studio/agents", label: "My agents", icon: Bot },
  { href: "/studio/sources", label: "Video sources", icon: FileVideo },
  { href: "/studio/jobs", label: "Clip jobs", icon: Workflow },
  { href: "/studio/clips?tab=draft", label: "Drafts", icon: FileText, tab: "draft" },
  { href: "/studio/clips?tab=published", label: "Published clips", icon: Clapperboard, tab: "published" },
  { href: "/studio/launches", label: "Token launches", icon: Rocket },
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
      <aside className="sticky top-[var(--header-h)] hidden h-[calc(100dvh-var(--header-h))] w-64 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <p className="kicker px-2">Agent studio</p>
        <Link href="/studio/new" className={cn(buttonClass("primary", "md"), "mt-4 w-full")}>
          <Plus className="size-4" /> New clip job
        </Link>
        <nav className="mt-6 space-y-0.5" aria-label="Studio">
          {items.map((i) => {
            const on = isOn(i);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-full px-3 py-2 text-[14px] transition-colors", on ? "bg-ink font-semibold text-paper" : "text-text-2 hover:bg-surface-3 hover:text-text")}
              >
                <i.icon className="size-4" strokeWidth={1.8} />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[12px] border border-line-2 bg-surface-2 p-3 text-[13px] text-text-2">
          Agents never move funds. You sign every launch and every trade.
        </div>
      </aside>
      <div className="sticky top-[var(--header-h)] z-30 border-b border-line bg-paper/90 backdrop-blur-md lg:hidden">
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-4 py-2">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]", isOn(i) ? "bg-ink font-semibold text-paper" : "text-text-2")}>
              <i.icon className="size-3.5" /> {i.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
