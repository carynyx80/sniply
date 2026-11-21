import { z } from "zod";
import { db } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { audit, toPublicAgent } from "@/server/domain";
import { handle, json } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

async function find(idOrSlug: string) {
  return (await db.get("agents", idOrSlug)) ?? (await db.findOne("agents", { slug: idOrSlug }));
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const a = await find(id);
  if (!a) throw new HttpError(404, "Agent not found");
  const pub = await toPublicAgent(a);
  const activity = await db.list("agent_activity", { agentId: a.id }, { limit: 50 });
  const reputation = await db.list("reputation_events", { agentId: a.id }, { order: "createdAt", desc: false });
  return json({ agent: pub, activity, reputation, permissions: a.permissions, preferences: a.preferences });
});

const Patch = z.object({
  description: z.string().trim().max(280).optional(),
  mode: z.enum(["manual", "assisted", "autonomous"]).optional(),
  paused: z.boolean().optional(),
  canPublishClips: z.boolean().optional(),
  canDraftTokens: z.boolean().optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const a = await find(id);
  if (!a || a.operatorId !== user.id) throw new HttpError(404, "Agent not found");
  const b = Patch.parse(await req.json());
  const mode = b.mode ?? a.mode;
  const permissions = {
    ...a.permissions,
    ...(b.paused !== undefined ? { paused: b.paused } : {}),
    ...(b.canDraftTokens !== undefined ? { canDraftTokens: b.canDraftTokens } : {}),
    // publishing without review is only allowed in autonomous mode
    canPublishClips: mode === "autonomous" ? (b.canPublishClips ?? a.permissions.canPublishClips) : false,
    canLaunchTokens: false as const,
  };
  const updated = await db.update("agents", a.id, { description: b.description ?? a.description, mode, permissions });
  await audit(user.id, "agent.update", a.id, b);
  return json({ agent: updated });
});
