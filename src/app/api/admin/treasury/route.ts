import { requireAdmin } from "@/server/auth";
import { handle, json } from "@/server/http";
import { getTreasuryStatus } from "@/server/treasury";

/** Admin-only: live, read-only treasury status from BNB Smart Chain mainnet. */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  return json({ treasury: await getTreasuryStatus(force) });
});
