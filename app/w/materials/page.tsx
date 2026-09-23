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
const TYPE_EMOJI: Record<string, string> = { SILK_YARN: "🧵", COTTON_YARN: "☁️", WOOL_YARN: "🐑", ZARI: "✨", DYE: "🎨" };

const SWATCHES: Record<string, string> = {
  natural: "#efe3c8", maroon: "#701f2b", red: "#c0262d", gold: "#d4a73c", "peacock blue": "#0f5f7a",
  indigo: "#2b3a7a", green: "#2f7a3d", black: "#1f1a17", white: "#fafafa", blue: "#2856a8", yellow: "#e6b422",
};
const swatch = (colour: string) => {
  const c = colour.toLowerCase();
  return SWATCHES[c] || Object.entries(SWATCHES).find(([k]) => c.includes(k))?.[1] || "#d9cdb8";
};
const fmtKg = (g: number) => (g >= 1000 ? `${+(g / 1000).toFixed(1)} kg` : `${g} g`);

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
      <div className="md:flex md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Traceability</p>
          <h1 className="font-display mt-1 text-2xl sm:text-3xl font-bold text-maroon-900">My materials</h1>
          <p className="mt-1.5 max-w-xl text-sm text-stone-600">
            Register each yarn, zari and dye lot you buy. Link them to your pieces so a buyer can trace the thread back to its source.
          </p>
        </div>
        {lots.length > 0 && <MaterialForm className="btn-primary btn-lg mt-4 w-full md:mt-0 md:w-auto shrink-0" />}
      </div>

      {lots.length > 0 && (
        <div className="mt-5 grid grid-cols-3 divide-x divide-silk-200 rounded-2xl bg-white py-4 text-center ring-1 ring-silk-200">
          {[
            [lots.length, "Lots"],
            [fmtKg(totalGrams), "Sourced"],
            [fmtKg(usedGrams), "Woven in"],
          ].map(([v, l]) => (
            <div key={String(l)} className="px-2">
              <div className="font-display text-xl sm:text-2xl font-bold text-maroon-800">{String(v)}</div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((l) => {
          const total = l.quantity?.value || 0;
          const remaining = l.remainingGrams ?? 0;
          const usedPct = total ? Math.round(((total - remaining) / total) * 100) : 0;
          const low = total > 0 && remaining / total < 0.15;
          return (
            <div key={l.lotId} className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-silk-200">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-silk-50 text-2xl">{TYPE_EMOJI[l.type] || "🧵"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-bold text-maroon-900">{TYPE_LABEL[l.type] || l.type}</p>
                    {l.spec?.isHankYarn && (
                      <span className="shrink-0 rounded-full bg-leaf-600/10 text-leaf-700 ring-1 ring-leaf-600/25 px-2 py-0.5 text-[11px] font-bold">HANK</span>
                    )}
                  </div>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-stone-600">
                    {l.spec?.colour && <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: swatch(l.spec.colour) }} />}
                    <span className="min-w-0 truncate">{[l.spec?.colour, l.supplier?.name && `from ${l.supplier.name}`].filter(Boolean).join(" · ") || "No colour or supplier"}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className={`font-bold ${low ? "text-orange-700" : "text-maroon-900"}`}>{fmtKg(remaining)} left</span>
                  <span className="text-xs text-stone-500">of {fmtKg(total)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-silk-100 overflow-hidden" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Used">
                  <div className={`h-full rounded-full ${low ? "bg-orange-500" : "bg-maroon-600"}`} style={{ width: `${usedPct}%` }} />
                </div>
                <p className="mt-1 text-xs text-stone-500">{usedPct}% woven into your pieces{low ? " · running low" : ""}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-silk-100 pt-3">
                {CERT_LABEL[l.spec?.certification] && (
                  <span className="rounded-full bg-silk-100 px-2.5 py-0.5 text-[11px] font-semibold text-maroon-800">{CERT_LABEL[l.spec.certification]}</span>
                )}
                <span className="min-w-0 truncate font-mono text-xs text-stone-500">{l.lotId}</span>
                {l.ledger?.entrySeq != null && (
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-stone-400">
                    <Icon name="seal" className="h-3.5 w-3.5" /> #{l.ledger.entrySeq}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {lots.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white p-8 sm:p-12 text-center ring-1 ring-silk-200">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-silk-50 text-3xl">🧵</span>
            <h2 className="font-display mt-4 text-lg font-bold text-maroon-900">No materials yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">Register your yarn, zari and dye so every piece you weave can carry its full story.</p>
            <MaterialForm label="Register your first lot" className="btn-primary btn-lg mt-5 w-full sm:w-auto" />
          </div>
        )}
      </div>
    </PortalShell>
  );
}
