import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import AudioPlayer from "@/components/AudioPlayer";
import { dbConnect } from "@/lib/db";
import { Weaver, Product } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Public weaver profile (FR-A5): no phone, no address beyond village, no ID data. */
export default async function WeaverProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  await dbConnect();
  const w = await Weaver.findOne({ handle }).lean<Record<string, any> | null>();
  if (!w) {
    return (
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-stone-600">No weaver found at this address.</p>
          <Link href="/explore" className="btn-primary mt-4">Explore weavers</Link>
        </main>
      </div>
    );
  }
  const products = await Product.find({ weaverId: w._id, status: { $in: ["MINTED", "FLAGGED"] } })
    .sort({ createdAt: -1 })
    .limit(24)
    .lean<Record<string, any>[]>();
  const verified = w.verification?.status === "VERIFIED";

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-16">
        <section className="card overflow-hidden sm:flex">
          {w.profile?.photoAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(w.profile.photoAssetId)!} alt={w.profile?.displayName} className="sm:w-72 w-full aspect-square object-cover" />
          ) : (
            <div className="sm:w-72 w-full aspect-square bg-silk-100 flex items-center justify-center text-7xl">🧑‍🦱</div>
          )}
          <div className="p-6 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl font-bold text-maroon-900">{w.profile?.displayName}</h1>
              {verified && (
                <span className="rounded-full bg-leaf-600 text-white text-xs font-bold px-2.5 py-1">✓ Verified weaver</span>
              )}
              {w.verification?.status === "REVOKED" && (
                <span className="rounded-full bg-red-700 text-white text-xs font-bold px-2.5 py-1">Credential revoked</span>
              )}
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {[
                w.profile?.crafts?.map((c: { name: string }) => c.name).join(", "),
                [w.personal?.address?.village, w.profile?.cluster?.name, w.profile?.cluster?.state].filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                [w.profile?.yearsWeaving ?? "—", "years weaving"],
                [w.profile?.generation ? `${w.profile.generation}th` : "—", "generation"],
                [w.stats?.totalScans ?? 0, "scans worldwide"],
              ].map(([v, l]) => (
                <div key={String(l)} className="rounded-xl bg-silk-50 border border-silk-200 py-2.5">
                  <dt className="font-display text-xl font-bold text-maroon-700">{String(v)}</dt>
                  <dd className="text-[11px] text-stone-500 font-semibold uppercase tracking-wide">{l}</dd>
                </div>
              ))}
            </dl>
            {verified && (
              <p className="mt-4 text-xs text-stone-500">
                Physically verified by <strong>{w.verification?.verifierOrgName || w.verification?.verifierName}</strong>
                {w.verification?.verifiedAt ? ` on ${new Date(w.verification.verifiedAt).toLocaleDateString("en-IN")}` : ""}
                {w.ledger?.credentialEntrySeq != null ? ` · ledger entry #${w.ledger.credentialEntrySeq}` : ""}
              </p>
            )}
            {w.profile?.guruLineage && <p className="mt-3 text-sm italic text-stone-600">“{w.profile.guruLineage}”</p>}
          </div>
        </section>

        {(w.story?.audioAssetId || w.story?.transcript?.original?.text) && (
          <section className="mt-6">
            <h2 className="font-display text-xl font-bold text-maroon-900">In their own words</h2>
            {w.story?.audioAssetId && (
              <div className="mt-3">
                <AudioPlayer src={mediaUrl(w.story.audioAssetId)!} label={`Hear ${w.profile?.displayName?.split(" ")[0]}`} durationSec={w.story?.audioDurationSec} />
              </div>
            )}
            {w.story?.transcript?.original?.text && (
              <blockquote className="card mt-3 p-5 text-[15px] italic leading-relaxed text-stone-800">
                “{w.story.transcript.original.text}”
              </blockquote>
            )}
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-maroon-900">Passported work</h2>
          <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3">
            {products.map((p) => (
              <Link key={p.passportId} href={`/p/${p.passportId}`} className="card overflow-hidden hover:border-maroon-600 transition-colors">
                {p.media?.primaryAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.media.primaryAssetId)!} alt={p.item?.name} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-silk-100 flex items-center justify-center text-4xl">🧣</div>
                )}
                <div className="p-3">
                  <h3 className="text-sm font-bold text-maroon-900 line-clamp-2">{p.item?.name}</h3>
                </div>
              </Link>
            ))}
            {products.length === 0 && <p className="text-sm text-stone-500 col-span-full">No passported pieces yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
