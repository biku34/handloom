import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import ProductCard from "@/components/ProductCard";
import { getCatalog } from "@/lib/catalog";
import { mediaUrl } from "@/lib/storage";

export const metadata = { title: "Shop" };

const CATEGORY_LABEL: Record<string, string> = {
  SAREE: "Sarees", DHOTI: "Dhotis", STOLE: "Stoles", SHAWL: "Shawls",
  FABRIC: "Fabric", DUPATTA: "Dupattas", TOWEL: "Towels", OTHER: "Other",
};

type Params = { craft?: string; category?: string; q?: string };

function hrefWith(base: Params, key: keyof Params, value?: string) {
  const next: Params = { ...base };
  if (value) next[key] = value;
  else delete next[key];
  const qs = Object.entries(next)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/explore${qs ? `?${qs}` : ""}`;
}

function Chip({ label, href, on }: { label: string; href: string; on: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ${
        on ? "bg-maroon-800 text-white ring-maroon-800" : "bg-white text-stone-700 ring-silk-200 hover:ring-maroon-600"
      }`}
    >
      {label}
    </Link>
  );
}

function SideLink({ label, href, on }: { label: string; href: string; on: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
        on ? "bg-maroon-700/10 font-semibold text-maroon-900" : "text-stone-600 hover:bg-silk-100 hover:text-maroon-800"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  const { craft, category, q: rawQ } = await searchParams;
  const q = rawQ?.trim() || undefined;
  let catalog: Awaited<ReturnType<typeof getCatalog>> | null = null;
  try {
    catalog = await getCatalog(craft, category, q);
  } catch (e) {
    // DB unreachable — show a friendly notice instead of crashing (P6).
    console.error("[explore] catalog query failed:", e);
  }
  if (!catalog) {
    return (
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-maroon-900">The collection is taking a breather</h1>
          <p className="mt-2 text-sm text-stone-600">We couldn&apos;t load the pieces right now. Please try again in a moment.</p>
          <Link href="/explore" className="btn-primary btn-lg mt-6 w-full">Try again</Link>
        </main>
      </div>
    );
  }
  const { products, crafts, categories, total, makers } = catalog;
  const active: Params = { craft, category, q };
  const filtered = Boolean(craft || category || q);

  return (
    <div>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-5 md:py-8">
        {/* heading */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-maroon-900 truncate">
              {q ? `“${q}”` : craft || (category ? CATEGORY_LABEL[category] || category : "The collection")}
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              {filtered
                ? `${products.length} ${products.length === 1 ? "piece" : "pieces"} found`
                : `${total.toLocaleString("en-IN")} verified pieces, each with a face and a story`}
            </p>
          </div>
          {filtered && (
            <Link href="/explore" className="shrink-0 rounded-full bg-silk-100 px-3 py-1.5 text-sm font-semibold text-maroon-800 hover:bg-silk-200">
              Clear ✕
            </Link>
          )}
        </div>

        {/* phones & tablets: swipeable filter chips */}
        <div className="lg:hidden mt-4 space-y-2.5">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Chip label="All crafts" href={hrefWith(active, "craft")} on={!craft} />
            {crafts.map((c) => (
              <Chip key={c} label={c} href={hrefWith(active, "craft", c)} on={craft === c} />
            ))}
          </div>
          {categories.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <Chip label="All types" href={hrefWith(active, "category")} on={!category} />
              {categories.map((c) => (
                <Chip key={c} label={CATEGORY_LABEL[c] || c} href={hrefWith(active, "category", c)} on={category === c} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-8">
          {/* desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start space-y-7">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-silk-700">Craft</h3>
              <nav className="mt-2 flex flex-col gap-0.5">
                <SideLink label="All crafts" href={hrefWith(active, "craft")} on={!craft} />
                {crafts.map((c) => (
                  <SideLink key={c} label={c} href={hrefWith(active, "craft", c)} on={craft === c} />
                ))}
              </nav>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-silk-700">Type</h3>
              <nav className="mt-2 flex flex-col gap-0.5">
                <SideLink label="All types" href={hrefWith(active, "category")} on={!category} />
                {categories.map((c) => (
                  <SideLink key={c} label={CATEGORY_LABEL[c] || c} href={hrefWith(active, "category", c)} on={category === c} />
                ))}
              </nav>
            </div>
            {makers.length > 0 && (
              <div className="border-t border-silk-200 pt-6">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-silk-700">The makers</h3>
                <div className="mt-3 space-y-2.5">
                  {makers.map((w) => {
                    const photo = mediaUrl(w.profile?.photoAssetId);
                    return (
                      <Link key={w.handle} href={`/weaver/${w.handle}`} className="group flex items-center gap-2.5">
                        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-silk-100 ring-1 ring-silk-200 group-hover:ring-maroon-600">
                          {photo && <Image src={photo} alt="" fill sizes="36px" className="object-cover" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-maroon-900 truncate group-hover:text-maroon-700">{w.profile?.displayName}</p>
                          <p className="text-[11px] text-stone-500 truncate">{w.profile?.cluster?.name}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* catalog */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.passportId} p={p} priority={i < 2} />
              ))}
            </div>
            {products.length === 0 && (
              <div className="card p-12 text-center text-stone-500">
                No pieces match{q ? ` “${q}”` : " this filter"}.{" "}
                <Link href="/explore" className="font-semibold text-maroon-700 hover:underline">See everything</Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-10 bg-maroon-900 text-silk-100/70 text-center text-xs py-6">
        SUTRA · every thread has a story
      </footer>
    </div>
  );
}
