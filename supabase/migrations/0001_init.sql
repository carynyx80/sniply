-- Sniply initial schema. Server uses the service role; RLS protects any direct client (anon/auth) access.
-- Column names are snake_case mirrors of src/lib/types.ts.
create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  wallet text not null unique check (wallet ~ '^0x[0-9a-f]{40}$'),
  username text unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  bio text check (char_length(bio) <= 200),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table auth_nonces (
  id uuid primary key default gen_random_uuid(),
  nonce text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index on auth_nonces (created_at);

-- Off-chain agent profile (user supplied, unverified)
create table agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  operator_id uuid not null references users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  description text not null default '',
  avatar_hue int not null check (avatar_hue between 0 and 360),
  mode text not null check (mode in ('manual','assisted','autonomous')),
  permissions jsonb not null,
  preferences jsonb not null,
  created_at timestamptz not null default now(),
  -- financial autonomy is disabled platform-wide
  constraint no_financial_autonomy check ((permissions->>'canLaunchTokens')::boolean is not true)
);
create index on agents (operator_id);

-- Verified on-chain identity (written only by server after RPC check)
create table agent_identities (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  owner_wallet text not null,
  registry text not null,
  chain_id int not null,
  balance text not null,
  verified_at_block text not null,
  verified_at timestamptz not null,
  status text not null check (status in ('verified','revoked')),
  claimed_name text
);
create unique index one_active_identity_per_agent on agent_identities (agent_id) where status = 'verified';

create table video_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  filename text not null,
  mime text not null,
  bytes bigint not null check (bytes > 0),
  duration_sec double precision,
  storage_path text not null unique,
  rights_attested boolean not null check (rights_attested),
  status text not null check (status in ('uploaded','processing','ready','failed')),
  created_at timestamptz not null default now()
);
create index on video_assets (owner_id, created_at desc);

create table processing_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references video_assets(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  owner_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('queued','analyzing','ranking','completed','failed')),
  stage text not null,
  progress real not null default 0,
  error text,
  signals_summary jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);
create index on processing_jobs (owner_id, created_at desc);
create index on processing_jobs (status) where status not in ('completed','failed');

create table clip_candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references processing_jobs(id) on delete cascade,
  asset_id uuid not null references video_assets(id) on delete cascade,
  start_sec double precision not null,
  end_sec double precision not null check (end_sec > start_sec),
  score real not null,
  reasons text[] not null,
  suggested_title text not null,
  status text not null check (status in ('suggested','draft','published','rejected')),
  created_at timestamptz not null default now()
);
create index on clip_candidates (job_id);

create table clips (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references clip_candidates(id) on delete set null,
  asset_id uuid not null references video_assets(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  creator_id uuid not null references users(id) on delete cascade,
  title text not null,
  caption text not null default '',
  category text not null,
  start_sec double precision not null,
  end_sec double precision not null,
  aspect text not null check (aspect in ('9:16','16:9','1:1')),
  thumbnail_path text,
  status text not null check (status in ('draft','published','removed')),
  likes int not null default 0,
  views int not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  check (end_sec - start_sec between 2 and 180)
);
create index on clips (status, published_at desc);
create index on clips (agent_id) where status = 'published';
create index on clips (creator_id);

create table token_drafts (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips(id) on delete cascade,
  creator_id uuid not null references users(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  name text not null,
  symbol text not null check (symbol ~ '^[A-Z0-9]{2,10}$'),
  description text not null,
  links jsonb not null default '{}',
  status text not null check (status in ('draft','submitted','confirmed','failed')),
  created_at timestamptz not null default now()
);

create table launch_attempts (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references token_drafts(id) on delete cascade,
  creator_id uuid not null references users(id),
  chain_id int not null,
  tx_hash text not null unique,
  status text not null check (status in ('pending','confirmed','reverted','unknown')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- prevent duplicate submissions per draft
create unique index one_live_attempt_per_draft on launch_attempts (draft_id) where status in ('pending','confirmed');

create table token_launches (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references token_drafts(id),
  clip_id uuid not null unique references clips(id),
  agent_id uuid references agents(id) on delete set null,
  creator_id uuid not null references users(id),
  chain_id int not null,
  token_address text not null,
  tx_hash text not null unique,
  block_number text not null,
  name text not null,
  symbol text not null,
  confirmed_at timestamptz not null,
  unique (chain_id, token_address)
);

-- Cached snapshots from verified data providers (optional; UI reads chain directly)
create table market_data (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid not null references token_launches(id) on delete cascade,
  source text not null,
  price_native numeric,
  liquidity_native numeric,
  volume_24h_native numeric,
  captured_at timestamptz not null default now()
);
create index on market_data (launch_id, captured_at desc);

create table engagement_events (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  kind text not null check (kind in ('view','like','share')),
  created_at timestamptz not null default now()
);
create unique index one_like_per_user on engagement_events (clip_id, user_id) where kind = 'like';
create index on engagement_events (clip_id, kind);

create table agent_activity (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  kind text not null,
  message text not null,
  ref jsonb,
  created_at timestamptz not null default now()
);
create index on agent_activity (agent_id, created_at desc);

create table reputation_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  kind text not null,
  delta int not null,
  created_at timestamptz not null default now()
);
create index on reputation_events (agent_id, created_at);

create table content_reports (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid references clips(id) on delete set null,
  reporter_id uuid references users(id) on delete set null,
  reason text not null check (reason in ('copyright','spam','harmful','misleading','other')),
  details text not null,
  status text not null check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now()
);
create index on content_reports (status, created_at desc);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  target text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index on audit_logs (created_at desc);

-- Agent operators: future multi-operator support
create table agent_operators (
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','editor')),
  primary key (agent_id, user_id)
);

-- Wallet identities: additional wallets linked to a user via signature
create table wallet_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  wallet text not null unique,
  verified_at timestamptz not null default now()
);

-- Agent permissions history (audit of scope changes)
create table agent_permissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  permissions jsonb not null,
  changed_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- Video sources: authorized external sources (future)
create table video_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('upload','url','livestream')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────── Row Level Security ─────────
-- Enable on every table. The app server uses the service role (bypasses RLS).
-- Public read policies expose only published/verified data to anon clients.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create policy "public read published clips" on clips for select using (status = 'published');
create policy "public read agents" on agents for select using (true);
create policy "public read verified identities" on agent_identities for select using (status = 'verified');
create policy "public read launches" on token_launches for select using (true);
create policy "public read activity" on agent_activity for select using (true);
create policy "public read reputation" on reputation_events for select using (true);
create policy "public read market data" on market_data for select using (true);
-- No anon/auth write policies: all writes go through validated server routes.

-- Storage: private bucket; access via short-lived signed URLs only.
insert into storage.buckets (id, name, public) values ('sniply-media', 'sniply-media', false) on conflict do nothing;
