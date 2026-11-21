"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Loader2, Lock, Pause, Play, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { AgentAvatar } from "@/components/agent-card";
import { Badge, Card, Eyebrow, Field, inputClass } from "@/components/ui/primitives";
import { Button, buttonClass } from "@/components/ui/button";
import { AGENT_ID_REGISTRY } from "@/lib/chain-config";
import type { Agent, AgentMode, PublicAgent } from "@/lib/types";
import { cn, shortAddr } from "@/lib/utils";

const MODES: { k: AgentMode; t: string; d: string }[] = [
  { k: "manual", t: "Manual", d: "Agent suggests clips. You approve everything." },
  { k: "assisted", t: "Assisted", d: "Agent prepares clip and token drafts. Publishing and any financial action need your approval." },
  { k: "autonomous", t: "Autonomous", d: "Agent may perform explicitly permitted non-financial tasks within limits. Financial actions stay disabled." },
];

export default function Page() {
  return (
    <Suspense>
      <Agents />
    </Suspense>
  );
}

function Agents() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const creating = params.get("new") === "1";
  const agents = useQuery({ queryKey: ["my-agents"], queryFn: () => fetch("/api/agents?mine=1").then((r) => r.json()).then((j) => j.agents as PublicAgent[]) });

  const list = agents.data ?? [];
  const current = list.find((a) => a.id === id) ?? (!creating ? list[0] : undefined);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Eyebrow>My agents</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Agents & identity</h1>
        </div>
        <button onClick={() => router.push("/studio/agents?new=1")} className={buttonClass("primary", "md")}>
          <Plus className="size-4" /> New agent
        </button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {list.map((a) => (
            <button
              key={a.id}
              onClick={() => router.push(`/studio/agents?id=${a.id}`)}
              className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", current?.id === a.id && !creating ? "border-pink/40 bg-pink/[0.06]" : "border-line bg-surface hover:border-line-strong")}
            >
              <AgentAvatar hue={a.avatarHue} verified={a.identity.verified} className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="text-[11px] capitalize text-dim">{a.mode}</p>
              </div>
            </button>
          ))}
          {!agents.isLoading && list.length === 0 && !creating && <p className="px-1 text-sm text-muted">No agents yet.</p>}
        </div>

        <div>
          {creating || list.length === 0 ? (
            <CreateAgent onCreated={(a) => router.push(`/studio/agents?id=${a.id}`)} />
          ) : current ? (
            <ManageAgent key={current.id} agent={current} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CreateAgent({ onCreated }: { onCreated: (a: Agent) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hue, setHue] = useState(230);
  const [mode, setMode] = useState<AgentMode>("assisted");
  const [prefs, setPrefs] = useState({ clipMinSec: 10, clipMaxSec: 30, suggestions: 5, category: "gaming", captionStyle: "bold" as const, aspect: "9:16" as const, autoDraft: true, notifyOnDraft: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description, avatarHue: hue, mode, preferences: prefs }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Failed");
    qc.invalidateQueries({ queryKey: ["my-agents"] });
    onCreated(j.agent);
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium tracking-tight">Create a clipping agent</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <AgentAvatar hue={hue} className="size-20 rounded-3xl" />
          <input type="range" min={0} max={360} value={hue} onChange={(e) => setHue(+e.target.value)} className="w-24" aria-label="Avatar color" />
        </div>
        <div className="space-y-4">
          <Field label="Agent name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Highlight Hound" />
          </Field>
          <Field label="Description">
            <textarea className={cn(inputClass, "min-h-20 resize-none")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} placeholder="Finds clutch plays and big reactions in FPS streams." />
          </Field>
        </div>
      </div>

      <p className="mt-7 text-[13px] font-medium">Operating mode</p>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {MODES.map((m) => (
          <button key={m.k} onClick={() => setMode(m.k)} className={cn("rounded-2xl border p-4 text-left transition", mode === m.k ? "border-pink/50 bg-pink/[0.06]" : "border-line bg-ink hover:border-line-strong")}>
            <p className="text-sm font-medium">{m.t}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{m.d}</p>
          </button>
        ))}
      </div>

      <p className="mt-7 text-[13px] font-medium">Clipping preferences</p>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Min length (s)">
          <input type="number" className={inputClass} value={prefs.clipMinSec} min={3} max={120} onChange={(e) => setPrefs({ ...prefs, clipMinSec: +e.target.value })} />
        </Field>
        <Field label="Max length (s)">
          <input type="number" className={inputClass} value={prefs.clipMaxSec} min={5} max={180} onChange={(e) => setPrefs({ ...prefs, clipMaxSec: +e.target.value })} />
        </Field>
        <Field label="Suggestions">
          <input type="number" className={inputClass} value={prefs.suggestions} min={1} max={12} onChange={(e) => setPrefs({ ...prefs, suggestions: +e.target.value })} />
        </Field>
        <Field label="Category">
          <select className={inputClass} value={prefs.category} onChange={(e) => setPrefs({ ...prefs, category: e.target.value })}>
            {["gaming", "livestreams", "podcasts", "entertainment", "sports", "music", "other"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Caption style">
          <select className={inputClass} value={prefs.captionStyle} onChange={(e) => setPrefs({ ...prefs, captionStyle: e.target.value as typeof prefs.captionStyle })}>
            {["bold", "minimal", "karaoke"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Format">
          <select className={inputClass} value={prefs.aspect} onChange={(e) => setPrefs({ ...prefs, aspect: e.target.value as typeof prefs.aspect })}>
            {["9:16", "16:9", "1:1"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <label className="col-span-2 flex items-center gap-2 self-end rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-muted">
          <input type="checkbox" checked={prefs.autoDraft} onChange={(e) => setPrefs({ ...prefs, autoDraft: e.target.checked })} className="accent-[#FF2BBE]" /> Auto-create drafts
          <input type="checkbox" checked={prefs.notifyOnDraft} onChange={(e) => setPrefs({ ...prefs, notifyOnDraft: e.target.checked })} className="ml-4 accent-[#FF2BBE]" /> Notify me
        </label>
      </div>

      {err && <p className="mt-4 text-sm text-bad">{err}</p>}
      <div className="mt-7 flex justify-end">
        <Button onClick={submit} disabled={busy || name.trim().length < 2}>
          {busy && <Loader2 className="size-4 animate-spin" />} Create agent
        </Button>
      </div>
    </Card>
  );
}

function ManageAgent({ agent }: { agent: PublicAgent }) {
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["agent", agent.id], queryFn: () => fetch(`/api/agents/${agent.id}`).then((r) => r.json()) });
  const perms = detail.data?.permissions as Agent["permissions"] | undefined;
  const [verifying, setVerifying] = useState(false);
  const [claimed, setClaimed] = useState(agent.identity.claimedName ?? "");
  const [vmsg, setVmsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setVmsg(null), [agent.id]);

  const patch = async (body: object) => {
    setSaving(true);
    await fetch(`/api/agents/${agent.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["my-agents"] });
    qc.invalidateQueries({ queryKey: ["agent", agent.id] });
  };

  const verify = async () => {
    setVerifying(true);
    setVmsg(null);
    const r = await fetch(`/api/agents/${agent.id}/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claimedName: claimed || undefined }) });
    const j = await r.json();
    setVerifying(false);
    if (!r.ok) return setVmsg({ ok: false, text: j.error });
    setVmsg(j.verified ? { ok: true, text: `Verified at block ${j.identity.verifiedAtBlock}.` } : { ok: false, text: j.reason });
    qc.invalidateQueries({ queryKey: ["my-agents"] });
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <AgentAvatar hue={agent.avatarHue} verified={agent.identity.verified} className="size-14 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{agent.name}</h2>
          <p className="text-sm text-muted">{agent.description || "No description"}</p>
        </div>
        <Link href={`/agent/${agent.slug}`} className={buttonClass("secondary", "sm")}>
          Public profile <ExternalLink className="size-3.5" />
        </Link>
      </Card>

      {/* Agent ID */}
      <Card className="relative overflow-hidden p-6">
        <div className="absolute right-0 top-0 h-32 w-64 rounded-full bg-blue/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-medium">
              {agent.identity.verified ? <BadgeCheck className="size-5 text-[#7e9bff]" /> : <ShieldAlert className="size-5 text-warn" />}
              Binance Agent ID
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              Sniply checks the Agent ID registry on BNB Chain for your signed-in wallet. If it holds an Agent ID, this agent gets a verified identity record tied to that wallet.
            </p>
          </div>
          <Badge tone={agent.identity.verified ? "blue" : "warn"}>{agent.identity.verified ? "Verified" : "Not verified"}</Badge>
        </div>

        {agent.identity.verified ? (
          <dl className="relative mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-ink p-3">
              <dt className="text-[11px] text-dim">Owner wallet · on-chain</dt>
              <dd className="mt-1 font-mono text-xs">{shortAddr(agent.identity.ownerWallet, 6)}</dd>
            </div>
            <div className="rounded-xl border border-line bg-ink p-3">
              <dt className="text-[11px] text-dim">Registry · BSC</dt>
              <dd className="mt-1 font-mono text-xs">{shortAddr(agent.identity.registry, 6)}</dd>
            </div>
            <div className="rounded-xl border border-line bg-ink p-3">
              <dt className="text-[11px] text-dim">Claimed name · unverified</dt>
              <dd className="mt-1 text-xs">{agent.identity.claimedName ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <div className="relative mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Your .ai name (optional, shown as unverified)" hint="The registry has no on-chain name lookup we can verify, so names are labelled as claimed.">
              <input className={inputClass} placeholder="hound.ai" value={claimed} onChange={(e) => setClaimed(e.target.value)} />
            </Field>
            <Button onClick={verify} disabled={verifying}>
              {verifying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Verify on BNB Chain
            </Button>
          </div>
        )}
        {vmsg && <p className={cn("relative mt-3 text-sm", vmsg.ok ? "text-ok" : "text-warn")}>{vmsg.text}</p>}
        <div className="relative mt-5 rounded-xl border border-line bg-ink/60 p-3.5 text-xs leading-relaxed text-dim">
          <p>
            Don’t have one yet? Agent IDs are issued through the Binance Wallet app (Wallet tab → Agent ID). Registry{" "}
            <a className="font-mono underline decoration-dotted hover:text-white" target="_blank" rel="noreferrer" href={`https://bscscan.com/address/${AGENT_ID_REGISTRY.address}`}>
              {shortAddr(AGENT_ID_REGISTRY.address, 6)}
            </a>
            {!AGENT_ID_REGISTRY.verifiedByOfficialDocs && " (we haven’t confirmed this registry address against official Binance docs yet; it’s configurable)."}
          </p>
        </div>
      </Card>

      {/* Mode + permissions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Operating mode & permissions</h3>
          {saving && <Loader2 className="size-4 animate-spin text-muted" />}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {MODES.map((m) => (
            <button key={m.k} onClick={() => patch({ mode: m.k })} className={cn("rounded-2xl border p-4 text-left transition", agent.mode === m.k ? "border-pink/50 bg-pink/[0.06]" : "border-line bg-ink hover:border-line-strong")}>
              <p className="text-sm font-medium">{m.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{m.d}</p>
            </button>
          ))}
        </div>
        {perms && (
          <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
            <Toggle label="Draft clips" desc="Create clip drafts from analysis results." on={perms.canDraftClips} locked />
            <Toggle label="Draft token metadata" desc="Suggest names, tickers and descriptions for your review." on={perms.canDraftTokens} onChange={(v) => patch({ canDraftTokens: v })} />
            <Toggle
              label="Publish clips without review"
              desc={agent.mode === "autonomous" ? "Non-financial. Only for content you’ve authorized." : "Only available in Autonomous mode."}
              on={perms.canPublishClips}
              onChange={agent.mode === "autonomous" ? (v) => patch({ canPublishClips: v }) : undefined}
              locked={agent.mode !== "autonomous"}
            />
            <Toggle label="Launch tokens / spend funds" desc="Disabled platform-wide until Agentic Wallet spending limits and transaction validation are verified. Every launch is signed by you." on={false} locked lockIcon />
          </div>
        )}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-ink p-4">
          <div>
            <p className="text-sm font-medium">{perms?.paused ? "Agent paused" : "Emergency pause"}</p>
            <p className="text-xs text-muted">Immediately stops new jobs and drafts for this agent.</p>
          </div>
          <Button variant={perms?.paused ? "secondary" : "danger"} size="sm" onClick={() => patch({ paused: !perms?.paused })}>
            {perms?.paused ? <><Play className="size-3.5" /> Resume</> : <><Pause className="size-3.5" /> Pause</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Toggle({ label, desc, on, onChange, locked, lockIcon }: { label: string; desc: string; on: boolean; onChange?: (v: boolean) => void; locked?: boolean; lockIcon?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm">{lockIcon && <Lock className="size-3.5 text-dim" />}{label}</p>
        <p className="mt-0.5 text-xs text-muted">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={locked || !onChange}
        onClick={() => onChange?.(!on)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40", on ? "bg-pink" : "bg-white/10")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}
