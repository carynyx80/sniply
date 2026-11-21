import { promises as fs, createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { localPath } from "@/server/storage";

const TYPES: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", jpg: "image/jpeg", png: "image/png" };

/** Local-dev media server with HTTP Range support (production uses signed storage URLs). */
export async function GET(req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  let p: string;
  try {
    p = localPath(key.join("/"));
  } catch {
    return new Response("Bad key", { status: 400 });
  }
  const stat = await fs.stat(p).catch(() => null);
  if (!stat) return new Response("Not found", { status: 404 });
  const type = TYPES[p.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), stat.size - 1) : Math.min(start + 4 * 1024 * 1024, stat.size - 1);
    const stream = Readable.toWeb(createReadStream(p, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { "content-type": type, "content-range": `bytes ${start}-${end}/${stat.size}`, "accept-ranges": "bytes", "content-length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(p)) as ReadableStream;
  return new Response(stream, { headers: { "content-type": type, "content-length": String(stat.size), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" } });
}
