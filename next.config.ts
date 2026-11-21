import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Separate output dir for local prod builds/E2E so they don't clobber `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  webpack: (config) => {
    // wagmi/connectors re-exports optional connectors whose SDKs we don't ship.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@coinbase/wallet-sdk": false,
      "@metamask/connect-evm": false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
      accounts: false,
      "mppx/client": false,
    };
    config.externals = [...(config.externals ?? []), "pino-pretty", "lokijs", "encoding"];
    return config;
  },
  /**
   * Split deployment: when BACKEND_URL is set (Vercel frontend), every /api/* request is
   * proxied to the Railway backend. Same-origin from the browser's view, so the session
   * cookie keeps working. On Railway BACKEND_URL is unset and the route handlers run locally.
   */
  async rewrites() {
    const backend = process.env.BACKEND_URL?.replace(/\/$/, "");
    if (!backend) return { beforeFiles: [], afterFiles: [], fallback: [] };
    return { beforeFiles: [{ source: "/api/:path*", destination: `${backend}/api/:path*` }], afterFiles: [], fallback: [] };
  },
  async redirects() {
    const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sniply.ink";
    const legacyHosts = [
      "sniply-carynyx1.vercel.app",
      "sniply-git-main-carynyx1.vercel.app",
      "sniply-taupe.vercel.app",
      "sniply-api-production-1501f285.up.railway.app", // backend: only /api stays here
    ];
    // Everything except /api/* (the backend proxy + health checks) moves to the canonical site.
    return legacyHosts.map((host) => ({
      source: "/:path((?!api/).*)",
      has: [{ type: "host" as const, value: host }],
      destination: `${canonical}/:path`,
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
