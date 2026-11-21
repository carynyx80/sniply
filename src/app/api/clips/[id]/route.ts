import { z } from "zod";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json } from "@/server/http";
import { recordActivity, recordReputation, toPublicClip } from "@/server/domain";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const c = await db.get("clips", id);
  if (!c || c.status === "removed") throw new HttpError(404, "Clip not found");
  if (c.status === "draft") {
    const u = await requireUser();
    if (u.id !== c.creatorId) throw new HttpError(404, "Clip not found");
  }
  return json({ clip: await toPublicClip(c), raw: c });
});

const Patch = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  caption: z.string().trim().max(300).optional(),
  startSec: z.number().min(0).optional(),
  endSec: z.number().positive().optional(),
  publish: z.boolean().optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const c = await db.get("clips", id);
  if (!c || c.creatorId !== user.id || c.status === "removed") throw new HttpError(404, "Clip not found");
  const b = Patch.parse(await req.json());
  const wasDraft = c.status === "draft";
  const updated = await db.update("clips", id, {
    ...b,
    ...(b.publish && wasDraft ? { status: "published" as const, publishedAt: now() } : {}),
  });
  if (b.publish && wasDraft) {
    await recordActivity({ agentId: c.agentId, actorId: user.id, kind: "clip.published", message: `Creator approved publication of “${updated!.title}”.`, ref: { clipId: id } });
    await recordReputation(c.agentId, "clip_published");
  }
  return json({ clip: updated });
});
