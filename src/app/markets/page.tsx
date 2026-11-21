"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { formatUnits, type Address } from "viem";
import { CandlestickChart } from "lucide-react";
import { Badge, Board, EmptyState, Note, PageHeader, Skeleton } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { erc20Abi, pancakeFactoryAbi } from "@/lib/abis";
import { PANCAKE_V2 } from "@/lib/chain-config";
import type { PublicClip, TokenLaunch } from "@/lib/types";
import { fmtNum, timeAgo } from "@/lib/utils";

type Market = TokenLaunch & { clip: PublicClip | null };
const ZERO = "0x0000000000000000000000000000000000000000";

function useMarketReads(m: Market) {
  const pc = PANCAKE_V2[(m.chainId in PANCAKE_V2 ? m.chainId : 97) as keyof typeof PANCAKE_V2];
  const r = useReadContracts({
    contracts: [
      { address: m.tokenAddress as Address, abi: erc20Abi, functionName: "totalSupply", chainId: m.chainId },
      { address: m.tokenAddress as Address, abi: erc20Abi, functionName: "decimals", chainId: m.chainId },
      { address: pc.factory, abi: pancakeFactoryAbi, functionName: "getPair", args: [m.tokenAddress as Address, pc.wrappedNative], chainId: m.chainId },
    ],
  });
  return {
    loading: r.isLoading,
    supply: r.data?.[0]?.result as bigint | undefined,
    decimals: r.data?.[1]?.result as number | undefined,
    pair: r.data?.[2]?.result as Address | undefined,
  };
}

function SupplyCell({ m }: { m: Market }) {
  const { supply, decimals } = useMarketReads(m);
  return <>{supply !== undefined && decimals !== undefined ? fmtNum(Number(formatUnits(supply, decimals))) : "…"}</>;
}
function PoolCell({ m }: { m: Market }) {
  const { loading, pair } = useMarketReads(m);
  if (loading) return <span className="text-muted">…</span>;
  return pair && pair !== ZERO ? <Badge tone="ok">Pool live</Badge> : <Badge>No pool</Badge>;
}

export default function Markets() {
  const q = useQuery({ queryKey: ["markets"], queryFn: () => fetch("/api/markets").then((r) => r.json()).then((j) => j.markets as Market[]) });
  return (
    <>
      <main className="mx-auto max-w-[1200px] px-4 pt-12 md:px-6 md:pt-16">
        <PageHeader
          eyebrow="Markets"
          title="Every market listed here"
          accent="was confirmed on-chain."
          sub="Only tokens whose launch transaction Sniply verified on BNB Chain are listed. Supply and liquidity are read live from the chain. Nothing is estimated or padded."
        />
        <Note tone="warn" className="mb-6">
          Tokens are highly speculative and can go to zero. Agent reputation reflects clip activity, not token quality. Sniply does not give investment advice.
        </Note>
        {q.isLoading ? (
          <Skeleton className="h-64" />
        ) : !q.data?.length ? (
          <EmptyState
            icon={<CandlestickChart className="size-5" />}
            title="No confirmed markets yet"
            body="A market appears only after a creator launches a token for a published clip and the transaction is confirmed on BNB Chain."
            action={<Link href="/studio/clips?tab=published" className={buttonClass("primary", "md")}>Launch from a clip</Link>}
          />
        ) : (
          <Board
            columns={[
              { key: "token", label: "Token" },
              { key: "pool", label: "Status" },
              { key: "supply", label: "Supply", align: "right" },
              { key: "chain", label: "Chain", align: "right" },
              { key: "launched", label: "Launched", align: "right" },
            ]}
            rows={q.data.map((m) => ({
              key: m.id,
              href: `/market/${m.tokenAddress}`,
              cells: {
                token: (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-line-2 bg-surface-3">
                      {m.clip?.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.clip.thumbnailUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="display grid size-full place-items-center text-[20px] text-text">{m.symbol[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-baseline gap-2">
                        <span className="truncate font-semibold text-text">{m.name}</span>
                        <span className="font-mono text-[12px] text-muted">${m.symbol}</span>
                      </p>
                      <p className="truncate text-[13px] text-muted">{m.clip?.agent ? `${m.clip.agent.name}${m.clip.agent.verified ? " · verified" : ""}` : m.clip?.title ?? "Clip removed"}</p>
                    </div>
                  </div>
                ),
                pool: <PoolCell m={m} />,
                supply: <SupplyCell m={m} />,
                chain: m.chainId === 56 ? "BSC" : "BSC testnet",
                launched: timeAgo(m.confirmedAt),
              },
            }))}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
