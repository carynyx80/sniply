import { db, backend } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { handle, json } from "@/server/http";

export const GET = handle(async () => {
  await requireAdmin();
  const [users, agents, identities, assets, jobs, clips, launches, attempts, reports, audit] = await Promise.all([
    db.count("users"),
    db.count("agents"),
    db.count("agent_identities", { status: "verified" }),
    db.count("video_assets"),
    db.list("processing_jobs", undefined, { limit: 50 }),
    db.list("clips", undefined, { limit: 50 }),
    db.count("token_launches"),
    db.list("launch_attempts", undefined, { limit: 50 }),
    db.list("content_reports", undefined, { limit: 100 }),
    db.list("audit_logs", undefined, { limit: 100 }),
  ]);
  return json({
    counts: { users, agents, verifiedAgents: identities, videos: assets, launches, openReports: reports.filter((r) => r.status === "open").length },
    jobs,
    clips,
    failedAttempts: attempts.filter((a) => a.status !== "confirmed" && a.status !== "pending"),
    reports,
    audit,
    health: { database: backend },
  });
});
