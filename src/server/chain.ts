import "server-only";
import { createPublicClient, http, parseAbi, type Address } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { AGENT_ID_REGISTRY } from "@/lib/chain-config";

export const clients = {
  [bsc.id]: createPublicClient({ chain: bsc, transport: http(process.env.BSC_RPC_URL ?? process.env.NEXT_PUBLIC_BSC_RPC) }),
  [bscTestnet.id]: createPublicClient({
    chain: bscTestnet,
    transport: http(process.env.BSC_TESTNET_RPC_URL ?? process.env.NEXT_PUBLIC_BSC_TESTNET_RPC),
  }),
} as const;

export function clientFor(chainId: number) {
  const c = clients[chainId as keyof typeof clients];
  if (!c) throw new Error(`Unsupported chain ${chainId}`);
  return c;
}

const erc721 = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);

/**
 * Verify Binance Agent ID ownership by reading the registry on BSC mainnet.
 * This is the documented-by-community check (balanceOf > 0). It proves the wallet
 * holds an Agent ID; it cannot resolve which token ID or name (no enumeration).
 */
export async function verifyAgentIdOwnership(owner: Address) {
  const c = clientFor(AGENT_ID_REGISTRY.chainId);
  const [balance, block] = await Promise.all([
    c.readContract({ address: AGENT_ID_REGISTRY.address, abi: erc721, functionName: "balanceOf", args: [owner] }),
    c.getBlockNumber(),
  ]);
  return { holds: balance > BigInt(0), balance: balance.toString(), block: block.toString() };
}
