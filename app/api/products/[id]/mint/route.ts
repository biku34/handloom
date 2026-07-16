import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Product } from "@/lib/models";
import { issuePassport } from "@/lib/passport";
import { audit } from "@/lib/provenance";
import mongoose from "mongoose";

/**
 * POST /api/products/[id]/mint — issue the Digital Product Passport (FR-C4,
 * chain-free: ledger entry + tag secret instead of an ERC-721 mint).
 * The response contains the tag secret ONCE. It is never retrievable again.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });

  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  const owns =
    session.role === "ADMIN" ||
    (session.role === "WEAVER" && String(product.weaverId) === session.weaverId) ||
    (session.role === "COOP_OFFICER" && String(product.orgId) === session.orgId);
  if (!owns) return NextResponse.json({ title: "Forbidden", status: 403 }, { status: 403 });

  const result = await issuePassport(id);
  if (!result.ok) {
    return NextResponse.json({ title: result.error, status: 422 }, { status: 422 });
  }
  await audit({ actorUserId: session.userId, actorRole: session.role, action: "PASSPORT_ISSUED", targetType: "product", targetId: product.passportId });
  return NextResponse.json({
    minted: true,
    passportId: product.passportId,
    ledgerSeq: result.entrySeq,
    tagSecret: result.secret,
    note: "Store the tag secret now — it is printed under the scratch panel and can never be shown again.",
    publicUrl: `/p/${product.passportId}`,
  });
}
