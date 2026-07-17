import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import Icon from "@/components/Icon";
import { ADMIN_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver, Product, Scan, FraudReport, LedgerEntry } from "@/lib/models";
import { verifyLedgerChain } from "@/lib/ledger";
import { isChainEnabled, chainNetworkName, chainProviderName, walletBalance, explorerAddressUrl } from "@/lib/chain";

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

  const chainOn = isChainEnabled();
  const [onChain, chainPending, chainFailed, wallet] = chainOn
    ? await Promise.all([
        LedgerEntry.countDocuments({ "chain.status": "CONFIRMED" }),
        LedgerEntry.countDocuments({ "chain.status": "PENDING" }),
        LedgerEntry.countDocuments({ "chain.status": "FAILED" }),
        walletBalance(),
      ])
    : [0, 0, 0, null];

  const stats: [number, string, string, string][] = [
    [weavers, "Weavers", "/coop/weavers", "users"],
    [pending, "Pending verify", "/admin/verify", "badge"],
    [products, "Products", "/coop/products", "box"],
    [minted, "Passports", "/coop/products", "seal"],
    [scans, "Scans", "/admin/dashboard", "scan"],
    [openFraud, "Open fraud", "/admin/fraud", "alert"],
    [ledgerCount, "Ledger entries", "/admin/dashboard", "grid"],
  ];

  return (
    <PortalShell title="Platform Admin" nav={ADMIN_NAV} userName={session?.name}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Operations</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">Platform overview</h1>

      <div
        className={`mt-5 flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-semibold ${
          chain.intact ? "bg-leaf-600/10 text-leaf-700 border border-leaf-600/25" : "bg-red-50 text-red-800 border border-red-200"
        }`}
      >
        <Icon name={chain.intact ? "seal" : "alert"} className="h-5 w-5 shrink-0" />
        {chain.intact
          ? `Integrity ledger verified live — ${chain.checked} entries recomputed, hash chain intact.`
          : `LEDGER CHAIN BROKEN at entry #${chain.brokenAtSeq}.`}
      </div>

      {/* Public blockchain anchoring status */}
      <div className={`mt-3 rounded-xl border px-5 py-4 ${chainOn ? "bg-maroon-900 text-silk-100 border-maroon-800" : "bg-silk-50 border-silk-200"}`}>
        {chainOn ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2 font-semibold">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-silk-200 text-maroon-900 text-xs">⛓</span>
              On-chain anchoring: <span className="text-leaf-300">{chainNetworkName()}</span>
              <span className="text-silk-200/70 font-normal">via {chainProviderName()}</span>
            </span>
            <span>{onChain.toLocaleString()} confirmed</span>
            {chainPending > 0 && <span className="text-amber-300">{chainPending} pending</span>}
            {chainFailed > 0 && <span className="text-red-300">{chainFailed} failed</span>}
            {wallet && (
              <a href={explorerAddressUrl(wallet.address) || "#"} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-mono opacity-80 hover:opacity-100">
                wallet {wallet.address.slice(0, 8)}… · {wallet.balance} POL ↗
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-600">
            <strong className="text-maroon-900">On-chain anchoring is off.</strong> Records use the local hash-chained ledger only.
            To publish every action to Polygon automatically, see <span className="font-mono text-xs">BLOCKCHAIN.md</span>.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map(([n, label, href, icon]) => (
          <Link key={label} href={href} className="card group relative overflow-hidden p-4 text-center">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-maroon-600 to-silk-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Icon name={icon} className="mx-auto h-4.5 w-4.5 text-silk-700" />
            <div className="font-display mt-2 text-2xl font-bold text-maroon-800">{n.toLocaleString()}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Append-only</p>
          <h2 className="font-display mt-1 text-xl font-bold text-maroon-900">Latest ledger entries</h2>
        </div>
      </div>
      <div className="card mt-4 divide-y divide-silk-100 overflow-hidden">
        {recentLedger.map((e) => (
          <div key={e.seq} className="px-5 py-3 flex items-baseline gap-4 text-sm hover:bg-silk-50 transition-colors">
            <span className="font-mono text-xs text-stone-400 w-10 shrink-0 text-right">#{e.seq}</span>
            <span className="w-44 shrink-0">
              <span className="rounded-md bg-silk-100 border border-silk-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-maroon-800">
                {e.type.replace(/_/g, " ")}
              </span>
            </span>
            <span className="text-stone-600 truncate flex-1">{e.summary}</span>
            <span className="text-xs text-stone-400 whitespace-nowrap hidden sm:inline">{new Date(e.at).toLocaleString("en-IN")}</span>
          </div>
        ))}
        {recentLedger.length === 0 && <p className="px-5 py-8 text-sm text-stone-500">Ledger is empty.</p>}
      </div>
    </PortalShell>
  );
}
