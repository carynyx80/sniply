import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Wrap a route handler: maps HttpError / ZodError to clean JSON errors. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof ZodError) return json({ error: "Invalid input", issues: e.issues }, 400);
      console.error(e);
      return json({ error: "Internal error" }, 500);
    }
  };
}

/** Fixed-window in-memory rate limiter. Use Upstash/Redis in multi-instance production. */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < t) {
    buckets.set(key, { n: 1, reset: t + windowMs });
    return;
  }
  if (++b.n > limit) throw new HttpError(429, "Too many requests — slow down");
}

export function clientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
