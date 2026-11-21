# Database

Migration: `supabase/migrations/0001_init.sql`. TypeScript mirror: `src/lib/types.ts` (camelCase ↔ snake_case handled in `src/server/db.ts`).

Tables: users, wallet_identities, auth_nonces, agents, agent_operators, agent_permissions, agent_identities, video_sources, video_assets, processing_jobs, clip_candidates, clips, token_drafts, launch_attempts, token_launches, market_data, engagement_events, agent_activity, reputation_events, content_reports, audit_logs.

Key guarantees:
- **Verified vs unverified identity:** `agents` holds operator-supplied profile data. `agent_identities` holds server-written, RPC-verified records (owner wallet, registry, chain, block). There's one active identity per agent (partial unique index).
- **Idempotency:** `processing_jobs (owner_id, idempotency_key)` is unique. `launch_attempts.tx_hash` is unique.
- **No duplicate launches:** only one pending or confirmed attempt per draft, and `token_launches.clip_id`/`draft_id` are unique.
- **One like per user:** partial unique index on `engagement_events`.
- **No financial autonomy:** CHECK on `agents.permissions`.
- **RLS:** on for every table. Anon clients can read only published clips, agents, verified identities, launches, activity and reputation. All writes go through validated server routes using the service role.
- **Pagination:** `offset/limit` on list endpoints. Indexes cover feed (`status, published_at desc`), per-agent and per-owner lookups.

Apply: `supabase db push` (or paste into the SQL editor), then set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

Note: the Supabase adapter does filtering for some feed views (category, tokenized, trending) in application code. Before large scale, move those into SQL/RPC.
