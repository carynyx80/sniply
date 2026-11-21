import { z } from "zod";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const jobs = await db.list("processing_jobs", { ownerId: user.id }, { limit: 50 });
  return json({ jobs });
});

const Create = z.object({ assetId: z.string().uuid(), idempotencyKey: z.string().min(8).max(80) });

/** Create (or return existing, idempotently) a processing job for an uploaded asset. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`job:${user.id}`, 30, 3_600_000);
  const { assetId, idempotencyKey } = Create.parse(await req.json());
  const existing = await db.findOne("processing_jobs", { idempotencyKey, ownerId: user.id });
  if (existing) return json({ job: existing });
  const asset = await db.get("video_assets", assetId);
  if (!asset || asset.ownerId !== user.id) throw new HttpError(404, "Video not found");
  const t = now();
  const job = await db.insert("processing_jobs", {
    assetId,
    agentId: asset.agentId,
    ownerId: user.id,
    status: "queued",
    stage: "queued",
    progress: 0,
    error: null,
    signalsSummary: null,
    idempotencyKey,
    createdAt: t,
    updatedAt: t,
  });
  await db.update("video_assets", assetId, { status: "processing" });
  return json({ job }, 201);
});
