import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { dbConnect } from "@/lib/db";
import { Weaver, Product } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  await dbConnect();
  const weavers = await Weaver.find({ "verification.status": "VERIFIED", status: "ACTIVE" })
    .sort({ "stats.totalScans": -1 })
    .limit(24)
    .lean<Record<string, any>[]>();
  const products = await Product.find({ status: "MINTED" })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate("weaverId", "profile.displayName handle")
    .lean<Record<string, any>[]>();

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-maroon-900">Meet the weavers</h1>
        <p className="mt-2 text-sm text-stone-600">Every profile below belongs to a person whose loom was physically verified.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {weavers.map((w) => (
            <Link key={w.handle} href={`/weaver/${w.handle}`} className="card overflow-hidden hover:border-maroon-600 transition-colors">
              {w.profile?.photoAssetId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(w.profile.photoAssetId)!} alt={w.profile?.displayName} className="w-full aspect-[3/2] object-cover" />
              ) : (
                <div className="w-full aspect-[3/2] bg-silk-100 flex items-center justify-center text-5xl">🧑‍🦱</div>
              )}
              <div className="p-4">
                <h2 className="font-bold text-maroon-900">{w.profile?.displayName}</h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  {[w.profile?.crafts?.[0]?.name, w.profile?.cluster?.name].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 text-xs text-stone-400">
                  {[w.profile?.yearsWeaving ? `${w.profile.yearsWeaving} yrs` : null, w.stats?.productsRegistered ? `${w.stats.productsRegistered} pieces` : null, `${w.stats?.totalScans ?? 0} scans`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </Link>
          ))}
          {weavers.length === 0 && <p className="text-sm text-stone-500">No verified weavers yet — run the seed script.</p>}
        </div>

        <h2 className="font-display mt-14 text-2xl font-bold text-maroon-900">Recently passported pieces</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <Link key={p.passportId} href={`/p/${p.passportId}`} className="card overflow-hidden hover:border-maroon-600 transition-colors">
              {p.media?.primaryAssetId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(p.media.primaryAssetId)!} alt={p.item?.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-silk-100 flex items-center justify-center text-5xl">🧣</div>
              )}
              <div className="p-3">
                <h3 className="text-sm font-bold text-maroon-900 line-clamp-2">{p.item?.name}</h3>
                <p className="mt-1 text-xs text-stone-500">{p.weaverId?.profile?.displayName}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
