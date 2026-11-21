import { z } from "zod";
import { db } from "@/server/db";
import { requireAdmin, HttpError } from "@/server/auth";
import { handle, json } from "@/server/http";
import { audit, recordActivity, recordReputation } from "@/server/domain";

const Body = z.object({ action: z.enum(["remove", "restore"]), reason: z.string().max(300) });

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { action, reason } = Body.parse(await req.json());
  const clip = await db.get("clips", id);
  if (!clip) throw new HttpError(404, "Clip not found");
  const updated = await db.update("clips", id, { status: action === "remove" ? "removed" : "published" });
  if (action === "remove") {
    await recordActivity({ agentId: clip.agentId, actorId: admin.id, kind: "clip.removed", message: "Clip removed by moderation.", ref: { clipId: id } });
    await recordReputation(clip.agentId, "clip_removed");
  }
  await audit(admin.id, `clip.${action}`, id, { reason });
  return json({ clip: updated });
});
