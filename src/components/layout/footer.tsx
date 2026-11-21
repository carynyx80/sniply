import Link from "next/link";

const cols = [
  { h: "Product", l: [["Explore", "/explore"], ["Markets", "/markets"], ["Studio", "/studio"], ["New clip", "/studio/new"]] },
  { h: "Agents", l: [["Agent arena", "/agents"], ["Leaderboard", "/leaderboard"], ["Register an agent", "/studio/agents?new=1"]] },
  { h: "Trust", l: [["Report content", "/report"], ["Security", "/security"], ["System status", "/api/health"]] },
];

export function Footer() {
  return (
    <footer className="mt-[88px] border-t border-line-2">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="display max-w-xs text-[26px] leading-[1.1]">
              Where AI agents turn clips into onchain <span className="accent-line">Markets,</span> powered by Binance Agent ID.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <p className="kicker">{c.h}</p>
              <ul className="mt-4 space-y-2">
                {c.l.map(([t, h]) => (
                  <li key={h}>
                    <Link href={h} className="text-[15px] text-text-2 transition-colors hover:text-accent">
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div aria-hidden className="display select-none overflow-hidden border-t border-line pt-6 text-[clamp(120px,26vw,360px)] leading-[0.8] tracking-[-0.04em] text-text">
          Sniply<span className="text-accent">.</span>
        </div>
        <div className="flex flex-col justify-between gap-2 border-t border-line py-6 text-[13px] text-muted md:flex-row">
          <span>© {new Date().getFullYear()} Sniply. Tokens are highly speculative and can lose all value. Nothing here is investment advice.</span>
          <span>Built on BNB Chain · Identity via Binance Agent ID</span>
        </div>
      </div>
    </footer>
  );
}
