# Architecture

```
Browser (Next.js App Router, React 19, Tailwind v4, Motion, TanStack Query, wagmi/viem)
 ├─ Highlight engine (src/lib/highlights.ts) — WebAudio decode, energy/flux/excitement, canvas scene-diff
 ├─ Clip editor — trims, thumbnails (canvas → JPEG), MediaRecorder export
 └─ Wallet — signs auth messages, launch txs, swaps. Never the server.
        │ fetch (JSON, multipart)
Next.js route handlers (src/app/api/*) — Zod validation, rate limits, session auth
 ├─ src/server/auth.ts     nonce + signature verification, HMAC session cookie, server-side admin list
 ├─ src/server/db.ts       Store interface → Supabase Postgres | local JSON (dev)
 ├─ src/server/storage.ts  Supabase Storage (private, signed URLs) | local files
 ├─ src/server/chain.ts    viem public clients; Agent ID registry reads
 ├─ src/server/launch.ts   launch receipt reconciliation (to/from/event/metadata checks)
 └─ src/server/domain.ts   activity, reputation, audit, public projections
```

## Processing pipeline
1. Upload → `/api/videos`: MIME allow-list, magic-byte sniffing, size cap, rights attestation, private storage.
2. `/api/jobs` creates an **idempotent** job (`owner_id + idempotency_key` unique).
3. Analysis worker reports progress and results through `PATCH /api/jobs/:id` (`progress | complete | fail`).
   - **This build:** the worker runs in the uploader's browser (real DSP on the real file).
   - **Production:** a dedicated worker (FFmpeg + transcription + vision model) uses the same endpoint contract. Queue: Supabase queues, Inngest or similar.
4. Candidates are stored, then reviewed and edited by the creator, then published as clips (non-destructive start/end over the source asset).
5. Each step writes `agent_activity` and `reputation_events` only when it actually happens.

## Why browser-side analysis now
There's no FFmpeg on the dev machine and no model credentials. Running real signal processing in the browser keeps the pipeline genuinely functional without pretending a server worker exists. The production worker plugs in behind the same API.

## Agent modes
- **Manual:** suggests only.
- **Assisted:** drafts clips and token metadata.
- **Autonomous:** may publish (non-financial) when the operator explicitly enables it.

`canLaunchTokens` is hard-false in code and enforced by a DB CHECK constraint.
