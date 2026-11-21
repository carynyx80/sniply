/**
 * Read-only mainnet check of the Flap launch encoding. Uses eth_call (simulateContract):
 * nothing is signed or broadcast, no BNB is spent.
 */
import { createPublicClient, http, type Address, type Hex } from "viem";
import { bsc } from "viem/chains";
import { buildNewTokenV6Params, feeSplit, findVanitySalt, FLAP, flapPortalAbi } from "../src/lib/flap.ts";

const client = createPublicClient({ chain: bsc, transport: http("https://bsc-dataseed.bnbchain.org") });
const creator = "0x000000000000000000000000000000000000dEaD" as Address; // simulation only
const treasury = "0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff" as Address;

const t0 = Date.now();
const { salt, token } = findVanitySalt(`0x${Date.now().toString(16).padStart(64, "0")}` as Hex);
console.log(`vanity salt found in ${Date.now() - t0} ms → predicted token ${token}`);

const params = buildNewTokenV6Params({ name: "Sniply Simulation", symbol: "SNPSIM", metaCid: "bafkreisimulationonlynotarealcid", salt, creator, commissionReceiver: treasury, initialBuyWei: BigInt(0) });
try {
  const { result } = await client.simulateContract({ address: FLAP.portal, abi: flapPortalAbi, functionName: "newTokenV6", args: [params], account: creator, value: BigInt(0) });
  console.log("simulation OK → returned token:", result, "| matches prediction:", result.toLowerCase() === token.toLowerCase());
} catch (e) {
  console.log("simulation reverted:", (e as Error).message.split("\n").slice(0, 4).join(" | "));
}
console.log("fee split at 1% tax:", feeSplit());
