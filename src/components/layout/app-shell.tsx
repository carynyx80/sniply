"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBlockNumber } from "wagmi";
import { Menu, Plus, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ConnectButton } from "@/components/web3/connect-button";
import { activeChain } from "@/lib/chain-config";
import { cn, fmtNum } from "@/lib/utils";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/agents", label: "Agents" },
  { href: "/studio", label: "Create" },
  { href: "/markets", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const isActive = (p: string, href: string) =>
  p === href || p.startsWith(`${href}/`) || (href === "/agents" && p.startsWith("/agent/")) || (href === "/markets" && p.startsWith("/market/"));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh">
      <Header pathname={pathname} />
      <Ticker />
      {children}
    </div>
  );
}

function Header({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 h-[var(--header-h)] border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto grid h-full max-w-[1200px] grid-cols-[1fr_auto] items-center px-4 md:px-6 min-[860px]:grid-cols-[1fr_auto_1fr]">
          <Link href="/" aria-label="Sniply home" className="justify-self-start">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 min-[860px]:flex" aria-label="Main">
            {NAV.map((n) => {
              const on = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[14px] transition-colors",
                    on ? "bg-ink font-semibold text-paper" : "text-text-2 hover:bg-surface-3 hover:text-text",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 justify-self-end">
            <Link
              href="/studio/new"
              aria-label="New clip"
              title="New clip"
              className="hidden size-9 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-3 hover:text-text sm:grid"
            >
              <Plus className="size-[18px]" />
            </Link>
            <ConnectButton />
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="grid size-9 place-items-center rounded-full border border-line-2 bg-surface text-text min-[860px]:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 overflow-y-auto bg-paper px-4 pb-10 pt-4 min-[860px]:hidden"
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {[{ href: "/", label: "Home" }, ...NAV, { href: "/studio/new", label: "New clip" }].map((n) => {
                const on = n.href === "/" ? pathname === "/" : isActive(pathname, n.href);
                return (
                  <Link key={n.href} href={n.href} className="flex items-center justify-between border-b border-line py-4">
                    <span className={cn("display text-[34px]", on && "accent-line")}>{n.label}</span>
                    {on && <span className="kicker">Current</span>}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** 34px ink ticker tape with live items only. */
function Ticker() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const block = useBlockNumber({ chainId: activeChain.id, watch: true, query: { enabled: mounted } });
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()) as Promise<{ clips: number; agents: number; verified: number; launches: number }>,
    refetchInterval: 60_000,
  });
  const markets = useQuery({
    queryKey: ["markets"],
    queryFn: () => fetch("/api/markets").then((r) => r.json()).then((j) => j.markets as { symbol: string; name: string }[]),
  });
  const s = stats.data;
  const base: [string, string, string][] = [
    ["BLK", activeChain.id === 56 ? "BSC block" : "BSC testnet block", block.data ? `#${block.data.toLocaleString()}` : "…"],
    ["CLP", "Clips published", s ? fmtNum(s.clips, 0) : "…"],
    ["AGT", "Agents", s ? fmtNum(s.agents, 0) : "…"],
    ["AID", "Verified Agent IDs", s ? fmtNum(s.verified, 0) : "…"],
    ["LCH", "Confirmed launches", s ? fmtNum(s.launches, 0) : "…"],
    ["FEE", "Sniply trading fee", "0%"],
    ...(markets.data ?? []).slice(0, 8).map((m) => [m.symbol, m.name, "Live"] as [string, string, string]),
  ];
  // Repeat so the strip is always full, then duplicate for a seamless loop.
  const items = Array.from({ length: Math.max(2, Math.ceil(12 / base.length)) }, () => base).flat();
  const row = (k: string) => (
    <div className="flex shrink-0 items-center" aria-hidden={k === "b"}>
      {items.map(([sym, label, fig], i) => (
        <span key={`${k}${i}`} className="flex items-center gap-2 px-4 text-[12px]">
          <span className="font-mono font-semibold text-paper">{sym}</span>
          <span className="text-paper/60">{label}</span>
          <span className="font-mono tabular-nums text-paper">{fig}</span>
          <span className="ml-4 size-[3px] rounded-full bg-paper/40" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee-wrap h-[var(--ticker-h)] overflow-hidden bg-ink" aria-label="Live platform figures">
      <div className="marquee h-full items-center">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
