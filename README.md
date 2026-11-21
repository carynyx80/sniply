# Sniply

**Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.**

Sniply is an AI-native clipping and tokenization platform on BNB Chain. Creators upload footage they have rights to. A clipping agent ranks the best moments, the creator trims, captions and publishes them, and a published clip can get a BEP-20 market that the creator signs for in their own wallet.

## Quick start

```bash
npm install --legacy-peer-deps
cp .env.example .env.local     # everything is optional for local dev
npm run dev                    # http://localhost:3000
```

With no env vars set, Sniply uses a local JSON database (`.data/sniply.json`) and local file storage (`.data/uploads`), so the full product loop works offline: wallet sign-in → agent → upload → analysis → edit → publish → feed.

## What works today

| Area | Status |
|---|---|
| Homepage, Explore, Agents, Agent profiles, Leaderboard, Markets, Market page, Profiles, Admin, Report | ✅ Built. All data is real (empty states until people create content) |
| Wallet connect (injected incl. Binance Wallet / MetaMask, WalletConnect with project ID) | ✅ |
| Wallet-signature auth (nonce, domain-bound, replay-protected, HMAC session cookie) | ✅ Covered by E2E tests |
| Upload validation (MIME + magic bytes, size, rights attestation) | ✅ |
| Highlight detection (audio energy, spectral flux, local excitement, scene change → ranked windows) | ✅ Runs in the browser; unit-tested |
| Clip editor (trim handles, keyboard nudging, captions, aspect, thumbnail capture, WebM export, draft/publish) | ✅ |
| Agent Studio (create agents, modes, permission scopes, emergency pause, activity) | ✅ |
| Binance Agent ID verification (`balanceOf` on registry, BSC mainnet) | ⚠️ Implemented, but the registry address comes from community sources, not official Binance docs. See AGENT_ID_INTEGRATION.md |
| AI titles / captions / token metadata | ⚠️ Needs `ANTHROPIC_API_KEY`. Falls back to heuristic titles without it |
| Speech transcription & burned-in captions | ❌ Needs a transcription provider + FFmpeg worker (contract documented) |
| Token launch | ⚠️ Full flow built: draft → review → wallet-signed tx → on-chain receipt verification. **Turned off** until a verified launch contract is configured. See BLOCKCHAIN.md |
| Trading | ✅ PancakeSwap V2 quotes and swaps with exact-amount approvals, slippage control and receipt tracking. Only for Sniply-verified launches |
| Supabase backend | ✅ Adapter + migration with RLS written. Not run against a live project (no credentials) |

## Docs
- [ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) · [AGENT_ID_INTEGRATION.md](AGENT_ID_INTEGRATION.md) · [BLOCKCHAIN.md](BLOCKCHAIN.md) · [SECURITY.md](SECURITY.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [TESTING.md](TESTING.md)

## Brand
The logo mark in `public/brand/sniply-mark.png` was extracted from the supplied concept sheet (bottom-right concept) and is used as an alpha mask filled with the brand gradient. Please supply the original vector (SVG) to replace it; the current file is upscaled from a ~190px crop.
