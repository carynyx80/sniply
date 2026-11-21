"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useBalance, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { formatEther, keccak256, toBytes } from "viem";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, Lock, Rocket, Wand2 } from "lucide-react";
import { Badge, Card, Eyebrow, Field, inputClass } from "@/components/ui/primitives";
import { Button, buttonClass } from "@/components/ui/button";
import { ConnectButton } from "@/components/web3/connect-button";
import { activeChain, explorerBase, LAUNCHPAD, launchEnabled } from "@/lib/chain-config";
import type { LaunchAttempt, PublicClip, TokenDraft, TokenLaunch } from "@/lib/types";
import { cn } from "@/lib/utils";

const factoryAbi = [
  { type: "function", name: "createToken", stateMutability: "payable", inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "clipRef", type: "bytes32" }], outputs: [{ type: "address" }] },
  { type: "function", name: "creationFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export default function LaunchPage({ params }: { params: Promise<{ clipId: string }> }) {
  const { clipId } = use(params);
  const qc = useQueryClient();
  const clip = useQuery({ queryKey: ["clip", clipId], queryFn: () => fetch(`/api/clips/${clipId}`).then((r) => r.json()).then((j) => j.clip as PublicClip) });
  const drafts = useQuery({ queryKey: ["my-drafts"], queryFn: () => fetch("/api/tokens/drafts").then((r) => r.json()).then((j) => j.drafts as TokenDraft[]) });
  const draft = drafts.data?.filter((d) => d.clipId === clipId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState({ x: "", telegram: "", website: "" });
  const [busy, setBusy] = useState<null | "ai" | "draft">(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (clip.data && !name) {
      const words = clip.data.title.replace(/[^a-zA-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
      setName(clip.data.title.slice(0, 32));
      setSymbol(words.slice(0, 3).map((w) => w[0]).join("").toUpperCase().padEnd(3, "X").slice(0, 6));
      setDescription(`Community token for the Sniply clip “${clip.data.title}”.`.slice(0, 240));
    }
  }, [clip.data, name]);

  const suggest = async () => {
    setBusy("ai");
    setMsg(null);
    const r = await fetch("/api/ai/suggest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "token", context: { title: clip.data?.title, caption: clip.data?.caption, category: clip.data?.category } }) });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) return setMsg(j.error);
    setName(j.suggestion.name);
    setSymbol(j.suggestion.symbol);
    setDescription(j.suggestion.description);
  };

  const saveDraft = async () => {
    setBusy("draft");
    setMsg(null);
    const r = await fetch("/api/tokens/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clipId, name, symbol, description, links }) });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) return setMsg(j.error);
    qc.invalidateQueries({ queryKey: ["my-drafts"] });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/studio/clips?tab=published" className="flex items-center gap-1.5 text-sm text-muted hover:text-white"><ArrowLeft className="size-4" /> Clips</Link>
      <Eyebrow className="mt-6">Token launchpad · BNB Chain</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Launch a market for this clip</h1>

      <div className="mt-8 grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit overflow-hidden">
          <div className="relative aspect-[9/16] bg-ink">
            {clip.data && <video src={`${clip.data.videoUrl}#t=${clip.data.startSec}`} poster={clip.data.thumbnailUrl ?? undefined} muted playsInline controls className="size-full object-cover" />}
          </div>
          <div className="p-4">
            <p className="text-sm font-medium">{clip.data?.title ?? "…"}</p>
            {clip.data?.agent && <p className="mt-1 text-xs text-muted">Agent · {clip.data.agent.name}{clip.data.agent.verified ? " (Agent ID verified)" : ""}</p>}
          </div>
        </Card>

        <div className="space-y-4">
          <Steps current={!draft ? 0 : draft.status === "confirmed" ? 3 : draft.status === "submitted" ? 2 : 1} />

          {!draft || draft.status === "failed" ? (
            <Card className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">1 · Token metadata</h2>
                <Button variant="secondary" size="sm" onClick={suggest} disabled={busy !== null}>
                  {busy === "ai" ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} Agent suggestion
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Field label="Token name"><input className={inputClass} value={name} maxLength={32} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="Symbol"><input className={cn(inputClass, "font-mono uppercase")} value={symbol} maxLength={10} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></Field>
              </div>
              <Field label="Description" hint="Describe the clip. No price predictions or return promises (they’re rejected).">
                <textarea className={cn(inputClass, "min-h-24 resize-none")} value={description} maxLength={240} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["x", "telegram", "website"] as const).map((k) => (
                  <Field key={k} label={k === "x" ? "X (optional)" : `${k[0].toUpperCase() + k.slice(1)} (optional)`}>
                    <input className={inputClass} placeholder="https://" value={links[k]} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} />
                  </Field>
                ))}
              </div>
              {msg && <p className="text-sm text-warn">{msg}</p>}
              <div className="flex justify-end">
                <Button onClick={saveDraft} disabled={busy !== null || name.length < 2 || symbol.length < 2}>
                  {busy === "draft" && <Loader2 className="size-4 animate-spin" />} Save draft for review
                </Button>
              </div>
            </Card>
          ) : (
            <LaunchPanel draft={draft} />
          )}
        </div>
      </div>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  const s = ["Metadata", "Review & sign", "On-chain confirmation", "Market live"];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {s.map((x, i) => (
        <div key={x}>
          <div className={cn("h-1 rounded-full", i < current ? "bg-ok" : i === current ? "bg-brand" : "bg-white/10")} />
          <p className={cn("mt-2 text-[11px]", i <= current ? "text-white" : "text-dim")}>{x}</p>
        </div>
      ))}
    </div>
  );
}

function LaunchPanel({ draft }: { draft: TokenDraft }) {
  const qc = useQueryClient();
  const enabled = launchEnabled();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const balance = useBalance({ address, chainId: activeChain.id });
  const fee = useReadContract({ address: enabled ? (LAUNCHPAD.factoryAddress as `0x${string}`) : undefined, abi: factoryAbi, functionName: "creationFee", chainId: activeChain.id, query: { enabled } });
  const { writeContractAsync, isPending } = useWriteContract();
  const [ack, setAck] = useState(false);
  const [attempt, setAttempt] = useState<LaunchAttempt | null>(null);
  const [launch, setLaunch] = useState<TokenLaunch | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // poll pending attempts until the server reconciles them against the chain
  useEffect(() => {
    if (!attempt || (attempt.status !== "pending" && attempt.status !== "unknown")) return;
    const t = setInterval(async () => {
      const j = await fetch(`/api/launches/${attempt.id}`).then((r) => r.json());
      if (j.attempt) setAttempt(j.attempt);
      if (j.launch) {
        setLaunch(j.launch);
        qc.invalidateQueries({ queryKey: ["my-drafts"] });
      }
    }, 4000);
    return () => clearInterval(t);
  }, [attempt, qc]);

  const insufficient = fee.data !== undefined && balance.data && balance.data.value < fee.data;

  const go = async () => {
    setErr(null);
    try {
      const clipRef = keccak256(toBytes(draft.clipId));
      const hash = await writeContractAsync({
        address: LAUNCHPAD.factoryAddress as `0x${string}`,
        abi: factoryAbi,
        functionName: "createToken",
        args: [draft.name, draft.symbol, clipRef],
        value: fee.data ?? BigInt(0),
        chainId: activeChain.id,
      });
      const r = await fetch("/api/launches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftId: draft.id, txHash: hash }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setAttempt(j.attempt);
    } catch (e) {
      setErr((e as Error).message.split("\n")[0]);
    }
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="bg-brand grid size-12 place-items-center rounded-[10px] text-lg font-bold">{draft.symbol[0]}</span>
          <div>
            <p className="font-medium">{draft.name}</p>
            <p className="font-mono text-sm text-muted">${draft.symbol} · BEP-20</p>
          </div>
        </div>
        <Badge tone={draft.status === "confirmed" ? "ok" : draft.status === "submitted" ? "warn" : "neutral"}>{draft.status}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted">{draft.description}</p>

      {!enabled ? (
        <div className="rounded-[10px] border border-warn/30 bg-warn/[0.06] p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-warn"><Lock className="size-4" /> Launching is not available yet</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your draft is saved. On-chain launch is turned off until an operator configures a verified launch contract on BNB Chain. We haven’t found official integration docs for an existing BNB launchpad, so Sniply ships an auditable factory contract (<span className="font-mono text-xs">contracts/SniplyTokenFactory.sol</span>). It needs a security review and a testnet deployment before it can be switched on.
          </p>
          <p className="mt-3 text-xs text-dim">Nothing has been submitted to any chain. No fees have been charged.</p>
        </div>
      ) : launch ? (
        <div className="rounded-[10px] border border-ok/30 bg-ok/[0.06] p-5">
          <p className="flex items-center gap-2 font-medium text-ok"><CheckCircle2 className="size-4" /> Confirmed on {activeChain.name}</p>
          <p className="mt-2 break-all font-mono text-xs text-muted">{launch.tokenAddress}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/market/${launch.tokenAddress}`} className={buttonClass("primary", "sm")}>Open market</Link>
            <a href={`${explorerBase(launch.chainId)}/tx/${launch.txHash}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>Explorer <ExternalLink className="size-3.5" /></a>
          </div>
        </div>
      ) : attempt ? (
        <div className="rounded-[10px] border border-line bg-ink p-5">
          <p className="flex items-center gap-2 text-sm font-medium">
            {attempt.status === "reverted" ? <AlertTriangle className="size-4 text-bad" /> : <Loader2 className="size-4 animate-spin text-pink" />}
            {attempt.status === "pending" && "Waiting for on-chain confirmation…"}
            {attempt.status === "unknown" && "Status uncertain — retrying RPC…"}
            {attempt.status === "reverted" && "Launch failed"}
          </p>
          {attempt.error && <p className="mt-2 text-xs text-bad">{attempt.error}</p>}
          <a href={`${explorerBase(attempt.chainId)}/tx/${attempt.txHash}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-white">
            {attempt.txHash.slice(0, 18)}… <ExternalLink className="size-3" />
          </a>
        </div>
      ) : (
        <>
          <dl className="divide-y divide-line rounded-[10px] border border-line text-sm">
            <Row k="Network" v={activeChain.name} />
            <Row k="Launch contract" v={<span className="font-mono text-xs">{LAUNCHPAD.factoryAddress}</span>} />
            <Row k="Creation fee" v={fee.data !== undefined ? `${formatEther(fee.data)} ${activeChain.nativeCurrency.symbol}` : "Reading…"} />
            <Row k="Your balance" v={balance.data ? `${Number(formatEther(balance.data.value)).toFixed(4)} ${balance.data.symbol}` : "—"} />
            <Row k="Plus" v="Network gas (shown by your wallet)" />
          </dl>
          <label className="flex gap-3 text-[13px] leading-relaxed text-muted">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[#FF2BBE]" />
            I reviewed the metadata. I understand tokens are highly speculative, may have no value, and this transaction can’t be undone.
          </label>
          {err && <p className="text-sm text-bad">{err}</p>}
          {!isConnected ? (
            <ConnectButton />
          ) : chainId !== activeChain.id ? (
            <Button onClick={() => switchChain({ chainId: activeChain.id })}>Switch to {activeChain.name}</Button>
          ) : (
            <Button size="lg" className="w-full" onClick={go} disabled={!ack || isPending || !!insufficient || fee.data === undefined}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
              {insufficient ? "Insufficient balance" : isPending ? "Confirm in wallet…" : "Sign & launch"}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted">{k}</dt>
      <dd className="truncate text-right">{v}</dd>
    </div>
  );
}
