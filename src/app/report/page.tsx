"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flag } from "lucide-react";
import { Card, Field, PageHeader, inputClass } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default function Page() {
  return <Suspense><Report /></Suspense>;
}

function Report() {
  const clipId = useSearchParams().get("clip");
  const [reason, setReason] = useState("copyright");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const send = async () => {
    setState("sending");
    const r = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clipId, reason, details }) });
    if (r.ok) setState("done");
    else { setErr((await r.json()).error ?? "Failed"); setState("error"); }
  };
  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-32">
      <PageHeader eyebrow="Trust & safety" title="Report content" sub="Copyright takedowns, spam, harmful or misleading content. Reports go to the moderation queue and every action is audit-logged." />
      <Card className="space-y-5 p-6">
        {state === "done" ? (
          <div className="py-8 text-center"><Flag className="mx-auto size-8 text-ok" /><p className="mt-4 font-medium">Report received</p><p className="mt-1 text-sm text-muted">Moderators will review it.</p></div>
        ) : (
          <>
            {clipId && <p className="font-mono text-xs text-dim">Clip {clipId}</p>}
            <Field label="Reason">
              <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="copyright">Copyright / I own this content</option>
                <option value="spam">Spam</option>
                <option value="harmful">Harmful or abusive</option>
                <option value="misleading">Misleading financial claims</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Details" hint={reason === "copyright" ? "Include the original work, your relationship to it, and how to contact you." : "At least 10 characters."}>
              <textarea className={`${inputClass} min-h-32 resize-none`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
            </Field>
            {state === "error" && <p className="text-sm text-bad">{err}</p>}
            <Button onClick={send} disabled={details.trim().length < 10 || state === "sending"}>Submit report</Button>
          </>
        )}
      </Card>
    </main>
  );
}
