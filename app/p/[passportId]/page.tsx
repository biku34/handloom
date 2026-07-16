import Link from "next/link";
import { buildPassportView } from "@/lib/passport";
import AudioPlayer from "@/components/AudioPlayer";
import ScanBeacon from "@/components/ScanBeacon";
import SiteHeader from "@/components/SiteHeader";
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

export default async function VerifyPage({ params }: { params: Promise<{ passportId: string }> }) {
  const { passportId } = await params;
  const view = await buildPassportView(passportId).catch(() => null);

  /* Unknown code — deliberately designed, never a generic 404 (FR-F1 AC-5) */
  if (!view) {
    return (
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-10">
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
      </div>
    );
  }

  const { verdict, weaver, product, certificates, journey, ownership, materials } = view;
  const MAT_TYPE: Record<string, string> = { SILK_YARN: "Silk yarn", COTTON_YARN: "Cotton yarn", WOOL_YARN: "Wool yarn", ZARI: "Zari", DYE: "Dye" };
  const mainImage = product.images.primary || product.images.onLoom;
  const secondImage = product.images.onLoom && product.images.onLoom !== product.images.primary ? product.images.onLoom : null;
  const verdictPill: Record<string, { cls: string; label: string }> = {
    GENUINE: { cls: "bg-leaf-600 text-white", label: "✓ Verified genuine handloom" },
    PENDING: { cls: "bg-amber-500 text-white", label: "Confirmation pending" },
    FLAGGED: { cls: "bg-orange-600 text-white", label: "Under review" },
    VOIDED: { cls: "bg-red-700 text-white", label: "Passport voided" },
  };
  const pill = verdictPill[verdict.status] ?? verdictPill.PENDING;

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-16">
        <ScanBeacon passportId={passportId} />

        {/* safety warning stays for flagged / voided items */}
        {verdict.warnings.length > 0 && (
          <div className="mb-4 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900 space-y-1">
            {verdict.warnings.map((w: string, i: number) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        {/* ── Weaver profile, up top ── */}
        {weaver && (
          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-4 sm:gap-5">
              {weaver.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={weaver.photoUrl} alt={weaver.displayName || "The weaver"} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover shrink-0" />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-silk-100 flex items-center justify-center text-3xl shrink-0">🧑‍🦱</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-silk-700">Woven by</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-maroon-900">{weaver.displayName}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${pill.cls}`}>{pill.label}</span>
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  {[weaver.generation ? `${weaver.generation}th generation` : null, weaver.cluster, weaver.yearsWeaving ? `${weaver.yearsWeaving} years at the loom` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {weaver.verification?.verifiedBy && (
                  <p className="mt-2 flex items-start gap-2 text-xs text-stone-500">
                    <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-leaf-600 text-white text-[9px] shrink-0">✓</span>
                    <span>
                      Identity and loom physically verified by <strong>{weaver.verification.verifiedBy}</strong>
                      {weaver.verification.verifiedAt ? ` on ${new Date(weaver.verification.verifiedAt).toLocaleDateString("en-IN")}` : ""}
                    </span>
                  </p>
                )}
              </div>
            </div>
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
            {weaver.handle && (
              <Link href={`/weaver/${weaver.handle}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-maroon-700 hover:gap-2 transition-all">
                See all of {weaver.displayName?.split(" ")[0]}&apos;s work →
              </Link>
            )}
          </section>
        )}

        {/* two-column on desktop, single column on phones */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          {/* ── LEFT: the product photos ── */}
          <div className="space-y-6">
            {mainImage && (
              <section className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainImage} alt={product.name || "The piece"} className="w-full aspect-square object-cover" />
                <div className="px-5 py-4">
                  <p className="text-sm font-semibold text-maroon-800">
                    {[
                      product.production?.loomHours ? `${product.production.loomHours} hours at the loom` : null,
                      product.specs?.weaveTechnique ? `${product.specs.weaveTechnique.charAt(0) + product.specs.weaveTechnique.slice(1).toLowerCase()} weave` : null,
                      product.specs?.zariType ? "Pure zari" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Photographed where it was woven"}
                  </p>
                </div>
              </section>
            )}

            {secondImage && (
              <section className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={secondImage} alt="On the loom" className="w-full aspect-square object-cover" />
                <div className="px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-silk-700">On the loom where it was woven</p>
                </div>
              </section>
            )}

            {product.images.gallery?.filter(Boolean).length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {product.images.gallery.filter(Boolean).slice(0, 6).map((g: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={g} alt="" className="card aspect-square object-cover" />
                ))}
              </div>
            )}

            {product.voiceNoteUrl && (
              <AudioPlayer src={product.voiceNoteUrl} label="The weaver, about this piece" />
            )}
          </div>

          {/* ── RIGHT: the facts, materials, and next steps ── */}
          <div className="space-y-6">
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-maroon-900">{product.name}</h2>
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
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {product.specs.lengthCm ? (<div className="flex justify-between border-b border-silk-100 pb-1.5"><dt className="text-stone-500">Length</dt><dd className="font-medium">{(product.specs.lengthCm / 100).toFixed(1)} m</dd></div>) : null}
                  {product.specs.weightGrams ? (<div className="flex justify-between border-b border-silk-100 pb-1.5"><dt className="text-stone-500">Weight</dt><dd className="font-medium">{product.specs.weightGrams} g</dd></div>) : null}
                  {product.specs.zariGrams ? (<div className="flex justify-between border-b border-silk-100 pb-1.5"><dt className="text-stone-500">Zari</dt><dd className="font-medium">{product.specs.zariGrams} g</dd></div>) : null}
                  {product.specs.dyeType ? (<div className="flex justify-between border-b border-silk-100 pb-1.5"><dt className="text-stone-500">Dye</dt><dd className="font-medium">{String(product.specs.dyeType).replace(/_/g, " ").toLowerCase()}</dd></div>) : null}
                </dl>
              )}
            </section>

            {materials.length > 0 && (
              <section className="card p-5 sm:p-6">
                <h2 className="font-display text-lg font-bold text-maroon-900">Traceable materials</h2>
                <p className="mt-1 text-xs text-stone-500">The very threads this piece was woven from — sourced and recorded by the weaver.</p>
                <ul className="mt-4 space-y-2.5">
                  {materials.map((m: { role: string; type: string; lotId?: string; grams?: number; supplier?: string; certification?: string | null; isHankYarn?: boolean }, i: number) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-silk-50 border border-silk-200 px-3 py-2.5">
                      <span className="mt-0.5 rounded-md bg-maroon-700/10 text-maroon-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">{m.role}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-maroon-900">
                          {MAT_TYPE[m.type] || m.type}
                          {m.grams ? <span className="font-normal text-stone-500"> · {m.grams} g</span> : null}
                        </p>
                        <p className="text-xs text-stone-500">{[m.supplier, m.lotId].filter(Boolean).join(" · ")}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {m.isHankYarn && <span className="rounded-full bg-leaf-600/10 text-leaf-700 border border-leaf-600/25 px-2 py-0.5 text-[10px] font-bold">Hank yarn</span>}
                        {m.certification && <span className="rounded-full bg-silk-100 border border-silk-300 text-maroon-800 px-2 py-0.5 text-[10px] font-bold">{m.certification.replace(/_/g, " ")}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
                {materials.some((m: { isHankYarn?: boolean }) => m.isHankYarn) && (
                  <p className="mt-4 rounded-lg bg-silk-50 border border-silk-200 px-3 py-2 text-[11px] leading-relaxed text-stone-600">
                    Hank yarn is reserved by law for the handloom sector — its presence is a genuine signal that this piece was hand-woven, not power-loomed.
                  </p>
                )}
              </section>
            )}

            {/* deeper paths */}
            <nav className="space-y-2.5">
              <Link href={`/p/${passportId}/journey`} className="card flex items-center justify-between px-5 py-4 hover:border-maroon-600">
                <span className="font-semibold text-maroon-900">See the full journey</span>
                <span className="text-stone-400">{journey.stepCount} steps →</span>
              </Link>
              <Link href={`/p/${passportId}/story`} className="card flex items-center justify-between px-5 py-4 hover:border-maroon-600">
                <span className="font-semibold text-maroon-900">Read the story</span>
                <span className="text-stone-400">→</span>
              </Link>
              <Link href={`/p/${passportId}/claim`} className={`flex items-center justify-between px-5 py-4 rounded-2xl ${ownership.claimed ? "card" : "bg-maroon-700 text-white hover:bg-maroon-800 transition-colors"}`}>
                <span className={`font-semibold ${ownership.claimed ? "text-maroon-900" : "text-white"}`}>{ownership.claimed ? "Ownership" : "I bought this — claim it"}</span>
                <span className={ownership.claimed ? "text-stone-400" : "text-silk-200"}>{ownership.claimed ? "claimed ✓" : "→"}</span>
              </Link>
              <Link href={`/p/${passportId}/proof`} className="flex items-center justify-between px-5 py-3 text-sm text-stone-500 hover:text-maroon-800">
                <span>Verify the proof yourself</span>
                <span>↗</span>
              </Link>
            </nav>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-stone-400">
          SUTRA passport <span className="font-mono">{passportId}</span>
          {view.proof.sealed && view.proof.sealedAt ? ` · record sealed on ${new Date(view.proof.sealedAt).toLocaleDateString("en-IN")}` : ""}
        </p>
      </main>
    </div>
  );
}
