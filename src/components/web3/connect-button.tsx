"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Wallet, LogOut, ShieldCheck, ChevronDown, AlertTriangle, User } from "lucide-react";
import Link from "next/link";
import { activeChain } from "@/lib/chain-config";
import { cn, shortAddr } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { useSession, useSignIn } from "./use-session";

export function ConnectButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { user } = useSession();
  const { signIn, signOut, pending: signing, error: signError } = useSignIn();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!mounted) return <div className={cn("h-9 w-36 rounded-full bg-white/5", className)} />;

  const wrongChain = isConnected && chainId !== activeChain.id;
  const authed = user && address && user.wallet.toLowerCase() === address.toLowerCase();

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          buttonClass(isConnected ? "secondary" : "primary", "sm"),
          "h-9 gap-2 pl-3 pr-3",
        )}
      >
        {isConnected ? (
          <>
            <span className={cn("size-2 rounded-full", authed ? "bg-ok" : wrongChain ? "bg-warn" : "bg-muted")} />
            <span className="font-mono text-xs">{shortAddr(address)}</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </>
        ) : (
          <>
            <Wallet className="size-4" /> Connect Wallet
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-[10px] border border-line-strong bg-surface/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {!isConnected ? (
              <div className="space-y-1">
                <p className="px-3 pb-1 pt-2 text-xs text-dim">Choose a wallet</p>
                {connectors.map((c) => (
                  <button
                    key={c.uid}
                    disabled={isPending}
                    onClick={() => connect({ connector: c, chainId: activeChain.id })}
                    className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-left text-sm hover:bg-white/5"
                  >
                    <span className="grid size-8 place-items-center rounded-[6px] bg-white/5">
                      <Wallet className="size-4" />
                    </span>
                    <span>
                      {c.name === "Injected" ? "Browser wallet" : c.name}
                      <span className="block text-[11px] text-dim">
                        {c.type === "injected" ? "Binance Wallet, MetaMask, Rabby…" : "Scan with mobile wallet"}
                      </span>
                    </span>
                  </button>
                ))}
                {connectError && <p className="px-3 py-2 text-xs text-bad">{connectError.message.split("\n")[0]}</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-3 pb-2 pt-2">
                  <p className="font-mono text-xs text-muted">{shortAddr(address, 6)}</p>
                  <p className="mt-1 text-[11px] text-dim">
                    {authed ? "Signed in · wallet ownership verified" : "Connected · not signed in"}
                  </p>
                </div>
                {wrongChain && (
                  <button
                    onClick={() => switchChain({ chainId: activeChain.id })}
                    className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2.5 text-sm text-warn hover:bg-white/5"
                  >
                    <AlertTriangle className="size-4" /> Switch to {activeChain.name}
                  </button>
                )}
                {!authed && (
                  <button
                    onClick={signIn}
                    disabled={signing}
                    className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2.5 text-sm hover:bg-white/5"
                  >
                    <ShieldCheck className="size-4 text-pink" /> {signing ? "Check your wallet…" : "Sign in with wallet"}
                  </button>
                )}
                {signError && <p className="px-3 py-1 text-xs text-bad">{signError}</p>}
                {authed && (
                  <Link
                    href={`/profile/${address}`}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2.5 text-sm hover:bg-white/5"
                  >
                    <User className="size-4" /> My profile
                  </Link>
                )}
                <button
                  onClick={async () => {
                    if (authed) await signOut();
                    disconnect();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-white"
                >
                  <LogOut className="size-4" /> Disconnect
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
