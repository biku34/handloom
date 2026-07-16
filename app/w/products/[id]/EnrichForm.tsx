"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = Record<string, any>;

const ZARI_TYPES = ["", "PURE_SILVER_GOLD_PLATED", "PURE_SILVER", "TESTED_ZARI", "IMITATION_ZARI"];
const DYE_TYPES = ["", "NATURAL", "VEGETABLE", "AZO_FREE_CHEMICAL"];

/* Module-level so they keep a stable identity across renders — defining these
   inside the component would remount every input on each keystroke (focus loss). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-silk-200 pt-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-silk-700">{title}</p>
      <div className="mt-3 grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

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
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      <input className="input" value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function EnrichForm({ productId, product, frozen }: { productId: string; product: Product; frozen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: unknown) => (v === "" || v == null ? undefined : Number(v));
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-maroon-900">Product details & story</h2>
            <p className="mt-1 text-sm text-stone-500">
              {filled > 0 ? "Add more detail to make this piece's page richer." : "Add dimensions, weave, price and story — this is what fills out the public page."}
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="btn-primary shrink-0">{filled > 0 ? "Edit details" : "Add details"}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-maroon-900">Product details & story</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-stone-400 hover:text-maroon-700">Collapse</button>
      </div>
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
      {saved && <div className="rounded-xl bg-leaf-600/10 border border-leaf-600/25 text-leaf-700 px-4 py-3 text-sm">Saved — your public page is updated.</div>}

      <div>
        <label className="label">Name of the piece</label>
        <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kanjivaram Silk Saree — Peacock Blue with Temple Border" />
      </div>

      <Section title="Dimensions & weight">
        <Field label="Length (cm)" value={f.lengthCm} onChange={(v) => set("lengthCm", v)} placeholder="e.g. 630" inputMode="numeric" />
        <Field label="Width (cm)" value={f.widthCm} onChange={(v) => set("widthCm", v)} placeholder="e.g. 118" inputMode="numeric" />
        <Field label="Weight (g)" value={f.weightGrams} onChange={(v) => set("weightGrams", v)} placeholder="e.g. 720" inputMode="numeric" />
      </Section>

      <Section title="Craft detail">
        <Field label="Thread count — warp" value={f.warp} onChange={(v) => set("warp", v)} placeholder="e.g. 60" inputMode="numeric" />
        <Field label="Thread count — weft" value={f.weft} onChange={(v) => set("weft", v)} placeholder="e.g. 56" inputMode="numeric" />
        <div>
          <label className="label">Zari type</label>
          <select className="input" value={f.zariType} onChange={(e) => set("zariType", e.target.value)}>
            {ZARI_TYPES.map((z) => <option key={z} value={z}>{z ? z.replace(/_/g, " ").toLowerCase() : "—"}</option>)}
          </select>
        </div>
        <Field label="Zari (g)" value={f.zariGrams} onChange={(v) => set("zariGrams", v)} placeholder="e.g. 180" inputMode="numeric" />
        <Field label="Weave technique" value={f.weaveTechnique} onChange={(v) => set("weaveTechnique", v)} placeholder="e.g. Korvai, Kadhua, Double ikat" />
        <div>
          <label className="label">Dye type</label>
          <select className="input" value={f.dyeType} onChange={(e) => set("dyeType", e.target.value)}>
            {DYE_TYPES.map((d) => <option key={d} value={d}>{d ? d.replace(/_/g, " ").toLowerCase() : "—"}</option>)}
          </select>
        </div>
      </Section>

      <Section title="Design">
        <Field label="Colours (comma-separated)" value={f.colours} onChange={(v) => set("colours", v)} placeholder="Peacock Blue, Maroon, Gold" wide />
        <Field label="Motifs (comma-separated)" value={f.motifs} onChange={(v) => set("motifs", v)} placeholder="Temple Border, Mayil Chakram" wide />
      </Section>

      <Section title="Production">
        <Field label="Hours at the loom" value={f.loomHours} onChange={(v) => set("loomHours", v)} placeholder="e.g. 118" inputMode="numeric" />
        <Field label="Number of weavers" value={f.weaverCount} onChange={(v) => set("weaverCount", v)} placeholder="e.g. 2" inputMode="numeric" />
      </Section>

      <Section title="Indicative price (INR) — never shown publicly">
        <Field label="From" value={f.priceMin} onChange={(v) => set("priceMin", v)} placeholder="e.g. 45000" inputMode="numeric" />
        <Field label="To" value={f.priceMax} onChange={(v) => set("priceMax", v)} placeholder="e.g. 62000" inputMode="numeric" />
      </Section>

      <Section title="GI protection">
        <label className="sm:col-span-2 flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={f.giRegistered} onChange={(e) => set("giRegistered", e.target.checked)} />
          This craft has a registered Geographical Indication (GI) tag
        </label>
        {f.giRegistered && (
          <>
            <Field label="GI number" value={f.giNumber} onChange={(v) => set("giNumber", v)} placeholder="e.g. GI-00007" />
            <Field label="GI name" value={f.giName} onChange={(v) => set("giName", v)} placeholder="e.g. Kanchipuram Silk" />
          </>
        )}
      </Section>

      <Section title="The story">
        <Field label="Title" value={f.title} onChange={(v) => set("title", v)} placeholder="e.g. Four months, two looms, one border" wide />
        <div className="sm:col-span-2">
          <label className="label">The story of this piece</label>
          <textarea className="input min-h-24" value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="What makes it special, how long it took, what inspired it…" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Cultural note (optional)</label>
          <textarea className="input min-h-20" value={f.culturalNote} onChange={(e) => set("culturalNote", e.target.value)} placeholder="e.g. The mayil chakram motif is drawn from the Kailasanathar temple…" />
        </div>
      </Section>

      <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
    </form>
  );
}
