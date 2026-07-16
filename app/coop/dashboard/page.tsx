import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import Icon from "@/components/Icon";
import { COOP_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver, Product, Organization } from "@/lib/models";

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

  const stats: [string | number, string, string, string][] = [
    [weaverCount, "Weavers", "/coop/weavers", "users"],
    [pendingWeavers, "Awaiting verification", "/coop/weavers?status=PENDING", "badge"],
    [productCount, "Products", "/coop/products", "box"],
    [mintedCount, "Passports issued", "/coop/products", "seal"],
    [flaggedCount, "Flagged", "/coop/products", "alert"],
  ];

  return (
    <PortalShell title="Cooperative" nav={COOP_NAV} userName={session?.name}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Cooperative console</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">{org?.name || "Cooperative"}</h1>
      <p className="mt-1.5 text-sm text-stone-500">
        {org?.address?.district}
        {org?.address?.state ? `, ${org.address.state}` : ""}
        {org?.registrationNo ? ` · Reg. ${org.registrationNo}` : ""}
      </p>

      <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(([n, label, href, icon]) => (
          <Link key={label} href={href} className="card group relative overflow-hidden p-5">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-maroon-600 to-silk-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Icon name={icon} className="h-5 w-5 text-silk-700" />
            <div className="font-display mt-3 text-3xl font-bold text-maroon-800">{String(n)}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Link href="/coop/weavers/new" className="card group p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-maroon-700/10 text-maroon-700">
            <Icon name="users" className="h-5.5 w-5.5" />
          </div>
          <h2 className="font-display mt-4 text-lg font-bold text-maroon-900">Assisted registration</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Register a weaver on their behalf, in their presence, with recorded consent. The primary onboarding path in year one.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-maroon-700 group-hover:gap-2.5 transition-all">
            Begin <Icon name="arrow" className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/coop/products" className="card group p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-maroon-700/10 text-maroon-700">
            <Icon name="box" className="h-5.5 w-5.5" />
          </div>
          <h2 className="font-display mt-4 text-lg font-bold text-maroon-900">Dispatch & custody</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Transfer custody to retailers. Dispatch automatically seals each passport record — permanently.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-maroon-700 group-hover:gap-2.5 transition-all">
            Open custody <Icon name="arrow" className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </PortalShell>
  );
}
