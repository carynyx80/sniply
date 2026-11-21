import { z } from "zod";
import { getAddress, isAddress, verifyMessage } from "viem";
import { db, now } from "@/server/db";
import { createSession, HttpError } from "@/server/auth";
import { clientKey, handle, json, rateLimit } from "@/server/http";

const Body = z.object({
  address: z.string().refine(isAddress),
  message: z.string().min(20).max(2000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export const POST = handle(async (req: Request) => {
  rateLimit(`verify:${clientKey(req)}`, 10, 60_000);
  const { address, message, signature } = Body.parse(await req.json());

  // Message must bind to this host, this address, and a fresh unused nonce.
  // Accept the direct host, the proxy's forwarded host (Vercel → Railway), and explicitly allowed hosts.
  const allowed = [
    req.headers.get("host"),
    req.headers.get("x-forwarded-host"),
    ...(process.env.ALLOWED_AUTH_HOSTS ?? "").split(","),
  ]
    .map((h) => h?.trim())
    .filter(Boolean) as string[];
  const msgHost = message.split(" wants you to sign in")[0];
  if (!allowed.includes(msgHost)) throw new HttpError(400, "Domain mismatch");
  if (!message.includes(`\n${getAddress(address)}\n`)) throw new HttpError(400, "Address mismatch");
  const nonce = /Nonce: ([a-f0-9]{32})/.exec(message)?.[1];
  if (!nonce) throw new HttpError(400, "Missing nonce");
  const rec = await db.findOne("auth_nonces", { nonce });
  if (!rec || rec.usedAt) throw new HttpError(400, "Nonce invalid or used");
  if (Date.now() - new Date(rec.createdAt).getTime() > 10 * 60_000) throw new HttpError(400, "Nonce expired");

  const ok = await verifyMessage({ address: getAddress(address), message, signature: signature as `0x${string}` });
  if (!ok) throw new HttpError(401, "Signature does not match wallet");
  await db.update("auth_nonces", rec.id, { usedAt: now() });

  const wallet = address.toLowerCase();
  let user = await db.findOne("users", { wallet });
  if (!user) user = await db.insert("users", { wallet, username: null, bio: null, avatarUrl: null, createdAt: now() });
  await createSession(user.id);
  return json({ ok: true });
});
