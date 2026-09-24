import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Product, PROVENANCE_EVENT_TYPES } from "@/lib/models";
import { recordProvenanceEvent } from "@/lib/provenance";
import { freezePassport } from "@/lib/passport";
import mongoose from "mongoose";

/** POST /api/products/[id]/events — record a provenance event (FR-E1). Append-only. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "RETAILER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });

  // Once sealed (dispatch) or claimed by its owner, the journey is locked.
  if (product.passport?.frozen || product.authenticity?.claimedByConsumer) {
    return NextResponse.json(
      {
        title: "Journey is locked",
        detail: product.authenticity?.claimedByConsumer
          ? "This piece has been claimed by its owner — its journey can no longer be changed."
          : "This record was sealed at dispatch — its journey can no longer be changed.",
        status: 409,
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { eventType, note, location, occurredAt, mediaAssetIds } = body;
  if (!PROVENANCE_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ title: `eventType must be one of: ${PROVENANCE_EVENT_TYPES.join(", ")}`, status: 400 }, { status: 400 });
  }

  // Every journey step must carry photo evidence — 1 or 2 images.
  const media = Array.isArray(mediaAssetIds)
    ? mediaAssetIds.filter((m) => mongoose.isValidObjectId(m)).map(String)
    : [];
  if (media.length < 1 || media.length > 2) {
    return NextResponse.json({ title: "Add 1 or 2 photos for this step", status: 400 }, { status: 400 });
  }

  const event = await recordProvenanceEvent({
    productId: id,
    eventType,
    occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    actorType: session.role === "WEAVER" ? "WEAVER" : session.role === "RETAILER" ? "RETAILER" : "COOP",
    actorId: session.userId,
    actorName: session.name,
    note: note ? String(note).slice(0, 500) : undefined,
    location: location ? String(location).slice(0, 120) : undefined,
    mediaAssetIds: media,
  });

  // Freeze on dispatch (FR-C6 AC-1): DISPATCHED seals the record automatically.
  if (eventType === "DISPATCHED" && product.passport?.issuedAt && !product.passport?.frozen) {
    await freezePassport(id);
  }

  return NextResponse.json({ ok: true, eventIndex: event.eventIndex, ledgerSeq: event.ledger?.entrySeq }, { status: 201 });
}
