# Deployment

1. **Supabase:** create a project, run `supabase/migrations/0001_init.sql`, and confirm the private bucket `sniply-media` exists.
2. **Vercel:** import the repo. Install command: `npm install --legacy-peer-deps`. Set env vars from `.env.example`. At minimum: `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_WALLETS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `BSC_RPC_URL`, `BSC_TESTNET_RPC_URL`.
3. **Uploads at scale:** Vercel functions cap request bodies (~4.5 MB). For real video sizes, switch the client to `signedUploadUrl()` (in `src/server/storage.ts`) and upload directly to Supabase Storage, or use Mux/Cloudflare Stream direct uploads.
4. **Worker:** deploy a container (Railway/Fly) with FFmpeg + a transcription provider that consumes `processing_jobs` and calls the same `PATCH /api/jobs/:id` contract.
5. **Launchpad (optional):** after an audit, deploy `SniplyTokenFactory` to BSC Testnet. Set `NEXT_PUBLIC_LAUNCHPAD=sniply-factory` and `NEXT_PUBLIC_SNIPLY_FACTORY_ADDRESS`.
6. **Rate limiting:** replace the in-memory limiter with Upstash Redis.

## External services & credentials
| Service | Env | Required for |
|---|---|---|
| Supabase | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | Production DB + storage |
| BNB RPC provider | BSC_RPC_URL, BSC_TESTNET_RPC_URL | Reliable Agent ID checks, launch verification |
| WalletConnect | NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID | Mobile wallets |
| Anthropic | ANTHROPIC_API_KEY | AI titles, captions, token metadata |
| Transcription (e.g. Whisper-compatible) | TRANSCRIPTION_API_KEY | Subtitles in the worker |
| Mux / Cloudflare Stream (optional) | — | Transcoding & adaptive streaming |
| Bitquery / Codex (optional) | — | USD prices, historical volume |
