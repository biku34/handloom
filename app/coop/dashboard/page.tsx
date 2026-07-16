import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver, Product, Organization } from "@/lib/models";
import { COOP_NAV } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function CoopDashboard() {
  const session = await getSession();
  await dbConnect();
  const org = session?.orgId ? await Organization.findById(session.orgId).lean<Record<string, any> | null>() : null;
  const orgFilter = session?.role === "ADMIN" ? {} : { orgId: session?.orgId };
  const [weaverCount, pendingWeavers, productCount, mintedCount, flaggedCount] = await Promise.all([
    Weaver.countDocuments(orgFilter),
    Weaver.countDocuments({ ...orgFilter, "verification.status": "PENDING" }),
    Product.countDocuments(orgFilter),
    Product.countDocuments({ ...orgFilter, status: "MINTED" }),
    Product.countDocuments({ ...orgFilter, status: "FLAGGED" }),
  ]);

  return (
    <PortalShell title="Cooperative Console" nav={COOP_NAV} userName={session?.name}>
      <h1 className="font-display text-2xl font-bold text-maroon-900">{org?.name || "Cooperative"}</h1>
      <p className="mt-1 text-sm text-stone-500">{org?.address?.district}{org?.address?.state ? `, ${org.address.state}` : ""}</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          [weaverCount, "Weavers", "/coop/weavers"],
          [pendingWeavers, "Awaiting verification", "/coop/weavers?status=PENDING"],
          [productCount, "Products", "/coop/products"],
          [mintedCount, "Passports issued", "/coop/products"],
          [flaggedCount, "Flagged", "/coop/products"],
        ].map(([n, label, href]) => (
          <Link key={String(label)} href={String(href)} className="card p-4 text-center hover:border-maroon-600 transition-colors">
            <div className="font-display text-3xl font-bold text-maroon-700">{String(n)}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/coop/weavers/new" className="card p-6 hover:border-maroon-600 transition-colors">
          <div className="text-3xl">📝</div>
          <h2 className="mt-2 font-bold text-maroon-900">Assisted registration</h2>
          <p className="mt-1 text-sm text-stone-600">Register a weaver on their behalf, in their presence, with recorded consent. The primary onboarding path.</p>
        </Link>
        <Link href="/coop/products" className="card p-6 hover:border-maroon-600 transition-colors">
          <div className="text-3xl">📦</div>
          <h2 className="mt-2 font-bold text-maroon-900">Dispatch & custody</h2>
          <p className="mt-1 text-sm text-stone-600">Transfer custody to retailers. Dispatch automatically seals each passport record.</p>
        </Link>
      </div>
    </PortalShell>
  );
}
