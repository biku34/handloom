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
        <div className="rounded-2xl bg-white p-4 ring-1 ring-silk-200">
          <p className="text-sm font-bold text-maroon-900">Ready to go public?</p>
          <p className="mt-1 text-xs text-stone-500">Issuing the passport creates the QR tag buyers scan to meet you.</p>
          <button onClick={mint} disabled={busy} className="btn-green btn-lg mt-3 w-full">
            {busy ? "Issuing…" : "Issue the Digital Passport"}
          </button>
        </div>
      )}
      {(status === "MINTED" || status === "FLAGGED") && !frozen && (
        <form onSubmit={recordEvent} className="rounded-2xl bg-white p-4 ring-1 ring-silk-200 space-y-3">
          <div>
            <p className="text-sm font-bold text-maroon-900">Add a journey step</p>
            <p className="mt-0.5 text-xs text-stone-500">Buyers see each step on the piece&apos;s public page.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Journey step">
            {EVENT_OPTIONS.map(([v, l]) => {
              const on = eventType === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setEventType(v)}
                  className={`min-h-10 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition-colors ${
                    on ? "bg-maroon-800 text-white ring-maroon-800" : "bg-white text-stone-700 ring-silk-300 hover:ring-maroon-600"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          {eventType === "DISPATCHED" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              Dispatching seals the record permanently — nothing can be edited afterwards.
            </p>
          )}
          <input className="input" placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary btn-lg w-full" disabled={busy}>{busy ? "Recording…" : "Add to the journey"}</button>
        </form>
      )}
      {frozen && (
        <p className="flex gap-2.5 rounded-2xl bg-silk-100 px-4 py-3 text-sm text-stone-600 ring-1 ring-silk-300">
          <span aria-hidden="true">🔒</span>
          This record was sealed at dispatch and can no longer be changed — that is the guarantee buyers rely on.
        </p>
      )}
    </div>
  );
}
