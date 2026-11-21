import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/layout/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sniply — Clips into onchain Markets", template: "%s · Sniply" },
  description: "Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.",
  icons: { icon: "/brand/sniply-mark.png" },
};

export const viewport: Viewport = { themeColor: "#08080D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="grain min-h-dvh">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
