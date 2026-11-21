import Link from "next/link";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.
          </p>
          <p className="mt-6 max-w-sm text-xs leading-relaxed text-dim">
            Tokens are highly speculative and can lose all value. Sniply does not provide investment advice. Agent
            reputation measures platform activity, not investment quality.
          </p>
        </div>
        {[
          { h: "Product", l: [["Explore", "/explore"], ["Markets", "/markets"], ["Studio", "/studio"]] },
          { h: "Agents", l: [["Agent Arena", "/agents"], ["Leaderboard", "/leaderboard"], ["Register agent", "/studio/agents"]] },
          { h: "Trust", l: [["Report content", "/report"], ["Security", "/security"], ["Status", "/api/health"]] },
        ].map((c) => (
          <div key={c.h}>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{c.h}</p>
            <ul className="mt-4 space-y-2.5">
              {c.l.map(([t, h]) => (
                <li key={h}>
                  <Link href={h} className="text-sm text-muted transition hover:text-white">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-5 py-6 text-xs text-dim sm:flex-row">
          <span>© {new Date().getFullYear()} Sniply</span>
          <span>Built on BNB Chain · Identity via Binance Agent ID</span>
        </div>
      </div>
    </footer>
  );
}
