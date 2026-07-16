import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { ADMIN_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver, Product, Scan, FraudReport, LedgerEntry } from "@/lib/models";
import { verifyLedgerChain } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getSession();
  await dbConnect();
  const [weavers, pending, products, minted, scans, openFraud, ledgerCount, chain] = await Promise.all([
    Weaver.countDocuments(),
    Weaver.countDocuments({ "verification.status": "PENDING" }),
    Product.countDocuments(),
    Product.countDocuments({ status: "MINTED" }),
    Scan.countDocuments(),
    FraudReport.countDocuments({ status: { $in: ["OPEN", "INVESTIGATING"] } }),
    LedgerEntry.countDocuments(),
    verifyLedgerChain(),
  ]);
  const recentLedger = await LedgerEntry.find().sort({ seq: -1 }).limit(10).lean<Record<string, any>[]>();

  return (
    <PortalShell title="Platform Admin" nav={ADMIN_NAV} userName={session?.name}>
      <h1 className="font-display text-2xl font-bold text-maroon-900">Platform overview</h1>

      <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${chain.intact ? "bg-leaf-600/10 text-leaf-700 border border-leaf-600/30" : "bg-red-100 text-red-800 border border-red-300"}`}>
        {chain.intact ? `✓ Integrity ledger verified — ${chain.checked} entries, hash chain intact.` : `✕ LEDGER CHAIN BROKEN at entry #${chain.brokenAtSeq}.`}
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          [weavers, "Weavers", "/coop/weavers"],
          [pending, "Pending verify", "/admin/verify"],
          [products, "Products", "/coop/products"],
          [minted, "Passports", "/coop/products"],
          [scans, "Scans", "/admin/dashboard"],
          [openFraud, "Open fraud", "/admin/fraud"],
          [ledgerCount, "Ledger entries", "/admin/dashboard"],
        ].map(([n, label, href]) => (
          <Link key={String(label)} href={String(href)} className="card p-3 text-center hover:border-maroon-600 transition-colors">
            <div className="font-display text-2xl font-bold text-maroon-700">{String(n)}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">{label}</div>
          </Link>
        ))}
      </div>

      <h2 className="font-display mt-8 text-lg font-bold text-maroon-900">Latest ledger entries</h2>
      <div className="card mt-3 divide-y divide-silk-100">
        {recentLedger.map((e) => (
          <div key={e.seq} className="px-4 py-2.5 flex items-baseline gap-3 text-sm">
            <span className="font-mono text-xs text-stone-400 w-10 shrink-0">#{e.seq}</span>
            <span className="font-semibold text-maroon-800 w-44 shrink-0">{e.type.replace(/_/g, " ")}</span>
            <span className="text-stone-600 truncate flex-1">{e.summary}</span>
            <span className="text-xs text-stone-400 whitespace-nowrap">{new Date(e.at).toLocaleString("en-IN")}</span>
          </div>
        ))}
        {recentLedger.length === 0 && <p className="px-4 py-6 text-sm text-stone-500">Ledger is empty.</p>}
      </div>
    </PortalShell>
  );
}
