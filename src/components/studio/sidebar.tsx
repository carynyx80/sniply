"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Bot, Clapperboard, Cog, FileVideo, Home, LayoutGrid, Rocket, Upload, Workflow } from "lucide-react";
import { Logo } from "@/components/logo";
import { ConnectButton } from "@/components/web3/connect-button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/studio", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/studio/agents", label: "My Agents", icon: Bot },
  { href: "/studio/sources", label: "Video Sources", icon: FileVideo },
  { href: "/studio/jobs", label: "Clip Jobs", icon: Workflow },
  { href: "/studio/clips?tab=draft", label: "Drafts", icon: Clapperboard, match: "draft" },
  { href: "/studio/clips?tab=published", label: "Published Clips", icon: Clapperboard, match: "published" },
  { href: "/studio/launches", label: "Token Launches", icon: Rocket },
  { href: "/studio/settings", label: "Settings", icon: Cog },
];

export function StudioSidebar() {
  const pathname = usePathname();
  const isOn = (i: (typeof items)[number]) => {
    const base = i.href.split("?")[0];
    if (i.exact) return pathname === base;
    if (i.match) return pathname.startsWith(base) && typeof window !== "undefined" && window.location.search.includes(i.match);
    return pathname.startsWith(base);
  };
  return (
    <>
      {/* desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-ink px-3 py-5 lg:flex">
        <Link href="/" className="px-3">
          <Logo />
        </Link>
        <Link
          href="/studio/new"
          className="bg-brand mx-1 mt-7 flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium shadow-[0_10px_30px_-10px_rgba(255,43,190,0.6)]"
        >
          <Upload className="size-4" /> New clip job
        </Link>
        <nav className="mt-6 flex-1 space-y-0.5">
          {items.map((i) => {
            const on = isOn(i);
            return (
              <Link key={i.href} href={i.href} className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition", on ? "text-white" : "text-muted hover:text-white")}>
                {on && <motion.span layoutId="studio-active" className="absolute inset-0 rounded-xl bg-white/[0.06]" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <i.icon className="relative size-4" />
                <span className="relative">{i.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 px-1">
          <Link href="/" className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs text-dim hover:text-white">
            <Home className="size-3.5" /> Back to Sniply
          </Link>
          <ConnectButton />
        </div>
      </aside>
      {/* mobile top bar + scroller */}
      <div className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/"><Logo /></Link>
          <ConnectButton />
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
          {[{ href: "/studio/new", label: "New job", icon: Upload }, ...items].map((i) => (
            <Link key={i.href + i.label} href={i.href} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px]", pathname === i.href.split("?")[0] ? "bg-white/10 text-white" : "text-muted")}>
              <i.icon className="size-3.5" /> {i.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
