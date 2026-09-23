import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import Icon from "@/components/Icon";
import { WEAVER_NAV } from "@/components/nav";
import ProductActions from "./ProductActions";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Product, ProvenanceEvent, Claim, MaterialLot, Certificate } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";
import MaterialsPanel from "./MaterialsPanel";
import EnrichForm from "./EnrichForm";
import CertificatesPanel from "./CertificatesPanel";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const RECENT_STEPS = 4; // journey steps shown before "Show earlier steps"

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-stone-100 text-stone-700" },
  PENDING_MEDIA: { label: "Needs a photo", cls: "bg-amber-100 text-amber-800" },
  QUEUED: { label: "Issuing…", cls: "bg-amber-100 text-amber-800" },
  MINTED: { label: "Passport issued", cls: "bg-leaf-600 text-white" },
  FAILED: { label: "Issue failed", cls: "bg-red-100 text-red-800" },
  FLAGGED: { label: "Under review", cls: "bg-orange-600 text-white" },
  VOID: { label: "Void", cls: "bg-stone-200 text-stone-600" },
};

const nice = (s?: string) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "");

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

  const [events, claim, lots, certs] = await Promise.all([
    ProvenanceEvent.find({ productId: product._id }).sort({ eventIndex: 1 }).lean<Record<string, any>[]>(),
    product.authenticity?.claimedByConsumer
      ? Claim.findOne({ productId: product._id, status: "CLAIMED" }).sort({ claimedAt: -1 }).lean<Record<string, any> | null>()
      : Promise.resolve(null),
    MaterialLot.find({ weaverId: product.weaverId, remainingGrams: { $gt: 0 } }).sort({ createdAt: -1 }).lean<Record<string, any>[]>(),
    Certificate.find({ productId: product._id }).lean<Record<string, any>[]>(),
  ]);
  const productPlain = JSON.parse(JSON.stringify(product));
  const status = STATUS[product.status] || { label: nice(product.status), cls: "bg-stone-100 text-stone-700" };
  const frozen = !!product.passport?.frozen;
  const issued = product.status === "MINTED" || product.status === "FLAGGED";
  const photo = mediaUrl(product.media?.primaryAssetId) || mediaUrl(product.media?.onLoomAssetId);

  return (
    <PortalShell title="Weaver" nav={nav} userName={session?.name}>
      <Link href="/w/dashboard" className="-ml-2 inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-maroon-700 hover:bg-silk-100">
        <Icon name="chevron" className="h-4 w-4 rotate-180" strokeWidth={2.2} /> My work
      </Link>

      {/* Phones: one column in reading order (hero → status & actions → details).
          Desktop: status & actions move into a sticky right-hand column. */}
      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        {/* ── Hero ── */}
        <section className="min-w-0 lg:col-start-1 overflow-hidden rounded-2xl bg-white ring-1 ring-silk-200">
          <div className="relative aspect-[4/3] bg-silk-100 lg:aspect-[16/10]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={product.item?.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">🧣</div>
            )}
            <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${status.cls}`}>
              {issued ? "✓ " : ""}{status.label}
            </span>
            {frozen && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-maroon-800 shadow-sm">
                <Icon name="seal" className="h-3.5 w-3.5" strokeWidth={2} /> Sealed
              </span>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <h1 className="font-display text-xl sm:text-2xl font-bold leading-snug text-maroon-900 break-words">{product.item?.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.item?.craft?.name && <span className="rounded-full bg-silk-100 px-2.5 py-1 text-xs font-semibold text-maroon-800">{product.item.craft.name}</span>}
              {product.item?.category && <span className="rounded-full bg-silk-100 px-2.5 py-1 text-xs font-semibold text-maroon-800">{nice(product.item.category)}</span>}
              {product.passportId && <span className="rounded-full bg-stone-100 px-2.5 py-1 font-mono text-[11px] text-stone-600">{product.passportId}</span>}
            </div>
            {product.media?.voiceNoteAssetId && (
              <div className="mt-4">
                <p className="label">Your voice note</p>
                <audio className="w-full" controls preload="none" src={mediaUrl(product.media.voiceNoteAssetId)!} />
              </div>
            )}
          </div>
        </section>

        {/* ── Status, passport & actions ── */}
        <aside className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-32 lg:self-start">
          {/* quick numbers */}
          <div className="grid grid-cols-3 divide-x divide-silk-200 rounded-2xl bg-white py-3 text-center ring-1 ring-silk-200">
            <Stat n={product.stats?.scanCount ?? 0} label="Scans" />
            <Stat n={events.length} label="Journey steps" />
            <Stat n={product.authenticity?.claimedByConsumer ? "Yes" : "Not yet"} label="Found a home" />
          </div>

          <ProductActions productId={String(product._id)} status={product.status} frozen={frozen} />

          {issued && product.passportId && (
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-silk-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${product.passportId}`} alt="Passport QR code" className="h-24 w-24 shrink-0 rounded-lg border border-silk-200 lg:h-32 lg:w-32" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-silk-700">Passport tag</p>
                <p className="mt-0.5 truncate font-mono text-xs text-stone-500">{product.passportId}</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  <Link href={`/p/${product.passportId}`} className="btn-secondary w-full">View public page</Link>
                  <a href={`/api/qr/${product.passportId}`} download={`${product.passportId}.png`} className="flex min-h-10 items-center justify-center text-sm font-semibold text-maroon-700 hover:underline">
                    Download QR
                  </a>
                </div>
              </div>
            </div>
          )}

          {product.authenticity?.claimedByConsumer && (
            <div className="rounded-2xl bg-leaf-600/5 p-4 ring-1 ring-leaf-600/25">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-leaf-700">Found its home</p>
              <p className="font-display mt-1 text-lg font-bold text-maroon-900">{claim?.claimantName || "An anonymous buyer"}</p>
              <p className="mt-1 text-xs text-stone-500">
                claimed this piece
                {claim?.claimedAt ? ` on ${new Date(claim.claimedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
                Your work is now part of their story.
              </p>
            </div>
          )}

          {product.authenticity?.riskScore > 0 && (
            <p className="rounded-xl bg-orange-50 px-4 py-3 text-xs text-orange-800 ring-1 ring-orange-200">
              <strong>Risk score:</strong> {product.authenticity.riskScore} — the review team may look at recent scans.
            </p>
          )}
        </aside>

        {/* ── Details, certificates, journey, materials ── */}
        <div className="min-w-0 space-y-4 lg:col-start-1">
          <EnrichForm productId={String(product._id)} product={productPlain} frozen={frozen} />

          <CertificatesPanel
            productId={String(product._id)}
            certificates={certs.map((c) => ({ type: c.type, number: c.number, issuedBy: c.issuedBy }))}
          />

          <section className="card p-4 sm:p-5">
            <h2 className="font-bold text-maroon-900">Journey so far</h2>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No steps recorded yet.</p>
            ) : (
              <>
                {/* long journeys: keep the latest steps in view, fold the rest */}
                {events.length > RECENT_STEPS && (
                  <details className="group mt-3">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-maroon-700">
                      <Icon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-90" strokeWidth={2.2} />
                      <span className="group-open:hidden">Show {events.length - RECENT_STEPS} earlier steps</span>
                      <span className="hidden group-open:inline">Hide earlier steps</span>
                    </summary>
                    <Timeline events={events.slice(0, -RECENT_STEPS)} lastIsCurrent={false} />
                  </details>
                )}
                <Timeline events={events.slice(-RECENT_STEPS)} lastIsCurrent />
              </>
            )}
          </section>

          <MaterialsPanel
            productId={String(product._id)}
            frozen={frozen}
            linked={(product.materials || []).map((m: Record<string, any>) => ({
              lotIdLabel: m.lotIdLabel,
              type: m.type,
              role: m.role,
              quantityGrams: m.quantityGrams,
              supplierName: m.supplierName,
              isHankYarn: m.isHankYarn,
            }))}
            lots={lots.map((l) => ({
              _id: String(l._id),
              lotId: l.lotId,
              type: l.type,
              remainingGrams: l.remainingGrams ?? 0,
              colour: l.spec?.colour,
              isHankYarn: l.spec?.isHankYarn,
            }))}
          />
        </div>
      </div>
    </PortalShell>
  );
}


function Timeline({ events, lastIsCurrent }: { events: Record<string, any>[]; lastIsCurrent: boolean }) {
  return (
    <ol className="mt-3">
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <li key={e.eventIndex} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[9px] top-5 bottom-0 w-px bg-silk-300" aria-hidden="true" />}
            <span className={`relative mt-0.5 h-[19px] w-[19px] shrink-0 rounded-full border-2 ${last && lastIsCurrent ? "border-maroon-700 bg-maroon-700" : "border-silk-300 bg-white"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-maroon-900">{nice(e.eventType)}</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {new Date(e.occurredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {e.actor?.displayName ? ` · ${e.actor.displayName}` : ""}
              </p>
              {e.detail?.note && <p className="mt-1 text-sm text-stone-600 break-words">{e.detail.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="px-2">
      <p className="font-display text-lg font-bold text-maroon-800">{n}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
    </div>
  );
}
