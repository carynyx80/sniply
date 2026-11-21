import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Sniply: Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg: string, file: string) => readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

/** Paper background, serif headline, italic ink-blue second line, hairline rule + caption and URL. */
export default async function OG() {
  const [serif, serifItalic, sans] = await Promise.all([
    font("instrument-serif", "instrument-serif-latin-400-normal.woff"),
    font("instrument-serif", "instrument-serif-latin-400-italic.woff"),
    font("instrument-sans", "instrument-sans-latin-400-normal.woff"),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#f4f1ea", display: "flex", flexDirection: "column", padding: "72px 80px 56px", color: "#15130f" }}>
        <div style={{ fontFamily: "Sans", fontSize: 22, letterSpacing: 2, color: "#736c62", textTransform: "uppercase" }}>Sniply</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", fontFamily: "Serif", fontSize: 104, lineHeight: 0.98, letterSpacing: -2 }}>
          <span>The Internet Has Moments.</span>
          <span style={{ fontFamily: "SerifItalic", color: "#2b37d4" }}>Agents Make Them Markets.</span>
        </div>
        <div style={{ marginTop: 56, borderTop: "1px solid #d4cec1", paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40, fontFamily: "Sans", fontSize: 19, color: "#48433b" }}>
          <span style={{ maxWidth: 760 }}>Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.</span>
          <span style={{ color: "#736c62", flexShrink: 0 }}>sniply-carynyx1.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Serif", data: serif, style: "normal", weight: 400 },
        { name: "SerifItalic", data: serifItalic, style: "italic", weight: 400 },
        { name: "Sans", data: sans, style: "normal", weight: 400 },
      ],
    },
  );
}
