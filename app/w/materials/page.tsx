import PortalShell from "@/components/PortalShell";
import Icon from "@/components/Icon";
import { WEAVER_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { MaterialLot } from "@/lib/models";
import MaterialForm from "./MaterialForm";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  SILK_YARN: "Silk yarn", COTTON_YARN: "Cotton yarn", WOOL_YARN: "Wool yarn", ZARI: "Zari", DYE: "Dye",
};
const CERT_LABEL: Record<string, string> = {
  SILK_MARK: "Silk Mark", HANDLOOM_HANK: "Handloom hank", AZO_FREE: "Azo-free", ORGANIC: "Organic", NONE: "",
};

export default async function MaterialsPage() {
  const session = await getSession();
  await dbConnect();
  const lots = session?.weaverId
    ? await MaterialLot.find({ weaverId: session.weaverId }).sort({ createdAt: -1 }).lean<Record<string, any>[]>()
    : [];

  const totalGrams = lots.reduce((a, l) => a + (l.quantity?.value || 0), 0);
  const usedGrams = lots.reduce((a, l) => a + ((l.quantity?.value || 0) - (l.remainingGrams || 0)), 0);

  return (
    <PortalShell title="Weaver" nav={WEAVER_NAV} userName={session?.name}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Traceability</p>
          <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">My materials</h1>
          <p className="mt-1.5 text-sm text-stone-600">
            Register each yarn, zari and dye lot you buy. Link them to your pieces so a buyer can trace the thread back to its source.
          </p>
        </div>
        <MaterialForm />
      </div>

      {lots.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            [lots.length, "lots registered"],
            [`${(totalGrams / 1000).toFixed(1)} kg`, "total sourced"],
            [`${(usedGrams / 1000).toFixed(1)} kg`, "woven in"],
          ].map(([v, l]) => (
            <div key={String(l)} className="card p-4 text-center">
              <div className="font-display text-2xl font-bold text-maroon-800">{String(v)}</div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((l) => {
          const total = l.quantity?.value || 0;
          const remaining = l.remainingGrams ?? 0;
          const usedPct = total ? Math.round(((total - remaining) / total) * 100) : 0;
          return (
            <div key={l.lotId} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-bold text-maroon-900">{TYPE_LABEL[l.type] || l.type}</p>
                  <p className="font-mono text-xs text-stone-400">{l.lotId}</p>
                </div>
                {l.spec?.isHankYarn && (
                  <span className="rounded-full bg-leaf-600/10 text-leaf-700 border border-leaf-600/25 px-2.5 py-0.5 text-[10px] font-bold">HANK</span>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-stone-600">
                {l.spec?.colour && <p>{l.spec.colour}</p>}
                {l.supplier?.name && <p className="text-xs text-stone-500">from {l.supplier.name}</p>}
                {CERT_LABEL[l.spec?.certification] && (
                  <span className="inline-block rounded-full bg-silk-100 border border-silk-300 px-2.5 py-0.5 text-[11px] font-semibold text-maroon-800">
                    {CERT_LABEL[l.spec.certification]}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>{remaining} g left</span>
                  <span>{usedPct}% used</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-silk-100 overflow-hidden">
                  <div className="h-full bg-maroon-600" style={{ width: `${usedPct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-stone-400">of {total} g sourced</p>
              </div>
              {l.ledger?.entrySeq != null && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-400">
                  <Icon name="seal" className="h-3.5 w-3.5" /> ledger entry #{l.ledger.entrySeq}
                </p>
              )}
            </div>
          );
        })}
        {lots.length === 0 && (
          <div className="card col-span-full p-12 text-center text-stone-500">
            <Icon name="spool" className="mx-auto h-10 w-10 text-silk-300" strokeWidth={1.2} />
            <p className="mt-4">No material lots yet. Register your yarn and dye so your pieces can carry their full story.</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
