import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";

const Body = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,20}$/).nullable().optional(),
  bio: z.string().trim().max(200).nullable().optional(),
});

export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const b = Body.parse(await req.json());
  if (b.username) {
    const taken = await db.findOne("users", { username: b.username });
    if (taken && taken.id !== user.id) return json({ error: "Username taken" }, 409);
  }
  return json({ user: await db.update("users", user.id, b) });
});
