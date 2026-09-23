"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/* Register a material lot — a guided 3-step flow in a sheet:
   bottom sheet on phones, centred dialog on larger screens. */

const TYPES = [
  { v: "SILK_YARN", label: "Silk yarn", emoji: "🧵", hint: "Mulberry, tussar, muga…" },
  { v: "COTTON_YARN", label: "Cotton yarn", emoji: "☁️", hint: "Count & ply" },
  { v: "WOOL_YARN", label: "Wool yarn", emoji: "🐑", hint: "Pashmina, merino…" },
  { v: "ZARI", label: "Zari", emoji: "✨", hint: "Metallic thread" },
  { v: "DYE", label: "Dye", emoji: "🎨", hint: "Natural or chemical" },
] as const;

const CERTS = [
  ["NONE", "None"],
  ["SILK_MARK", "Silk Mark"],
  ["HANDLOOM_HANK", "Handloom hank"],
  ["AZO_FREE", "Azo-free"],
  ["ORGANIC", "Organic"],
] as const;

const COLOURS = [
  ["Natural", "#efe3c8"], ["Maroon", "#701f2b"], ["Red", "#c0262d"], ["Gold", "#d4a73c"], ["Peacock Blue", "#0f5f7a"],
  ["Indigo", "#2b3a7a"], ["Green", "#2f7a3d"], ["Black", "#1f1a17"], ["White", "#fafafa"],
] as const;

const AMOUNTS = [250, 500, 1000, 2000, 5000];

const EMPTY = {
  type: "", supplierName: "", colour: "", quantityGrams: "", certification: "NONE",
  denier: "", ply: "", dyeChemistry: "", isHankYarn: true,
};

const fmtGrams = (g: number) => (g >= 1000 ? `${+(g / 1000).toFixed(2)} kg` : `${g} g`);

export default function MaterialForm({ label = "Register a material lot", className = "btn-primary" }: { label?: string; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [f, setF] = useState(EMPTY);
  const [unit, setUnit] = useState<"g" | "kg">("g");
  const [qtyText, setQtyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof typeof EMPTY, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const type = TYPES.find((t) => t.v === f.type);
  const isYarn = ["SILK_YARN", "COTTON_YARN", "WOOL_YARN"].includes(f.type);
  const grams = Number(f.quantityGrams) || 0;

  // lock page scroll + close on Escape while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the scroll position at the top of each step
  useEffect(() => {
    sheetRef.current?.querySelector("[data-scroll]")?.scrollTo({ top: 0 });
  }, [step]);

  function start() {
    setF(EMPTY);
    setQtyText("");
    setUnit("g");
    setStep(0);
    setError(null);
    setDone(null);
    setOpen(true);
  }
  function close() {
    if (busy) return;
    setOpen(false);
  }

  function setQuantity(text: string, u = unit) {
    const clean = text.replace(/[^\d.]/g, "");
    setQtyText(clean);
    const n = Number(clean);
    set("quantityGrams", n > 0 ? String(Math.round(u === "kg" ? n * 1000 : n)) : "");
  }
  function switchUnit(u: "g" | "kg") {
    if (u === unit) return;
    setUnit(u);
    if (grams) setQtyText(u === "kg" ? String(+(grams / 1000).toFixed(3)) : String(grams));
  }
  function pickAmount(g: number) {
    setUnit(g >= 1000 ? "kg" : "g");
    setQtyText(g >= 1000 ? String(g / 1000) : String(g));
    set("quantityGrams", String(g));
  }

  const canNext = [!!f.type, grams > 0, true][step];

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          quantityGrams: grams,
          denier: f.denier ? Number(f.denier) : undefined,
          ply: f.ply ? Number(f.ply) : undefined,
          isHankYarn: isYarn ? f.isHankYarn : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.title || "Could not register lot");
      setDone(data.lotId || data.lot?.lotId || "saved");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const STEPS = ["Material", "Amount", "Details"];

  return (
    <>
      <button type="button" onClick={start} className={className}>
        <span aria-hidden="true" className="text-lg leading-none">＋</span> {label}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="presentation">
          {/* backdrop */}
          <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-maroon-900/50 backdrop-blur-[2px] animate-[fade_.2s_ease]" />

          <div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lot-sheet-title"
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none md:max-w-lg md:rounded-3xl animate-[sheet_.25s_cubic-bezier(.22,.61,.36,1)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* grab handle (phones) */}
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-silk-200 md:hidden" aria-hidden="true" />

            {/* header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-3 md:pt-5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-silk-700">
                  {done ? "Registered" : `Step ${step + 1} of 3 · ${STEPS[step]}`}
                </p>
                <h2 id="lot-sheet-title" className="font-display mt-0.5 text-xl font-bold text-maroon-900">
                  {done ? "Lot added to your materials" : ["What did you buy?", "How much, and what colour?", "Where is it from?"][step]}
                </h2>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-silk-100">
                ✕
              </button>
            </div>

            {/* progress */}
            {!done && (
              <div className="mt-3 flex gap-1.5 px-5" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-maroon-700" : "bg-silk-100"}`} />
                ))}
              </div>
            )}

            {/* body */}
            <div data-scroll className="flex-1 overflow-y-auto px-5 py-5">
              {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

              {done ? (
                <div className="py-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf-600 text-3xl text-white">✓</div>
                  <p className="mt-4 text-sm text-stone-600">
                    <strong className="text-maroon-900">{fmtGrams(grams)} of {f.colour ? `${f.colour.toLowerCase()} ` : ""}{type?.label.toLowerCase()}</strong> is now on your
                    ledger. Link it to a piece from that piece&apos;s page so buyers can trace the thread.
                  </p>
                </div>
              ) : step === 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {TYPES.map((t) => {
                    const on = f.type === t.v;
                    return (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => {
                          set("type", t.v);
                          setStep(1); // one tap moves on
                        }}
                        aria-pressed={on}
                        className={`flex flex-col items-start rounded-2xl p-4 text-left ring-2 transition-all active:scale-[0.98] ${
                          on ? "bg-maroon-700/5 ring-maroon-700" : "bg-silk-50 ring-transparent hover:ring-silk-300"
                        } ${t.v === "DYE" ? "col-span-2 flex-row items-center gap-3" : ""}`}
                      >
                        <span className="text-3xl leading-none">{t.emoji}</span>
                        <span className={t.v === "DYE" ? "" : "mt-3"}>
                          <span className="block font-bold text-maroon-900">{t.label}</span>
                          <span className="block text-xs text-stone-500">{t.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : step === 1 ? (
                <div className="space-y-6">
                  <div>
                    <label className="label" htmlFor="lot-qty">Quantity</label>
                    <div className="flex items-stretch overflow-hidden rounded-xl border border-silk-300 focus-within:border-maroon-600 focus-within:ring-3 focus-within:ring-maroon-600/15">
                      <input
                        id="lot-qty"
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-2xl font-bold text-maroon-900 outline-none"
                        inputMode="decimal"
                        value={qtyText}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        autoFocus
                      />
                      <div className="flex shrink-0 items-center gap-1 bg-silk-50 p-1.5">
                        {(["g", "kg"] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => switchUnit(u)}
                            aria-pressed={unit === u}
                            className={`h-10 min-w-12 rounded-lg px-3 text-sm font-bold ${unit === u ? "bg-maroon-800 text-white" : "text-stone-600"}`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {AMOUNTS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => pickAmount(g)}
                          className={`min-h-10 rounded-full px-4 text-sm font-semibold ring-1 transition-colors ${
                            grams === g ? "bg-maroon-800 text-white ring-maroon-800" : "bg-white text-stone-700 ring-silk-300 hover:ring-maroon-600"
                          }`}
                        >
                          {fmtGrams(g)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="label">Colour</p>
                    <div className="flex flex-wrap gap-2.5">
                      {COLOURS.map(([name, hex]) => {
                        const on = f.colour === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => set("colour", on ? "" : name)}
                            aria-pressed={on}
                            title={name}
                            className={`flex min-h-10 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm ring-1 transition-all ${
                              on ? "bg-maroon-700/5 ring-2 ring-maroon-700 font-semibold text-maroon-900" : "bg-white text-stone-700 ring-silk-300"
                            }`}
                          >
                            <span className="h-7 w-7 rounded-full ring-1 ring-black/10" style={{ background: hex }} />
                            {name}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      className="input mt-3"
                      value={COLOURS.some(([n]) => n === f.colour) ? "" : f.colour}
                      onChange={(e) => set("colour", e.target.value)}
                      placeholder="Or type a colour — e.g. Mango Yellow"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="label" htmlFor="lot-supplier">Supplier</label>
                    <input id="lot-supplier" className="input" value={f.supplierName} onChange={(e) => set("supplierName", e.target.value)} placeholder="Who did you buy it from?" />
                  </div>

                  <div>
                    <p className="label">Certification</p>
                    <div className="flex flex-wrap gap-2">
                      {CERTS.map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => set("certification", v)}
                          aria-pressed={f.certification === v}
                          className={`min-h-10 rounded-full px-4 text-sm font-medium ring-1 transition-colors ${
                            f.certification === v ? "bg-maroon-800 text-white ring-maroon-800" : "bg-white text-stone-700 ring-silk-300 hover:ring-maroon-600"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isYarn && (
                    <>
                      <button
                        type="button"
                        onClick={() => set("isHankYarn", !f.isHankYarn)}
                        aria-pressed={f.isHankYarn}
                        className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-2 transition-colors ${f.isHankYarn ? "bg-leaf-600/5 ring-leaf-600" : "bg-silk-50 ring-transparent"}`}
                      >
                        <span className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${f.isHankYarn ? "bg-leaf-600" : "bg-stone-300"}`}>
                          <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${f.isHankYarn ? "translate-x-5" : ""}`} />
                        </span>
                        <span className="text-sm text-stone-700">
                          <strong className="text-maroon-900">This is hank yarn</strong>
                          <span className="mt-0.5 block text-xs text-stone-500">Hank yarn is legally reserved for handloom — a real authenticity signal buyers can see.</span>
                        </span>
                      </button>
                      <details className="group rounded-2xl bg-silk-50 px-4 py-1">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-maroon-800">
                          Yarn specs (optional)
                          <span className="text-stone-400 transition-transform group-open:rotate-180">▾</span>
                        </summary>
                        <div className="grid grid-cols-2 gap-3 pb-4 pt-1">
                          <div className="min-w-0">
                            <label className="label" htmlFor="lot-denier">Denier</label>
                            <input id="lot-denier" className="input" inputMode="numeric" value={f.denier} onChange={(e) => set("denier", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 20" />
                          </div>
                          <div className="min-w-0">
                            <label className="label" htmlFor="lot-ply">Ply</label>
                            <input id="lot-ply" className="input" inputMode="numeric" value={f.ply} onChange={(e) => set("ply", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 2" />
                          </div>
                        </div>
                      </details>
                    </>
                  )}

                  {f.type === "DYE" && (
                    <div>
                      <label className="label" htmlFor="lot-dye">Dye chemistry</label>
                      <input id="lot-dye" className="input" value={f.dyeChemistry} onChange={(e) => set("dyeChemistry", e.target.value)} placeholder="e.g. Natural indigo" />
                    </div>
                  )}

                  {/* live summary */}
                  <div className="rounded-2xl border border-dashed border-silk-300 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-silk-700">You&apos;re registering</p>
                    <p className="mt-1 flex items-center gap-2 font-semibold text-maroon-900">
                      <span className="text-xl">{type?.emoji}</span>
                      {fmtGrams(grams)} · {f.colour || "no colour"} {type?.label.toLowerCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {[f.supplierName && `from ${f.supplierName}`, f.certification !== "NONE" && CERTS.find(([v]) => v === f.certification)?.[1], isYarn && f.isHankYarn && "hank yarn"]
                        .filter(Boolean)
                        .join(" · ") || "Add a supplier or certification if you have one."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* footer actions */}
            <div className="flex gap-3 border-t border-silk-100 px-5 py-4">
              {done ? (
                <>
                  <button type="button" className="btn-secondary btn-lg flex-1" onClick={start}>Add another</button>
                  <button type="button" className="btn-primary btn-lg flex-1" onClick={() => setOpen(false)}>Done</button>
                </>
              ) : (
                <>
                  {step > 0 && (
                    <button type="button" className="btn-secondary btn-lg" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                      Back
                    </button>
                  )}
                  {step < 2 ? (
                    <button type="button" className="btn-primary btn-lg flex-1" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                      {step === 0
                        ? type ? `Continue with ${type.label.toLowerCase()}` : "Choose a material"
                        : grams ? `Continue with ${fmtGrams(grams)}` : "Enter a quantity"}
                    </button>
                  ) : (
                    <button type="button" className="btn-green btn-lg flex-1" disabled={busy || !grams || !f.type} onClick={submit}>
                      {busy ? "Registering…" : "Register lot"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        // Portal to <body>: <main> keeps a CSS transform from its entrance
        // animation, which would otherwise trap this fixed overlay inside it.
        document.body
      )}
    </>
  );
}
