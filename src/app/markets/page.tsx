"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { formatUnits, type Address } from "viem";
import { BadgeCheck, CandlestickChart, ExternalLink } from "lucide-react";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { erc20Abi, pancakeFactoryAbi } from "@/lib/abis";
import { explorerBase, PANCAKE_V2 } from "@/lib/chain-config";
import type { PublicClip, TokenLaunch } from "@/lib/types";
import { fmtNum, shortAddr, timeAgo } from "@/lib/utils";

type Market = TokenLaunch & { clip: PublicClip | null };

export default function Markets() {
  const q = useQuery({ queryKey: ["markets"], queryFn: () => fetch("/api/markets").then((r) => r.json()).then((j) => j.markets as Market[]) });
  return (
    <>
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32">
        <PageHeader
          eyebrow="Markets"
          title={<>Every market here was <span className="text-brand">confirmed on-chain.</span></>}
          sub="Only tokens whose launch transaction Sniply verified on BNB Chain are listed. Supply and liquidity are read live from the chain; nothing is estimated or padded."
        />
        <div className="mb-6 rounded-2xl border border-line bg-surface/60 px-4 py-3 text-xs leading-relaxed text-dim">
          Tokens are highly speculative and can go to zero. Agent reputation reflects clip activity, not token quality. Sniply doesn’t give investment advice.
        </div>
        {q.isLoading ? (
          <Skeleton className="h-64 rounded-3xl" />
        ) : !q.data?.length ? (
          <EmptyState
            icon={<CandlestickChart className="size-6" />}
            title="No confirmed markets yet"
            body="A market appears only after a creator launches a token for a published clip and the transaction is confirmed on BNB Chain."
            action={<Link href="/studio/clips?tab=published" className={buttonClass("primary", "md")}>Launch from a clip</Link>}
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_1fr] gap-4 border-b border-line px-5 py-3 text-xs text-dim md:grid">
              <span>Token</span><span>Agent</span><span>Supply</span><span>Liquidity</span><span>Launched</span>
            </div>
            {q.data.map((m) => <MarketRow key={m.id} m={m} />)}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function MarketRow({ m }: { m: Market }) {
  const pc = PANCAKE_V2[(m.chainId in PANCAKE_V2 ? m.chainId : 97) as keyof typeof PANCAKE_V2];
  const reads = useReadContracts({
    contracts: [
      { address: m.tokenAddress as Address, abi: erc20Abi, functionName: "totalSupply", chainId: m.chainId },
      { address: m.tokenAddress as Address, abi: erc20Abi, functionName: "decimals", chainId: m.chainId },
      { address: pc.factory, abi: pancakeFactoryAbi, functionName: "getPair", args: [m.tokenAddress as Address, pc.wrappedNative], chainId: m.chainId },
    ],
  });
  const supply = reads.data?.[0]?.result as bigint | undefined;
  const dec = reads.data?.[1]?.result as number | undefined;
  const pair = reads.data?.[2]?.result as Address | undefined;
  const hasPool = pair && pair !== "0x0000000000000000000000000000000000000000";
  return (
    <Link href={`/market/${m.tokenAddress}`} className="grid grid-cols-2 items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-white/[0.02] md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr]">
      <div className="flex items-center gap-3">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.clip?.thumbnailUrl ? <img src={m.clip.thumbnailUrl} alt="" className="size-full object-cover" /> : <span className="bg-brand grid size-full place-items-center font-bold">{m.symbol[0]}</span>}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{m.name}</p>
          <p className="font-mono text-xs text-muted">${m.symbol}</p>
        </div>
      </div>
      <div className="text-right text-sm md:text-left">
        {m.clip?.agent ? <span className="inline-flex items-center gap-1">{m.clip.agent.name}{m.clip.agent.verified && <BadgeCheck className="size-3.5 text-[#7e9bff]" />}</span> : <span className="text-dim">—</span>}
      </div>
      <span className="text-sm tabular-nums text-muted">{supply !== undefined && dec !== undefined ? fmtNum(Number(formatUnits(supply, dec))) : "…"}</span>
      <span className="text-sm text-muted">{reads.isLoading ? "…" : hasPool ? "Pool live" : "No pool"}</span>
      <span className="flex items-center gap-1.5 text-sm text-muted">
        {timeAgo(m.confirmedAt)}
        <a onClick={(e) => e.stopPropagation()} href={`${explorerBase(m.chainId)}/token/${m.tokenAddress}`} target="_blank" rel="noreferrer" aria-label="Explorer" className="hidden md:inline"><ExternalLink className="size-3.5" /></a>
      </span>
      <span className="col-span-2 font-mono text-[10.5px] text-dim md:hidden">{shortAddr(m.tokenAddress, 6)}</span>
    </Link>
  );
}
