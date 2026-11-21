"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress } from "viem";
import { Coins, Film, UserRound } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { ClipCard } from "@/components/clip-card";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { Footer } from "@/components/layout/footer";
import { useSession } from "@/components/web3/use-session";
import type { PublicAgent, PublicClip, TokenLaunch } from "@/lib/types";
import { shortAddr, timeAgo } from "@/lib/utils";
import Link from "next/link";

export default function Profile({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = use(params);
  const { user: me } = useSession();
  const q = useQuery({ enabled: isAddress(wallet), queryKey: ["profile", wallet.toLowerCase()], queryFn: () => fetch(`/api/users/${wallet}`).then((r) => r.json()) as Promise<{ user: { wallet: string; username: string | null; bio: string | null; createdAt: string } | null; agents: PublicAgent[]; clips: PublicClip[]; launches: TokenLaunch[] }> });
  const isMe = me?.wallet === wallet.toLowerCase();
  return (
    <>
      <main className="mx-auto max-w-[1200px] px-4 md:px-6 pb-24 pt-8 md:pt-12">
        {q.isLoading ? <Skeleton className="h-40 rounded-[14px]" /> : !q.data?.user ? (
          <EmptyState icon={<UserRound className="size-6" />} title="No Sniply profile" body={`${shortAddr(wallet, 6)} hasn’t signed in to Sniply yet.`} />
        ) : (
          <>
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="display grid size-20 place-items-center rounded-full border border-line-2 bg-surface-3 text-[40px] text-text">{(q.data.user.username ?? q.data.user.wallet.slice(2)).charAt(0).toUpperCase()}</div>
              <div className="flex-1">
                <h1 className="display text-[clamp(36px,4.6vw,52px)]">{q.data.user.username ?? shortAddr(q.data.user.wallet, 6)}</h1>
                <p className="mt-1 font-mono text-xs text-muted">{q.data.user.wallet} · signature-verified · joined {timeAgo(q.data.user.createdAt)}</p>
                {q.data.user.bio && <p className="mt-3 max-w-xl text-sm text-muted">{q.data.user.bio}</p>}
              </div>
              {isMe && <Link href="/studio/settings" className="text-sm text-muted hover:text-text">Edit profile</Link>}
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[["Agents", q.data.agents.length], ["Published clips", q.data.clips.length], ["Confirmed launches", q.data.launches.length]].map(([k, v]) => (
                <div key={k as string} className="rounded-[14px] border border-line bg-surface p-5"><p className="text-3xl font-semibold">{v}</p><p className="text-xs text-dim">{k}</p></div>
              ))}
            </div>
            {q.data.agents.length > 0 && (
              <section className="mt-12"><h2 className="text-lg font-semibold">Agents</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{q.data.agents.map((a) => <AgentCard key={a.id} agent={a} />)}</div></section>
            )}
            <section className="mt-12">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Film className="size-4" /> Clips</h2>
              {q.data.clips.length ? <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{q.data.clips.map((c) => <ClipCard key={c.id} clip={c} />)}</div> : <p className="mt-4 text-sm text-muted">No published clips.</p>}
            </section>
            {q.data.launches.length > 0 && (
              <section className="mt-12">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Coins className="size-4" /> Launched tokens</h2>
                <div className="mt-4 space-y-2">{q.data.launches.map((l) => <Link key={l.id} href={`/market/${l.tokenAddress}`} className="flex justify-between rounded-[14px] border border-line bg-surface p-4 hover:border-line-2"><span>{l.name} <span className="font-mono text-muted">${l.symbol}</span></span><span className="font-mono text-xs text-dim">{shortAddr(l.tokenAddress)}</span></Link>)}</div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
