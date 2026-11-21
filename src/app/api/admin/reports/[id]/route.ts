import { z } from "zod";
import { db } from "@/server/db";
import { requireAdmin, HttpError } from "@/server/auth";
import { handle, json } from "@/server/http";
import { audit } from "@/server/domain";

const Body = z.object({ status: z.enum(["actioned", "dismissed"]) });

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { status } = Body.parse(await req.json());
  const r = await db.get("content_reports", id);
  if (!r) throw new HttpError(404, "Report not found");
  const updated = await db.update("content_reports", id, { status });
  await audit(admin.id, `report.${status}`, id);
  return json({ report: updated });
});
