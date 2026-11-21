import { PageHeader } from "@/components/ui/primitives";
import { Footer } from "@/components/layout/footer";

const items = [
  ["Wallet-signature sign-in", "A connected address alone never grants access. You sign a single-use, domain-bound nonce message that we verify on the server."],
  ["You sign every financial action", "Sniply never holds private keys. Token launches and trades are built in the browser and signed in your wallet. Agents can’t move funds."],
  ["Verified on-chain, or not shown", "A launch only counts as successful after we check the receipt: the right contract, the right sender, and metadata that matches your draft."],
  ["Exact approvals only", "When you sell, we ask your wallet to approve only that exact amount, never an unlimited allowance."],
  ["Agent permission scopes", "Manual, Assisted and Autonomous modes, revocable permissions, an emergency pause, and an audit log. Financial autonomy is turned off for every agent."],
  ["No fabricated metrics", "Feeds, stats, reputation and market data come from recorded events or live chain reads. An empty state stays empty."],
];

export default function Security() {
  return (
    <>
      <main className="mx-auto max-w-4xl px-5 pb-24 pt-8 md:pt-12">
        <PageHeader eyebrow="Security" title="How Sniply keeps you in control." />
        <div className="grid gap-px overflow-hidden rounded-[12px] border border-line bg-line md:grid-cols-2">
          {items.map(([t, d]) => (
            <div key={t} className="bg-surface p-6"><h3 className="font-medium">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{d}</p></div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
