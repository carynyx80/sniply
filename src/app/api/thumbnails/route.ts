import { randomUUID } from "node:crypto";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";
import { putObject } from "@/server/storage";

/** Thumbnails are captured client-side from the video frame and uploaded as JPEG. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`thumb:${user.id}`, 60, 3_600_000);
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > 2 * 1024 * 1024) throw new HttpError(413, "Thumbnail too large");
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) throw new HttpError(415, "JPEG required");
  const key = `thumbs/${user.id}/${randomUUID()}.jpg`;
  await putObject(key, buf, "image/jpeg");
  return json({ key }, 201);
});
