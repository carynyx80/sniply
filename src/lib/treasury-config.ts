import { getAddress, isAddress, type Address } from "viem";

/**
 * Sniply Company Wallet (treasury) — pure configuration helpers.
 *
 * The treasury is identified by its PUBLIC address only. Sniply never holds, stores or
 * requests its private key; the address alone cannot sign or spend. Nothing in the app
 * moves funds to or from it automatically. It is a separate category from user wallets
 * (signed-in creators) and agent identities (Binance Agent ID).
 */

export const TREASURY_CHAIN_ID = 56 as const; // BNB Smart Chain mainnet

/** Default official company wallet. Override with SNIPLY_TREASURY_ADDRESS. */
export const DEFAULT_TREASURY_ADDRESS = "0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff" as const;

/** Well-known BEP-20 stablecoins on BSC mainnet, used for read-only balance display. */
export const TREASURY_WATCH_TOKENS = [
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" as Address },
  { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as Address },
] as const;

export type TreasuryConfig = { address: Address; chainId: typeof TREASURY_CHAIN_ID; source: "env" | "default" };

/**
 * Parse and validate the configured treasury address.
 * - must be a 20-byte hex address
 * - if mixed-case, the EIP-55 checksum must be correct (catches typos)
 * - the zero address is rejected
 */
export function parseTreasuryAddress(raw: string | undefined | null): TreasuryConfig {
  const source = raw && raw.trim() ? "env" : "default";
  const value = (raw && raw.trim()) || DEFAULT_TREASURY_ADDRESS;
  if (!isAddress(value, { strict: false })) throw new Error("Treasury address is not a valid EVM address");
  const mixed = value !== value.toLowerCase() && value !== value.toUpperCase().replace("0X", "0x");
  if (mixed && !isAddress(value, { strict: true })) throw new Error("Treasury address has an invalid EIP-55 checksum");
  const address = getAddress(value);
  if (address === "0x0000000000000000000000000000000000000000") throw new Error("Treasury address cannot be the zero address");
  return { address, chainId: TREASURY_CHAIN_ID, source };
}

export function isTreasuryAddress(candidate: string | null | undefined, treasury: Address): boolean {
  if (!candidate || !isAddress(candidate, { strict: false })) return false;
  return getAddress(candidate) === treasury;
}
