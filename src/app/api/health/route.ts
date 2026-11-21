import { backend } from "@/server/db";
import { launchEnabled, LAUNCHPAD, NETWORK, AGENT_ID_REGISTRY } from "@/lib/chain-config";
import { json } from "@/server/http";
import { treasury } from "@/server/treasury";

export async function GET() {
  return json({
    ok: true,
    database: backend,
    network: NETWORK,
    launchpad: launchEnabled() ? (LAUNCHPAD.kind === "flap" ? "flap (Tax Token V3, 1% tax, creator + Sniply commission)" : "configured") : "disabled (no verified launch contract configured)",
    agentIdRegistry: { address: AGENT_ID_REGISTRY.address, verifiedByOfficialDocs: AGENT_ID_REGISTRY.verifiedByOfficialDocs },
    // Public address only — the treasury cannot be signed for or spent from by Sniply.
    treasury: { address: treasury.address, chainId: treasury.chainId, mode: "read-only" },
    ai: {
      textModel: process.env.ANTHROPIC_API_KEY ? "configured" : "not configured",
      transcription: process.env.TRANSCRIPTION_API_KEY ? "configured" : "not configured",
    },
  });
}
