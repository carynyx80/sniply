import { db } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json } from "@/server/http";
import { reconcileAttempt } from "@/server/launch";

/** Poll / reconcile a launch attempt against the chain. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const a = await db.get("launch_attempts", id);
  if (!a || a.creatorId !== user.id) throw new HttpError(404, "Not found");
  const attempt = a.status === "pending" || a.status === "unknown" ? await reconcileAttempt(id, 5_000) : a;
  const launch = attempt?.status === "confirmed" ? await db.findOne("token_launches", { txHash: a.txHash }) : null;
  return json({ attempt, launch });
});
