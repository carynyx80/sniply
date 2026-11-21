import { z } from "zod";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";
import { recordActivity, slugify, toPublicAgent } from "@/server/domain";

export const GET = handle(async (req: Request) => {
  const u = new URL(req.url);
  const limit = Math.min(Number(u.searchParams.get("limit") ?? 24), 100);
  const mine = u.searchParams.get("mine") === "1";
  let agents = await db.list("agents");
  if (mine) {
    const user = await requireUser();
    agents = agents.filter((a) => a.operatorId === user.id);
  }
  const pub = await Promise.all(agents.map((a) => toPublicAgent(a)));
  const sort = u.searchParams.get("sort") ?? "reputation";
  const key: Record<string, (a: (typeof pub)[number]) => number> = {
    reputation: (a) => a.stats.reputation,
    views: (a) => a.stats.views,
    clips: (a) => a.stats.clips,
    launches: (a) => a.stats.launches,
    jobs: (a) => a.stats.jobsOk,
  };
  const k = key[sort] ?? key.reputation;
  pub.sort((a, b) => k(b) - k(a) || Number(b.identity.verified) - Number(a.identity.verified));
  return json({ agents: pub.slice(0, limit) });
});

const Create = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(280).default(""),
  avatarHue: z.number().int().min(0).max(360),
  mode: z.enum(["manual", "assisted", "autonomous"]),
  preferences: z.object({
    clipMinSec: z.number().min(3).max(120),
    clipMaxSec: z.number().min(5).max(180),
    suggestions: z.number().int().min(1).max(12),
    category: z.string().max(30),
    captionStyle: z.enum(["bold", "minimal", "karaoke"]),
    aspect: z.enum(["9:16", "16:9", "1:1"]),
    autoDraft: z.boolean(),
    notifyOnDraft: z.boolean(),
  }),
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`agent:${user.id}`, 10, 3_600_000);
  const b = Create.parse(await req.json());
  if (b.preferences.clipMinSec >= b.preferences.clipMaxSec) throw new HttpError(400, "Min clip length must be below max");
  let slug = slugify(b.name);
  if (await db.findOne("agents", { slug })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const agent = await db.insert("agents", {
    slug,
    operatorId: user.id,
    name: b.name,
    description: b.description,
    avatarHue: b.avatarHue,
    mode: b.mode,
    permissions: {
      canDraftClips: true,
      canPublishClips: false, // operator must explicitly enable, autonomous mode only
      canDraftTokens: b.mode !== "manual",
      canLaunchTokens: false, // financial autonomy is disabled platform-wide
      paused: false,
    },
    preferences: b.preferences,
    createdAt: now(),
  });
  await recordActivity({ agentId: agent.id, actorId: user.id, kind: "agent.registered", message: "Agent registered by operator.", ref: null });
  return json({ agent }, 201);
});
