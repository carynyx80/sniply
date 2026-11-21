"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance, usePublicClient, useReadContract, useReadContracts, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther, formatUnits, getAddress, isAddress, parseEther, parseUnits, type Address } from "viem";
import { AlertTriangle, BadgeCheck, Check, Copy, ExternalLink, Loader2, Settings2 } from "lucide-react";
import { Badge, Card, EmptyState, Note, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/web3/connect-button";
import { Footer } from "@/components/layout/footer";
import { erc20Abi, pancakeFactoryAbi, pancakePairAbi, pancakeRouterAbi } from "@/lib/abis";
import { activeChain, DEFAULT_SLIPPAGE_BPS, explorerBase, MAX_SLIPPAGE_BPS, PANCAKE_V2 } from "@/lib/chain-config";
import { minOut, priceImpact, spotPrice } from "@/lib/trade-math";
import type { PublicClip, TokenLaunch } from "@/lib/types";
import { cn, fmtNum, shortAddr } from "@/lib/utils";

type Market = TokenLaunch & { clip: PublicClip | null };
const ZERO = "0x0000000000000000000000000000000000000000";

export default function MarketPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = use(params);
  const valid = isAddress(raw);
  const token = valid ? getAddress(raw) : undefined;
  const markets = useQuery({ queryKey: ["markets"], queryFn: () => fetch("/api/markets").then((r) => r.json()).then((j) => j.markets as Market[]) });
  const m = markets.data?.find((x) => x.tokenAddress.toLowerCase() === raw.toLowerCase());
  const chainId = m?.chainId ?? activeChain.id;
  const pc = PANCAKE_V2[chainId as keyof typeof PANCAKE_V2];

  const meta = useReadContracts({
    query: { enabled: !!token },
    contracts: token
      ? [
          { address: token, abi: erc20Abi, functionName: "name", chainId },
          { address: token, abi: erc20Abi, functionName: "symbol", chainId },
          { address: token, abi: erc20Abi, functionName: "decimals", chainId },
          { address: token, abi: erc20Abi, functionName: "totalSupply", chainId },
          { address: pc.factory, abi: pancakeFactoryAbi, functionName: "getPair", args: [token, pc.wrappedNative], chainId },
        ]
      : [],
  });
  const [name, symbol, decimals, supply, pair] = (meta.data ?? []).map((r) => r.result) as [string?, string?, number?, bigint?, Address?];
  const hasPool = !!pair && pair !== ZERO;

  const pool = useReadContracts({
    query: { enabled: hasPool, refetchInterval: 15_000 },
    contracts: hasPool ? [{ address: pair!, abi: pancakePairAbi, functionName: "getReserves", chainId }, { address: pair!, abi: pancakePairAbi, functionName: "token0", chainId }] : [],
  });
  const reserves = pool.data?.[0]?.result as readonly [bigint, bigint, number] | undefined;
  const token0 = pool.data?.[1]?.result as Address | undefined;
  const [rToken, rNative] = reserves && token0 && token ? (getAddress(token0) === token ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]]) : [undefined, undefined];
  const price = rToken !== undefined && rNative !== undefined && decimals !== undefined ? spotPrice(rToken, rNative, decimals) : undefined;
  const fdv = price !== undefined && supply !== undefined && decimals !== undefined ? price * Number(formatUnits(supply, decimals)) : undefined;

  const client = usePublicClient({ chainId });
  const swaps = useQuery({
    enabled: hasPool && !!client && !!token0 && decimals !== undefined,
    queryKey: ["swaps", pair],
    refetchInterval: 20_000,
    queryFn: async () => {
      const latest = await client!.getBlockNumber();
      const logs = await client!.getContractEvents({ address: pair!, abi: pancakePairAbi, eventName: "Swap", fromBlock: latest > BigInt(4900) ? latest - BigInt(4900) : BigInt(0), toBlock: latest });
      const tIs0 = getAddress(token0!) === token;
      return logs.slice(-60).reverse().map((l) => {
        const a = l.args as { amount0In: bigint; amount1In: bigint; amount0Out: bigint; amount1Out: bigint; to: Address };
        const tokIn = tIs0 ? a.amount0In : a.amount1In;
        const tokOut = tIs0 ? a.amount0Out : a.amount1Out;
        const natIn = tIs0 ? a.amount1In : a.amount0In;
        const natOut = tIs0 ? a.amount1Out : a.amount0Out;
        const buy = tokOut > BigInt(0);
        const tok = Number(formatUnits(buy ? tokOut : tokIn, decimals!));
        const nat = Number(formatEther(buy ? natIn : natOut));
        return { hash: l.transactionHash, block: l.blockNumber, buy, tok, nat, px: tok ? nat / tok : 0, to: a.to };
      });
    },
  });

  if (!valid) return <main className="mx-auto max-w-xl px-4 pt-40"><EmptyState icon={<AlertTriangle className="size-6" />} title="Invalid address" body="That isn’t a valid contract address." /></main>;

  return (
    <>
      <main className="mx-auto max-w-[1200px] px-4 md:px-6 pb-24 pt-8 md:pt-12">
        {markets.isFetched && !m && (
          <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-warn/30 bg-warn/[0.06] p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
            <p className="text-muted"><span className="text-warn">Not a Sniply-verified launch.</span> We have no confirmed launch record for this contract, so trading is disabled here. Check the address carefully.</p>
          </div>
        )}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <span className="bg-ink text-paper grid size-14 place-items-center rounded-[14px] text-xl font-bold">{(symbol ?? "?")[0]}</span>
            <div>
              <h1 className="display text-[clamp(36px,4.6vw,52px)]">{name ?? (meta.isLoading ? "…" : "Unknown token")}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                <span className="font-mono">${symbol ?? "—"}</span>
                <CopyAddr addr={token!} />
                <a href={`${explorerBase(chainId)}/token/${token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-text">Explorer <ExternalLink className="size-3" /></a>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="display text-[40px] leading-none tabular-nums">{price !== undefined ? `${price.toPrecision(4)} ${activeChain.nativeCurrency.symbol}` : "—"}</p>
            <p className="text-xs text-dim">Spot price from pool reserves · on-chain</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <Card className="overflow-hidden">
                <div className="aspect-[9/16] bg-surface-2">
                  {m?.clip ? <video src={`${m.clip.videoUrl}#t=${m.clip.startSec}`} poster={m.clip.thumbnailUrl ?? undefined} muted playsInline controls className="size-full object-cover" /> : <div className="grid size-full place-items-center text-xs text-dim">No clip</div>}
                </div>
              </Card>
              <Card className="p-5">
                <PriceChart points={(swaps.data ?? []).slice().reverse().map((s) => s.px)} loading={swaps.isLoading && hasPool} hasPool={hasPool} />
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Total supply", supply !== undefined && decimals !== undefined ? fmtNum(Number(formatUnits(supply, decimals))) : "—"],
                ["Pool liquidity", rNative !== undefined ? `${(2 * Number(formatEther(rNative))).toFixed(2)} ${activeChain.nativeCurrency.symbol}` : hasPool ? "…" : "No pool"],
                ["FDV", fdv !== undefined ? `${fmtNum(fdv, 2)} ${activeChain.nativeCurrency.symbol}` : "—"],
                ["Swaps (≈4h)", swaps.data ? String(swaps.data.length) : "—"],
              ].map(([k, v]) => (
                <Card key={k} className="p-4">
                  <p className="text-[11px] text-dim">{k}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{v}</p>
                </Card>
              ))}
            </div>
            <p className="text-[11px] text-dim">USD values need a price oracle or indexer (e.g. Bitquery/Codex). Until one is configured, values are in {activeChain.nativeCurrency.symbol}.</p>

            <Card className="p-5">
              <h2 className="text-sm font-semibold">Recent transactions</h2>
              {!hasPool ? (
                <p className="mt-3 text-sm text-muted">No PancakeSwap pool exists for this token yet.</p>
              ) : swaps.isLoading ? (
                <Skeleton className="mt-3 h-24" />
              ) : !swaps.data?.length ? (
                <p className="mt-3 text-sm text-muted">No swaps in the last ~4,900 blocks.</p>
              ) : (
                <div className="mt-3 divide-y divide-line text-sm">
                  {swaps.data.slice(0, 15).map((s) => (
                    <a key={s.hash + s.tok} href={`${explorerBase(chainId)}/tx/${s.hash}`} target="_blank" rel="noreferrer" className="grid grid-cols-[60px_1fr_1fr_90px] gap-2 py-2.5 hover:bg-surface-2">
                      <span className={s.buy ? "text-ok" : "text-bad"}>{s.buy ? "Buy" : "Sell"}</span>
                      <span className="tabular-nums">{fmtNum(s.tok)} {symbol}</span>
                      <span className="tabular-nums text-muted">{s.nat.toFixed(4)} {activeChain.nativeCurrency.symbol}</span>
                      <span className="text-right font-mono text-xs text-dim">{shortAddr(s.to)}</span>
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <TradePanel token={token!} symbol={symbol} decimals={decimals} hasPool={hasPool} enabled={!!m} reserveToken={rToken} reserveNative={rNative} chainId={chainId} />
            <Card className="space-y-3 p-5 text-sm">
              <h3 className="font-semibold">About</h3>
              {m?.clip ? <p className="text-muted">{m.clip.title}</p> : null}
              <dl className="space-y-2">
                {m?.clip?.agent && (
                  <div className="flex justify-between gap-3"><dt className="text-dim">Agent</dt><dd><Link href={`/agent/${m.clip.agent.slug}`} className="inline-flex items-center gap-1 hover:text-text">{m.clip.agent.name}{m.clip.agent.verified && <BadgeCheck className="size-3.5 text-accent" />}</Link></dd></div>
                )}
                {m?.clip && <div className="flex justify-between gap-3"><dt className="text-dim">Creator</dt><dd><Link href={`/profile/${m.clip.creatorWallet}`} className="font-mono text-xs hover:text-text">{shortAddr(m.clip.creatorWallet)}</Link></dd></div>}
                {m && <div className="flex justify-between gap-3"><dt className="text-dim">Launch tx</dt><dd><a href={`${explorerBase(chainId)}/tx/${m.txHash}`} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-text">{shortAddr(m.txHash, 6)}</a></dd></div>}
                {m && <div className="flex justify-between gap-3"><dt className="text-dim">Block</dt><dd className="font-mono text-xs">{m.blockNumber}</dd></div>}
              </dl>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CopyAddr({ addr }: { addr: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(addr); setOk(true); setTimeout(() => setOk(false), 1200); }} className="inline-flex items-center gap-1 font-mono text-xs hover:text-text">
      {shortAddr(addr, 5)} {ok ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
    </button>
  );
}

function PriceChart({ points, loading, hasPool }: { points: number[]; loading: boolean; hasPool: boolean }) {
  const d = useMemo(() => {
    if (points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || max || 1;
    return points.map((p, i) => `${(i / (points.length - 1)) * 100},${38 - ((p - min) / span) * 34}`).join(" ");
  }, [points]);
  const up = points.length > 1 && points[points.length - 1] >= points[0];
  return (
    <div className="flex h-full min-h-56 flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Price · from swap events</p>
        {points.length > 1 && <Badge tone={up ? "ok" : "bad"}>{(((points[points.length - 1] - points[0]) / (points[0] || 1)) * 100).toFixed(1)}%</Badge>}
      </div>
      <div className="relative mt-4 flex-1">
        {loading ? <Skeleton className="absolute inset-0" /> : d ? (
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 size-full">
            <polygon points={`0,40 ${d} 100,40`} fill="var(--accent-soft)" />
            <polyline points={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <div className="absolute inset-0 grid place-items-center rounded-[8px] border border-dashed border-line-2 text-center text-xs text-dim">{hasPool ? "Not enough recent swaps to chart" : "No liquidity pool yet"}</div>
        )}
      </div>
    </div>
  );
}

function TradePanel({ token, symbol, decimals, hasPool, enabled, reserveToken, reserveNative, chainId }: { token: Address; symbol?: string; decimals?: number; hasPool: boolean; enabled: boolean; reserveToken?: bigint; reserveNative?: bigint; chainId: number }) {
  const pc = PANCAKE_V2[chainId as keyof typeof PANCAKE_V2];
  const { address, isConnected, chainId: walletChain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slip, setSlip] = useState(DEFAULT_SLIPPAGE_BPS);
  const [showSlip, setShowSlip] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const native = useBalance({ address, chainId });
  const tokBal = useReadContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId, query: { enabled: !!address } });
  const allowance = useReadContract({ address: token, abi: erc20Abi, functionName: "allowance", args: address ? [address, pc.router] : undefined, chainId, query: { enabled: !!address } });

  const amountIn = useMemo(() => {
    try {
      if (!amount || Number(amount) <= 0) return undefined;
      return side === "buy" ? parseEther(amount) : decimals !== undefined ? parseUnits(amount, decimals) : undefined;
    } catch {
      return undefined;
    }
  }, [amount, side, decimals]);
  const path = side === "buy" ? [pc.wrappedNative, token] : [token, pc.wrappedNative];
  const quote = useReadContract({ address: pc.router, abi: pancakeRouterAbi, functionName: "getAmountsOut", args: amountIn ? [amountIn, path] : undefined, chainId, query: { enabled: !!amountIn && hasPool, refetchInterval: 10_000 } });
  const out = (quote.data as readonly bigint[] | undefined)?.[1];
  const impact = amountIn && (side === "buy" ? reserveNative : reserveToken) ? priceImpact(amountIn, (side === "buy" ? reserveNative : reserveToken)!) : undefined;

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const receipt = useWaitForTransactionReceipt({ hash, chainId });
  const needsApproval = side === "sell" && amountIn !== undefined && (allowance.data ?? BigInt(0)) < amountIn;
  const insufficient = amountIn !== undefined && (side === "buy" ? native.data && native.data.value < amountIn : tokBal.data !== undefined && (tokBal.data as bigint) < amountIn);

  const submit = async () => {
    if (!address || !amountIn || !out) return;
    setErr(null);
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const min = minOut(out, slip);
      if (side === "buy") {
        setHash(await writeContractAsync({ address: pc.router, abi: pancakeRouterAbi, functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens", args: [min, path, address, deadline], value: amountIn, chainId }));
      } else if (needsApproval) {
        // exact-amount approval — never unlimited
        const h = await writeContractAsync({ address: token, abi: erc20Abi, functionName: "approve", args: [pc.router, amountIn], chainId });
        setHash(h);
      } else {
        setHash(await writeContractAsync({ address: pc.router, abi: pancakeRouterAbi, functionName: "swapExactTokensForETHSupportingFeeOnTransferTokens", args: [amountIn, min, path, address, deadline], chainId }));
      }
    } catch (e) {
      setErr((e as Error).message.split("\n")[0]);
    }
  };

  if (receipt.isSuccess && hash) {
    setTimeout(() => { allowance.refetch(); tokBal.refetch(); native.refetch(); }, 0);
  }

  const disabledReason = !enabled ? "Trading disabled for unverified tokens" : !hasPool ? "No liquidity pool on PancakeSwap" : null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex rounded-full border border-line bg-surface-2 p-1 text-sm">
          {(["buy", "sell"] as const).map((s) => (
            <button key={s} onClick={() => { setSide(s); setAmount(""); setHash(undefined); }} className={cn("rounded-full px-5 py-1.5 capitalize", side === s ? (s === "buy" ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad") : "text-muted")}>{s}</button>
          ))}
        </div>
        <button onClick={() => setShowSlip((v) => !v)} className="flex items-center gap-1 text-xs text-muted hover:text-text"><Settings2 className="size-3.5" /> {(slip / 100).toFixed(1)}%</button>
      </div>
      {showSlip && (
        <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-line bg-surface-2 p-2">
          {[50, 100, 300].map((b) => <button key={b} onClick={() => setSlip(b)} className={cn("rounded-lg px-2.5 py-1 text-xs", slip === b ? "bg-surface-3" : "text-muted")}>{b / 100}%</button>)}
          <input type="number" min={0.1} max={MAX_SLIPPAGE_BPS / 100} step={0.1} value={slip / 100} onChange={(e) => setSlip(Math.min(MAX_SLIPPAGE_BPS, Math.max(10, Math.round(Number(e.target.value) * 100))))} className="w-16 bg-transparent text-right text-xs outline-none" />
          <span className="text-xs text-dim">% max slippage</span>
        </div>
      )}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-dim">
          <span>You pay</span>
          <span>Balance: {side === "buy" ? (native.data ? Number(formatEther(native.data.value)).toFixed(4) : "—") : tokBal.data !== undefined && decimals !== undefined ? fmtNum(Number(formatUnits(tokBal.data as bigint, decimals))) : "—"}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 rounded-[14px] border border-line bg-surface-2 px-4 py-3 focus-within:border-accent/50">
          <input inputMode="decimal" className="w-full bg-transparent text-2xl font-semibold tabular-nums outline-none placeholder:text-dim" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
          <span className="shrink-0 font-mono text-sm text-muted">{side === "buy" ? activeChain.nativeCurrency.symbol : symbol}</span>
        </div>
        <div className="mt-3 space-y-1.5 rounded-[8px] bg-surface-2 p-3 text-xs">
          <div className="flex justify-between"><span className="text-dim">Expected out (quote)</span><span className="tabular-nums">{out !== undefined ? (side === "buy" && decimals !== undefined ? `${fmtNum(Number(formatUnits(out, decimals)))} ${symbol}` : `${Number(formatEther(out)).toFixed(6)} ${activeChain.nativeCurrency.symbol}`) : quote.isLoading ? "…" : "—"}</span></div>
          <div className="flex justify-between"><span className="text-dim">Minimum received</span><span className="tabular-nums">{out !== undefined ? (side === "buy" && decimals !== undefined ? fmtNum(Number(formatUnits(minOut(out, slip), decimals))) : Number(formatEther(minOut(out, slip))).toFixed(6)) : "—"}</span></div>
          <div className="flex justify-between"><span className="text-dim">Price impact</span><span className={cn(impact !== undefined && impact > 0.05 && "text-warn")}>{impact !== undefined ? `${(impact * 100).toFixed(2)}%` : "—"}</span></div>
          <div className="flex justify-between"><span className="text-dim">Fees</span><span>0.25% LP fee + network gas · no Sniply fee</span></div>
          <div className="flex justify-between"><span className="text-dim">Route</span><span className="font-mono">PancakeSwap V2 router {shortAddr(pc.router)}</span></div>
        </div>
      </div>
      {err && <p className="mt-3 text-xs text-bad">{err}</p>}
      {hash && (
        <p className="mt-3 flex items-center gap-2 text-xs">
          {receipt.isLoading ? <Loader2 className="size-3.5 animate-spin" /> : receipt.isSuccess ? <Check className="size-3.5 text-ok" /> : receipt.isError ? <AlertTriangle className="size-3.5 text-bad" /> : null}
          {receipt.isLoading ? "Waiting for confirmation" : receipt.isSuccess ? "Confirmed on-chain" : receipt.isError ? "Failed or reverted" : "Submitted"}
          <a href={`${explorerBase(chainId)}/tx/${hash}`} target="_blank" rel="noreferrer" className="ml-auto font-mono text-muted hover:text-text">{shortAddr(hash)}</a>
        </p>
      )}
      <div className="mt-4">
        {disabledReason ? (
          <Button className="w-full" size="lg" disabled>{disabledReason}</Button>
        ) : !isConnected ? (
          <ConnectButton className="[&>button]:w-full" />
        ) : walletChain !== chainId ? (
          <Button className="w-full" size="lg" onClick={() => switchChain({ chainId })}>Switch network</Button>
        ) : (
          <Button className="w-full" size="lg" onClick={submit} disabled={!out || isPending || !!insufficient || receipt.isLoading}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {insufficient ? "Insufficient balance" : needsApproval ? `Approve exactly ${amount} ${symbol}` : side === "buy" ? `Buy ${symbol ?? ""}` : `Sell ${symbol ?? ""}`}
          </Button>
        )}
      </div>
      {chainId === 56 && (
        <Note tone="warn" className="mt-3 text-[13px]">
          BNB Smart Chain mainnet: swaps spend real BNB and tokens from your own wallet, and confirmed transactions can’t be reversed.
        </Note>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-muted">Quotes come from the router on-chain and can change before your transaction confirms. Tokens can lose all value.</p>
    </Card>
  );
}
