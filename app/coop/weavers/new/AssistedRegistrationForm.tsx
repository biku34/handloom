"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CRAFT_OPTIONS = [
  [1, "Kanjivaram Silk"], [2, "Banarasi"], [3, "Jamdani"], [4, "Pochampally Ikat"],
  [5, "Chanderi"], [6, "Maheshwari"], [7, "Bhagalpuri Silk"], [8, "Kullu Shawl"],
  [9, "Muga Silk"], [10, "Patola"], [11, "Cotton Handloom"],
] as const;

export default function AssistedRegistrationForm() {
  const router = useRouter();
  const [f, setF] = useState({
    fullName: "", phone: "", village: "", district: "", state: "Tamil Nadu", pincode: "",
    craftCode: 1, loomType: "PIT_LOOM", yearsWeaving: "", generation: "", guruLineage: "",
    storyText: "", language: "ta", consentGiven: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coop/weavers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Registration failed");
      router.push("/coop/weavers?status=PENDING");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Full name *</label>
          <input className="input" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        </div>
        <div>
          <label className="label">Phone (their login) *</label>
          <input className="input" inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10 digits" required />
        </div>
        <div>
          <label className="label">Village</label>
          <input className="input" value={f.village} onChange={(e) => set("village", e.target.value)} />
        </div>
        <div>
          <label className="label">District</label>
          <input className="input" value={f.district} onChange={(e) => set("district", e.target.value)} />
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" value={f.state} onChange={(e) => set("state", e.target.value)} />
        </div>
        <div>
          <label className="label">Primary craft</label>
          <select className="input" value={f.craftCode} onChange={(e) => set("craftCode", Number(e.target.value))}>
            {CRAFT_OPTIONS.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Loom type</label>
          <select className="input" value={f.loomType} onChange={(e) => set("loomType", e.target.value)}>
            {["PIT_LOOM", "FRAME_LOOM", "JACQUARD", "DOBBY", "BACKSTRAP"].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Years weaving</label>
          <input className="input" inputMode="numeric" value={f.yearsWeaving} onChange={(e) => set("yearsWeaving", e.target.value)} />
        </div>
        <div>
          <label className="label">Generation (e.g. 4 = 4th generation)</label>
          <input className="input" inputMode="numeric" value={f.generation} onChange={(e) => set("generation", e.target.value)} />
        </div>
        <div>
          <label className="label">Story language</label>
          <select className="input" value={f.language} onChange={(e) => set("language", e.target.value)}>
            {[["ta", "Tamil"], ["hi", "Hindi"], ["te", "Telugu"], ["bn", "Bengali"], ["or", "Odia"], ["as", "Assamese"], ["kn", "Kannada"], ["mr", "Marathi"], ["gu", "Gujarati"], ["en", "English"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Lineage (who taught them?)</label>
        <input className="input" value={f.guruLineage} onChange={(e) => set("guruLineage", e.target.value)} placeholder="e.g. Learned from father, Sundaram S." />
      </div>
      <div>
        <label className="label">Their story (as told to you — the weaver&apos;s voice note can be added later)</label>
        <textarea className="input min-h-28" value={f.storyText} onChange={(e) => set("storyText", e.target.value)} />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 cursor-pointer">
        <input type="checkbox" className="mt-1" checked={f.consentGiven} onChange={(e) => set("consentGiven", e.target.checked)} />
        <span className="text-sm text-amber-900">
          <strong>Consent confirmed (mandatory).</strong> The weaver is present, the consent script was read aloud in their language,
          and they agree that their name, photo, voice and story will be shown publicly to buyers. They can withdraw at any time via the cooperative.
        </span>
      </label>
      <button className="btn-primary w-full" disabled={busy || !f.consentGiven}>
        {busy ? "Registering…" : "Register weaver (verification stays pending)"}
      </button>
    </form>
  );
}
