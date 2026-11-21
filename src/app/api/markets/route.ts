import { db } from "@/server/db";
import { handle, json } from "@/server/http";
import { toPublicClip } from "@/server/domain";

/** Markets = only tokens whose launch was confirmed on-chain. Live metrics are read client-side from the chain. */
export const GET = handle(async () => {
  const launches = await db.list("token_launches", undefined, { order: "confirmedAt" });
  const out = await Promise.all(
    launches.map(async (l) => {
      const clip = await db.get("clips", l.clipId);
      return { ...l, clip: clip && clip.status === "published" ? await toPublicClip(clip) : null };
    }),
  );
  return json({ markets: out });
});
