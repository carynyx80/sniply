import { isAddress } from "viem";
import { db } from "@/server/db";
import { HttpError } from "@/server/auth";
import { handle, json } from "@/server/http";
import { toPublicAgent, toPublicClip } from "@/server/domain";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ wallet: string }> }) => {
  const { wallet } = await ctx.params;
  if (!isAddress(wallet)) throw new HttpError(400, "Bad address");
  const user = await db.findOne("users", { wallet: wallet.toLowerCase() });
  if (!user) return json({ user: null, agents: [], clips: [], launches: [] });
  const [agents, clips, launches] = await Promise.all([
    db.list("agents", { operatorId: user.id }),
    db.list("clips", { creatorId: user.id, status: "published" }),
    db.list("token_launches", { creatorId: user.id }),
  ]);
  return json({
    user: { wallet: user.wallet, username: user.username, bio: user.bio, createdAt: user.createdAt },
    agents: await Promise.all(agents.map((a) => toPublicAgent(a, false))),
    clips: await Promise.all(clips.map(toPublicClip)),
    launches,
  });
});
