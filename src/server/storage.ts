import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Object storage. Supabase Storage (private bucket, signed URLs) in production;
 * local .data/uploads served through /api/media (auth-free read of published media only
 * would be enforced via signed URLs in production).
 */
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "sniply-media";
const UP_DIR = path.resolve(process.cwd(), process.env.SNIPLY_DATA_DIR ?? ".data", "uploads");
const sb =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

export const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"] as const;
export const MAX_VIDEO_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024;

export function safeKey(key: string) {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes("..")) throw new Error("Bad storage key");
  return key;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  safeKey(key);
  if (sb) {
    const { error } = await sb.storage.from(BUCKET).upload(key, body, { contentType, upsert: false });
    if (error) throw error;
    return key;
  }
  const p = path.join(UP_DIR, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  return key;
}

/** Signed upload URL for large direct-to-storage uploads (Supabase only). */
export async function signedUploadUrl(key: string) {
  if (!sb) return null;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(safeKey(key));
  if (error) throw error;
  return data;
}

export async function mediaUrl(key: string | null) {
  if (!key) return null;
  if (sb) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(key, 60 * 60);
    return data?.signedUrl ?? null;
  }
  return `/api/media/${key}`;
}

/** Read an object's bytes (used to send a clip thumbnail to the launchpad's IPFS). */
export async function getObject(key: string): Promise<Buffer> {
  safeKey(key);
  if (sb) {
    const { data, error } = await sb.storage.from(BUCKET).download(key);
    if (error || !data) throw error ?? new Error("Object not found");
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFile(path.join(UP_DIR, key));
}

export function localPath(key: string) {
  return path.join(UP_DIR, safeKey(key));
}
