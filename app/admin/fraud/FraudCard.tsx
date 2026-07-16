"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Report = {
  _id: string;
  reportRef: string;
  passportId?: string;
  reason: string;
  description?: string;
  riskScore: number;
  status: string;
  createdAt: string;
  autoSignals: { signal: string; weight: number; detail?: string }[];
};

export default function FraudCard({ report }: { report: Report }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(action: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fraud/${report._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resolution }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Action failed");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const riskColor = report.riskScore >= 70 ? "bg-red-700" : report.riskScore >= 40 ? "bg-orange-600" : "bg-amber-500";

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full ${riskColor} text-white text-xs font-bold px-2.5 py-1`}>risk {report.riskScore}</span>
            <span className="font-mono text-xs text-stone-500">{report.reportRef}</span>
            <span className="text-xs text-stone-400">{new Date(report.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <h2 className="mt-2 font-bold text-maroon-900">{report.reason.replace(/_/g, " ")}</h2>
          {report.passportId && (
            <a href={`/p/${report.passportId}`} target="_blank" className="text-xs font-mono text-maroon-700 hover:underline">
              passport {report.passportId} →
            </a>
          )}
        </div>
        <span className="rounded-full bg-silk-100 border border-silk-300 px-2.5 py-0.5 text-[11px] font-bold text-maroon-800">{report.status}</span>
      </div>
      {report.description && <p className="mt-2 text-sm text-stone-600">{report.description}</p>}
      {report.autoSignals?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {report.autoSignals.map((s, i) => (
            <li key={i} className="text-xs text-stone-500">⚙ {s.signal} (+{s.weight}) {s.detail ? `— ${s.detail}` : ""}</li>
          ))}
        </ul>
      )}
      {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-xs">{error}</div>}
      <div className="mt-4 space-y-2">
        <input className="input" placeholder="Resolution note (required to void)" value={resolution} onChange={(e) => setResolution(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => act("investigate")} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">🔍 Investigate</button>
          <button onClick={() => act("dismiss")} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">✓ Dismiss (false positive)</button>
          <button onClick={() => act("confirm")} disabled={busy} className="btn text-xs px-3 py-1.5 bg-orange-600 text-white hover:bg-orange-700">⚠ Confirm fraud</button>
          <button onClick={() => act("void")} disabled={busy || !resolution.trim()} className="btn text-xs px-3 py-1.5 bg-red-700 text-white hover:bg-red-800">✕ Void passport</button>
        </div>
      </div>
    </div>
  );
}
