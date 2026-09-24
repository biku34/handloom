"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/* Interactive "product journey" explainer — one saree from loom to buyer.
   Stage content mirrors the real app: roles, screens and the ledger entry
   types the backend actually writes (hashes shown here are illustrative). */

type Stage = {
  key: string;
  label: string;
  role: string;
  roleIcon: string;
  title: string;
  body: string;
  points: string[];
  ledger: string[]; // ledger entry types written at this stage
  note?: string; // shown when nothing is written to the ledger
  where: string;
};

const STAGES: Stage[] = [
  {
    key: "onboard", label: "Onboard", role: "Co-op officer", roleIcon: "users",
    title: "The cooperative brings the weaver in",
    body: "An officer registers the weaver on their behalf — name, cluster, craft and loom — so nobody is left out for lack of a smartphone.",
    points: ["Assisted registration", "Government ID stored only as a hash", "Profile waits for verification"],
    ledger: [], note: "Profile created — nothing is trusted until a human verifies it.", where: "/coop/weavers/new",
  },
  {
    key: "verify", label: "Verify", role: "Verifier", roleIcon: "badge",
    title: "A person stands at the loom",
    body: "A cooperative officer or Weavers' Service Centre official physically checks identity, loom and craft, then attests. This human check is the root of trust.",
    points: ["In-person attestation", "Can expire or be revoked", "Revocation shows on every passport"],
    ledger: ["WEAVER_ATTESTED"], where: "/admin/verify",
  },
  {
    key: "register", label: "Register", role: "Weaver", roleIcon: "plus",
    title: "Four taps on a phone",
    body: "A photo of the piece on the loom, the craft, the type and a voice note. Yarn, zari and dye lots are linked so the thread can be traced to its source.",
    points: ["Photo compressed on the phone", "Voice note in the weaver's own words", "Material lots linked by grams"],
    ledger: ["MATERIAL_REGISTERED"], where: "/w/register",
  },
  {
    key: "passport", label: "Passport", role: "Weaver", roleIcon: "seal",
    title: "The piece gets its Digital Passport",
    body: "A QR tag with a public passport ID and a hidden 8-character scratch secret. Only a hash of the secret is stored — even the database can't reveal it.",
    points: ["QR + scratch-panel secret", "Secret stored as a hash", "Public page goes live"],
    ledger: ["PASSPORT_ISSUED", "TAG_BOUND"], where: "/w/products/…",
  },
  {
    key: "journey", label: "Journey", role: "Weaver", roleIcon: "spool",
    title: "Every step, as it happens",
    body: "Weaving started, completed, finishing, quality check — each one becomes a ledger entry that commits to the one before it.",
    points: ["Append-only journey", "Each entry hash-chained", "Anchored on Polygon in the background"],
    ledger: ["PROVENANCE_EVENT", "PROVENANCE_EVENT"], where: "/w/products/…",
  },
  {
    key: "seal", label: "Seal", role: "Co-op officer", roleIcon: "truck",
    title: "Dispatch seals the record",
    body: "When the piece leaves for a retailer, custody transfers and the record freezes — exactly when the incentive to falsify appears, editing becomes impossible.",
    points: ["Custody transfer to retailer", "A piece dispatches once", "Record becomes read-only"],
    ledger: ["PASSPORT_FROZEN"], where: "/coop/products",
  },
  {
    key: "scan", label: "Scan", role: "Buyer", roleIcon: "scan",
    title: "Two seconds to the truth",
    body: "No app, no login. The buyer sees a clear verdict, the weaver's face and voice, the materials and the full journey — and can re-check the whole chain live.",
    points: ["Genuine · pending · flagged · voided", "Weaver story and voice", "Live hash-chain proof page"],
    ledger: [], note: "Scans aren't ledger entries — they feed the risk score (velocity, geo-spread).", where: "/p/{passport}",
  },
  {
    key: "claim", label: "Claim", role: "Buyer", roleIcon: "bag",
    title: "It's yours — and clones get caught",
    body: "The buyer scratches the panel and claims the piece with the secret. If that tag was already claimed, the second claim raises a counterfeit alarm.",
    points: ["Ownership recorded", "Duplicate claim → clone alarm", "Revisit purchases by phone number"],
    ledger: ["OWNERSHIP_CLAIMED"], where: "/p/{passport}/claim",
  },
];

const STEP_MS = 5500;

/* deterministic, illustrative 64-hex "hash" so the console looks alive without pretending to be real data */
function fakeHash(seed: string) {
  let out = "";
  for (let block = 0; block < 8; block++) {
    // FNV-1a over the whole seed per 32-bit block, then an avalanche mix
    let h = (2166136261 ^ Math.imul(block + 1, 0x9e3779b1)) >>> 0;
    for (let c = 0; c < seed.length; c++) h = Math.imul(h ^ seed.charCodeAt(c), 16777619) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    out += (h >>> 0).toString(16).padStart(8, "0");
  }
  return out;
}

export default function JourneyExplorer() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const stage = STAGES[i];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) setPlaying(false);
  }, []);

  const go = useCallback((n: number) => setI(((n % STAGES.length) + STAGES.length) % STAGES.length), []);
  const user = useCallback((n: number) => {
    setPlaying(false);
    go(n);
  }, [go]);

  // autoplay
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, i, go]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key === "ArrowRight") user(i + 1);
      if (e.key === "ArrowLeft") user(i - 1);
      if (e.key === " " && (e.target as HTMLElement)?.dataset?.journey) { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, user]);

  // ledger entries written up to and including this stage
  let seq = 96;
  let prev = fakeHash("SUTRA_GENESIS");
  const entries: { seq: number; type: string; prev: string; hash: string; stage: number }[] = [];
  STAGES.forEach((s, si) =>
    s.ledger.forEach((type, k) => {
      seq += 1;
      const hash = fakeHash(`${seq}|${type}|${s.key}|${k}|${prev}`);
      if (si <= i) entries.push({ seq, type, prev, hash, stage: si });
      prev = hash;
    })
  );
  const visible = entries.slice(-4);
  const pct = (i / (STAGES.length - 1)) * 100;

  return (
    <div data-journey="1">
      {/* ── stage rail ── */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative -mt-10 rounded-3xl bg-white p-4 sm:p-6 shadow-[0_20px_50px_-25px_rgba(64,16,26,0.45)] ring-1 ring-silk-200">
          {/* desktop rail */}
          <div className="relative hidden md:block px-5 pt-1 pb-2">
            {/* track runs from the centre of the first column to the centre of the last (8 columns inside px-5) */}
            <div className="absolute top-[26px] h-1 rounded-full bg-silk-100" style={{ left: "calc(1.25rem + (100% - 2.5rem) / 16)", right: "calc(1.25rem + (100% - 2.5rem) / 16)" }} />
            <div
              className="absolute top-[26px] h-1 rounded-full bg-gradient-to-r from-maroon-700 to-silk-300 transition-[width] duration-700 ease-out"
              style={{ left: "calc(1.25rem + (100% - 2.5rem) / 16)", width: `calc((100% - 2.5rem) * 7 / 8 * ${pct / 100})` }}
            />
            <ol className="relative grid grid-cols-8">
              {STAGES.map((s, si) => {
                const done = si < i, on = si === i;
                return (
                  <li key={s.key} className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => user(si)}
                      aria-current={on ? "step" : undefined}
                      aria-label={`Step ${si + 1}: ${s.label}`}
                      className={`relative flex h-12 w-12 items-center justify-center rounded-full ring-4 transition-all duration-300 ${
                        on ? "scale-110 bg-maroon-800 text-silk-200 ring-silk-200" : done ? "bg-silk-300 text-maroon-900 ring-white" : "bg-white text-stone-400 ring-silk-100 hover:text-maroon-700"
                      }`}
                    >
                      {on && <span className="absolute inset-0 rounded-full bg-maroon-700/30 animate-ping" style={{ animationDuration: "2s" }} />}
                      <Icon name={s.roleIcon} className="relative h-5 w-5" strokeWidth={2} />
                    </button>
                    <span className={`mt-2 text-sm font-semibold ${on ? "text-maroon-900" : "text-stone-500"}`}>{s.label}</span>
                    <span className="text-[11px] text-stone-400">{s.role}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* phone rail: swipeable chips + progress */}
          <div className="md:hidden">
            <div className="h-1 overflow-hidden rounded-full bg-silk-100">
              <div className="h-full rounded-full bg-gradient-to-r from-maroon-700 to-silk-300 transition-[width] duration-700" style={{ width: `${((i + 1) / STAGES.length) * 100}%` }} />
            </div>
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 snap-x">
              {STAGES.map((s, si) => (
                <button
                  key={s.key}
                  ref={(el) => { if (el && si === i) el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }}
                  type="button"
                  onClick={() => user(si)}
                  className={`snap-center shrink-0 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 transition-colors ${
                    si === i ? "bg-maroon-800 text-white ring-maroon-800" : si < i ? "bg-silk-100 text-maroon-800 ring-silk-200" : "bg-white text-stone-500 ring-silk-200"
                  }`}
                >
                  <span className="text-xs opacity-70">{si + 1}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* controls */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-silk-100 pt-4">
            <p className="text-sm text-stone-500">
              Step <strong className="text-maroon-900">{i + 1}</strong> of {STAGES.length}
              <span className="hidden sm:inline"> · use ← → keys{reduced ? "" : " or let it play"}</span>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => user(i - 1)} aria-label="Previous step" className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-silk-300 text-maroon-800 hover:bg-silk-100">
                <Icon name="chevron" className="h-5 w-5 rotate-180" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause" : "Play"}
                className="flex h-11 min-w-24 items-center justify-center gap-2 rounded-full bg-maroon-800 px-4 text-sm font-semibold text-white hover:bg-maroon-900"
              >
                <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span> {playing ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={() => user(i + 1)} aria-label="Next step" className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-silk-300 text-maroon-800 hover:bg-silk-100">
                <Icon name="chevron" className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
          {playing && (
            <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-silk-100" aria-hidden="true">
              <div key={i} className="h-full bg-maroon-600/60" style={{ animation: `journeyTick ${STEP_MS}ms linear forwards` }} />
            </div>
          )}
        </div>
      </div>

      {/* ── stage detail ── */}
      <div
        className="mx-auto max-w-6xl px-4 py-8 md:py-12"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) user(i + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <div key={stage.key} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px_minmax(0,1fr)] lg:items-center animate-[journeyIn_.45s_cubic-bezier(.22,.61,.36,1)]">
          {/* story */}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-maroon-700/10 px-3 py-1 text-xs font-bold text-maroon-800">
              <Icon name={stage.roleIcon} className="h-4 w-4" strokeWidth={2} /> {stage.role}
            </span>
            <h2 className="font-display mt-3 text-2xl sm:text-3xl font-bold leading-tight text-maroon-900">{stage.title}</h2>
            <p className="mt-3 text-[15px] leading-7 text-stone-600">{stage.body}</p>
            <ul className="mt-4 space-y-2">
              {stage.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf-600 text-[11px] text-white">✓</span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-xs text-stone-400">in the app → {stage.where}</p>
          </div>

          {/* phone */}
          <div className="mx-auto w-[260px] shrink-0">
            <div className="rounded-[2.2rem] bg-stone-900 p-2.5 shadow-[0_30px_60px_-25px_rgba(64,16,26,0.6)]">
              <div className="relative h-[480px] overflow-hidden rounded-[1.7rem] bg-silk-50">
                <div className="flex h-11 items-center justify-between bg-maroon-900 px-4 text-[11px] font-semibold text-silk-200">
                  <span>SUTRA</span>
                  <span className="mx-auto h-4 w-16 rounded-full bg-stone-900" aria-hidden="true" />
                  <span>{stage.role.split(" ")[0]}</span>
                </div>
                <PhoneScreen k={stage.key} />
              </div>
            </div>
          </div>

          {/* ledger console */}
          <div className="min-w-0 rounded-2xl bg-[#1b0a0e] p-4 sm:p-5 text-silk-100 ring-1 ring-maroon-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-silk-300">Integrity ledger</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-600/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf-600 animate-pulse" /> chain intact
              </span>
            </div>
            {stage.ledger.length === 0 && (
              <p className="mt-3 rounded-xl bg-white/5 px-3 py-2.5 text-xs leading-5 text-silk-100/75">{stage.note}</p>
            )}
            <ol className="mt-3 space-y-2">
              {visible.length === 0 && <li className="font-mono text-xs text-silk-100/40">— no entries yet —</li>}
              {visible.map((e) => {
                const fresh = e.stage === i;
                return (
                  <li key={e.seq} className={`rounded-xl px-3 py-2.5 font-mono text-[11px] leading-5 transition-colors ${fresh ? "bg-silk-300/10 ring-1 ring-silk-300/40 animate-[journeyIn_.5s_ease]" : "bg-white/5 text-silk-100/60"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={fresh ? "font-bold text-silk-200" : ""}>#{e.seq} {e.type}</span>
                      {fresh && <span className="rounded bg-silk-300 px-1.5 text-[10px] font-bold text-maroon-900">NEW</span>}
                    </div>
                    <div className="truncate text-silk-100/50">prev {e.prev.slice(0, 18)}…</div>
                    <div className="truncate">hash {e.hash.slice(0, 18)}…</div>
                    <div className={`mt-1 ${fresh ? "text-emerald-300" : "text-silk-100/40"}`}>⛓ anchored on Polygon</div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-[11px] leading-5 text-silk-100/45">Each entry&apos;s hash includes the previous one — change any record and the chain breaks. Hashes shown are illustrative.</p>
          </div>
        </div>

        {/* end CTA */}
        {i === STAGES.length - 1 && (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-maroon-900 p-6 text-center text-silk-100 sm:flex-row sm:justify-between sm:text-left animate-[journeyIn_.5s_ease]">
            <div>
              <p className="font-display text-xl font-bold">That&apos;s one unbroken thread.</p>
              <p className="mt-1 text-sm text-silk-100/75">See it on a real piece, or bring your cooperative on board.</p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Link href="/explore" className="btn-gold btn-lg flex-1 sm:flex-none">Browse real passports</Link>
              <button type="button" onClick={() => user(0)} className="btn-outline-light btn-lg">Replay</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── tiny, stylised phone screens for each stage ── */
function PhoneScreen({ k }: { k: string }) {
  const card = "rounded-2xl bg-white p-3 ring-1 ring-silk-200";
  const btn = (label: string, cls = "bg-maroon-700 text-white") => (
    <div className={`mt-3 flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold ${cls}`}>{label}</div>
  );
  const field = (label: string, value: string) => (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-silk-700">{label}</p>
      <p className="mt-0.5 rounded-lg border border-silk-300 bg-white px-2.5 py-1.5 text-xs text-stone-700">{value}</p>
    </div>
  );
  const avatar = (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-maroon-600 to-silk-300 text-sm font-bold text-white">MS</span>
  );
  const loomPhoto = (
    <div className="h-32 rounded-xl" style={{ background: "repeating-linear-gradient(90deg,#8c2f39 0 6px,#e5c383 6px 8px,#571722 8px 14px,#e5c383 14px 16px)" }} />
  );

  return (
    <div className="space-y-3 p-3 animate-[journeyIn_.4s_ease]">
      {k === "onboard" && (
        <div className={card}>
          <p className="text-sm font-bold text-maroon-900">Add a weaver</p>
          {field("Name", "Murugan S.")}
          {field("Cluster", "Kanchipuram, Tamil Nadu")}
          {field("Craft", "Kanjivaram Silk")}
          {field("Govt ID", "•••• •••• 4821")}
          {btn("Submit for verification")}
        </div>
      )}
      {k === "verify" && (
        <div className={card}>
          <div className="flex items-center gap-2.5">{avatar}<div><p className="text-sm font-bold text-maroon-900">Murugan S.</p><p className="text-[11px] text-stone-500">Pending · Kanchipuram</p></div></div>
          <div className="mt-3 space-y-1.5">
            {["Identity checked", "Loom seen in person", "Craft confirmed"].map((t) => (
              <p key={t} className="flex items-center gap-2 rounded-lg bg-leaf-600/10 px-2.5 py-1.5 text-xs font-medium text-leaf-700"><span>✓</span>{t}</p>
            ))}
          </div>
          {btn("Attest weaver", "bg-leaf-600 text-white")}
        </div>
      )}
      {k === "register" && (
        <div className={card}>
          {loomPhoto}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-maroon-800 px-2.5 py-1 text-[11px] font-semibold text-white">Kanjivaram Silk</span>
            <span className="rounded-full bg-silk-100 px-2.5 py-1 text-[11px] font-semibold text-maroon-800">Saree</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-silk-50 p-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon-700 text-[10px] text-white">▶</span>
            <div className="flex h-6 flex-1 items-center gap-0.5">
              {[3, 6, 9, 5, 11, 7, 4, 9, 12, 6, 3, 8, 10, 5, 7, 4].map((h, n) => <span key={n} className="w-1 rounded-full bg-maroon-600/70" style={{ height: h * 2 }} />)}
            </div>
            <span className="text-[10px] text-stone-500">0:24</span>
          </div>
          {btn("Register piece")}
        </div>
      )}
      {k === "passport" && (
        <div className={`${card} text-center`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-leaf-700">✓ Passport issued</p>
          <div className="mx-auto mt-2 grid h-28 w-28 grid-cols-7 gap-0.5 rounded-lg bg-white p-1.5 ring-1 ring-silk-200">
            {Array.from({ length: 49 }, (_, n) => <span key={n} className={(n * 7 + (n % 5) * 3) % 3 === 0 || [0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43].includes(n) ? "bg-stone-900" : ""} />)}
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-stone-500">2moThKcYACZWn4vb</p>
          <div className="mx-auto mt-2 w-40 rounded-lg bg-gradient-to-r from-stone-300 to-stone-400 py-2 font-mono text-sm font-bold tracking-[0.3em] text-stone-600">••••••••</div>
          <p className="mt-1 text-[10px] text-stone-500">scratch secret · shown once</p>
        </div>
      )}
      {k === "journey" && (
        <div className={card}>
          <p className="text-sm font-bold text-maroon-900">Journey so far</p>
          <ol className="mt-2.5">
            {[["Yarn sourced", "12 Aug"], ["Weaving started", "14 Aug"], ["Weaving completed", "02 Sep"], ["Quality checked", "05 Sep"]].map(([t, d], n, a) => (
              <li key={t} className="relative flex gap-2.5 pb-3 last:pb-0">
                {n < a.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-silk-300" />}
                <span className={`relative mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${n === a.length - 1 ? "border-maroon-700 bg-maroon-700" : "border-silk-300 bg-white"}`} />
                <div><p className="text-xs font-semibold text-maroon-900">{t}</p><p className="text-[10px] text-stone-500">{d} · ⛓ on Polygon</p></div>
              </li>
            ))}
          </ol>
          {btn("Add a journey step")}
        </div>
      )}
      {k === "seal" && (
        <div className={`${card} text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-maroon-900 text-2xl">🔒</span>
          <p className="mt-2 text-sm font-bold text-maroon-900">Dispatched to retailer</p>
          <p className="text-[11px] text-stone-500">Silk House, Chennai</p>
          <p className="mt-3 rounded-xl bg-silk-100 px-3 py-2 text-[11px] leading-4 text-stone-600">This record is sealed and can no longer be changed.</p>
          {btn("Sealed ✓", "bg-silk-200 text-maroon-900")}
        </div>
      )}
      {k === "scan" && (
        <>
          <div className="rounded-2xl bg-leaf-600 p-3 text-white">
            <p className="text-sm font-bold">✓ Genuine handloom</p>
            <p className="text-[11px] opacity-90">Verified · tamper-evident ledger</p>
          </div>
          <div className={card}>
            <div className="flex items-center gap-2.5">{avatar}<div><p className="text-[10px] uppercase tracking-wide text-silk-700">Woven by</p><p className="text-sm font-bold text-maroon-900">Murugan S.</p></div></div>
            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-silk-50 p-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon-700 text-[10px] text-white">▶</span>
              <p className="text-[11px] text-stone-600">Hear Murugan&apos;s voice</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {["118 hrs at the loom", "Korvai weave", "GI protected"].map((t) => <span key={t} className="rounded-full bg-silk-100 px-2 py-0.5 text-[10px] font-semibold text-maroon-800">{t}</span>)}
            </div>
          </div>
        </>
      )}
      {k === "claim" && (
        <>
          <div className={card}>
            <p className="text-sm font-bold text-maroon-900">Claim this piece</p>
            {field("Scratch secret", "K7Q2-M9XA")}
            {field("Your phone", "+91 98765 43210")}
            {btn("✓ It's yours", "bg-leaf-600 text-white")}
          </div>
          <div className="rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-200">
            <p className="text-xs font-bold text-orange-800">⚠ Second claim on the same tag?</p>
            <p className="mt-0.5 text-[11px] leading-4 text-orange-800/80">Counterfeit alarm → admin fraud queue.</p>
          </div>
        </>
      )}
    </div>
  );
}
