"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { useCallback, useState } from "react";
import { activeChain } from "@/lib/chain-config";

export type SessionUser = {
  id: string;
  wallet: string;
  username: string | null;
  isAdmin: boolean;
};

export function useSession() {
  const q = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const r = await fetch("/api/auth/session");
      const j = await r.json();
      return (j.user ?? null) as SessionUser | null;
    },
  });
  return { user: q.data ?? null, loading: q.isLoading };
}

/** Wallet-signature authentication (EIP-4361 style message, verified server-side). */
export function useSignIn() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    if (!address) return;
    setPending(true);
    setError(null);
    try {
      const n = await fetch("/api/auth/nonce", { method: "POST" }).then((r) => r.json());
      const message = [
        `${window.location.host} wants you to sign in with your Ethereum account:`,
        address,
        "",
        "Sign in to Sniply. This request will not trigger a blockchain transaction or cost any gas.",
        "",
        `URI: ${window.location.origin}`,
        "Version: 1",
        `Chain ID: ${chainId ?? activeChain.id}`,
        `Nonce: ${n.nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join("\n");
      const signature = await signMessageAsync({ message });
      const r = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, message, signature }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Verification failed");
      await qc.invalidateQueries({ queryKey: ["session"] });
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }, [address, chainId, signMessageAsync, qc]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    await qc.invalidateQueries({ queryKey: ["session"] });
  }, [qc]);

  return { signIn, signOut, pending, error };
}
