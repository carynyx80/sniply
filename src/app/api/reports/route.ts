import { z } from "zod";
import { db, now } from "@/server/db";
import { currentUser } from "@/server/auth";
import { clientKey, handle, json, rateLimit } from "@/server/http";

const Body = z.object({
  clipId: z.string().uuid().nullable(),
  reason: z.enum(["copyright", "spam", "harmful", "misleading", "other"]),
  details: z.string().trim().min(10).max(2000),
});

export const POST = handle(async (req: Request) => {
  rateLimit(`report:${clientKey(req)}`, 10, 3_600_000);
  const b = Body.parse(await req.json());
  const user = await currentUser();
  const report = await db.insert("content_reports", { ...b, reporterId: user?.id ?? null, status: "open", createdAt: now() });
  return json({ ok: true, id: report.id }, 201);
});
