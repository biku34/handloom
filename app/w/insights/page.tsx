import PortalShell from "@/components/PortalShell";
import { WEAVER_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Product, Scan } from "@/lib/models";

export const dynamic = "force-dynamic";

/** Weaver analytics (FR-G4): "Your work was seen by N people." Country + count only — no scanner PII. */
export default async function InsightsPage() {
  const session = await getSession();
  await dbConnect();
  const products = session?.weaverId
    ? await Product.find({ weaverId: session.weaverId }).select("passportId item.name stats").lean<Record<string, any>[]>()
    : [];
  const passportIds = products.map((p) => p.passportId);
  const scans = await Scan.find({ passportId: { $in: passportIds }, "client.isBot": { $ne: true } })
    .sort({ at: -1 })
    .limit(2000)
    .lean<Record<string, any>[]>();

  const total = scans.length;
  const unique = new Set(scans.map((s) => s.session?.anonId).filter(Boolean)).size;
  const countries = new Set(scans.map((s) => s.network?.country).filter(Boolean));
  const cities = [...new Set(scans.map((s) => s.network?.city).filter(Boolean))].slice(0, 8);
  const last30 = scans.filter((s) => new Date(s.at).getTime() > Date.now() - 30 * 86400000).length;

  return (
    <PortalShell title="Weaver" nav={WEAVER_NAV} userName={session?.name}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Reach</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">Who saw my work</h1>

      <div className="card mt-6 p-8 text-center bg-gradient-to-br from-maroon-900 via-maroon-800 to-maroon-700 text-silk-100 border-0 shadow-lg">
        <p className="font-display text-3xl font-bold">
          Your work was seen by {unique || total} {unique === 1 ? "person" : "people"}
          {countries.size > 0 ? ` in ${countries.size} ${countries.size === 1 ? "country" : "countries"}` : ""}.
        </p>
        <p className="mt-2 text-sm opacity-80">{last30} scans in the last 30 days · {total} all-time</p>
      </div>

      {cities.length > 0 && (
        <div className="card mt-5 p-5">
          <h2 className="font-bold text-maroon-900">Where your pieces were scanned</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <span key={c} className="rounded-full bg-silk-100 border border-silk-300 px-3.5 py-1 text-sm text-maroon-800">{c}</span>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-5 divide-y divide-silk-200">
        <div className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-silk-700">Per piece</div>
        {products.map((p) => (
          <div key={p.passportId} className="px-5 py-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-maroon-900 truncate pr-3">{p.item?.name}</span>
            <span className="text-stone-500 whitespace-nowrap">{p.stats?.scanCount ?? 0} scans</span>
          </div>
        ))}
        {products.length === 0 && <p className="px-5 py-6 text-sm text-stone-500">Register a piece to start seeing scans.</p>}
      </div>
    </PortalShell>
  );
}
