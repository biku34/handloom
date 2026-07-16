import Link from "next/link";
import { buildPassportView } from "@/lib/passport";
import AudioPlayer from "@/components/AudioPlayer";
import ScanBeacon from "@/components/ScanBeacon";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ passportId: string }> }): Promise<Metadata> {
  const { passportId } = await params;
  const view = await buildPassportView(passportId).catch(() => null);
  if (!view) return { title: "Unknown code" };
  return {
    title: `${view.product.name} — woven by ${view.weaver?.displayName ?? "a verified weaver"}`,
    description: view.verdict.message,
  };
}

function VerdictBanner({ verdict }: { verdict: { status: string; message: string; verifiedAt: string | Date | null } }) {
  const styles: Record<string, { bg: string; icon: string; headline: string }> = {
    GENUINE: { bg: "bg-leaf-600", icon: "✓", headline: "GENUINE HANDLOOM" },
    PENDING: { bg: "bg-amber-600", icon: "⏳", headline: "CONFIRMATION PENDING" },
    FLAGGED: { bg: "bg-orange-700", icon: "⚠", headline: "CAUTION — UNDER REVIEW" },
    VOIDED: { bg: "bg-red-800", icon: "✕", headline: "PASSPORT VOIDED" },
  };
  const s = styles[verdict.status] ?? styles.PENDING;
  return (
    <div className={`${s.bg} text-white rounded-2xl px-5 py-5 text-center shadow-md`}>
      <div className="text-4xl leading-none">{s.icon}</div>
      <div className="font-display mt-2 text-2xl font-bold tracking-wide">{s.headline}</div>
      <div className="mt-1 text-sm opacity-90">
        {verdict.message}
        {verdict.verifiedAt ? ` · ${new Date(verdict.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
      </div>
    </div>
  );
}

export default async function VerifyPage({ params }: { params: Promise<{ passportId: string }> }) {
  const { passportId } = await params;
  const view = await buildPassportView(passportId).catch(() => null);

  /* Unknown code — deliberately designed, never a generic 404 (FR-F1 AC-5) */
  if (!view) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="bg-stone-600 text-white rounded-2xl px-5 py-6 text-center">
          <div className="text-4xl">?</div>
          <h1 className="font-display mt-2 text-2xl font-bold">We have no record of this code</h1>
          <p className="mt-2 text-sm opacity-90">Code scanned: <span className="font-mono">{passportId}</span></p>
        </div>
        <div className="card mt-5 p-5">
          <h2 className="font-bold text-maroon-900">What this may mean</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-700 list-disc pl-5">
            <li>The tag may be <strong>counterfeit</strong> — genuine SUTRA tags always resolve to a record</li>
            <li>The code may have been mistyped or the tag damaged</li>
            <li>The product may not be activated yet by the cooperative</li>
          </ul>
          <div className="mt-5 flex gap-3">
            <Link href={`/report?code=${encodeURIComponent(passportId)}`} className="btn-primary flex-1">Report this tag</Link>
            <Link href="/verify" className="btn-secondary flex-1">Re-enter the code</Link>
          </div>
        </div>
      </main>
    );
  }

  const { verdict, weaver, product, certificates, journey, ownership } = view;
  const heroImage = product.images.primary || product.images.onLoom;

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <ScanBeacon passportId={passportId} />

      {/* 1 — the binary answer, above the fold */}
      <VerdictBanner verdict={verdict} />
      {verdict.warnings.length > 0 && (
        <div className="mt-3 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          {verdict.warnings.map((w: string, i: number) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {/* 2 — the human, immediately */}
      {weaver && (
        <section className="card mt-5 overflow-hidden">
          {weaver.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={weaver.photoUrl} alt={weaver.displayName || "The weaver"} className="w-full aspect-[4/3] object-cover" />
          ) : (
            <div className="w-full aspect-[4/3] bg-silk-100 flex items-center justify-center text-6xl">🧑‍🦱</div>
          )}
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-silk-700">Woven by</p>
            <h1 className="font-display text-2xl font-bold text-maroon-900">{weaver.displayName}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {[weaver.generation ? `${weaver.generation}th generation` : null, weaver.cluster, weaver.yearsWeaving ? `${weaver.yearsWeaving} years at the loom` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {weaver.verification?.verifiedBy && (
              <p className="mt-2 text-xs text-stone-500">
                Identity and loom physically verified by <strong>{weaver.verification.verifiedBy}</strong>
                {weaver.verification.verifiedAt ? ` on ${new Date(weaver.verification.verifiedAt).toLocaleDateString("en-IN")}` : ""}
              </p>
            )}
            {weaver.story?.audioUrl && (
              <div className="mt-4">
                <AudioPlayer src={weaver.story.audioUrl} label={`Hear ${weaver.displayName?.split(" ")[0]}'s voice`} durationSec={weaver.story.durationSec} />
              </div>
            )}
            {!weaver.story?.audioUrl && weaver.story?.transcript?.original?.text && (
              <blockquote className="mt-4 border-l-4 border-silk-300 pl-3 text-sm italic text-stone-700">
                “{weaver.story.transcript.original.text.slice(0, 220)}{weaver.story.transcript.original.text.length > 220 ? "…" : ""}”
              </blockquote>
            )}
          </div>
        </section>
      )}

      {/* 3 — proof that is emotional: the item on the loom */}
      {(product.images.onLoom || heroImage) && (
        <section className="card mt-5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.images.onLoom || heroImage!} alt={product.name || "The item on the loom"} className="w-full aspect-square object-cover" />
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-maroon-800">
              {[
                product.production?.loomHours ? `${product.production.loomHours} hours at the loom` : null,
                product.specs?.weaveTechnique ? `${product.specs.weaveTechnique.charAt(0) + product.specs.weaveTechnique.slice(1).toLowerCase()} weave` : null,
                product.specs?.zariType ? "Pure zari" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Photographed on the loom where it was woven"}
            </p>
          </div>
        </section>
      )}

      {/* item voice note */}
      {product.voiceNoteUrl && (
        <div className="mt-5">
          <AudioPlayer src={product.voiceNoteUrl} label="The weaver, about this piece" />
        </div>
      )}

      {/* 4 — what it is + credentials */}
      <section className="card mt-5 p-5">
        <h2 className="font-display text-xl font-bold text-maroon-900">{product.name}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.giTag?.registered && (
            <span className="rounded-full bg-leaf-600/10 text-leaf-700 border border-leaf-600/30 px-3 py-1 text-xs font-bold">GI Protected · {product.giTag.name}</span>
          )}
          {certificates.map((c: { type: string; number?: string }) => (
            <span key={c.type + c.number} className="rounded-full bg-silk-100 border border-silk-300 text-maroon-800 px-3 py-1 text-xs font-bold">
              {c.type.replace(/_/g, " ")}
              {c.number ? ` #${c.number}` : ""}
            </span>
          ))}
        </div>
        {product.specs && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {product.specs.lengthCm ? (<><dt className="text-stone-500">Length</dt><dd className="text-right font-medium">{(product.specs.lengthCm / 100).toFixed(1)} m</dd></>) : null}
            {product.specs.weightGrams ? (<><dt className="text-stone-500">Weight</dt><dd className="text-right font-medium">{product.specs.weightGrams} g</dd></>) : null}
            {product.specs.zariGrams ? (<><dt className="text-stone-500">Zari</dt><dd className="text-right font-medium">{product.specs.zariGrams} g</dd></>) : null}
            {product.specs.dyeType ? (<><dt className="text-stone-500">Dye</dt><dd className="text-right font-medium">{String(product.specs.dyeType).replace(/_/g, " ").toLowerCase()}</dd></>) : null}
          </dl>
        )}
      </section>

      {/* 5 — deeper paths */}
      <nav className="mt-5 space-y-2.5">
        <Link href={`/p/${passportId}/journey`} className="card flex items-center justify-between px-5 py-4 hover:border-maroon-600">
          <span className="font-semibold text-maroon-900">See the full journey</span>
          <span className="text-stone-400">{journey.stepCount} steps →</span>
        </Link>
        <Link href={`/p/${passportId}/story`} className="card flex items-center justify-between px-5 py-4 hover:border-maroon-600">
          <span className="font-semibold text-maroon-900">Read the story</span>
          <span className="text-stone-400">→</span>
        </Link>
        <Link href={`/p/${passportId}/claim`} className="card flex items-center justify-between px-5 py-4 hover:border-maroon-600">
          <span className="font-semibold text-maroon-900">{ownership.claimed ? "Ownership" : "I bought this"}</span>
          <span className="text-stone-400">{ownership.claimed ? "claimed ✓" : "claim it →"}</span>
        </Link>
        <Link href={`/p/${passportId}/proof`} className="flex items-center justify-between px-5 py-3 text-sm text-stone-500 hover:text-maroon-800">
          <span>Verify the proof yourself</span>
          <span>↗</span>
        </Link>
      </nav>

      <p className="mt-8 text-center text-xs text-stone-400">
        SUTRA passport <span className="font-mono">{passportId}</span>
        {view.proof.sealed && view.proof.sealedAt ? ` · record sealed on ${new Date(view.proof.sealedAt).toLocaleDateString("en-IN")}` : ""}
      </p>
    </main>
  );
}
