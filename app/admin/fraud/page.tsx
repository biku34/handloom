import PortalShell from "@/components/PortalShell";
import { ADMIN_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { FraudReport } from "@/lib/models";
import FraudCard from "./FraudCard";

export const dynamic = "force-dynamic";

export default async function FraudQueuePage() {
  const session = await getSession();
  await dbConnect();
  const open = await FraudReport.find({ status: { $in: ["OPEN", "INVESTIGATING"] } }).sort({ riskScore: -1, createdAt: -1 }).limit(100).lean<Record<string, any>[]>();
  const closed = await FraudReport.find({ status: { $in: ["CONFIRMED_FRAUD", "FALSE_POSITIVE", "CLOSED"] } }).sort({ resolvedAt: -1 }).limit(10).lean<Record<string, any>[]>();

  const serialize = (r: Record<string, any>) => ({
    _id: String(r._id),
    reportRef: r.reportRef,
    passportId: r.passportId,
    reason: r.reason,
    description: r.description,
    riskScore: r.riskScore ?? 0,
    status: r.status,
    createdAt: String(r.createdAt),
    autoSignals: (r.autoSignals || []).map((s: Record<string, any>) => ({ signal: s.signal, weight: s.weight, detail: s.detail })),
  });

  return (
    <PortalShell title="Platform Admin" nav={ADMIN_NAV} userName={session?.name}>
      <h1 className="font-display text-2xl font-bold text-maroon-900">Fraud queue</h1>
      <p className="mt-1 text-sm text-stone-600">Sorted by risk. A duplicate-claim signal is conclusive evidence of tag cloning.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {open.map((r) => (
          <FraudCard key={String(r._id)} report={serialize(r)} />
        ))}
        {open.length === 0 && <p className="text-sm text-stone-500">No open reports. 🎉</p>}
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="mt-10 font-bold text-maroon-900">Recently resolved</h2>
          <div className="card mt-3 divide-y divide-silk-100">
            {closed.map((r) => (
              <div key={String(r._id)} className="px-4 py-2.5 flex items-baseline gap-3 text-sm">
                <span className="font-mono text-xs text-stone-400">{r.reportRef}</span>
                <span className="font-semibold text-maroon-800">{r.reason?.replace(/_/g, " ")}</span>
                <span className={`text-xs font-bold ${r.status === "CONFIRMED_FRAUD" ? "text-red-700" : "text-leaf-700"}`}>{r.status?.replace(/_/g, " ")}</span>
                <span className="text-stone-500 text-xs truncate flex-1">{r.resolution}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </PortalShell>
  );
}
