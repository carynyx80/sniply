import { z } from "zod";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";
import { reconcileAttempt } from "@/server/launch";
import { activeChain, launchEnabled } from "@/lib/chain-config";

const Body = z.object({ draftId: z.string().uuid(), txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) });

/**
 * Record a launch attempt AFTER the creator signed + broadcast it from their wallet.
 * The server never signs. Success is only recorded after on-chain receipt verification.
 * Idempotent on txHash; one active attempt per draft prevents duplicate submissions.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`launch:${user.id}`, 10, 3_600_000);
  if (!launchEnabled()) throw new HttpError(503, "Token launch infrastructure is not configured");
  const { draftId, txHash } = Body.parse(await req.json());
  const draft = await db.get("token_drafts", draftId);
  if (!draft || draft.creatorId !== user.id) throw new HttpError(404, "Draft not found");
  const dup = await db.findOne("launch_attempts", { txHash: txHash.toLowerCase() });
  if (dup) return json({ attempt: dup });
  const pending = (await db.list("launch_attempts", { draftId })).find((a) => a.status === "pending" || a.status === "confirmed");
  if (pending) throw new HttpError(409, "A launch for this draft is already pending or confirmed");
  const t = now();
  const attempt = await db.insert("launch_attempts", { draftId, creatorId: user.id, chainId: activeChain.id, txHash: txHash.toLowerCase(), status: "pending", error: null, createdAt: t, updatedAt: t });
  await db.update("token_drafts", draftId, { status: "submitted" });
  const result = await reconcileAttempt(attempt.id, 20_000);
  return json({ attempt: result }, 201);
});
