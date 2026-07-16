import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import Icon from "@/components/Icon";
import { WEAVER_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver, Product, Claim } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: "bg-stone-100 text-stone-600 border border-stone-200", label: "Draft" },
  PENDING_MEDIA: { cls: "bg-amber-50 text-amber-800 border border-amber-200", label: "Needs photo" },
  QUEUED: { cls: "bg-amber-50 text-amber-800 border border-amber-200", label: "Queued" },
  MINTED: { cls: "bg-leaf-600/10 text-leaf-700 border border-leaf-600/25", label: "Passported" },
  FLAGGED: { cls: "bg-orange-50 text-orange-800 border border-orange-200", label: "Under review" },
  VOID: { cls: "bg-red-50 text-red-800 border border-red-200", label: "Voided" },
};

export default async function WeaverDashboard() {
  const session = await getSession();
  await dbConnect();
  const weaver = session?.weaverId ? await Weaver.findById(session.weaverId).lean<Record<string, any> | null>() : null;
  const products = weaver
    ? await Product.find({ weaverId: weaver._id }).sort({ createdAt: -1 }).lean<Record<string, any>[]>()
    : [];
  const verified = weaver?.verification?.status === "VERIFIED";
  const claims = products.length
    ? await Claim.find({ productId: { $in: products.map((p) => p._id) }, status: "CLAIMED" }).lean<Record<string, any>[]>()
    : [];
  const claimantByProduct = new Map(claims.map((c) => [String(c.productId), c.claimantName]));

  if (!weaver) {
    return (
      <PortalShell title="Weaver" nav={WEAVER_NAV} userName={session?.name}>
        <div className="card mx-auto max-w-md p-10 text-center">
          <p className="text-sm text-stone-600">Your session is out of date.</p>
          <Link href="/login" className="btn-primary mt-4">Sign in again</Link>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Weaver" nav={WEAVER_NAV} userName={session?.name}>
      {weaver && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon-900 via-maroon-800 to-maroon-700 text-silk-100 shadow-lg">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, #fff 0 2px, transparent 2px 14px)" }}
            aria-hidden="true"
          />
          <div className="relative px-6 py-7 sm:px-8 sm:flex items-center gap-8">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-300">
                {weaver.profile?.cluster?.name} · {weaver.profile?.crafts?.[0]?.name}
              </p>
              <h1 className="font-display mt-1.5 text-3xl font-bold">
                Vanakkam, {weaver.profile?.displayName?.split(" ")[0]}
              </h1>
              <p className="mt-2.5 text-sm text-silk-100/80 flex items-center gap-2">
                {verified ? (
                  <>
                    <Icon name="badge" className="h-4 w-4 text-silk-300" />
                    Verified weaver · credential valid till {weaver.verification?.expiresAt ? new Date(weaver.verification.expiresAt).toLocaleDateString("en-IN") : "—"}
                  </>
                ) : (
                  <>Verification {weaver.verification?.status?.toLowerCase()} — the verifier will visit soon. Passports unlock after that.</>
                )}
              </p>
            </div>
            <div className="mt-6 sm:mt-0 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/15 border border-white/15 text-center shrink-0">
              {[
                [products.length, "pieces"],
                [weaver.stats?.totalScans ?? 0, "scans"],
                [products.filter((p) => p.authenticity?.claimedByConsumer).length, "found homes"],
              ].map(([v, l]) => (
                <div key={String(l)} className="bg-maroon-900/40 px-5 py-3.5 backdrop-blur-sm">
                  <div className="font-display text-2xl font-bold text-silk-200">{String(v)}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-silk-100/60 font-semibold">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="mt-9 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">The loom&apos;s ledger</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-maroon-900">My pieces</h2>
        </div>
        <Link href="/w/register" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" /> Register a piece
        </Link>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const chip = STATUS_CHIP[p.status] || STATUS_CHIP.DRAFT;
          return (
            <Link key={p.passportId} href={`/w/products/${p._id}`} className="card overflow-hidden group">
              <div className="overflow-hidden">
                {p.media?.primaryAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(p.media.primaryAssetId)!}
                    alt={p.item?.name}
                    className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-silk-100 flex items-center justify-center text-silk-300">
                    <Icon name="box" className="h-12 w-12" strokeWidth={1.2} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-maroon-900 line-clamp-2 leading-snug">{p.item?.name}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${chip.cls}`}>{chip.label}</span>
                </div>
                <p className="mt-2 text-xs text-stone-500 flex items-center gap-1.5">
                  <Icon name="scan" className="h-3.5 w-3.5" />
                  {p.stats?.scanCount ?? 0} scans
                  {p.authenticity?.claimedByConsumer && (
                    <span className="ml-1 text-leaf-700 font-semibold truncate">
                      · claimed{claimantByProduct.get(String(p._id)) ? ` by ${claimantByProduct.get(String(p._id))}` : ""}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          );
        })}
        {products.length === 0 && (
          <div className="card col-span-full p-12 text-center text-stone-500">
            <Icon name="plus" className="mx-auto h-10 w-10 text-silk-300" strokeWidth={1.2} />
            <p className="mt-4">No pieces yet. Register your first — it takes under two minutes.</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
