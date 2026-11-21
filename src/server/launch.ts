import "server-only";
import { decodeEventLog, getAddress, parseAbi, type Hash } from "viem";
import { db, now } from "./db";
import { clientFor } from "./chain";
import { recordActivity, recordReputation, audit } from "./domain";
import { LAUNCHPAD } from "@/lib/chain-config";

export const factoryAbi = parseAbi([
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, bytes32 clipRef)",
  "function createToken(string name, string symbol, bytes32 clipRef) payable returns (address)",
  "function creationFee() view returns (uint256)",
]);

/**
 * Verify a launch tx on-chain: receipt must be success, sent TO the configured factory,
 * FROM the creator's wallet, and emit TokenCreated whose name/symbol match the draft.
 * Only then is a TokenLaunch row written.
 */
export async function reconcileAttempt(attemptId: string, timeoutMs: number) {
  const a = await db.get("launch_attempts", attemptId);
  if (!a) return null;
  const draft = await db.get("token_drafts", a.draftId);
  const creator = await db.get("users", a.creatorId);
  if (!draft || !creator) return a;
  const client = clientFor(a.chainId);
  try {
    const receipt = await client.waitForTransactionReceipt({ hash: a.txHash as Hash, timeout: timeoutMs }).catch(() => null);
    if (!receipt) return db.update("launch_attempts", a.id, { status: "pending", updatedAt: now() });
    const tx = await client.getTransaction({ hash: a.txHash as Hash });
    const fail = async (error: string) => {
      await db.update("token_drafts", draft.id, { status: "failed" });
      return db.update("launch_attempts", a.id, { status: "reverted", error, updatedAt: now() });
    };
    if (receipt.status !== "success") return fail("Transaction reverted on-chain");
    if (!LAUNCHPAD.factoryAddress || getAddress(tx.to ?? "0x0000000000000000000000000000000000000000") !== getAddress(LAUNCHPAD.factoryAddress))
      return fail("Transaction was not sent to the configured launch contract");
    if (getAddress(tx.from) !== getAddress(creator.wallet)) return fail("Transaction sender is not the signed-in creator");
    let created: { token: string; name: string; symbol: string } | null = null;
    for (const log of receipt.logs) {
      if (getAddress(log.address) !== getAddress(LAUNCHPAD.factoryAddress)) continue;
      try {
        const ev = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "TokenCreated") created = { token: ev.args.token, name: ev.args.name, symbol: ev.args.symbol };
      } catch {}
    }
    if (!created) return fail("No TokenCreated event in receipt");
    if (created.name !== draft.name || created.symbol !== draft.symbol) return fail("On-chain metadata does not match the reviewed draft");

    if (!(await db.findOne("token_launches", { txHash: a.txHash }))) {
      await db.insert("token_launches", {
        draftId: draft.id,
        clipId: draft.clipId,
        agentId: draft.agentId,
        creatorId: a.creatorId,
        chainId: a.chainId,
        tokenAddress: getAddress(created.token),
        txHash: a.txHash,
        blockNumber: receipt.blockNumber.toString(),
        name: created.name,
        symbol: created.symbol,
        confirmedAt: now(),
      });
      await db.update("token_drafts", draft.id, { status: "confirmed" });
      await recordActivity({ agentId: draft.agentId, actorId: a.creatorId, kind: "token.launch_confirmed", message: `Token launch $${created.symbol} confirmed on BNB Chain (block ${receipt.blockNumber}).`, ref: { token: created.token, tx: a.txHash } });
      await recordReputation(draft.agentId, "launch_confirmed");
      await audit(a.creatorId, "token.launch_confirmed", created.token, { tx: a.txHash });
    }
    return db.update("launch_attempts", a.id, { status: "confirmed", error: null, updatedAt: now() });
  } catch (e) {
    return db.update("launch_attempts", a.id, { status: "unknown", error: `RPC: ${(e as Error).message.split("\n")[0]}`, updatedAt: now() });
  }
}
