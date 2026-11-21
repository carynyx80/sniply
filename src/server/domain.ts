import "server-only";
import { db, now } from "./db";
import { mediaUrl } from "./storage";
import type * as T from "@/lib/types";

/**
 * Transparent reputation weights. Reputation = Σ deltas (floored at 0).
 * Documented in AGENT_ID_INTEGRATION.md. Not an indicator of investment quality.
 */
export const REPUTATION_WEIGHTS: Record<T.ReputationEvent["kind"], number> = {
  job_success: 2,
  job_failure: -1,
  clip_published: 3,
  launch_confirmed: 5,
  clip_removed: -15,
  engagement: 0, // engagement is shown separately; not folded in to avoid farming
};

export async function recordActivity(e: Omit<T.ActivityEvent, "id" | "createdAt">) {
  return db.insert("agent_activity", { ...e, createdAt: now() });
}

export async function recordReputation(agentId: string | null, kind: T.ReputationEvent["kind"]) {
  if (!agentId) return;
  await db.insert("reputation_events", { agentId, kind, delta: REPUTATION_WEIGHTS[kind], createdAt: now() });
}

export async function audit(actorId: string | null, action: string, target: string, meta?: Record<string, unknown>) {
  await db.insert("audit_logs", { actorId, action, target, meta: meta ?? null, createdAt: now() });
}

export async function toPublicAgent(a: T.Agent, withRecent = true): Promise<T.PublicAgent> {
  const [operator, identity, clips, launches, rep, jobs, recent] = await Promise.all([
    db.get("users", a.operatorId),
    db.findOne("agent_identities", { agentId: a.id, status: "verified" }),
    db.list("clips", { agentId: a.id, status: "published" }),
    db.count("token_launches", { agentId: a.id }),
    db.list("reputation_events", { agentId: a.id }),
    db.list("processing_jobs", { agentId: a.id }),
    withRecent ? db.list("agent_activity", { agentId: a.id }, { limit: 8 }) : Promise.resolve([]),
  ]);
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    description: a.description,
    avatarHue: a.avatarHue,
    mode: a.mode,
    operatorWallet: operator?.wallet ?? "",
    identity: {
      verified: !!identity,
      ownerWallet: identity?.ownerWallet ?? null,
      registry: identity?.registry ?? null,
      verifiedAt: identity?.verifiedAt ?? null,
      claimedName: identity?.claimedName ?? null,
    },
    stats: {
      clips: clips.length,
      views: clips.reduce((s, c) => s + c.views, 0),
      launches,
      jobsOk: jobs.filter((j) => j.status === "completed").length,
      jobsFailed: jobs.filter((j) => j.status === "failed").length,
      reputation: Math.max(0, rep.reduce((s, r) => s + r.delta, 0)),
    },
    recent,
    createdAt: a.createdAt,
  };
}

export async function toPublicClip(c: T.Clip): Promise<T.PublicClip> {
  const [asset, creator, agent, launch] = await Promise.all([
    db.get("video_assets", c.assetId),
    db.get("users", c.creatorId),
    c.agentId ? db.get("agents", c.agentId) : Promise.resolve(null),
    db.findOne("token_launches", { clipId: c.id }),
  ]);
  const verified = agent ? !!(await db.findOne("agent_identities", { agentId: agent.id, status: "verified" })) : false;
  return {
    id: c.id,
    title: c.title,
    caption: c.caption,
    category: c.category,
    videoUrl: (await mediaUrl(asset?.storagePath ?? null)) ?? "",
    thumbnailUrl: await mediaUrl(c.thumbnailPath),
    startSec: c.startSec,
    endSec: c.endSec,
    aspect: c.aspect,
    likes: c.likes,
    views: c.views,
    creatorWallet: creator?.wallet ?? "",
    agent: agent ? { id: agent.id, slug: agent.slug, name: agent.name, verified, avatarHue: agent.avatarHue } : null,
    token: launch ? { address: launch.tokenAddress, symbol: launch.symbol, name: launch.name, chainId: launch.chainId } : null,
    publishedAt: c.publishedAt,
  };
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "agent"
  );
}
