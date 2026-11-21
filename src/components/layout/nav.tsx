"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ConnectButton } from "@/components/web3/connect-button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/agents", label: "Agents" },
  { href: "/studio", label: "Create" },
  { href: "/markets", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Nav() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  // Studio + explore have their own full-bleed chrome
  if (pathname.startsWith("/studio") || pathname.startsWith("/admin")) return null;

  const active = links.find((l) => pathname.startsWith(l.href))?.href;

  return (
    <>
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 md:pt-4"
      >
        <nav
          className={cn(
            "flex w-full max-w-6xl items-center justify-between rounded-full border px-2 py-1.5 pl-4 transition-all duration-500",
            scrolled
              ? "border-line-strong bg-ink/70 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              : "border-transparent bg-transparent",
          )}
        >
          <Link href="/" aria-label="Sniply home">
            <Logo />
          </Link>

          <div className="hidden items-center md:flex" onMouseLeave={() => setHover(null)}>
            {links.map((l) => {
              const on = (hover ?? active) === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onMouseEnter={() => setHover(l.href)}
                  className={cn(
                    "relative px-4 py-2 text-[13.5px] transition-colors",
                    active === l.href || hover === l.href ? "text-white" : "text-muted",
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.07]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                  {active === l.href && (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-pink"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ConnectButton className="hidden sm:block" />
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center rounded-full bg-white/[0.06] md:hidden"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <Logo />
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="grid size-10 place-items-center rounded-full bg-white/[0.06]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-10 flex flex-col px-5">
              {[{ href: "/", label: "Home" }, ...links].map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between border-b border-line py-5 text-3xl font-medium tracking-tight"
                  >
                    {l.label}
                    {active === l.href && <span className="size-2 rounded-full bg-pink" />}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-8">
                <ConnectButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
