"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const CRAFTS = [
  { code: 1, name: "Kanjivaram Silk", icon: "🪷" },
  { code: 2, name: "Banarasi", icon: "🕌" },
  { code: 3, name: "Jamdani", icon: "🌸" },
  { code: 4, name: "Pochampally Ikat", icon: "🔷" },
  { code: 5, name: "Chanderi", icon: "🌙" },
  { code: 6, name: "Maheshwari", icon: "🏞️" },
  { code: 7, name: "Bhagalpuri Silk", icon: "🌾" },
  { code: 8, name: "Kullu Shawl", icon: "🏔️" },
  { code: 9, name: "Muga Silk", icon: "🐛" },
  { code: 10, name: "Patola", icon: "💠" },
  { code: 11, name: "Cotton Handloom", icon: "☁️" },
];

const CATEGORIES = [
  { key: "SAREE", label: "Saree", icon: "🥻" },
  { key: "SHAWL", label: "Shawl", icon: "🧣" },
  { key: "DHOTI", label: "Dhoti", icon: "👘" },
  { key: "STOLE", label: "Stole", icon: "🎀" },
  { key: "DUPATTA", label: "Dupatta", icon: "💃" },
  { key: "FABRIC", label: "Fabric", icon: "🧵" },
];

type Step = 1 | 2 | 3 | 4 | 5;

export default function RegisterFlow({ defaultCraftCode }: { defaultCraftCode?: number }) {
  const [step, setStep] = useState<Step>(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [craftCode, setCraftCode] = useState<number>(defaultCraftCode || 1);
  const [category, setCategory] = useState("SAREE");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ passportId: string; productId: string; tagSecret?: string; minted: boolean } | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch {
      setError("Microphone unavailable — you can skip the voice note.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function uploadAsset(file: Blob, name: string, kind: string, purpose: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file, name);
    fd.append("kind", kind);
    fd.append("purpose", purpose);
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.title || "Upload failed");
    return data.assetId;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const onLoomAssetId = photo ? await uploadAsset(photo, photo.name, "IMAGE", "ON_LOOM") : undefined;
      const voiceNoteAssetId = audioBlob ? await uploadAsset(audioBlob, "voice-note.webm", "AUDIO", "PRODUCT_VOICE_NOTE") : undefined;
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ craftCode, category, onLoomAssetId, primaryAssetId: onLoomAssetId, voiceNoteAssetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Registration failed");

      // Try to issue the passport straight away (works if the weaver is verified)
      let tagSecret: string | undefined;
      let minted = false;
      const mintRes = await fetch(`/api/products/${data.productId}/mint`, { method: "POST" });
      if (mintRes.ok) {
        const mint = await mintRes.json();
        tagSecret = mint.tagSecret;
        minted = true;
      }
      setDone({ passportId: data.passportId, productId: data.productId, tagSecret, minted });
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /* ── Success screen ── */
  if (step === 5 && done) {
    return (
      <div className="card p-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="font-display mt-3 text-2xl font-bold text-maroon-900">
          {done.minted ? "Passport issued!" : "Piece registered!"}
        </h2>
        {done.minted ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${done.passportId}`} alt="Passport QR code" className="mx-auto mt-4 w-52 h-52 rounded-xl border border-silk-200" />
            <p className="mt-2 font-mono text-sm text-stone-500">{done.passportId}</p>
            {done.tagSecret && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-300 p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Scratch-panel secret — shown only once</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-maroon-900 text-center">{done.tagSecret}</p>
                <p className="mt-2 text-xs text-amber-800">
                  This goes under the scratch panel on the printed tag. It is not stored anywhere and cannot be recovered — note it down now.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            Saved. The passport will be issued once your verification is complete — your cooperative has been notified.
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <Link href={`/p/${done.passportId}`} className="btn-secondary flex-1">View public page</Link>
          <Link href="/w/dashboard" className="btn-primary flex-1">Done</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <span key={s} className={`h-2.5 rounded-full transition-all ${step === s ? "w-8 bg-maroon-700" : "w-2.5 bg-silk-300"}`} />
        ))}
      </div>
      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}

      {/* Tap 1 — photo on the loom */}
      {step === 1 && (
        <div className="card p-6 text-center">
          <h2 className="font-display text-xl font-bold text-maroon-900">📷 Photo of the piece on your loom</h2>
          <p className="mt-1 text-sm text-stone-500">The single most convincing proof — your work, on your loom, in your hands.</p>
          <label className="mt-5 block cursor-pointer">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Preview" className="mx-auto max-h-72 rounded-xl object-cover" />
            ) : (
              <div className="mx-auto flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-silk-300 bg-silk-50 text-6xl">
                📷
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPhoto(f);
                  setPhotoPreview(URL.createObjectURL(f));
                }
              }}
            />
            <span className="btn-secondary mt-4">{photo ? "Retake" : "Open camera / choose photo"}</span>
          </label>
          <button className="btn-primary mt-5 w-full text-base py-3" onClick={() => setStep(2)} disabled={!photo}>
            Next →
          </button>
        </div>
      )}

      {/* Tap 2 — craft */}
      {step === 2 && (
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold text-maroon-900 text-center">🧵 What craft is this?</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {CRAFTS.map((c) => (
              <button
                key={c.code}
                onClick={() => { setCraftCode(c.code); setStep(3); }}
                className={`rounded-xl border p-3 text-center transition-colors cursor-pointer ${craftCode === c.code ? "border-maroon-600 bg-maroon-700/5" : "border-silk-200 hover:border-maroon-600/50"}`}
              >
                <div className="text-3xl">{c.icon}</div>
                <div className="mt-1.5 text-xs font-semibold text-maroon-900 leading-tight">{c.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tap 3 — category */}
      {step === 3 && (
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold text-maroon-900 text-center">🥻 What did you weave?</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => { setCategory(c.key); setStep(4); }}
                className={`rounded-xl border p-4 text-center transition-colors cursor-pointer ${category === c.key ? "border-maroon-600 bg-maroon-700/5" : "border-silk-200 hover:border-maroon-600/50"}`}
              >
                <div className="text-4xl">{c.icon}</div>
                <div className="mt-1.5 text-sm font-semibold text-maroon-900">{c.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tap 4 — voice note */}
      {step === 4 && (
        <div className="card p-6 text-center">
          <h2 className="font-display text-xl font-bold text-maroon-900">🎙️ Tell us about this piece</h2>
          <p className="mt-1 text-sm text-stone-500">In your own language: how long it took, what makes it special. Buyers will hear your voice.</p>
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full text-5xl transition-colors cursor-pointer ${recording ? "bg-red-600 animate-pulse text-white" : "bg-maroon-700 text-white hover:bg-maroon-800"}`}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {recording ? "◼" : "🎙️"}
          </button>
          <p className="mt-3 text-sm text-stone-500">
            {recording ? "Recording… tap to stop" : audioBlob ? "✓ Voice note recorded — tap to re-record" : "Tap to record"}
          </p>
          {audioBlob && !recording && <audio className="mx-auto mt-3" controls src={URL.createObjectURL(audioBlob)} />}
          <div className="mt-6 space-y-2">
            <button className="btn-primary w-full text-base py-3" onClick={submit} disabled={busy || recording}>
              {busy ? "Registering…" : "✓ Register this piece"}
            </button>
            {!audioBlob && (
              <button className="w-full text-xs text-stone-400 underline cursor-pointer" onClick={submit} disabled={busy || recording}>
                Skip the voice note and register
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
