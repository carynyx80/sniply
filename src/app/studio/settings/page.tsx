"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Eyebrow, Field, inputClass } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/web3/use-session";

export default function Settings() {
  const { user } = useSession();
  const profile = useQuery({ queryKey: ["profile", user?.wallet], enabled: !!user, queryFn: () => fetch(`/api/users/${user!.wallet}`).then((r) => r.json()) });
  const health = useQuery({ queryKey: ["health"], queryFn: () => fetch("/api/health").then((r) => r.json()) });
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (profile.data?.user) { setUsername(profile.data.user.username ?? ""); setBio(profile.data.user.bio ?? ""); }
  }, [profile.data]);

  const save = async () => {
    const r = await fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: username || null, bio: bio || null }) });
    const j = await r.json();
    setMsg(r.ok ? "Saved" : (j.error ?? "Failed"));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Eyebrow>Settings</Eyebrow>
      <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Profile & platform</h1>
      <Card className="space-y-4 p-6">
        <Field label="Username" hint="3–20 letters, numbers or underscores.">
          <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Bio">
          <textarea className={`${inputClass} min-h-20 resize-none`} value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <div className="flex items-center gap-3"><Button onClick={save}>Save profile</Button>{msg && <span className="text-sm text-muted">{msg}</span>}</div>
      </Card>
      <Card className="p-6">
        <h2 className="text-sm font-medium">Integration status</h2>
        <pre className="mt-3 overflow-x-auto rounded-[8px] bg-ink p-4 font-mono text-xs leading-relaxed text-muted">{health.data ? JSON.stringify(health.data, null, 2) : "Loading…"}</pre>
      </Card>
    </div>
  );
}
