"use client";

import { ShieldCheck } from "lucide-react";
import { useAccount } from "wagmi";
import { useSession, useSignIn } from "@/components/web3/use-session";
import { ConnectButton } from "@/components/web3/connect-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";

/** Gate: requires a wallet-signature session (an unsigned connected address is not enough). */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const { isConnected } = useAccount();
  const { signIn, pending, error } = useSignIn();
  if (loading) return <Skeleton className="h-64" />;
  if (user) return <>{children}</>;
  return (
    <div className="relative mx-auto mt-10 max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-8 text-center">
      <div className="bg-brand absolute -top-24 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
      <div className="relative mx-auto grid size-14 place-items-center rounded-2xl border border-line bg-ink">
        <ShieldCheck className="size-6 text-pink" />
      </div>
      <h2 className="relative mt-5 text-xl font-semibold tracking-tight">Sign in to open the Studio</h2>
      <p className="relative mt-2 text-sm leading-relaxed text-muted">
        Connect a wallet, then sign a free message to prove you own it. No transaction, no gas.
      </p>
      <div className="relative mt-6 flex justify-center">
        {isConnected ? <Button onClick={signIn} disabled={pending}>{pending ? "Check your wallet…" : "Sign in with wallet"}</Button> : <ConnectButton />}
      </div>
      {error && <p className="relative mt-3 text-xs text-bad">{error}</p>}
    </div>
  );
}
