"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustodyPanel({ products }: { products: { _id: string; passportId: string; name: string; status: string; holder: string; frozen: boolean; dispatchable: boolean }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toHolderName, setToHolderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function transfer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/coop/custody/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected], toHolderType: "RETAILER", toHolderName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Transfer failed");
      const failed = (data.results || []).filter((r: { ok: boolean }) => !r.ok);
      const failNote = failed.length
        ? ` ${failed.length} skipped: ${failed.map((f: { error?: string }) => f.error).join("; ")}.`
        : "";
      setMsg(`Dispatched ${data.transferred} item(s) to ${toHolderName}. Their records are now sealed.${failNote}`);
      setSelected(new Set());
      setToHolderName("");
      router.refresh();
    } catch (err) {
      setMsg(`✕ ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {msg && <div className="mb-4 rounded-xl bg-silk-100 border border-silk-300 px-4 py-3 text-sm text-maroon-900">{msg}</div>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-silk-700 border-b border-silk-200">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Passport</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Holder</th>
              <th className="px-4 py-3">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silk-100">
            {products.map((p) => (
              <tr key={p._id} className={selected.has(p._id) ? "bg-silk-50" : !p.dispatchable ? "opacity-55" : ""}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p._id)}
                    onChange={() => toggle(p._id)}
                    disabled={!p.dispatchable}
                    title={p.dispatchable ? "" : "Already dispatched — an item leaves the cooperative only once"}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-maroon-900">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-stone-500">
                  <a href={`/p/${p.passportId}`} className="hover:underline" target="_blank">{p.passportId}</a>
                </td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3 text-stone-600">{p.holder}</td>
                <td className="px-4 py-3">
                  {p.frozen ? (
                    <span className="rounded-full bg-silk-100 border border-silk-300 px-2.5 py-0.5 text-[11px] font-bold text-maroon-800">sealed</span>
                  ) : (
                    <span className="text-stone-400 text-xs">editable</span>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={transfer} className="card mt-4 p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-56">
          <label className="label">Dispatch selected to (retailer name)</label>
          <input className="input" value={toHolderName} onChange={(e) => setToHolderName(e.target.value)} placeholder="e.g. Nalli Silks, T. Nagar" />
        </div>
        <button className="btn-primary" disabled={busy || selected.size === 0 || !toHolderName.trim()}>
          {busy ? "Dispatching…" : `Dispatch ${selected.size || ""} item(s) — seals records`}
        </button>
      </form>
    </div>
  );
}
