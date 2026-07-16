"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Lot = { _id: string; lotId: string; type: string; remainingGrams: number; colour?: string; isHankYarn?: boolean };
type Linked = { lotIdLabel?: string; type?: string; role?: string; quantityGrams?: number; supplierName?: string; isHankYarn?: boolean };

const ROLES = ["WARP", "WEFT", "ZARI", "DYE"] as const;
const TYPE_LABEL: Record<string, string> = { SILK_YARN: "Silk", COTTON_YARN: "Cotton", WOOL_YARN: "Wool", ZARI: "Zari", DYE: "Dye" };

export default function MaterialsPanel({ productId, frozen, linked, lots }: { productId: string; frozen: boolean; linked: Linked[]; lots: Lot[] }) {
  const router = useRouter();
  const [lotObjectId, setLotObjectId] = useState("");
  const [role, setRole] = useState<string>("WARP");
  const [grams, setGrams] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotObjectId, role, grams: Number(grams) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Could not link material");
      setLotObjectId("");
      setGrams("");
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
        <h2 className="font-bold text-maroon-900">Materials</h2>
        <Link href="/w/materials" className="text-xs font-semibold text-maroon-700 hover:underline">Manage lots →</Link>
      </div>

      {linked.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {linked.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-silk-50 border border-silk-200 px-3.5 py-2.5 text-sm">
              <span className="font-medium text-maroon-900">
                {m.role} · {TYPE_LABEL[m.type || ""] || m.type}
                {m.supplierName ? <span className="text-stone-500 font-normal"> · {m.supplierName}</span> : null}
                {m.isHankYarn ? <span className="ml-1.5 rounded-full bg-leaf-600/10 text-leaf-700 border border-leaf-600/25 px-1.5 py-0.5 text-[9px] font-bold align-middle">HANK</span> : null}
              </span>
              <span className="text-stone-500 whitespace-nowrap">{m.quantityGrams} g · <span className="font-mono text-xs">{m.lotIdLabel}</span></span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-500">No materials linked yet.</p>
      )}

      {frozen ? (
        <p className="mt-4 text-xs text-stone-400">The record is sealed — materials can no longer be added.</p>
      ) : lots.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          You have no material lots with stock left. <Link href="/w/materials" className="font-semibold text-maroon-700 hover:underline">Register a lot →</Link>
        </p>
      ) : (
        <form onSubmit={link} className="mt-4 border-t border-silk-200 pt-4 space-y-3">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-xs">{error}</div>}
          <div>
            <label className="label">Lot</label>
            <select className="input" value={lotObjectId} onChange={(e) => setLotObjectId(e.target.value)} required>
              <option value="">Choose a lot…</option>
              {lots.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.lotId} — {TYPE_LABEL[l.type] || l.type}{l.colour ? ` (${l.colour})` : ""} · {l.remainingGrams} g left
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Grams used</label>
              <input className="input" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="e.g. 380" required />
            </div>
          </div>
          <button className="btn-primary w-full" disabled={busy || !lotObjectId || !grams}>
            {busy ? "Linking…" : "Link material to this piece"}
          </button>
        </form>
      )}
    </div>
  );
}
