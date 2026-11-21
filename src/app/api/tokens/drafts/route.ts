import { z } from "zod";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";
import { recordActivity } from "@/server/domain";

const BANNED = /(guarantee|guaranteed|100x|1000x|risk[- ]?free|moon|profit)/i;

export const GET = handle(async () => {
  const user = await requireUser();
  const drafts = await db.list("token_drafts", { creatorId: user.id });
  return json({ drafts });
});

const Create = z.object({
  clipId: z.string().uuid(),
  name: z.string().trim().min(2).max(32),
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,10}$/, "2–10 letters/numbers"),
  description: z.string().trim().max(240),
  links: z.object({ x: z.string().url().optional().or(z.literal("")), telegram: z.string().url().optional().or(z.literal("")), website: z.string().url().optional().or(z.literal("")) }).default({}),
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`draft:${user.id}`, 20, 3_600_000);
  const b = Create.parse(await req.json());
  if (BANNED.test(`${b.name} ${b.description}`)) throw new HttpError(400, "Remove financial promises from the name/description");
  const clip = await db.get("clips", b.clipId);
  if (!clip || clip.creatorId !== user.id) throw new HttpError(404, "Clip not found");
  if (clip.status !== "published") throw new HttpError(409, "Publish the clip before preparing a token");
  if (await db.findOne("token_launches", { clipId: clip.id })) throw new HttpError(409, "This clip already has a confirmed token");
  const draft = await db.insert("token_drafts", {
    clipId: clip.id,
    creatorId: user.id,
    agentId: clip.agentId,
    name: b.name,
    symbol: b.symbol,
    description: b.description,
    links: Object.fromEntries(Object.entries(b.links).filter(([, v]) => v)),
    status: "draft",
    createdAt: now(),
  });
  await recordActivity({ agentId: clip.agentId, actorId: user.id, kind: "token.draft_created", message: `Token draft $${draft.symbol} prepared for review.`, ref: { draftId: draft.id } });
  return json({ draft }, 201);
});
