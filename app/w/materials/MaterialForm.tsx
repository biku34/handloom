"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  ["SILK_YARN", "Silk yarn"],
  ["COTTON_YARN", "Cotton yarn"],
  ["WOOL_YARN", "Wool yarn"],
  ["ZARI", "Zari"],
  ["DYE", "Dye"],
] as const;

const CERTS = [
  ["NONE", "None"],
  ["SILK_MARK", "Silk Mark"],
  ["HANDLOOM_HANK", "Handloom hank"],
  ["AZO_FREE", "Azo-free"],
  ["ORGANIC", "Organic"],
] as const;

export default function MaterialForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    type: "SILK_YARN", supplierName: "", colour: "", quantityGrams: "", certification: "NONE",
    denier: "", ply: "", dyeChemistry: "", isHankYarn: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const isYarn = ["SILK_YARN", "COTTON_YARN", "WOOL_YARN"].includes(f.type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, quantityGrams: Number(f.quantityGrams), denier: f.denier ? Number(f.denier) : undefined, ply: f.ply ? Number(f.ply) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Could not register lot");
      setF({ type: "SILK_YARN", supplierName: "", colour: "", quantityGrams: "", certification: "NONE", denier: "", ply: "", dyeChemistry: "", isHankYarn: true });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        Register a material lot
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <h2 className="font-display text-lg font-bold text-maroon-900">New material lot</h2>
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Material</label>
          <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantity (grams) *</label>
          <input className="input" inputMode="numeric" value={f.quantityGrams} onChange={(e) => set("quantityGrams", e.target.value)} placeholder="e.g. 5000" required />
        </div>
        <div>
          <label className="label">Supplier</label>
          <input className="input" value={f.supplierName} onChange={(e) => set("supplierName", e.target.value)} placeholder="Who did you buy it from?" />
        </div>
        <div>
          <label className="label">Colour</label>
          <input className="input" value={f.colour} onChange={(e) => set("colour", e.target.value)} placeholder="e.g. Peacock Blue" />
        </div>
        <div>
          <label className="label">Certification</label>
          <select className="input" value={f.certification} onChange={(e) => set("certification", e.target.value)}>
            {CERTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {isYarn ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Denier</label>
              <input className="input" inputMode="numeric" value={f.denier} onChange={(e) => set("denier", e.target.value)} />
            </div>
            <div>
              <label className="label">Ply</label>
              <input className="input" inputMode="numeric" value={f.ply} onChange={(e) => set("ply", e.target.value)} />
            </div>
          </div>
        ) : f.type === "DYE" ? (
          <div>
            <label className="label">Dye chemistry</label>
            <input className="input" value={f.dyeChemistry} onChange={(e) => set("dyeChemistry", e.target.value)} placeholder="e.g. Natural indigo" />
          </div>
        ) : <div />}
      </div>
      {isYarn && (
        <label className="flex items-start gap-3 rounded-xl border border-silk-300 bg-silk-50 p-3.5 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={f.isHankYarn} onChange={(e) => set("isHankYarn", e.target.checked)} />
          <span className="text-sm text-stone-700">
            <strong>Hank yarn.</strong> Hank yarn is legally reserved for the handloom sector — recording it is a genuine authenticity signal, not decoration.
          </span>
        </label>
      )}
      <div className="flex gap-3">
        <button className="btn-primary flex-1" disabled={busy || !f.quantityGrams}>{busy ? "Registering…" : "Register lot"}</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
