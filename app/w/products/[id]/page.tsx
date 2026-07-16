import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { WEAVER_NAV } from "@/components/nav";
import ProductActions from "./ProductActions";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Product, ProvenanceEvent, Claim } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export default async function WeaverProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  await dbConnect();
  const product = mongoose.isValidObjectId(id) ? await Product.findById(id).lean<Record<string, any> | null>() : null;

  const nav = WEAVER_NAV;

  if (!product || (session?.role === "WEAVER" && String(product.weaverId) !== session.weaverId)) {
    return (
      <PortalShell title="Weaver" nav={nav} userName={session?.name}>
        <p className="text-stone-600">Piece not found.</p>
      </PortalShell>
    );
  }

  const events = product ? await ProvenanceEvent.find({ productId: product._id }).sort({ eventIndex: 1 }).lean<Record<string, any>[]>() : [];
  const claim = product?.authenticity?.claimedByConsumer
    ? await Claim.findOne({ productId: product._id, status: "CLAIMED" }).sort({ claimedAt: -1 }).lean<Record<string, any> | null>()
    : null;

  return (
    <PortalShell title="Weaver" nav={nav} userName={session?.name}>
      <Link href="/w/dashboard" className="text-sm text-maroon-700 font-semibold">← My work</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="card overflow-hidden">
            {product.media?.primaryAssetId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(product.media.primaryAssetId)!} alt={product.item?.name} className="w-full max-h-[420px] object-cover" />
            ) : (
              <div className="w-full h-56 bg-silk-100 flex items-center justify-center text-6xl">🧣</div>
            )}
            <div className="p-5">
              <h1 className="font-display text-2xl font-bold text-maroon-900">{product.item?.name}</h1>
              <p className="mt-1 text-sm text-stone-500">
                {product.item?.craft?.name} · {product.item?.category} · status <strong>{product.status}</strong>
              </p>
              {product.media?.voiceNoteAssetId && (
                <audio className="mt-3 w-full" controls src={mediaUrl(product.media.voiceNoteAssetId)!} />
              )}
            </div>
          </div>

          <div className="card mt-5 p-5">
            <h2 className="font-bold text-maroon-900">Journey so far</h2>
            <ol className="mt-3 space-y-2">
              {events.map((e) => (
                <li key={e.eventIndex} className="flex items-baseline gap-3 text-sm">
                  <span className="font-mono text-xs text-stone-400 shrink-0">#{e.eventIndex}</span>
                  <span className="font-semibold text-maroon-800">{e.eventType.replace(/_/g, " ")}</span>
                  <span className="text-stone-500 text-xs">{new Date(e.occurredAt).toLocaleDateString("en-IN")}</span>
                  {e.actor?.displayName && <span className="text-stone-400 text-xs truncate">by {e.actor.displayName}</span>}
                  {e.detail?.note && <span className="text-stone-500 text-xs truncate">— {e.detail.note}</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-5">
          {product.status === "MINTED" || product.status === "FLAGGED" ? (
            <div className="card p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-silk-700">Passport tag</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${product.passportId}`} alt="QR" className="mx-auto mt-3 w-44 h-44 rounded-lg border border-silk-200" />
              <p className="mt-2 font-mono text-xs text-stone-500">{product.passportId}</p>
              <Link href={`/p/${product.passportId}`} className="btn-secondary mt-3 w-full">View public page →</Link>
            </div>
          ) : null}
          <ProductActions productId={String(product._id)} status={product.status} frozen={!!product.passport?.frozen} />
          {product.authenticity?.claimedByConsumer && (
            <div className="card p-5 bg-leaf-600/5 border-leaf-600/25">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-leaf-700">Found its home</p>
              <p className="font-display mt-1.5 text-lg font-bold text-maroon-900">
                {claim?.claimantName || "An anonymous buyer"}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                claimed this piece
                {claim?.claimedAt ? ` on ${new Date(claim.claimedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
                Your work is now part of their story.
              </p>
            </div>
          )}
          <div className="card p-4 text-xs text-stone-500">
            <p><strong>Scans:</strong> {product.stats?.scanCount ?? 0}</p>
            <p className="mt-1"><strong>Claimed:</strong> {product.authenticity?.claimedByConsumer ? `Yes — ${claim?.claimantName || "name not shared"}` : "Not yet"}</p>
            {product.authenticity?.riskScore > 0 && <p className="mt-1"><strong>Risk score:</strong> {product.authenticity.riskScore}</p>}
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
