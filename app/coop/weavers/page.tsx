import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { COOP_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver } from "@/lib/models";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  VERIFIED: "bg-leaf-600/10 text-leaf-700 border border-leaf-600/30",
  PENDING: "bg-amber-100 text-amber-800",
  REVOKED: "bg-red-100 text-red-800",
  EXPIRED: "bg-stone-200 text-stone-600",
};

export default async function CoopWeaversPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const session = await getSession();
  await dbConnect();
  const filter: Record<string, unknown> = session?.role === "ADMIN" ? {} : { orgId: session?.orgId };
  if (status) filter["verification.status"] = status;
  const weavers = await Weaver.find(filter).sort({ createdAt: -1 }).limit(500).lean<Record<string, any>[]>();

  return (
    <PortalShell title="Cooperative Console" nav={COOP_NAV} userName={session?.name}>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Members</p>
          <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">Weaver roster{status ? ` — ${status.toLowerCase()}` : ""}</h1>
        </div>
        <Link href="/coop/weavers/new" className="btn-primary">Register a weaver</Link>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-silk-700 border-b border-silk-200">
              <th className="px-4 py-3">Weaver</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Craft · Cluster</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3 text-right">Pieces</th>
              <th className="px-4 py-3 text-right">Scans</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silk-100">
            {weavers.map((w) => (
              <tr key={w.weaverId}>
                <td className="px-4 py-3 font-semibold text-maroon-900">{w.profile?.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs text-stone-500">{w.weaverId}</td>
                <td className="px-4 py-3 text-stone-600">
                  {[w.profile?.crafts?.[0]?.name, w.profile?.cluster?.name].filter(Boolean).join(" · ")}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CHIP[w.verification?.status] || "bg-stone-100"}`}>
                    {w.verification?.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{w.stats?.productsRegistered ?? 0}</td>
                <td className="px-4 py-3 text-right">{w.stats?.totalScans ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/weaver/${w.handle}`} className="text-maroon-700 font-semibold text-xs hover:underline">public page →</Link>
                </td>
              </tr>
            ))}
            {weavers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-500">No weavers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
