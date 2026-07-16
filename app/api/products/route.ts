import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Product, Weaver, CRAFTS } from "@/lib/models";
import { generatePassportId } from "@/lib/hash";
import { recordProvenanceEvent } from "@/lib/provenance";

/**
 * POST /api/products — the 4-tap registration (FR-C1).
 * Minimal payload: craftCode, category, media asset ids, optional voice note.
 */
export async function POST(req: NextRequest) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const { craftCode, category, name, primaryAssetId, onLoomAssetId, galleryAssetIds, voiceNoteAssetId, weaverId } = body;

  // A weaver registers for themselves; a co-op officer registers on behalf (assisted).
  let targetWeaverId = session.role === "WEAVER" ? session.weaverId : weaverId;
  if (!targetWeaverId) {
    return NextResponse.json({ title: "weaverId is required", status: 400 }, { status: 400 });
  }
  const weaver = await Weaver.findById(targetWeaverId);
  if (!weaver) return NextResponse.json({ title: "Weaver not found", status: 404 }, { status: 404 });

  const craft = CRAFTS.find((c) => c.code === Number(craftCode)) || weaver.profile?.crafts?.[0] || { code: 11, name: "Cotton Handloom" };

  // Collision-checked public passport id (client-generated ids also accepted).
  let passportId = typeof body.passportId === "string" && /^[1-9A-HJ-NP-Za-km-z]{10,20}$/.test(body.passportId) ? body.passportId : generatePassportId();
  while (await Product.exists({ passportId })) passportId = generatePassportId();

  const product = await Product.create({
    passportId,
    weaverId: weaver._id,
    orgId: weaver.orgId,
    item: {
      name: name || `${craft.name} ${String(category || "SAREE").charAt(0) + String(category || "SAREE").slice(1).toLowerCase()} by ${weaver.profile?.displayName || "weaver"}`,
      craft: { code: craft.code, name: craft.name },
      category: category || "SAREE",
    },
    media: {
      primaryAssetId: primaryAssetId || onLoomAssetId || undefined,
      onLoomAssetId: onLoomAssetId || undefined,
      gallery: Array.isArray(galleryAssetIds) ? galleryAssetIds : [],
      voiceNoteAssetId: voiceNoteAssetId || undefined,
    },
    status: primaryAssetId || onLoomAssetId ? "DRAFT" : "PENDING_MEDIA",
    custody: { currentHolderType: "WEAVER", currentHolderName: weaver.profile?.displayName, since: new Date() },
    createdBy: session.userId,
    registrationMode: session.role === "WEAVER" ? "SELF" : "ASSISTED",
  });

  await recordProvenanceEvent({
    productId: String(product._id),
    eventType: "WEAVING_COMPLETED",
    actorType: "WEAVER",
    actorId: String(weaver._id),
    actorName: weaver.profile?.displayName,
    note: "Product registered on SUTRA",
    location: weaver.personal?.address?.village,
  });

  return NextResponse.json(
    {
      productId: String(product._id),
      passportId,
      status: product.status,
      publicUrl: `/p/${passportId}`,
    },
    { status: 201 }
  );
}

/** GET /api/products?mine=1 — the caller's products */
export async function GET(req: NextRequest) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "RETAILER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const url = new URL(req.url);
  const filter: Record<string, unknown> = {};
  if (session.role === "WEAVER") filter.weaverId = session.weaverId;
  else if (url.searchParams.get("weaverId")) filter.weaverId = url.searchParams.get("weaverId");
  else if (session.orgId && session.role !== "ADMIN") filter.orgId = session.orgId;
  const products = await Product.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ products });
}
