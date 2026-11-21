import { db, now } from "@/server/db";
import { newNonce } from "@/server/auth";
import { clientKey, handle, json, rateLimit } from "@/server/http";

export const POST = handle(async (req: Request) => {
  rateLimit(`nonce:${clientKey(req)}`, 20, 60_000);
  const nonce = newNonce();
  await db.insert("auth_nonces", { nonce, createdAt: now(), usedAt: null });
  return json({ nonce });
});
