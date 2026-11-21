import { bsc, bscTestnet } from "viem/chains";
import type { Address } from "viem";

/**
 * Chain + contract configuration. Every address here is either a widely-documented
 * public contract or explicitly marked as UNVERIFIED and overridable via env.
 * See BLOCKCHAIN.md and AGENT_ID_INTEGRATION.md.
 */

export const NETWORK = (process.env.NEXT_PUBLIC_SNIPLY_NETWORK ?? "testnet") as "testnet" | "mainnet";
export const activeChain = NETWORK === "mainnet" ? bsc : bscTestnet;
export const supportedChains = [bscTestnet, bsc] as const;

/** Official BNB Chain public RPCs (used when no dedicated RPC is configured). */
export const PUBLIC_RPC = { [bsc.id]: "https://bsc-dataseed.bnbchain.org", [bscTestnet.id]: "https://bsc-testnet-dataseed.bnbchain.org" } as const;

export const explorerBase = (chainId: number) =>
  chainId === bsc.id ? "https://bscscan.com" : "https://testnet.bscscan.com";

/**
 * Binance Agent ID registry.
 * STATUS: UNVERIFIED BY OFFICIAL BINANCE DOCS. This address is the one used consistently
 * by Binance Agent ID Hackathon projects (described as the SPACE ID Agent ID registry,
 * ERC-721, soulbound, BSC mainnet chainId 56). Ownership check = balanceOf(owner) > 0.
 * The registry exposes no enumeration, so we cannot list token IDs per owner.
 * Override with NEXT_PUBLIC_AGENT_ID_REGISTRY once Binance publishes an official address.
 */
export const AGENT_ID_REGISTRY = {
  chainId: bsc.id,
  address: (process.env.NEXT_PUBLIC_AGENT_ID_REGISTRY ??
    "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F") as Address,
  verifiedByOfficialDocs: false,
};

/** PancakeSwap V2 — public, widely documented router/factory addresses. */
export const PANCAKE_V2 = {
  [bsc.id]: {
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E" as Address,
    factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73" as Address,
    wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as Address,
  },
  [bscTestnet.id]: {
    router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1" as Address,
    factory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17" as Address,
    wrappedNative: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" as Address,
  },
} as const;

/**
 * Token launch infrastructure. Disabled unless a verified launch contract is configured.
 * "sniply-factory" = the auditable SniplyTokenFactory in /contracts (must be deployed
 * to testnet by the operator and its address set here).
 */
export const LAUNCHPAD = {
  kind: (process.env.NEXT_PUBLIC_LAUNCHPAD ?? "none") as "none" | "sniply-factory" | "flap",
  factoryAddress: (process.env.NEXT_PUBLIC_SNIPLY_FACTORY_ADDRESS ?? "") as Address | "",
};

export const launchEnabled = () =>
  // Flap's Portal is BSC-mainnet only.
  (LAUNCHPAD.kind === "flap" && NETWORK === "mainnet") ||
  (LAUNCHPAD.kind === "sniply-factory" && /^0x[0-9a-fA-F]{40}$/.test(LAUNCHPAD.factoryAddress));

export const DEFAULT_SLIPPAGE_BPS = 100; // 1%
export const MAX_SLIPPAGE_BPS = 1500; // 15%
