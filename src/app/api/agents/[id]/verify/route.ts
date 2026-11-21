import { z } from "zod";
import { getAddress } from "viem";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { verifyAgentIdOwnership } from "@/server/chain";
import { audit, recordActivity } from "@/server/domain";
import { AGENT_ID_REGISTRY } from "@/lib/chain-config";
import { handle, json, rateLimit } from "@/server/http";

const Body = z.object({ claimedName: z.string().trim().max(64).regex(/^[a-z0-9-]*(\.ai)?$/i).optional() });

/**
 * Binance Agent ID verification.
 * The operator's wallet is already proven by signature (session). We then read the
 * Agent ID registry on BSC mainnet: balanceOf(operatorWallet) > 0 ⇒ verified.
 * The result, block number and registry address are stored as a separate verified record.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  rateLimit(`verify-agent:${user.id}`, 6, 60_000);
  const { id } = await ctx.params;
  const agent = await db.get("agents", id);
  if (!agent || agent.operatorId !== user.id) throw new HttpError(404, "Agent not found");
  const { claimedName } = Body.parse(await req.json().catch(() => ({})));

  let result;
  try {
    result = await verifyAgentIdOwnership(getAddress(user.wallet));
  } catch (e) {
    throw new HttpError(502, `Could not reach BNB Chain RPC: ${(e as Error).message.split("\n")[0]}`);
  }
  if (!result.holds) {
    return json({ verified: false, reason: "This wallet does not hold a Binance Agent ID in the configured registry.", registry: AGENT_ID_REGISTRY.address, block: result.block }, 200);
  }
  const existing = await db.findOne("agent_identities", { agentId: agent.id, status: "verified" });
  const record = {
    agentId: agent.id,
    ownerWallet: user.wallet,
    registry: AGENT_ID_REGISTRY.address,
    chainId: AGENT_ID_REGISTRY.chainId,
    balance: result.balance,
    verifiedAtBlock: result.block,
    verifiedAt: now(),
    status: "verified" as const,
    claimedName: claimedName || null,
  };
  const identity = existing ? await db.update("agent_identities", existing.id, record) : await db.insert("agent_identities", record);
  if (!existing) await recordActivity({ agentId: agent.id, actorId: user.id, kind: "agent.identity_verified", message: `Binance Agent ID ownership verified on BNB Chain at block ${result.block}.`, ref: { block: result.block } });
  await audit(user.id, "agent.verify_identity", agent.id, { block: result.block });
  return json({ verified: true, identity });
});
