import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Product } from "@/lib/models";
import mongoose from "mongoose";

async function loadOwned(id: string, session: { role: string; weaverId?: string; orgId?: string }) {
  if (!mongoose.isValidObjectId(id)) return null;
  const product = await Product.findById(id);
  if (!product) return null;
  if (session.role === "ADMIN") return product;
  if (session.role === "WEAVER" && String(product.weaverId) === session.weaverId) return product;
  if ((session.role === "COOP_OFFICER" || session.role === "RETAILER") && String(product.orgId) === session.orgId) return product;
  return null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "RETAILER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  const product = await loadOwned(id, session);
  if (!product) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  return NextResponse.json({ product });
}

/** PATCH — enrichment (FR-C2). Rejected once frozen (DI-03). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  const product = await loadOwned(id, session);
  if (!product) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  if (product.passport?.frozen) {
    return NextResponse.json(
      { title: "Record is sealed", detail: "This passport was frozen at dispatch; its record can no longer be edited.", status: 409 },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { item, narrative, media } = body;
  if (item) {
    // Merge whitelisted item fields
    if (item.name) product.item.name = String(item.name).slice(0, 200);
    if (item.category) product.item.category = item.category;
    if (item.specs) product.item.specs = { ...(product.item.specs?.toObject?.() || product.item.specs || {}), ...item.specs };
    if (item.production) product.item.production = { ...(product.item.production?.toObject?.() || product.item.production || {}), ...item.production };
    if (item.priceRange) product.item.priceRange = { ...(product.item.priceRange?.toObject?.() || product.item.priceRange || {}), ...item.priceRange };
    if (item.giTag) product.item.giTag = item.giTag;
  }
  if (narrative) product.narrative = { ...(product.narrative?.toObject?.() || product.narrative || {}), ...narrative };
  if (media) {
    if (media.primaryAssetId) product.media.primaryAssetId = media.primaryAssetId;
    if (media.onLoomAssetId) product.media.onLoomAssetId = media.onLoomAssetId;
    if (Array.isArray(media.galleryAssetIds)) product.media.gallery = media.galleryAssetIds;
    if (media.voiceNoteAssetId) product.media.voiceNoteAssetId = media.voiceNoteAssetId;
  }
  if (product.status === "PENDING_MEDIA" && (product.media.primaryAssetId || product.media.onLoomAssetId)) {
    product.status = "DRAFT";
  }
  await product.save();
  return NextResponse.json({ ok: true, product });
}
