"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AttestPanel({ weaver }: { weaver: { _id: string; weaverId: string; name: string; village: string; craft: string; loom: string; status: string } }) {
  const router = useRouter();
  const [loomConfirmed, setLoomConfirmed] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevoke, setShowRevoke] = useState(false);

  async function attest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify/weavers/${weaver._id}/attest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loomConfirmed, identityConfirmed, method: "IN_PERSON" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Attestation failed");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify/weavers/${weaver._id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Revocation failed");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-maroon-900">{weaver.name}</h2>
          <p className="text-xs text-stone-500 font-mono">{weaver.weaverId}</p>
          <p className="mt-1 text-sm text-stone-600">{[weaver.craft, weaver.village, weaver.loom ? weaver.loom.replace(/_/g, " ").toLowerCase() + " loom" : null].filter(Boolean).join(" · ")}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${weaver.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-leaf-600/10 text-leaf-700"}`}>{weaver.status}</span>
      </div>
      {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">{error}</div>}

      {weaver.status === "PENDING" && (
        <div className="mt-4 space-y-2.5">
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={loomConfirmed} onChange={(e) => setLoomConfirmed(e.target.checked)} />
            <span>I physically saw the loom, and it is a <strong>handloom</strong> (no motor drive), at the declared location.</span>
          </label>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={identityConfirmed} onChange={(e) => setIdentityConfirmed(e.target.checked)} />
            <span>I verified the weaver&apos;s identity against their physical ID document, in person.</span>
          </label>
          <button onClick={attest} disabled={busy || !loomConfirmed || !identityConfirmed} className="btn-green w-full">
            {busy ? "Recording attestation…" : "✅ Attest (valid 730 days, ledger-anchored)"}
          </button>
        </div>
      )}

      {weaver.status === "VERIFIED" && (
        <div className="mt-4">
          {!showRevoke ? (
            <button onClick={() => setShowRevoke(true)} className="text-xs text-red-700 underline cursor-pointer">Revoke credential…</button>
          ) : (
            <div className="space-y-2">
              <input className="input" placeholder="Mandatory reason (public)" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={revoke} disabled={busy || !revokeReason.trim()} className="btn bg-red-700 text-white hover:bg-red-800 flex-1">Revoke</button>
                <button onClick={() => setShowRevoke(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
