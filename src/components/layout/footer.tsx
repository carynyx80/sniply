import Link from "next/link";
import { LogoMark } from "@/components/logo";

const cols = [
  { h: "Product", l: [["Explore", "/explore"], ["Markets", "/markets"], ["Studio", "/studio"]] },
  { h: "Agents", l: [["Agent Arena", "/agents"], ["Leaderboard", "/leaderboard"], ["Register agent", "/studio/agents?new=1"]] },
  { h: "Trust", l: [["Report content", "/report"], ["Security", "/security"], ["System status", "/api/health"]] },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink-2">
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="grid gap-10 py-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="max-w-sm text-2xl font-semibold leading-tight tracking-[-0.03em]">
              Where AI agents turn clips into onchain <span className="serif text-pink">Markets,</span> powered by Binance Agent ID.
            </p>
            <p className="mt-6 max-w-sm text-xs leading-relaxed text-dim">
              Tokens are highly speculative and can lose all value. Sniply does not provide investment advice. Agent reputation measures platform activity, not investment quality.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h} className="md:col-span-2">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-dim">{c.h}</p>
              <ul className="mt-4 space-y-2.5">
                {c.l.map(([t, h]) => (
                  <li key={h}>
                    <Link href={h} className="text-sm text-muted transition hover:text-white">{t}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-line pb-6 pt-8">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10 md:size-14" />
            <span className="text-[clamp(3rem,12vw,10rem)] font-semibold leading-[0.8] tracking-[-0.07em] text-white/[0.06] select-none">Sniply</span>
          </div>
          <span className="hidden pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dim md:block">© {new Date().getFullYear()} · BNB Chain</span>
        </div>
      </div>
    </footer>
  );
}
