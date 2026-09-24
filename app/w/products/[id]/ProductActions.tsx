"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EVENT_OPTIONS = [
  ["WEAVING_STARTED", "Weaving started"],
  ["WEAVING_COMPLETED", "Weaving completed"],
  ["FINISHED", "Finishing done"],
  ["QC_PASSED", "Quality checked"],
  ["DISPATCHED", "Dispatched (seals the record)"],
];

export default function ProductActions({ productId, status, frozen }: { productId: string; status: string; frozen: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [eventType, setEventType] = useState("WEAVING_COMPLETED");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    const imgs = Array.from(list || [])
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...imgs].slice(0, 2));
  }
  function removePhoto(i: number) {
    setPhotos((prev) => {
      const gone = prev[i];
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function uploadPhoto(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("kind", "IMAGE");
    fd.append("purpose", "JOURNEY_STEP");
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    if (res.status === 413) throw new Error("That photo is too large — try a smaller one.");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.title || "Photo upload failed");
    return data.assetId as string;
  }

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/mint`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Could not issue passport");
      setSecret(data.tagSecret);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function recordEvent(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length < 1) {
      setError("Add at least one photo of this step.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mediaAssetIds: string[] = [];
      for (const p of photos) mediaAssetIds.push(await uploadPhoto(p.file));
      const res = await fetch(`/api/products/${productId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, note, mediaAssetIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Could not record event");
      setNote("");
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
      {secret && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Scratch-panel secret — shown only once</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-maroon-900 text-center">{secret}</p>
        </div>
      )}
      {status !== "MINTED" && status !== "FLAGGED" && status !== "VOID" && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-silk-200">
          <p className="text-sm font-bold text-maroon-900">Ready to go public?</p>
          <p className="mt-1 text-xs text-stone-500">Issuing the passport creates the QR tag buyers scan to meet you.</p>
          <button onClick={mint} disabled={busy} className="btn-green btn-lg mt-3 w-full">
            {busy ? "Issuing…" : "Issue the Digital Passport"}
          </button>
        </div>
      )}
      {(status === "MINTED" || status === "FLAGGED") && !frozen && (
        <form onSubmit={recordEvent} className="rounded-2xl bg-white p-4 ring-1 ring-silk-200 space-y-3">
          <div>
            <p className="text-sm font-bold text-maroon-900">Add a journey step</p>
            <p className="mt-0.5 text-xs text-stone-500">Buyers see each step on the piece&apos;s public page.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Journey step">
            {EVENT_OPTIONS.map(([v, l]) => {
              const on = eventType === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setEventType(v)}
                  className={`min-h-10 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition-colors ${
                    on ? "bg-maroon-800 text-white ring-maroon-800" : "bg-white text-stone-700 ring-silk-300 hover:ring-maroon-600"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          {eventType === "DISPATCHED" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              Dispatching seals the record permanently — nothing can be edited afterwards.
            </p>
          )}
          <input className="input" placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

          {/* photos — every step must show 1–2 photos */}
          <div>
            <p className="label">
              Photos of this step <span className="font-normal text-stone-400">(1–2, required)</span>
            </p>
            <div className="mt-1 flex gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-silk-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Step photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 2 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-silk-300 text-stone-400 transition-colors hover:border-maroon-600 hover:text-maroon-700"
                >
                  <span className="text-xl leading-none">＋</span>
                  <span className="text-[10px] font-semibold">Add photo</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <button className="btn-primary btn-lg w-full" disabled={busy || photos.length < 1}>
            {busy ? "Recording…" : "Add to the journey"}
          </button>
        </form>
      )}
      {frozen && (
        <p className="flex gap-2.5 rounded-2xl bg-silk-100 px-4 py-3 text-sm text-stone-600 ring-1 ring-silk-300">
          <span aria-hidden="true">🔒</span>
          This record was sealed at dispatch and can no longer be changed — that is the guarantee buyers rely on.
        </p>
      )}
    </div>
  );
}
