import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { dbConnect } from "@/lib/db";
import { Weaver, Product } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  SAREE: "Sarees", DHOTI: "Dhotis", STOLE: "Stoles", SHAWL: "Shawls",
  FABRIC: "Fabric", DUPATTA: "Dupattas", TOWEL: "Towels", OTHER: "Other",
};

const inr = (n?: number) => (n ? "₹" + Number(n).toLocaleString("en-IN") : null);

function chipHref(base: Record<string, string | undefined>, key: string, value?: string) {
  const next = { ...base };
  if (value) next[key] = value;
  else delete next[key];
  const qs = Object.entries(next)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/explore${qs ? `?${qs}` : ""}`;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ craft?: string; category?: string }> }) {
  const { craft, category } = await searchParams;
  await dbConnect();

  const baseFilter: Record<string, unknown> = { status: { $in: ["MINTED", "FLAGGED"] } };
  const filter: Record<string, unknown> = { ...baseFilter };
  if (craft) filter["item.craft.name"] = craft;
  if (category) filter["item.category"] = category;

  const [products, crafts, categories, total, weavers] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(48)
      .populate("weaverId", "profile.displayName profile.photoAssetId profile.cluster handle")
      .lean<Record<string, any>[]>(),
    Product.distinct("item.craft.name", baseFilter),
    Product.distinct("item.category", baseFilter),
    Product.countDocuments(baseFilter),
    Weaver.find({ "verification.status": "VERIFIED", status: "ACTIVE" }).sort({ "stats.totalScans": -1 }).limit(6).lean<Record<string, any>[]>(),
  ]);

  const active = { craft, category };
  const craftList = (crafts as string[]).filter(Boolean).sort();
  const categoryList = (categories as string[]).filter(Boolean);

  const FilterLink = ({ label, href, on }: { label: string; href: string; on: boolean }) => (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
        on ? "bg-maroon-700/10 font-semibold text-maroon-900" : "text-stone-600 hover:bg-silk-100 hover:text-maroon-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <SiteHeader />

      {/* hero */}
      <section className="bg-maroon-900 text-silk-100">
        <div className="mx-auto max-w-6xl px-4 py-9 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-silk-300">The collection</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-bold">Discover authentic handloom</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-silk-100/80">
            {total.toLocaleString()} verified pieces, each with a face, a story, and a tamper-evident record.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── left sidebar: filters + makers ── */}
          <aside className="lg:w-56 shrink-0 lg:sticky lg:top-6 lg:self-start space-y-8">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-silk-700">Craft</h3>
              <nav className="mt-2 flex flex-col gap-0.5">
                <FilterLink label="All crafts" href={chipHref(active, "craft")} on={!craft} />
                {craftList.map((c) => (
                  <FilterLink key={c} label={c} href={chipHref(active, "craft", c)} on={craft === c} />
                ))}
              </nav>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-silk-700">Type</h3>
              <nav className="mt-2 flex flex-col gap-0.5">
                <FilterLink label="All types" href={chipHref(active, "category")} on={!category} />
                {categoryList.map((c) => (
                  <FilterLink key={c} label={CATEGORY_LABEL[c] || c} href={chipHref(active, "category", c)} on={category === c} />
                ))}
              </nav>
            </div>

            {weavers.length > 0 && (
              <div className="border-t border-silk-200 pt-6">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-silk-700">The makers</h3>
                <div className="mt-3 space-y-2.5">
                  {weavers.map((w) => (
                    <Link key={w.handle} href={`/weaver/${w.handle}`} className="group flex items-center gap-2.5">
                      {w.profile?.photoAssetId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(w.profile.photoAssetId)!} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-silk-200 group-hover:ring-maroon-600 transition-all" />
                      ) : (
                        <span className="h-9 w-9 rounded-full bg-silk-100" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-maroon-900 truncate group-hover:text-maroon-700">{w.profile?.displayName}</p>
                        <p className="text-[11px] text-stone-500 truncate">{w.profile?.cluster?.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ── main: product catalog ── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-stone-600">
                <span className="font-bold text-maroon-900">{products.length}</span> {products.length === 1 ? "piece" : "pieces"}
                {craft ? ` in ${craft}` : ""}{category ? ` · ${CATEGORY_LABEL[category] || category}` : ""}
              </p>
              {(craft || category) && (
                <Link href="/explore" className="text-sm font-semibold text-maroon-700 hover:underline whitespace-nowrap">Clear ✕</Link>
              )}
            </div>

            <div className="mt-4 grid gap-x-4 gap-y-7 grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const w = p.weaverId;
                const img = mediaUrl(p.media?.primaryAssetId) || mediaUrl(p.media?.onLoomAssetId);
                const flagged = p.status === "FLAGGED" || p.authenticity?.flagged;
                const price = p.item?.priceRange || {};
                const priceLabel = price.min
                  ? price.max && price.max !== price.min
                    ? `${inr(price.min)} – ${inr(price.max)}`
                    : inr(price.min)
                  : null;
                return (
                  <Link key={p.passportId} href={`/p/${p.passportId}`} className="group flex flex-col">
                    <div className="card relative overflow-hidden aspect-[4/5]">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={p.item?.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full bg-silk-100 flex items-center justify-center text-5xl">🧣</div>
                      )}
                      <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${flagged ? "bg-orange-600 text-white" : "bg-leaf-600 text-white"}`}>
                        {flagged ? "Under review" : "✓ Verified"}
                      </span>
                      {p.item?.giTag?.registered && (
                        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-maroon-800">GI</span>
                      )}
                    </div>
                    <div className="mt-2.5 px-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-silk-700">{p.item?.craft?.name}</span>
                      <h3 className="mt-0.5 text-sm font-bold leading-snug text-maroon-900 line-clamp-2 group-hover:text-maroon-700">{p.item?.name}</h3>
                      {priceLabel && (
                        <p className="mt-1.5 text-sm font-bold text-maroon-900">
                          {priceLabel} <span className="text-[10px] font-normal text-stone-400">indicative</span>
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {w?.profile?.photoAssetId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(w.profile.photoAssetId)!} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <span className="h-6 w-6 rounded-full bg-silk-200" />
                        )}
                        <span className="text-xs text-stone-500 truncate">
                          {w?.profile?.displayName}{w?.profile?.cluster?.name ? ` · ${w.profile.cluster.name}` : ""}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {products.length === 0 && (
                <div className="col-span-full card p-12 text-center text-stone-500">
                  No pieces match this filter. <Link href="/explore" className="font-semibold text-maroon-700 hover:underline">See all</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-maroon-900 text-silk-100/70 text-center text-xs py-6">
        SUTRA · every thread has a story
      </footer>
    </div>
  );
}
