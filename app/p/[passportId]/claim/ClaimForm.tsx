"use client";

import { useState } from "react";

export default function ClaimForm({ passportId }: { passportId: string }) {
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "clone" | "error"; title: string; detail?: string; reportRef?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/passports/${passportId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ kind: "ok", title: "This piece is yours ✓", detail: data.unlocked?.message + " Care: " + data.unlocked?.careInstructions });
      } else if (res.status === 409) {
        setResult({ kind: "clone", title: data.title, detail: data.detail, reportRef: data.reportRef });
      } else {
        setResult({ kind: "error", title: data.title || "Something went wrong", detail: data.detail });
      }
    } catch {
      setResult({ kind: "error", title: "Network error — please try again" });
    } finally {
      setBusy(false);
    }
  }

  if (result?.kind === "ok") {
    return (
      <div className="card p-6 bg-leaf-600 text-white border-0">
        <h2 className="font-display text-xl font-bold">{result.title}</h2>
        <p className="mt-2 text-sm opacity-95">{result.detail}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      {result?.kind === "clone" && (
        <div className="rounded-xl bg-red-800 text-white p-4">
          <h3 className="font-bold">{result.title}</h3>
          <p className="mt-1 text-sm opacity-95">{result.detail}</p>
          {result.reportRef && <p className="mt-2 text-xs font-mono">Reference: {result.reportRef}</p>}
        </div>
      )}
      {result?.kind === "error" && (
        <div className="rounded-xl bg-orange-100 border border-orange-300 text-orange-900 p-3 text-sm">
          <strong>{result.title}</strong>
          {result.detail && <p className="mt-1">{result.detail}</p>}
        </div>
      )}
      <div>
        <label className="label" htmlFor="secret">Code under the scratch panel</label>
        <input
          id="secret"
          className="input font-mono tracking-[0.3em] text-center text-lg uppercase"
          value={secret}
          onChange={(e) => setSecret(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="XXXXXXXX"
          required
        />
        <p className="mt-1.5 text-xs text-stone-500">Gently scratch the silver panel on the tag to reveal your 8-character code.</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Your name (optional)</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="So the weaver knows who treasures their work" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email (optional)</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="For your ownership record" />
      </div>
      <button className="btn-green w-full" disabled={busy || secret.length < 8}>
        {busy ? "Checking…" : "Claim ownership"}
      </button>
    </form>
  );
}
