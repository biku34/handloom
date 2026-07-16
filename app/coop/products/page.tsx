import PortalShell from "@/components/PortalShell";
import { COOP_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Product } from "@/lib/models";
import CustodyPanel from "./CustodyPanel";

export const dynamic = "force-dynamic";

export default async function CoopProductsPage() {
  const session = await getSession();
  await dbConnect();
  const filter = session?.role === "ADMIN" ? {} : { orgId: session?.orgId };
  const products = await Product.find(filter).sort({ createdAt: -1 }).limit(300).lean<Record<string, any>[]>();

  return (
    <PortalShell title="Cooperative Console" nav={COOP_NAV} userName={session?.name}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Chain of custody</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">Products & custody</h1>
      <p className="mt-1.5 mb-5 text-sm text-stone-600">
        Select passported items and dispatch them to a retailer. Dispatch records a custody event and permanently seals each record.
      </p>
      <CustodyPanel
        products={products.map((p) => ({
          _id: String(p._id),
          passportId: p.passportId,
          name: p.item?.name || "(unnamed)",
          status: p.status,
          holder: [p.custody?.currentHolderType, p.custody?.currentHolderName].filter(Boolean).join(": "),
          frozen: !!p.passport?.frozen,
          dispatchable: p.status === "MINTED" && !["RETAILER", "CONSUMER"].includes(p.custody?.currentHolderType),
        }))}
      />
    </PortalShell>
  );
}
