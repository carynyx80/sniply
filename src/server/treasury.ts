import "server-only";
import { formatEther, formatUnits, parseAbi } from "viem";
import { clientFor } from "./chain";
import { isTreasuryAddress, parseTreasuryAddress, TREASURY_CHAIN_ID, TREASURY_WATCH_TOKENS } from "@/lib/treasury-config";

/**
 * Server-side treasury access. Read-only by construction: this module only uses a
 * viem PublicClient (no wallet client, no account, no private key). It cannot sign,
 * send or approve anything.
 */

export const treasury = parseTreasuryAddress(process.env.SNIPLY_TREASURY_ADDRESS);

export const isTreasury = (addr: string | null | undefined) => isTreasuryAddress(addr, treasury.address);

const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"]);

export type TreasuryStatus = {
  address: string;
  chainId: number;
  configSource: "env" | "default";
  connectivity: { ok: boolean; chainIdMatches: boolean; reportedChainId: number | null; latestBlock: string | null; latencyMs: number | null; error: string | null };
  account: { type: "eoa" | "contract" | "unknown"; nonce: number | null };
  balances: { symbol: string; amount: string; tokenAddress: string | null }[];
  checkedAt: string;
  capabilities: { canSign: false; canSpend: false; autoTransfers: false };
};

let cache: { at: number; value: TreasuryStatus } | null = null;

/** Verify BNB mainnet connectivity and read the treasury's public on-chain state. Cached 30s. */
export async function getTreasuryStatus(force = false): Promise<TreasuryStatus> {
  if (!force && cache && Date.now() - cache.at < 30_000) return cache.value;
  const base: TreasuryStatus = {
    address: treasury.address,
    chainId: TREASURY_CHAIN_ID,
    configSource: treasury.source,
    connectivity: { ok: false, chainIdMatches: false, reportedChainId: null, latestBlock: null, latencyMs: null, error: null },
    account: { type: "unknown", nonce: null },
    balances: [],
    checkedAt: new Date().toISOString(),
    capabilities: { canSign: false, canSpend: false, autoTransfers: false },
  };
  try {
    const c = clientFor(TREASURY_CHAIN_ID);
    const t0 = Date.now();
    const [chainId, block, code, bnb, nonce] = await Promise.all([
      c.getChainId(),
      c.getBlockNumber(),
      c.getCode({ address: treasury.address }),
      c.getBalance({ address: treasury.address }),
      c.getTransactionCount({ address: treasury.address }),
    ]);
    const latencyMs = Date.now() - t0;
    const tokens = await Promise.all(
      TREASURY_WATCH_TOKENS.map(async (t) => {
        try {
          const [bal, dec] = await Promise.all([
            c.readContract({ address: t.address, abi: erc20, functionName: "balanceOf", args: [treasury.address] }),
            c.readContract({ address: t.address, abi: erc20, functionName: "decimals" }),
          ]);
          return { symbol: t.symbol, amount: formatUnits(bal, dec), tokenAddress: t.address as string };
        } catch {
          return { symbol: t.symbol, amount: "unavailable", tokenAddress: t.address as string };
        }
      }),
    );
    base.connectivity = { ok: chainId === TREASURY_CHAIN_ID, chainIdMatches: chainId === TREASURY_CHAIN_ID, reportedChainId: chainId, latestBlock: block.toString(), latencyMs, error: null };
    base.account = { type: code && code !== "0x" ? "contract" : "eoa", nonce };
    base.balances = [{ symbol: "BNB", amount: formatEther(bnb), tokenAddress: null }, ...tokens];
  } catch (e) {
    base.connectivity.error = (e as Error).message.split("\n")[0];
  }
  cache = { at: Date.now(), value: base };
  return base;
}
