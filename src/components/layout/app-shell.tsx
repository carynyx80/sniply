"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useBlockNumber } from "wagmi";
import { Bot, CandlestickChart, Clapperboard, Compass, House, Plus, Trophy } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ConnectButton } from "@/components/web3/connect-button";
import { activeChain } from "@/lib/chain-config";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: House, ch: "01" },
  { href: "/explore", label: "Explore", icon: Compass, ch: "02" },
  { href: "/agents", label: "Agents", icon: Bot, ch: "03" },
  { href: "/studio", label: "Create", icon: Clapperboard, ch: "04" },
  { href: "/markets", label: "Markets", icon: CandlestickChart, ch: "05" },
  { href: "/leaderboard", label: "Ranks", icon: Trophy, ch: "06" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/agents" && pathname.startsWith("/agent/")) || (href === "/markets" && pathname.startsWith("/market/"));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh lg:pl-[var(--rail-w)]">
      <Rail pathname={pathname} />
      <StatusBar pathname={pathname} />
      <div className="pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
      <TabBar pathname={pathname} />
    </div>
  );
}

/* ── Desktop channel rail ── */
function Rail({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[var(--rail-w)] flex-col items-center border-r border-line bg-ink py-4 lg:flex">
      <Link href="/" aria-label="Sniply home" className="grid size-11 place-items-center rounded-[10px] transition hover:bg-white/[0.05]">
        <LogoMark className="size-7" />
      </Link>
      <div className="mt-3 h-px w-8 bg-line" />
      <nav className="mt-3 flex flex-1 flex-col gap-1">
        {NAV.map((n) => {
          const on = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "group relative flex w-[60px] flex-col items-center gap-1 rounded-[10px] py-2.5 transition-colors",
                on ? "text-white" : "text-dim hover:text-white",
              )}
            >
              {on && (
                <motion.span
                  layoutId="rail-active"
                  className="absolute inset-0 rounded-[10px] bg-white/[0.06] ring-1 ring-inset ring-white/10"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {on && <motion.span layoutId="rail-tick" className="absolute -left-[8px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-pink" />}
              <n.icon className="relative size-[19px]" strokeWidth={on ? 2.1 : 1.7} />
              <span className="relative text-[10px] font-medium tracking-tight">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        href="/studio/new"
        aria-label="New clip"
        className="grid size-11 place-items-center rounded-[10px] bg-pink text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),0_8px_24px_-6px_rgba(255,43,190,0.7)] transition hover:scale-105"
      >
        <Plus className="size-5" strokeWidth={2.4} />
      </Link>
    </aside>
  );
}

/* ── Top status bar (live chain HUD) ── */
function StatusBar({ pathname }: { pathname: string }) {
  const current = NAV.find((n) => isActive(pathname, n.href));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const block = useBlockNumber({ chainId: activeChain.id, watch: true, query: { enabled: mounted, refetchInterval: 6_000 } });

  return (
    <header className="sticky top-0 z-40 flex h-[var(--bar-h)] items-center justify-between gap-3 border-b border-line bg-ink/80 px-3 backdrop-blur-xl md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="Sniply home">
          <LogoMark className="size-6" />
          <span className="text-[17px] font-semibold tracking-[-0.04em]">Sniply</span>
        </Link>
        <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] lg:flex">
          <span className="font-semibold text-white">Sniply</span>
          <span className="text-faint">/</span>
          <span className="text-muted">{current ? `CH.${current.ch} ${current.label}` : pathname.split("/")[1] || "home"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim md:flex">
          <span className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", block.data ? "bg-ok" : "bg-faint")} />
            {activeChain.id === 56 ? "BSC" : "BSC Testnet"}
          </span>
          <span className="tabular-nums text-muted" title="Latest block, read live from BNB Chain">
            BLK {block.data ? `#${block.data.toLocaleString()}` : "—"}
          </span>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}

/* ── Mobile bottom tab bar ── */
function TabBar({ pathname }: { pathname: string }) {
  const items = [NAV[0], NAV[1], { href: "/studio/new", label: "Clip", icon: Plus, ch: "" }, NAV[4], NAV[2]];
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {items.map((n) => {
          const center = n.href === "/studio/new";
          const on = !center && isActive(pathname, n.href);
          if (center)
            return (
              <Link key={n.href} href={n.href} aria-label="New clip" className="flex justify-center">
                <span className="grid size-12 place-items-center rounded-[14px] bg-pink shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),0_8px_24px_-6px_rgba(255,43,190,0.8)] active:scale-95">
                  <Plus className="size-6" strokeWidth={2.4} />
                </span>
              </Link>
            );
          return (
            <Link key={n.href} href={n.href} className={cn("relative flex flex-col items-center gap-1 py-1.5", on ? "text-white" : "text-dim")}>
              <n.icon className="size-[21px]" strokeWidth={on ? 2.1 : 1.7} />
              <span className="text-[10px] font-medium">{n.label}</span>
              {on && <motion.span layoutId="tab-dot" className="absolute -top-[9px] h-[2px] w-6 rounded-full bg-pink" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
