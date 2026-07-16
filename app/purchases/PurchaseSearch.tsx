"use client";

import { useState } from "react";
import Link from "next/link";

type Item = {
  passportId: string;
  name: string;
  craft?: string;
  image?: string | null;
  weaver?: string;
  cluster?: string;
  claimedAt: string;
  stillOwned: boolean;
  verdict: string;
};

const VERDICT_CHIP: Record<string, string> = {
  GENUINE: "bg-leaf-600/10 text-leaf-700 border border-leaf-600/25",
  FLAGGED: "bg-orange-50 text-orange-800 border border-orange-200",
  VOIDED: "bg-red-50 text-red-800 border border-red-200",
};

export default function PurchaseSearch() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ items: Item[]; searched: string } | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Search failed");
      setResult({ items: data.items, searched: data.phone });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="card p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="phone">Your phone number</label>
          <input
            id="phone"
            className="input text-lg"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="The number you used when claiming"
            autoFocus
          />
        </div>
        <button className="btn-primary sm:w-40" disabled={busy || phone.replace(/\D/g, "").length < 10}>
          {busy ? "Searching…" : "Find my items"}
        </button>
      </form>

      {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}

      {result && (
        <div className="mt-8">
          {result.items.length === 0 ? (
            <div className="card p-10 text-center text-stone-500">
              <p className="font-semibold text-maroon-900">No items found for that number.</p>
              <p className="mt-2 text-sm">
                Only pieces claimed with this exact phone number appear here. If you just bought something, claim it from its tag first.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                <span className="font-semibold text-maroon-900">{result.items.length}</span> {result.items.length === 1 ? "piece" : "pieces"} claimed with <span className="font-mono">••••{result.searched.slice(-4)}</span>
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {result.items.map((it) => (
                  <Link key={it.passportId + it.claimedAt} href={`/p/${it.passportId}`} className="card overflow-hidden group flex">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt={it.name} className="w-28 h-28 object-cover shrink-0" />
                    ) : (
                      <div className="w-28 h-28 bg-silk-100 shrink-0" />
                    )}
                    <div className="p-4 min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-maroon-900 line-clamp-2 leading-snug">{it.name}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${VERDICT_CHIP[it.verdict] || ""}`}>{it.verdict}</span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {[it.weaver, it.cluster].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-2 text-[11px] text-stone-400">
                        Claimed {new Date(it.claimedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {!it.stillOwned && " · later transferred"}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 group-hover:gap-2 transition-all">View details →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
