import { z } from "zod";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";
import { recordActivity, recordReputation, toPublicClip } from "@/server/domain";

const CATEGORIES = ["gaming", "livestreams", "podcasts", "entertainment", "sports", "music", "other"] as const;

export const GET = handle(async (req: Request) => {
  const u = new URL(req.url);
  const limit = Math.min(Number(u.searchParams.get("limit") ?? 12), 50);
  const offset = Math.max(Number(u.searchParams.get("offset") ?? 0), 0);
  const filter = u.searchParams.get("filter") ?? "new";
  const agentId = u.searchParams.get("agent");
  const creator = u.searchParams.get("creator");

  if (u.searchParams.get("mine") === "1") {
    const me = await requireUser();
    const mine = (await db.list("clips", { creatorId: me.id })).filter((c) => c.status !== "removed");
    const launches = await db.list("token_launches", { creatorId: me.id });
    const drafts = await db.list("token_drafts", { creatorId: me.id });
    return json({ clips: await Promise.all(mine.map(async (c) => ({ ...(await toPublicClip(c)), status: c.status, tokenDraft: drafts.find((d) => d.clipId === c.id) ?? null, launched: launches.some((l) => l.clipId === c.id) }))) });
  }
  let clips = await db.list("clips", { status: "published" }, { order: "publishedAt" });
  if (agentId) clips = clips.filter((c) => c.agentId === agentId);
  if (creator) {
    const user = await db.findOne("users", { wallet: creator.toLowerCase() });
    clips = clips.filter((c) => c.creatorId === user?.id);
  }
  if ((CATEGORIES as readonly string[]).includes(filter)) clips = clips.filter((c) => c.category === filter);
  if (filter === "agent") clips = clips.filter((c) => c.agentId);
  if (filter === "tokenized") {
    const launches = await db.list("token_launches");
    const ids = new Set(launches.map((l) => l.clipId));
    clips = clips.filter((c) => ids.has(c.id));
  }
  if (filter === "trending") {
    // Engagement-weighted with time decay. Uses only recorded Sniply engagement.
    const score = (c: (typeof clips)[number]) => {
      const ageH = (Date.now() - new Date(c.publishedAt ?? c.createdAt).getTime()) / 3.6e6;
      return (c.views + c.likes * 8) / Math.pow(ageH + 2, 1.4);
    };
    clips = [...clips].sort((a, b) => score(b) - score(a));
  }
  const page = clips.slice(offset, offset + limit);
  return json({ clips: await Promise.all(page.map(toPublicClip)), nextOffset: offset + limit < clips.length ? offset + limit : null });
});

const Create = z.object({
  assetId: z.string().uuid(),
  candidateId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2).max(100),
  caption: z.string().trim().max(300).default(""),
  category: z.enum(CATEGORIES),
  startSec: z.number().min(0),
  endSec: z.number().positive(),
  aspect: z.enum(["9:16", "16:9", "1:1"]),
  thumbnailPath: z.string().nullable().optional(),
  publish: z.boolean(),
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`clip:${user.id}`, 30, 3_600_000);
  const b = Create.parse(await req.json());
  if (b.endSec - b.startSec < 2 || b.endSec - b.startSec > 180) throw new HttpError(400, "Clips must be 2–180 seconds");
  const asset = await db.get("video_assets", b.assetId);
  if (!asset || asset.ownerId !== user.id) throw new HttpError(404, "Video not found");
  if (!asset.rightsAttested) throw new HttpError(403, "Rights attestation required");
  if (asset.durationSec && b.endSec > asset.durationSec + 0.5) throw new HttpError(400, "Clip exceeds video length");
  if (b.agentId) {
    const agent = await db.get("agents", b.agentId);
    if (!agent || agent.operatorId !== user.id) throw new HttpError(403, "Not your agent");
  }
  const t = now();
  const clip = await db.insert("clips", {
    candidateId: b.candidateId ?? null,
    assetId: b.assetId,
    agentId: b.agentId ?? null,
    creatorId: user.id,
    title: b.title,
    caption: b.caption,
    category: b.category,
    startSec: b.startSec,
    endSec: b.endSec,
    aspect: b.aspect,
    thumbnailPath: b.thumbnailPath ?? null,
    status: b.publish ? "published" : "draft",
    likes: 0,
    views: 0,
    createdAt: t,
    publishedAt: b.publish ? t : null,
  });
  if (b.candidateId) await db.update("clip_candidates", b.candidateId, { status: b.publish ? "published" : "draft" });
  if (b.publish) {
    await recordActivity({ agentId: clip.agentId, actorId: user.id, kind: "clip.published", message: `Creator approved publication of “${clip.title}”.`, ref: { clipId: clip.id } });
    await recordReputation(clip.agentId, "clip_published");
  }
  return json({ clip }, 201);
});
