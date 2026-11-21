import { backend } from "@/server/db";
import { launchEnabled, NETWORK, AGENT_ID_REGISTRY } from "@/lib/chain-config";
import { json } from "@/server/http";

export async function GET() {
  return json({
    ok: true,
    database: backend,
    network: NETWORK,
    launchpad: launchEnabled() ? "configured" : "disabled (no verified launch contract configured)",
    agentIdRegistry: { address: AGENT_ID_REGISTRY.address, verifiedByOfficialDocs: AGENT_ID_REGISTRY.verifiedByOfficialDocs },
    ai: {
      textModel: process.env.ANTHROPIC_API_KEY ? "configured" : "not configured",
      transcription: process.env.TRANSCRIPTION_API_KEY ? "configured" : "not configured",
    },
  });
}
