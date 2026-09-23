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
  const titleCase = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  const verifiedDate = verdict.verifiedAt ? new Date(verdict.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

  const vb =
    ({
      GENUINE: { icon: "✓", ring: "bg-leaf-600", card: "bg-white border-leaf-600/40", title: "Genuine handloom", sub: `Verified & recorded on a tamper-evident ledger${verifiedDate ? ` · ${verifiedDate}` : ""}` },
      PENDING: { icon: "⏳", ring: "bg-amber-500", card: "bg-amber-50 border-amber-200", title: "Confirmation pending", sub: verdict.message },
      FLAGGED: { icon: "!", ring: "bg-orange-600", card: "bg-orange-50 border-orange-300", title: "Caution — under review", sub: verdict.warnings[0] || verdict.message },
      VOIDED: { icon: "✕", ring: "bg-red-700", card: "bg-red-50 border-red-300", title: "Passport voided", sub: verdict.warnings[0] || verdict.message },
    } as Record<string, { icon: string; ring: string; card: string; title: string; sub: string }>)[verdict.status] ?? { icon: "⏳", ring: "bg-amber-500", card: "bg-amber-50 border-amber-200", title: "Pending", sub: verdict.message };

  // the few most impressive facts, as chips
  const keyFacts = [
    product.production?.loomHours ? `${product.production.loomHours} hrs at the loom` : null,
    product.specs?.weaveTechnique ? `${titleCase(product.specs.weaveTechnique)} weave` : null,
    product.specs?.lengthCm ? `${(product.specs.lengthCm / 100).toFixed(1)} m long` : null,
    product.giTag?.registered ? "GI protected" : null,
    product.specs?.zariType ? "Pure zari" : null,
  ].filter(Boolean).slice(0, 4) as string[];

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 lg:pb-16">
        <ScanBeacon passportId={passportId} />

        {/* ── verdict trust bar — the instant answer, above everything ── */}
        <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-4 ${vb.card}`}>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${vb.ring}`}>{vb.icon}</div>
          <div className="min-w-0">
            <p className="font-display text-lg sm:text-xl font-bold text-maroon-900">{vb.title}</p>
            <p className="text-sm text-stone-600">{vb.sub}</p>
          </div>
        </div>

        {/* ── weaver sidebar (desktop-left) + product main; product shows first on mobile ── */}
        <div className="mt-5 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          {/* ── THE MAKER ── */}
          {weaver && (
            <aside className="order-2 lg:order-1 lg:sticky lg:top-6">
              <section className="card overflow-hidden">
                {weaver.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={weaver.photoUrl} alt={weaver.displayName || "The weaver"} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-silk-100 flex items-center justify-center text-6xl">🧑‍🦱</div>
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-silk-700">Woven by</p>
                  <p className="font-display text-2xl font-bold text-maroon-900">{weaver.displayName}</p>
                  <p className="mt-1.5 text-sm text-stone-600">
                    {[weaver.generation ? `${weaver.generation}th generation` : null, weaver.cluster, weaver.yearsWeaving ? `${weaver.yearsWeaving} years at the loom` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {weaver.verification?.verifiedBy && (
                    <p className="mt-3 flex items-start gap-2 text-xs text-stone-500">
                      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-leaf-600 text-white text-[9px] shrink-0">✓</span>
                      <span>
                        Identity and loom physically verified by <strong>{weaver.verification.verifiedBy}</strong>
                        {weaver.verification.verifiedAt ? ` on ${new Date(weaver.verification.verifiedAt).toLocaleDateString("en-IN")}` : ""}
                      </span>
                    </p>
                  )}
                  {weaver.story?.audioUrl && (
                    <div className="mt-4">
                      <AudioPlayer src={weaver.story.audioUrl} label={`Hear ${weaver.displayName?.split(" ")[0]}'s voice`} durationSec={weaver.story.durationSec} />
                    </div>
                  )}
                  {!weaver.story?.audioUrl && weaver.story?.transcript?.original?.text && (
                    <blockquote className="mt-4 border-l-4 border-silk-300 pl-3 text-sm italic text-stone-700">
                      “{weaver.story.transcript.original.text.slice(0, 180)}{weaver.story.transcript.original.text.length > 180 ? "…" : ""}”
                    </blockquote>
                  )}
                  {weaver.handle && (
                    <Link href={`/weaver/${weaver.handle}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-maroon-700 hover:gap-2 transition-all">
                      See all of {weaver.displayName?.split(" ")[0]}&apos;s work →
                    </Link>
                  )}
                </div>
              </section>
            </aside>
          )}

          {/* ── THE PRODUCT ── */}
          <div className="order-1 lg:order-2 space-y-5">
            {/* photo */}
            <section className="card overflow-hidden">
              {mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImage} alt={product.name || "The piece"} className="w-full max-h-[520px] object-cover" />
              ) : (
                <div className="w-full h-64 bg-silk-100 flex items-center justify-center text-6xl">🧵</div>
              )}
            </section>

            {/* name + key facts + credentials — the "what is it" at a glance */}
            <section className="card p-5 sm:p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-silk-700">{product.craft}</span>
              <h1 className="font-display mt-0.5 text-2xl sm:text-3xl font-bold text-maroon-900">{product.name}</h1>
              {keyFacts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {keyFacts.map((f) => (
                    <span key={f} className="rounded-full bg-silk-100 border border-silk-300 px-3 py-1 text-xs font-semibold text-maroon-800">{f}</span>
                  ))}
                </div>
              )}
              {(product.giTag?.registered || certificates.length > 0) && (
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
              )}
            </section>

            {/* primary actions — 3 compact columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href={`/p/${passportId}/journey`}
                className="card group px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-maroon-600"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-silk-700">Provenance</span>
                <span className="mt-0.5 block font-bold text-sm text-maroon-900">See the full journey</span>
                <span className="text-xs text-stone-400 group-hover:text-maroon-700 transition-colors">{journey.stepCount} steps →</span>
              </Link>

              <Link
                href={`/p/${passportId}/claim`}
                className={`px-4 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 ${
                  ownership.claimed ? "bg-leaf-600/10 border border-leaf-600/30" : "bg-maroon-700 shadow-md hover:bg-maroon-800"
                }`}
              >
                {ownership.claimed ? (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-leaf-700">Ownership</span>
                    <span className="mt-0.5 block font-bold text-sm text-maroon-900">Claimed ✓</span>
                    <span className="text-xs text-stone-500">Found its home</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-silk-200/80">Just bought this?</span>
                    <span className="mt-0.5 block font-bold text-sm text-white">Claim your piece →</span>
                    <span className="text-xs text-silk-100/70">Become the owner</span>
                  </>
                )}
              </Link>

              <Link
                href={`/p/${passportId}/proof`}
                className="card group px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-maroon-600"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-silk-700">Independent</span>
                <span className="mt-0.5 block font-bold text-sm text-maroon-900">Verify the proof</span>
                <span className="text-xs text-stone-400 group-hover:text-maroon-700 transition-colors">on the public chain ↗</span>
              </Link>
            </div>

            {product.voiceNoteUrl && (
              <AudioPlayer src={product.voiceNoteUrl} label="The weaver, about this piece" />
            )}

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-maroon-900">Details</h2>
              {(() => {
                const s = product.specs || {};
                const p: { loomHours?: number; weaverCount?: number } = product.production || {};
                const fmt = (v: string) => String(v).replace(/_/g, " ").toLowerCase();
                const zari = s.zariType ? fmt(s.zariType) + (s.zariGrams ? ` · ${s.zariGrams} g` : "") : s.zariGrams ? `${s.zariGrams} g` : null;
                const rows: [string, string | null][] = [
                  ["Length", s.lengthCm ? `${(s.lengthCm / 100).toFixed(2)} m` : null],
                  ["Width", s.widthCm ? `${s.widthCm} cm` : null],
                  ["Weight", s.weightGrams ? `${s.weightGrams} g` : null],
                  ["Thread count", s.threadCount?.warp || s.threadCount?.weft ? `${s.threadCount?.warp ?? "?"} × ${s.threadCount?.weft ?? "?"}` : null],
                  ["Weave", s.weaveTechnique ? s.weaveTechnique.charAt(0).toUpperCase() + fmt(s.weaveTechnique).slice(1) : null],
                  ["Zari", zari],
                  ["Dye", s.dyeType ? fmt(s.dyeType) : null],
                  ["Hours at loom", p.loomHours ? `${p.loomHours} hrs` : null],
                  ["Woven by", p.weaverCount ? `${p.weaverCount} ${p.weaverCount === 1 ? "weaver" : "weavers"}` : null],
                ];
                const shown = rows.filter(([, v]) => v);
                const colours: string[] = (s.colours || []).filter(Boolean);
                const motifs: string[] = (s.motifs || []).filter(Boolean);
                if (!shown.length && !colours.length && !motifs.length) return null;
                return (
                  <>
                    {shown.length > 0 && (
                      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {shown.map(([k, v]) => (
                          <div key={k} className="flex justify-between border-b border-silk-100 pb-1.5">
                            <dt className="text-stone-500">{k}</dt>
                            <dd className="font-medium text-right">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {(colours.length > 0 || motifs.length > 0) && (
                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                        {colours.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-silk-700">Colours</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {colours.map((c) => (
                                <span key={c} className="rounded-full bg-silk-100 border border-silk-300 px-2.5 py-0.5 text-xs text-maroon-800">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {motifs.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-silk-700">Motifs</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {motifs.map((m) => (
                                <span key={m} className="rounded-full bg-silk-100 border border-silk-300 px-2.5 py-0.5 text-xs text-maroon-800">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
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

            {/* The story, inline */}
            {(product.narrative?.title || product.narrative?.body || product.narrative?.inspiration || product.narrative?.culturalNote) && (
              <section className="card p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-silk-700">The story</p>
                {product.narrative.title && (
                  <h2 className="font-display mt-1 text-xl sm:text-2xl font-bold text-maroon-900">{product.narrative.title}</h2>
                )}
                {product.narrative.body && (
                  <p className="mt-3 text-[15px] leading-relaxed text-stone-800">{product.narrative.body}</p>
                )}
                {product.narrative.inspiration && (
                  <div className="mt-4 border-l-4 border-silk-300 pl-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-silk-700">Inspiration</p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-700">{product.narrative.inspiration}</p>
                  </div>
                )}
                {product.narrative.culturalNote && (
                  <div className="mt-4 rounded-xl bg-silk-50 border border-silk-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-silk-700">Cultural note</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{product.narrative.culturalNote}</p>
                  </div>
                )}
              </section>
            )}

            {/* secondary imagery */}
            {secondImage && (
              <section className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={secondImage} alt="On the loom" className="w-full max-h-[480px] object-cover" />
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
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-stone-400">
          SUTRA passport <span className="font-mono">{passportId}</span>
          {view.proof.sealed && view.proof.sealedAt ? ` · record sealed on ${new Date(view.proof.sealedAt).toLocaleDateString("en-IN")}` : ""}
        </p>
      </main>

      {/* sticky action bar — always within reach on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-silk-200 bg-white/95 backdrop-blur px-4 py-2.5 flex items-center gap-3">
        <Link href={`/p/${passportId}/journey`} className="btn-secondary flex-1 py-2.5">Journey</Link>
        <Link href={`/p/${passportId}/claim`} className={`flex-1 py-2.5 ${ownership.claimed ? "btn-secondary" : "btn-primary"}`}>
          {ownership.claimed ? "Owned ✓" : "Claim this piece"}
        </Link>
      </div>
    </div>
  );
}
