import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

// Self-hosted (no build-time network): Instrument Serif, Instrument Sans, JetBrains Mono.
const serif = localFont({
  variable: "--font-instrument-serif",
  display: "swap",
  src: [
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
});
const sans = localFont({
  variable: "--font-instrument-sans",
  display: "swap",
  src: [
    { path: "../../node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});
const mono = localFont({
  variable: "--font-jetbrains-mono",
  display: "swap",
  src: [
    { path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sniply-carynyx1.vercel.app"),
  title: { default: "Sniply · Clips into onchain markets", template: "%s · Sniply" },
  description: "Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.",
};

export const viewport: Viewport = { themeColor: "#f4f1ea", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
