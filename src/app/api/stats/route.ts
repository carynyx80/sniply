import { db } from "@/server/db";
import { handle, json } from "@/server/http";

/** Real platform counts for the homepage ticker. No estimates. */
export const GET = handle(async () => {
  const [clips, agents, verified, launches] = await Promise.all([
    db.count("clips", { status: "published" }),
    db.count("agents"),
    db.count("agent_identities", { status: "verified" }),
    db.count("token_launches"),
  ]);
  return json({ clips, agents, verified, launches });
});
