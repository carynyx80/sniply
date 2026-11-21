import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import type { User } from "@/lib/types";

const COOKIE = "sniply_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET (>=32 chars) is required in production");
  return "dev-only-insecure-session-secret-change-me-please";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function newNonce() {
  return randomBytes(16).toString("hex");
}

export async function createSession(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, mac] = parts;
  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return db.get("users", userId);
}

/** Admins are configured server-side only (ADMIN_WALLETS). Never trust a client flag. */
export function isAdmin(user: User | null) {
  if (!user) return false;
  const list = (process.env.ADMIN_WALLETS ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(user.wallet.toLowerCase());
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Sign in with your wallet first");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (!isAdmin(u)) throw new HttpError(403, "Admin only");
  return u;
}
