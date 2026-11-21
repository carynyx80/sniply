import "server-only";
import { decodeEventLog, decodeFunctionData, getAddress, parseAbi, type Hash, type TransactionReceipt, type Transaction } from "viem";
import { db, now } from "./db";
import { clientFor } from "./chain";
import { recordActivity, recordReputation, audit } from "./domain";
import { treasury } from "./treasury";
import { LAUNCHPAD } from "@/lib/chain-config";
import { FLAP, flapPortalAbi, SNIPLY_TAX_BPS } from "@/lib/flap";
import type { TokenDraft, User } from "@/lib/types";

export const factoryAbi = parseAbi([
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, bytes32 clipRef)",
  "function createToken(string name, string symbol, bytes32 clipRef) payable returns (address)",
  "function creationFee() view returns (uint256)",
]);

type Verified = { ok: true; token: string; name: string; symbol: string } | { ok: false; error: string };
const same = (a: string | null | undefined, b: string) => !!a && getAddress(a) === getAddress(b);

/**
 * Flap launch verification. All must hold:
 *  - receipt success, tx.to == Flap Portal, tx.from == signed-in creator
 *  - decoded newTokenV6 input matches the reviewed draft: name, symbol, prepared salt + meta,
 *    beneficiary == creator, commissionReceiver == Sniply treasury, 1% buy/sell tax, Tax V3
 *  - the Portal emitted TokenCreated for the predicted token with matching creator/name/symbol
 */
function verifyFlap(tx: Transaction, receipt: TransactionReceipt, draft: TokenDraft, creator: User): Verified {
  if (!same(tx.to, FLAP.portal)) return { ok: false, error: "Transaction was not sent to Flap's Portal" };
  if (!draft.flap) return { ok: false, error: "Draft was not prepared for Flap" };
  let params;
  try {
    const d = decodeFunctionData({ abi: flapPortalAbi, data: tx.input });
    if (d.functionName !== "newTokenV6") return { ok: false, error: "Unexpected Portal function" };
    params = d.args[0];
  } catch {
    return { ok: false, error: "Could not decode the launch transaction" };
  }
  if (params.name !== draft.name || params.symbol !== draft.symbol) return { ok: false, error: "On-chain name/symbol differ from the reviewed draft" };
  if (params.salt.toLowerCase() !== draft.flap.salt.toLowerCase() || params.meta !== draft.flap.metaCid) return { ok: false, error: "Launch does not match the prepared metadata" };
  if (!same(params.beneficiary, creator.wallet)) return { ok: false, error: "Creator fee recipient is not the creator's wallet" };
  if (!same(params.commissionReceiver, treasury.address)) return { ok: false, error: "Sniply commission receiver is not the company treasury" };
  if (params.buyTaxRate !== SNIPLY_TAX_BPS || params.sellTaxRate !== SNIPLY_TAX_BPS || params.mktBps !== 10000 || params.tokenVersion !== 6)
    return { ok: false, error: "Tax configuration differs from Sniply's launch terms" };

  let created: { token: string; creator: string; name: string; symbol: string } | null = null;
  for (const log of receipt.logs) {
    if (!same(log.address, FLAP.portal)) continue;
    try {
      const ev = decodeEventLog({ abi: flapPortalAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "TokenCreated") created = { token: ev.args.token, creator: ev.args.creator, name: ev.args.name, symbol: ev.args.symbol };
    } catch {}
  }
  if (!created) return { ok: false, error: "No TokenCreated event from Flap in the receipt" };
  if (!same(created.token, draft.flap.predictedToken)) return { ok: false, error: "Created token differs from the predicted address" };
  if (!same(created.creator, creator.wallet) || created.name !== draft.name || created.symbol !== draft.symbol) return { ok: false, error: "Creation event does not match the draft" };
  return { ok: true, token: getAddress(created.token), name: created.name, symbol: created.symbol };
}

/** Legacy path for Sniply's own (unaudited, not deployed) factory. */
function verifyFactory(tx: Transaction, receipt: TransactionReceipt, draft: TokenDraft): Verified {
  if (!LAUNCHPAD.factoryAddress || !same(tx.to, LAUNCHPAD.factoryAddress)) return { ok: false, error: "Transaction was not sent to the configured launch contract" };
  let created: { token: string; name: string; symbol: string } | null = null;
  for (const log of receipt.logs) {
    if (!same(log.address, LAUNCHPAD.factoryAddress)) continue;
    try {
      const ev = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "TokenCreated") created = { token: ev.args.token, name: ev.args.name, symbol: ev.args.symbol };
    } catch {}
  }
  if (!created) return { ok: false, error: "No TokenCreated event in receipt" };
  if (created.name !== draft.name || created.symbol !== draft.symbol) return { ok: false, error: "On-chain metadata does not match the reviewed draft" };
  return { ok: true, ...created, token: getAddress(created.token) };
}

/** Reconcile a launch attempt against the chain. Only a fully verified launch is recorded. */
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
    if (!same(tx.from, creator.wallet)) return fail("Transaction sender is not the signed-in creator");

    const v = LAUNCHPAD.kind === "flap" ? verifyFlap(tx, receipt, draft, creator) : verifyFactory(tx, receipt, draft);
    if (!v.ok) return fail(v.error);

    if (!(await db.findOne("token_launches", { txHash: a.txHash }))) {
      await db.insert("token_launches", {
        draftId: draft.id,
        clipId: draft.clipId,
        agentId: draft.agentId,
        creatorId: a.creatorId,
        chainId: a.chainId,
        tokenAddress: v.token,
        txHash: a.txHash,
        blockNumber: receipt.blockNumber.toString(),
        name: v.name,
        symbol: v.symbol,
        confirmedAt: now(),
      });
      await db.update("token_drafts", draft.id, { status: "confirmed" });
      await recordActivity({ agentId: draft.agentId, actorId: a.creatorId, kind: "token.launch_confirmed", message: `Token launch $${v.symbol} confirmed on BNB Chain (block ${receipt.blockNumber}).`, ref: { token: v.token, tx: a.txHash } });
      await recordReputation(draft.agentId, "launch_confirmed");
      await audit(a.creatorId, "token.launch_confirmed", v.token, { tx: a.txHash, launchpad: LAUNCHPAD.kind });
    }
    return db.update("launch_attempts", a.id, { status: "confirmed", error: null, updatedAt: now() });
  } catch (e) {
    return db.update("launch_attempts", a.id, { status: "unknown", error: `RPC: ${(e as Error).message.split("\n")[0]}`, updatedAt: now() });
  }
}
