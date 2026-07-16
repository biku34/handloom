import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver, Product } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const WEAVER_NAV = [
  { href: "/w/dashboard", label: "🏠 My work" },
  { href: "/w/register", label: "➕ Register a piece" },
  { href: "/w/insights", label: "📊 Who saw my work" },
];

const STATUS_CHIP: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  PENDING_MEDIA: "bg-amber-100 text-amber-800",
  QUEUED: "bg-amber-100 text-amber-800",
  MINTED: "bg-leaf-600/10 text-leaf-700 border border-leaf-600/30",
  FLAGGED: "bg-orange-100 text-orange-800",
  VOID: "bg-red-100 text-red-800",
};

export default async function WeaverDashboard() {
  const session = await getSession();
  await dbConnect();
  const weaver = session?.weaverId ? await Weaver.findById(session.weaverId).lean<Record<string, any> | null>() : null;
  const products = weaver
    ? await Product.find({ weaverId: weaver._id }).sort({ createdAt: -1 }).lean<Record<string, any>[]>()
    : [];

  return (
    <PortalShell title="Weaver" nav={WEAVER_NAV} userName={session?.name}>
      {weaver && (
        <section className="card p-5 sm:flex items-center gap-5">
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-maroon-900">
              Vanakkam, {weaver.profile?.displayName?.split(" ")[0]} 🙏
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              {weaver.verification?.status === "VERIFIED" ? (
                <>✓ Verified weaver · credential valid till {weaver.verification?.expiresAt ? new Date(weaver.verification.expiresAt).toLocaleDateString("en-IN") : "—"}</>
              ) : (
                <>⏳ Verification {weaver.verification?.status?.toLowerCase()} — your cooperative&apos;s verifier will visit soon. Passports unlock after that.</>
              )}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 grid grid-cols-3 gap-3 text-center">
            {[
              [products.length, "pieces"],
              [weaver.stats?.totalScans ?? 0, "scans"],
              [products.filter((p) => p.authenticity?.claimedByConsumer).length, "found homes"],
            ].map(([v, l]) => (
              <div key={String(l)} className="rounded-xl bg-silk-50 border border-silk-200 px-4 py-2">
                <div className="font-display text-xl font-bold text-maroon-700">{String(v)}</div>
                <div className="text-[10px] uppercase tracking-wide text-stone-500 font-semibold">{l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-maroon-900">My pieces</h2>
        <Link href="/w/register" className="btn-primary">➕ Register a piece</Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Link key={p.passportId} href={`/w/products/${p._id}`} className="card overflow-hidden hover:border-maroon-600 transition-colors">
            {p.media?.primaryAssetId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(p.media.primaryAssetId)!} alt={p.item?.name} className="w-full aspect-[4/3] object-cover" />
            ) : (
              <div className="w-full aspect-[4/3] bg-silk-100 flex items-center justify-center text-5xl">🧣</div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-maroon-900 line-clamp-2">{p.item?.name}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CHIP[p.status] || "bg-stone-100"}`}>
                  {p.status === "MINTED" ? "PASSPORTED" : p.status}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-stone-500">
                {p.stats?.scanCount ?? 0} scans{p.authenticity?.claimedByConsumer ? " · claimed 💚" : ""}
              </p>
            </div>
          </Link>
        ))}
        {products.length === 0 && (
          <div className="card col-span-full p-10 text-center text-stone-500">
            <div className="text-5xl">🪡</div>
            <p className="mt-3">No pieces yet. Register your first — it takes under two minutes.</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
