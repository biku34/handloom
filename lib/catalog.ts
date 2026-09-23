import { unstable_cache } from "next/cache";
import { dbConnect } from "./db";
import { Weaver, Product, Scan, LedgerEntry } from "./models";

/* Public storefront queries, cached for a minute so a page view doesn't wait
   on several round-trips to MongoDB Atlas every time. Results go through
   JSON (ObjectIds → strings, Dates → ISO strings). */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type CatalogProduct = Record<string, any>;

const PUBLIC = { status: { $in: ["MINTED", "FLAGGED"] } };
const CARD_WEAVER_FIELDS = "profile.displayName profile.photoAssetId profile.cluster handle";
const REVALIDATE = 60;

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getHomeData = unstable_cache(
  async () => {
    await dbConnect();
    const [weavers, passports, scans, ledger, latest, crafts, makers] = await Promise.all([
      Weaver.countDocuments({ "verification.status": "VERIFIED" }),
      Product.countDocuments(PUBLIC),
      Scan.countDocuments(),
      LedgerEntry.countDocuments(),
      Product.find(PUBLIC).sort({ createdAt: -1 }).limit(8).populate("weaverId", CARD_WEAVER_FIELDS).lean(),
      Product.distinct("item.craft.name", PUBLIC),
      Weaver.find({ "verification.status": "VERIFIED", status: "ACTIVE" })
        .sort({ "stats.totalScans": -1 })
        .limit(8)
        .select("handle profile.displayName profile.photoAssetId profile.cluster")
        .lean(),
    ]);
    return plain({
      stats: { weavers, passports, scans, ledger },
      latest: latest as CatalogProduct[],
      crafts: (crafts as string[]).filter(Boolean).sort(),
      makers: makers as CatalogProduct[],
    });
  },
  ["home-v1"],
  { revalidate: REVALIDATE, tags: ["catalog"] }
);

export const getCatalog = unstable_cache(
  async (craft?: string, category?: string, q?: string) => {
    await dbConnect();
    const filter: Record<string, unknown> = { ...PUBLIC };
    if (craft) filter["item.craft.name"] = craft;
    if (category) filter["item.category"] = category;
    if (q) {
      const rx = new RegExp(escapeRegex(q.slice(0, 60)), "i");
      filter.$or = [{ "item.name": rx }, { "item.craft.name": rx }, { "item.category": rx }, { "item.description": rx }];
    }
    const [products, crafts, categories, total, makers] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).limit(48).populate("weaverId", CARD_WEAVER_FIELDS).lean(),
      Product.distinct("item.craft.name", PUBLIC),
      Product.distinct("item.category", PUBLIC),
      Product.countDocuments(PUBLIC),
      Weaver.find({ "verification.status": "VERIFIED", status: "ACTIVE" })
        .sort({ "stats.totalScans": -1 })
        .limit(6)
        .select("handle profile.displayName profile.photoAssetId profile.cluster")
        .lean(),
    ]);
    return plain({
      products: products as CatalogProduct[],
      crafts: (crafts as string[]).filter(Boolean).sort(),
      categories: (categories as string[]).filter(Boolean),
      total,
      makers: makers as CatalogProduct[],
    });
  },
  ["catalog-v1"],
  { revalidate: REVALIDATE, tags: ["catalog"] }
);
