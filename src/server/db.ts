import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type * as T from "@/lib/types";

/**
 * Storage abstraction with two backends sharing one code path:
 *  - Supabase Postgres (production) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 *    Uses the service role server-side only; RLS policies protect direct client access.
 *  - Local JSON file at .data/sniply.json (development, zero-config).
 * Rows are camelCase in TS, snake_case in Postgres.
 */

export type Tables = {
  users: T.User;
  agents: T.Agent;
  agent_identities: T.AgentIdentity;
  video_assets: T.VideoAsset;
  processing_jobs: T.ProcessingJob;
  clip_candidates: T.ClipCandidate;
  clips: T.Clip;
  token_drafts: T.TokenDraft;
  launch_attempts: T.LaunchAttempt;
  token_launches: T.TokenLaunch;
  agent_activity: T.ActivityEvent;
  reputation_events: T.ReputationEvent;
  content_reports: T.ContentReport;
  audit_logs: T.AuditLog;
  engagement_events: T.EngagementEvent;
  auth_nonces: { id: string; nonce: string; createdAt: string; usedAt: string | null };
};
export type TableName = keyof Tables;

const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapKeys = (o: Record<string, unknown>, f: (s: string) => string) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [f(k), v]));

type Where<R> = Partial<R>;

interface Store {
  list<K extends TableName>(t: K, where?: Where<Tables[K]>, opts?: { limit?: number; order?: keyof Tables[K]; desc?: boolean; offset?: number }): Promise<Tables[K][]>;
  get<K extends TableName>(t: K, id: string): Promise<Tables[K] | null>;
  findOne<K extends TableName>(t: K, where: Where<Tables[K]>): Promise<Tables[K] | null>;
  insert<K extends TableName>(t: K, row: Omit<Tables[K], "id"> & { id?: string }): Promise<Tables[K]>;
  update<K extends TableName>(t: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K] | null>;
  count<K extends TableName>(t: K, where?: Where<Tables[K]>): Promise<number>;
}

/* ───────────── Local JSON backend ───────────── */

const DATA_DIR = path.resolve(process.cwd(), process.env.SNIPLY_DATA_DIR ?? ".data");
const DB_FILE = path.join(DATA_DIR, "sniply.json");
type Snapshot = { [K in TableName]?: Tables[K][] };

let cache: Snapshot | null = null;
let chain: Promise<unknown> = Promise.resolve();

async function load(): Promise<Snapshot> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as Snapshot;
  } catch {
    cache = {};
  }
  return cache;
}
async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(cache, null, 1));
  await fs.rename(tmp, DB_FILE);
}
/** Serialize writes so concurrent requests can't clobber each other. */
function locked<R>(fn: () => Promise<R>): Promise<R> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}
const matches = <R,>(row: R, where?: Where<R>) =>
  !where || Object.entries(where).every(([k, v]) => (row as Record<string, unknown>)[k] === v);

const localStore: Store = {
  async list(t, where, opts = {}) {
    const db = await load();
    let rows = ((db[t] ?? []) as Tables[typeof t][]).filter((r) => matches(r, where));
    const order = (opts.order ?? "createdAt") as string;
    rows = [...rows].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[order] ?? "");
      const bv = String((b as Record<string, unknown>)[order] ?? "");
      return (opts.desc ?? true) ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    const off = opts.offset ?? 0;
    return rows.slice(off, opts.limit ? off + opts.limit : undefined);
  },
  async get(t, id) {
    const db = await load();
    return ((db[t] ?? []) as Tables[typeof t][]).find((r) => (r as { id: string }).id === id) ?? null;
  },
  async findOne(t, where) {
    const db = await load();
    return ((db[t] ?? []) as Tables[typeof t][]).find((r) => matches(r, where)) ?? null;
  },
  insert(t, row) {
    return locked(async () => {
      const db = await load();
      const full = { ...row, id: row.id ?? randomUUID() } as Tables[typeof t];
      (db[t] as unknown[]) = [...((db[t] as unknown[]) ?? []), full];
      await persist();
      return full;
    });
  },
  update(t, id, patch) {
    return locked(async () => {
      const db = await load();
      const rows = (db[t] ?? []) as Tables[typeof t][];
      const i = rows.findIndex((r) => (r as { id: string }).id === id);
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...patch };
      await persist();
      return rows[i];
    });
  },
  async count(t, where) {
    const db = await load();
    return ((db[t] ?? []) as Tables[typeof t][]).filter((r) => matches(r, where)).length;
  },
};

/* ───────────── Supabase backend ───────────── */

function supabaseStore(sb: SupabaseClient): Store {
  const out = <R,>(r: unknown) => mapKeys(r as Record<string, unknown>, toCamel) as R;
  const inp = (r: object) => mapKeys(r as Record<string, unknown>, toSnake);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyWhere = (q: any, where?: object): any => {
    for (const [k, v] of Object.entries(where ?? {})) q = q.eq(toSnake(k), v);
    return q;
  };
  return {
    async list(t, where, opts = {}) {
      let q = sb.from(t).select("*");
      q = applyWhere(q, where);
      q = q.order(toSnake(String(opts.order ?? "createdAt")), { ascending: !(opts.desc ?? true) });
      const off = opts.offset ?? 0;
      if (opts.limit) q = q.range(off, off + opts.limit - 1);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => out(r));
    },
    async get(t, id) {
      const { data, error } = await sb.from(t).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? out(data) : null;
    },
    async findOne(t, where) {
      const { data, error } = await applyWhere(sb.from(t).select("*"), where).limit(1).maybeSingle();
      if (error) throw error;
      return data ? out(data) : null;
    },
    async insert(t, row) {
      const { data, error } = await sb.from(t).insert(inp(row)).select("*").single();
      if (error) throw error;
      return out(data);
    },
    async update(t, id, patch) {
      const { data, error } = await sb.from(t).update(inp(patch)).eq("id", id).select("*").maybeSingle();
      if (error) throw error;
      return data ? out(data) : null;
    },
    async count(t, where) {
      const { count, error } = await applyWhere(sb.from(t).select("*", { count: "exact", head: true }), where);
      if (error) throw error;
      return count ?? 0;
    },
  };
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const backend: "supabase" | "local" = url && key ? "supabase" : "local";
export const db: Store =
  backend === "supabase" ? supabaseStore(createClient(url!, key!, { auth: { persistSession: false } })) : localStore;

export const now = () => new Date().toISOString();
