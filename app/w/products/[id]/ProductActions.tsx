"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EVENT_OPTIONS = [
  ["WEAVING_STARTED", "Weaving started"],
  ["WEAVING_COMPLETED", "Weaving completed"],
  ["FINISHED", "Finishing done"],
  ["QC_PASSED", "Quality checked"],
  ["DISPATCHED", "Dispatched (seals the record)"],
];

export default function ProductActions({ productId, status, frozen }: { productId: string; status: string; frozen: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [eventType, setEventType] = useState("WEAVING_COMPLETED");
  const [note, setNote] = useState("");

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/mint`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Could not issue passport");
      setSecret(data.tagSecret);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function recordEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Could not record event");
      setNote("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
      {secret && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Scratch-panel secret — shown only once</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-maroon-900 text-center">{secret}</p>
        </div>
      )}
      {status !== "MINTED" && status !== "FLAGGED" && status !== "VOID" && (
        <button onClick={mint} disabled={busy} className="btn-green w-full">
          {busy ? "Issuing…" : "Issue the Digital Passport"}
        </button>
      )}
      {(status === "MINTED" || status === "FLAGGED") && !frozen && (
        <form onSubmit={recordEvent} className="card p-4 space-y-3">
          <p className="text-sm font-bold text-maroon-900">Record a journey event</p>
          <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input className="input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Recording…" : "Add to the journey"}</button>
        </form>
      )}
      {frozen && (
        <p className="rounded-xl bg-silk-100 border border-silk-300 px-4 py-3 text-sm text-stone-600">
          This record was sealed at dispatch and can no longer be changed — that is the guarantee buyers rely on.
        </p>
      )}
    </div>
  );
}
