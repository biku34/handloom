"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  ["HANDLOOM_MARK", "Handloom Mark"],
  ["SILK_MARK", "Silk Mark"],
  ["GI", "GI (Geographical Indication)"],
  ["INDIA_HANDLOOM_BRAND", "India Handloom Brand"],
  ["ORGANIC", "Organic"],
  ["FAIR_TRADE", "Fair Trade"],
] as const;

type Cert = { type: string; number?: string; issuedBy?: string };

export default function CertificatesPanel({ productId, certificates }: { productId: string; certificates: Cert[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: "SILK_MARK", number: "", issuedBy: "", issuedAt: "", validUntil: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Could not add certificate");
      setF({ type: "SILK_MARK", number: "", issuedBy: "", issuedAt: "", validUntil: "" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-maroon-900">Certificates</h2>
        {!open && <button onClick={() => setOpen(true)} className="btn-secondary text-xs px-3 py-1.5">Add certificate</button>}
      </div>

      {certificates.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {certificates.map((c, i) => (
            <span key={i} className="rounded-full bg-silk-100 border border-silk-300 text-maroon-800 px-3 py-1 text-xs font-bold">
              {c.type.replace(/_/g, " ")}{c.number ? ` #${c.number}` : ""}
            </span>
          ))}
        </div>
      ) : (
        !open && <p className="mt-2 text-sm text-stone-500">No certificates yet — add Silk Mark, Handloom Mark, GI, etc.</p>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 border-t border-silk-200 pt-4 space-y-3">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-xs">{error}</div>}
          <div>
            <label className="label">Type</label>
            <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Certificate number</label>
            <input className="input" value={f.number} onChange={(e) => set("number", e.target.value)} placeholder="e.g. SM-9912-2026" required />
          </div>
          <div>
            <label className="label">Issued by (optional)</label>
            <input className="input" value={f.issuedBy} onChange={(e) => set("issuedBy", e.target.value)} placeholder="e.g. Silk Mark Organisation of India" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Issued on</label>
              <input type="date" className="input" value={f.issuedAt} onChange={(e) => set("issuedAt", e.target.value)} />
            </div>
            <div>
              <label className="label">Valid until</label>
              <input type="date" className="input" value={f.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy || !f.number}>{busy ? "Adding…" : "Add certificate"}</button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
