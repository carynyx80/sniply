import { z } from "zod";
import { db, now } from "@/server/db";
import { currentUser, HttpError } from "@/server/auth";
import { clientKey, handle, json, rateLimit } from "@/server/http";

const Body = z.object({ kind: z.enum(["view", "like", "share"]) });

/** Engagement: views dedup per user/IP per clip per day; likes require sign-in and are unique. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { kind } = Body.parse(await req.json());
  const ip = clientKey(req);
  rateLimit(`engage:${ip}`, 120, 60_000);
  const clip = await db.get("clips", id);
  if (!clip || clip.status !== "published") throw new HttpError(404, "Clip not found");
  const user = await currentUser();

  if (kind === "like") {
    if (!user) throw new HttpError(401, "Sign in to like");
    const existing = await db.findOne("engagement_events", { clipId: id, userId: user.id, kind: "like" });
    if (existing) return json({ ok: true, likes: clip.likes, liked: true });
    await db.insert("engagement_events", { clipId: id, userId: user.id, kind, createdAt: now() });
    const u = await db.update("clips", id, { likes: clip.likes + 1 });
    return json({ ok: true, likes: u!.likes, liked: true });
  }
  if (kind === "view") {
    const dayKey = `${id}:${user?.id ?? ip}:${new Date().toISOString().slice(0, 10)}`;
    if (seen.has(dayKey)) return json({ ok: true, views: clip.views });
    seen.add(dayKey);
    await db.insert("engagement_events", { clipId: id, userId: user?.id ?? null, kind, createdAt: now() });
    const u = await db.update("clips", id, { views: clip.views + 1 });
    return json({ ok: true, views: u!.views });
  }
  await db.insert("engagement_events", { clipId: id, userId: user?.id ?? null, kind, createdAt: now() });
  return json({ ok: true });
});

const seen = new Set<string>();
