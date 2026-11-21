import { z } from "zod";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json } from "@/server/http";
import { recordActivity, recordReputation } from "@/server/domain";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const job = await db.get("processing_jobs", id);
  if (!job || job.ownerId !== user.id) throw new HttpError(404, "Job not found");
  const candidates = await db.list("clip_candidates", { jobId: id }, { order: "score" });
  return json({ job, candidates });
});

const Candidate = z.object({
  startSec: z.number().min(0),
  endSec: z.number().positive(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string().max(80)).max(8),
  suggestedTitle: z.string().max(100),
});

const Patch = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), stage: z.string().max(40), progress: z.number().min(0).max(1) }),
  z.object({
    type: z.literal("complete"),
    durationSec: z.number().positive(),
    signalsSummary: z.record(z.string(), z.number()),
    candidates: z.array(Candidate).max(20),
  }),
  z.object({ type: z.literal("fail"), error: z.string().max(300) }),
]);

/**
 * Analysis worker reports. In this build the signal extraction (audio energy, spectral flux,
 * scene-change detection) runs in a browser Web Worker on the user's own device and reports
 * here; the production worker (FFmpeg + model provider) uses the same endpoint contract.
 */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const job = await db.get("processing_jobs", id);
  if (!job || job.ownerId !== user.id) throw new HttpError(404, "Job not found");
  if (job.status === "completed" || job.status === "failed") throw new HttpError(409, "Job already finished");
  const b = Patch.parse(await req.json());

  if (b.type === "progress") {
    const updated = await db.update("processing_jobs", id, { status: b.progress < 0.85 ? "analyzing" : "ranking", stage: b.stage, progress: b.progress, updatedAt: now() });
    return json({ job: updated });
  }
  if (b.type === "fail") {
    const updated = await db.update("processing_jobs", id, { status: "failed", error: b.error, updatedAt: now() });
    await db.update("video_assets", job.assetId, { status: "failed" });
    await recordReputation(job.agentId, "job_failure");
    return json({ job: updated });
  }
  const valid = b.candidates.filter((c) => c.endSec > c.startSec && c.endSec <= b.durationSec + 0.5);
  const t = now();
  for (const c of valid) {
    await db.insert("clip_candidates", { jobId: id, assetId: job.assetId, ...c, status: "suggested", createdAt: t });
  }
  const updated = await db.update("processing_jobs", id, { status: "completed", stage: "completed", progress: 1, signalsSummary: b.signalsSummary, updatedAt: t });
  await db.update("video_assets", job.assetId, { status: "ready", durationSec: b.durationSec });
  await recordReputation(job.agentId, "job_success");
  await recordActivity({ agentId: job.agentId, actorId: user.id, kind: "job.completed", message: "Clip processed successfully.", ref: { jobId: id } });
  if (valid.length)
    await recordActivity({ agentId: job.agentId, actorId: user.id, kind: "highlight.identified", message: `Agent identified ${valid.length} highlight${valid.length > 1 ? "s" : ""}.`, ref: { jobId: id } });
  return json({ job: updated, candidates: valid.length });
});
