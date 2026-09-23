"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = Record<string, any>;

const ZARI_TYPES = ["", "PURE_SILVER_GOLD_PLATED", "PURE_SILVER", "TESTED_ZARI", "IMITATION_ZARI"];
const DYE_TYPES = ["", "NATURAL", "VEGETABLE", "AZO_FREE_CHEMICAL"];

/* Module-level so they keep a stable identity across renders — defining these
   inside the component would remount every input on each keystroke (focus loss). */
function Field({
  label,
  value,
  onChange,
  placeholder,
  wide,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <label className="label">{label}</label>
      <input className="input" value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function EnrichForm({ productId, product, frozen }: { productId: string; product: Product; frozen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const s = product.item?.specs || {};
  const pr = product.item?.production || {};
  const price = product.item?.priceRange || {};
  const gi = product.item?.giTag || {};
  const n = product.narrative || {};

  const [f, setF] = useState({
    name: product.item?.name || "",
    lengthCm: s.lengthCm || "", widthCm: s.widthCm || "", weightGrams: s.weightGrams || "",
    warp: s.threadCount?.warp || "", weft: s.threadCount?.weft || "",
    zariType: s.zariType || "", zariGrams: s.zariGrams || "",
    weaveTechnique: s.weaveTechnique || "", dyeType: s.dyeType || "",
    colours: (s.colours || []).join(", "), motifs: (s.motifs || []).join(", "),
    loomHours: pr.loomHours || "", weaverCount: pr.weaverCount || "",
    priceMin: price.min || "", priceMax: price.max || "",
    giRegistered: !!gi.registered, giNumber: gi.giNumber || "", giName: gi.name || "",
    title: n.title || "", body: n.body || "", inspiration: n.inspiration || "", culturalNote: n.culturalNote || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: unknown) => { setF((p) => ({ ...p, [k]: v })); setSaved(false); };
  const num = (v: unknown) => (v === "" || v == null ? undefined : Number(v));
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  async function submit() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        item: {
          name: f.name || undefined,
          specs: {
            lengthCm: num(f.lengthCm), widthCm: num(f.widthCm), weightGrams: num(f.weightGrams),
            threadCount: { warp: num(f.warp), weft: num(f.weft) },
            zariType: f.zariType || undefined, zariGrams: num(f.zariGrams),
            weaveTechnique: f.weaveTechnique || undefined, dyeType: f.dyeType || undefined,
            colours: list(f.colours), motifs: list(f.motifs),
          },
          production: { loomHours: num(f.loomHours), weaverCount: num(f.weaverCount) },
          priceRange: { min: num(f.priceMin), max: num(f.priceMax), currency: "INR" },
          giTag: { registered: f.giRegistered, giNumber: f.giNumber || undefined, name: f.giName || undefined },
        },
        narrative: { title: f.title || undefined, body: f.body || undefined, inspiration: f.inspiration || undefined, culturalNote: f.culturalNote || undefined },
      };
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.title || "Could not save");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (frozen) {
    return (
      <div className="card p-5">
        <h2 className="font-bold text-maroon-900">Product details</h2>
        <p className="mt-2 text-sm text-stone-500">This record is sealed — details can no longer be edited.</p>
      </div>
    );
  }

  if (!open) {
    const filled = [s.lengthCm, s.weightGrams, s.weaveTechnique, n.body, pr.loomHours].filter(Boolean).length;
    return (
      <div className="card p-4 sm:p-5">
        <div className="sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-maroon-900">Product details & story</h2>
            <p className="mt-1 text-sm text-stone-500">
              {filled > 0 ? "A few quick questions to make this piece's page richer." : "We'll ask a few simple questions — answer what you can, skip the rest."}
            </p>
            {/* completeness meter */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-silk-100 sm:max-w-40">
                <div className="h-full rounded-full bg-leaf-600" style={{ width: `${(filled / 5) * 100}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-stone-500">{filled}/5</span>
            </div>
          </div>
          <button onClick={() => { setStep(0); setSaved(false); setOpen(true); }} className="btn-primary mt-3 w-full sm:mt-0 sm:w-auto shrink-0">{filled > 0 ? "Edit details" : "Let's begin"}</button>
        </div>
      </div>
    );
  }

  /* ── the guided questionnaire — one warm question per screen ── */
  const steps: { icon: string; q: string; hint?: string; content: React.ReactNode }[] = [
    {
      icon: "🧵",
      q: "What should we call this piece?",
      hint: "A clear name a shopper will recognise.",
      content: (
        <div>
          <label className="label">Name of the piece</label>
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kanjivaram Silk Saree — Peacock Blue with Temple Border" />
        </div>
      ),
    },
    {
      icon: "📏",
      q: "How big is the piece?",
      hint: "Measure the finished piece. Skip any you're not sure of.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Length (cm)" value={f.lengthCm} onChange={(v) => set("lengthCm", v)} placeholder="e.g. 630" inputMode="numeric" />
          <Field label="Width (cm)" value={f.widthCm} onChange={(v) => set("widthCm", v)} placeholder="e.g. 118" inputMode="numeric" />
          <Field label="Weight (g)" value={f.weightGrams} onChange={(v) => set("weightGrams", v)} placeholder="e.g. 720" inputMode="numeric" wide />
        </div>
      ),
    },
    {
      icon: "🧶",
      q: "How was it woven?",
      hint: "The craft that proves it's real handloom.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weave technique" value={f.weaveTechnique} onChange={(v) => set("weaveTechnique", v)} placeholder="e.g. Korvai, Kadhua, Double ikat" wide />
          <Field label="Thread count — warp" value={f.warp} onChange={(v) => set("warp", v)} placeholder="e.g. 60" inputMode="numeric" />
          <Field label="Thread count — weft" value={f.weft} onChange={(v) => set("weft", v)} placeholder="e.g. 56" inputMode="numeric" />
        </div>
      ),
    },
    {
      icon: "✨",
      q: "Any zari or special dye?",
      hint: "Leave blank if this piece has none.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 col-span-2">
            <label className="label">Zari type</label>
            <select className="input" value={f.zariType} onChange={(e) => set("zariType", e.target.value)}>
              {ZARI_TYPES.map((z) => <option key={z} value={z}>{z ? z.replace(/_/g, " ").toLowerCase() : "— none —"}</option>)}
            </select>
          </div>
          <Field label="Zari (g)" value={f.zariGrams} onChange={(v) => set("zariGrams", v)} placeholder="e.g. 180" inputMode="numeric" wide />
          <div className="min-w-0 col-span-2">
            <label className="label">Dye type</label>
            <select className="input" value={f.dyeType} onChange={(e) => set("dyeType", e.target.value)}>
              {DYE_TYPES.map((d) => <option key={d} value={d}>{d ? d.replace(/_/g, " ").toLowerCase() : "— not sure —"}</option>)}
            </select>
          </div>
        </div>
      ),
    },
    {
      icon: "🎨",
      q: "What does it look like?",
      hint: "The colours and motifs a shopper would notice. Separate each with a comma.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Colours" value={f.colours} onChange={(v) => set("colours", v)} placeholder="Peacock Blue, Maroon, Gold" wide />
          <Field label="Motifs" value={f.motifs} onChange={(v) => set("motifs", v)} placeholder="Temple Border, Mayil Chakram" wide />
        </div>
      ),
    },
    {
      icon: "⏳",
      q: "How much work went into it?",
      hint: "This is what makes buyers value your craft.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours at the loom" value={f.loomHours} onChange={(v) => set("loomHours", v)} placeholder="e.g. 118" inputMode="numeric" />
          <Field label="Number of weavers" value={f.weaverCount} onChange={(v) => set("weaverCount", v)} placeholder="e.g. 2" inputMode="numeric" />
        </div>
      ),
    },
    {
      icon: "💰",
      q: "Roughly what is it worth?",
      hint: "For your records only — this is never shown on the public page.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="From (₹)" value={f.priceMin} onChange={(v) => set("priceMin", v)} placeholder="e.g. 45000" inputMode="numeric" />
          <Field label="To (₹)" value={f.priceMax} onChange={(v) => set("priceMax", v)} placeholder="e.g. 62000" inputMode="numeric" />
        </div>
      ),
    },
    {
      icon: "🛡️",
      q: "Is this a GI-protected craft?",
      hint: "A Geographical Indication tag adds trust to the piece.",
      content: (
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-xl border border-silk-200 p-3 text-sm cursor-pointer hover:border-silk-300">
            <input type="checkbox" checked={f.giRegistered} onChange={(e) => set("giRegistered", e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>Yes — this craft has a registered Geographical Indication (GI) tag</span>
          </label>
          {f.giRegistered && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="GI number" value={f.giNumber} onChange={(v) => set("giNumber", v)} placeholder="e.g. GI-00007" />
              <Field label="GI name" value={f.giName} onChange={(v) => set("giName", v)} placeholder="e.g. Kanchipuram Silk" />
            </div>
          )}
        </div>
      ),
    },
    {
      icon: "📖",
      q: "Tell the story of this piece",
      hint: "A few honest lines mean more than a perfect paragraph.",
      content: (
        <div className="space-y-3">
          <div>
            <label className="label">A short title</label>
            <input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Four months, two looms, one border" />
          </div>
          <div>
            <label className="label">Its story</label>
            <textarea className="input min-h-28" value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="What makes it special, how long it took, what inspired it…" />
          </div>
          <div>
            <label className="label">A cultural note (optional)</label>
            <textarea className="input min-h-20" value={f.culturalNote} onChange={(e) => set("culturalNote", e.target.value)} placeholder="e.g. The mayil chakram motif is drawn from the Kailasanathar temple…" />
          </div>
        </div>
      ),
    },
  ];

  const total = steps.length + 1; // + review
  const isReview = step >= steps.length;
  const cur = steps[step];
  const pct = Math.round(((step + 1) / total) * 100);
  const next = () => setStep((x) => Math.min(x + 1, steps.length));
  const back = () => setStep((x) => Math.max(x - 1, 0));

  const summary: [string, string][] = ([
    ["Name", f.name],
    ["Size", [f.lengthCm && `${f.lengthCm} cm`, f.widthCm && `${f.widthCm} cm`, f.weightGrams && `${f.weightGrams} g`].filter(Boolean).join(" · ")],
    ["Weave", f.weaveTechnique],
    ["Thread count", f.warp || f.weft ? `${f.warp || "?"} × ${f.weft || "?"}` : ""],
    ["Zari", f.zariType ? f.zariType.replace(/_/g, " ").toLowerCase() + (f.zariGrams ? ` · ${f.zariGrams} g` : "") : ""],
    ["Dye", f.dyeType ? f.dyeType.replace(/_/g, " ").toLowerCase() : ""],
    ["Colours", f.colours],
    ["Motifs", f.motifs],
    ["Making", [f.loomHours && `${f.loomHours} hrs`, f.weaverCount && `${f.weaverCount} weaver${Number(f.weaverCount) === 1 ? "" : "s"}`].filter(Boolean).join(" · ")],
    ["Price (private)", f.priceMin || f.priceMax ? `₹${f.priceMin || "?"} – ${f.priceMax || "?"}` : ""],
    ["GI tag", f.giRegistered ? f.giName || "Registered" : ""],
    ["Story", f.title || (f.body ? f.body.slice(0, 44) + (f.body.length > 44 ? "…" : "") : "")],
  ] as [string, string][]).filter(([, v]) => v);

  return (
    <div className="card p-4 sm:p-5">
      {/* header + progress */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-silk-700">Step {Math.min(step + 1, total)} of {total}</p>
          <h2 className="font-display text-lg font-bold text-maroon-900">Build this piece&apos;s page</h2>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="-mr-2 min-h-10 rounded-lg px-3 text-sm font-semibold text-stone-500 hover:bg-silk-100 hover:text-maroon-700">Close</button>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-silk-100">
        <div className="h-full rounded-full bg-leaf-600 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
      {saved && <div className="mt-4 rounded-xl bg-leaf-600/10 border border-leaf-600/25 text-leaf-700 px-4 py-3 text-sm">Saved — your public page is updated.</div>}

      {/* the current question */}
      <div className="mt-5 min-h-[220px]">
        {!isReview ? (
          <div>
            <h3 className="font-display text-xl font-bold text-maroon-900">
              <span className="mr-1.5" aria-hidden="true">{cur.icon}</span>
              {cur.q}
            </h3>
            {cur.hint && <p className="mt-1 text-sm text-stone-500">{cur.hint}</p>}
            <div className="mt-4">{cur.content}</div>
          </div>
        ) : (
          <div>
            <h3 className="font-display text-xl font-bold text-maroon-900">
              <span className="mr-1.5" aria-hidden="true">✅</span>
              Does this look right?
            </h3>
            <p className="mt-1 text-sm text-stone-500">Here&apos;s what you&apos;ve added. Go back to change anything, then save.</p>
            {summary.length > 0 ? (
              <dl className="mt-4 divide-y divide-silk-100 rounded-xl border border-silk-200 overflow-hidden">
                {summary.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="shrink-0 text-stone-500">{k}</dt>
                    <dd className="text-right font-medium text-maroon-900 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 rounded-xl bg-silk-50 border border-silk-200 px-4 py-3 text-sm text-stone-500">
                You haven&apos;t added anything yet — go back and fill in whatever you can. Even one or two answers help.
              </p>
            )}
          </div>
        )}
      </div>

      {/* navigation */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || busy}
          className="btn-secondary disabled:opacity-40"
        >
          Back
        </button>
        {!isReview ? (
          <button type="button" onClick={next} className="btn-primary flex-1">Continue</button>
        ) : saved ? (
          <button type="button" onClick={() => setOpen(false)} className="btn-primary flex-1">Done ✓</button>
        ) : (
          <button type="button" onClick={submit} disabled={busy} className="btn-primary flex-1">{busy ? "Saving…" : "Save details"}</button>
        )}
      </div>
      {!isReview && (
        <button type="button" onClick={() => setStep(steps.length)} className="mt-3 w-full text-center text-xs font-semibold text-stone-500 hover:text-maroon-700">
          Skip to review &amp; save →
        </button>
      )}
    </div>
  );
}
