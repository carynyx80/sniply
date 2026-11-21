import { randomUUID } from "node:crypto";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";
import { ALLOWED_VIDEO, MAX_VIDEO_BYTES, mediaUrl, putObject } from "@/server/storage";

const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/x-matroska": "mkv" };

/** Validate container magic bytes — never trust the client MIME type alone. */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm"; // EBML (webm/mkv)
  return null;
}

export const GET = handle(async () => {
  const user = await requireUser();
  const assets = await db.list("video_assets", { ownerId: user.id });
  return json({ assets: await Promise.all(assets.map(async (a) => ({ ...a, url: await mediaUrl(a.storagePath) }))) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`upload:${user.id}`, 20, 3_600_000);
  const form = await req.formData();
  const file = form.get("file");
  const rights = form.get("rightsAttested") === "true";
  const agentId = (form.get("agentId") as string) || null;
  const durationSec = Number(form.get("durationSec")) || null;
  if (!(file instanceof File)) throw new HttpError(400, "No file");
  if (!rights) throw new HttpError(403, "You must confirm you have the rights to process this video");
  if (file.size > MAX_VIDEO_BYTES) throw new HttpError(413, `Max ${Math.round(MAX_VIDEO_BYTES / 1048576)} MB`);
  if (!(ALLOWED_VIDEO as readonly string[]).includes(file.type)) throw new HttpError(415, "Unsupported video type");
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniff(buf);
  if (!sniffed) throw new HttpError(415, "File content is not a supported video container");
  if (agentId) {
    const agent = await db.get("agents", agentId);
    if (!agent || agent.operatorId !== user.id) throw new HttpError(403, "Not your agent");
    if (agent.permissions.paused) throw new HttpError(409, "Agent is paused");
  }
  const id = randomUUID();
  const key = `videos/${user.id}/${id}.${EXT[file.type] ?? "mp4"}`;
  await putObject(key, buf, file.type);
  const asset = await db.insert("video_assets", {
    id,
    ownerId: user.id,
    agentId,
    filename: file.name.slice(0, 200),
    mime: file.type,
    bytes: file.size,
    durationSec,
    storagePath: key,
    rightsAttested: true,
    status: "uploaded",
    createdAt: now(),
  });
  return json({ asset: { ...asset, url: await mediaUrl(key) } }, 201);
});
