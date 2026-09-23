import Link from "next/link";
import Image from "next/image";
import { mediaUrl } from "@/lib/storage";
import type { CatalogProduct } from "@/lib/catalog";

const inr = (n?: number) => (n ? "₹" + Number(n).toLocaleString("en-IN") : null);

/** Storefront product tile — shared by the home page and the catalog. */
export default function ProductCard({ p, priority = false }: { p: CatalogProduct; priority?: boolean }) {
  const w = p.weaverId;
  const img = mediaUrl(p.media?.primaryAssetId) || mediaUrl(p.media?.onLoomAssetId);
  const avatar = mediaUrl(w?.profile?.photoAssetId);
  const flagged = p.status === "FLAGGED" || p.authenticity?.flagged;
  const price = p.item?.priceRange || {};
  const priceLabel = price.min
    ? price.max && price.max !== price.min
      ? `${inr(price.min)} – ${inr(price.max)}`
      : inr(price.min)
    : null;

  return (
    <Link href={`/p/${p.passportId}`} className="group flex flex-col rounded-2xl bg-white ring-1 ring-silk-200 overflow-hidden transition-shadow hover:shadow-[0_10px_28px_-12px_rgba(64,16,26,0.35)]">
      <div className="relative aspect-[4/5] bg-silk-100">
        {img ? (
          <Image
            src={img}
            alt={p.item?.name || "Handloom piece"}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-5xl">🧣</div>
        )}
        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
            flagged ? "bg-orange-600 text-white" : "bg-leaf-600 text-white"
          }`}
        >
          {flagged ? "Under review" : "✓ Verified"}
        </span>
        {p.item?.giTag?.registered && (
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-maroon-800 shadow-sm">GI</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-silk-700 truncate">{p.item?.craft?.name}</span>
        <h3 className="mt-0.5 text-sm font-semibold leading-snug text-maroon-900 line-clamp-2">{p.item?.name}</h3>
        <div className="mt-auto pt-2">
          {priceLabel ? (
            <p className="text-[15px] font-bold text-maroon-900">{priceLabel}</p>
          ) : (
            <p className="text-xs font-medium text-stone-400">Price on request</p>
          )}
          <div className="mt-2 flex items-center gap-1.5 border-t border-silk-100 pt-2">
            {avatar ? (
              <Image src={avatar} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="h-5 w-5 rounded-full bg-silk-200" />
            )}
            <span className="text-[11px] text-stone-500 truncate">
              by {w?.profile?.displayName || "a verified weaver"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
