import { z } from "zod";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";

const Body = z.object({
  kind: z.enum(["clip_title", "token"]),
  context: z.object({
    filename: z.string().max(200).optional(),
    category: z.string().max(30).optional(),
    title: z.string().max(100).optional(),
    caption: z.string().max(300).optional(),
    reasons: z.array(z.string().max(80)).max(8).optional(),
  }),
});

const SYSTEM = `You help creators on Sniply, a clipping platform. Return ONLY compact JSON.
Never make price predictions, return promises, or financial claims. Never impersonate real people or brands.
For kind=clip_title return {"titles":[3 short punchy titles <= 60 chars],"caption":"<= 120 chars"}.
For kind=token return {"name":"<= 32 chars","symbol":"3-8 uppercase letters","description":"<= 200 chars, descriptive, no hype about value"}.`;

/** Configurable model provider. Uses Anthropic Messages API when ANTHROPIC_API_KEY is set. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`ai:${user.id}`, 30, 3_600_000);
  const b = Body.parse(await req.json());
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new HttpError(503, "AI provider not configured (set ANTHROPIC_API_KEY). Heuristic suggestions are used instead.");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_TEXT_MODEL ?? "claude-haiku-5-5",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(b) }],
    }),
  });
  if (!r.ok) throw new HttpError(502, `AI provider error ${r.status}`);
  const data = (await r.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((c) => c.type === "text")?.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  let parsed: unknown;
  try {
    parsed = JSON.parse(match?.[0] ?? "{}");
  } catch {
    throw new HttpError(502, "AI returned malformed output");
  }
  if (b.kind === "token") {
    const T = z.object({ name: z.string().max(32), symbol: z.string().regex(/^[A-Z0-9]{2,10}$/), description: z.string().max(240) });
    return json({ suggestion: T.parse(parsed), provider: "anthropic" });
  }
  const C = z.object({ titles: z.array(z.string().max(80)).max(5), caption: z.string().max(160) });
  return json({ suggestion: C.parse(parsed), provider: "anthropic" });
});
