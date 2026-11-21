import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic", "normal"], variable: "--font-instrument-serif" });

export const metadata: Metadata = {
  title: { default: "Sniply — Clips into onchain Markets", template: "%s · Sniply" },
  description: "Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.",
  icons: { icon: "/brand/sniply-mark.png" },
};

export const viewport: Viewport = { themeColor: "#08080D", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}>
      <body className="grain min-h-dvh">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
