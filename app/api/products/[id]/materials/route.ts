import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Product } from "@/lib/models";
import { linkMaterialToProduct } from "@/lib/materials";
import mongoose from "mongoose";

/** POST /api/products/[id]/materials — link a lot to a product (FR-B2). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });

  const product = await Product.findById(id).select("weaverId orgId").lean<{ weaverId: unknown; orgId: unknown } | null>();
  if (!product) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  const owns =
    session.role === "ADMIN" ||
    (session.role === "WEAVER" && String(product.weaverId) === session.weaverId) ||
    (session.role === "COOP_OFFICER" && String(product.orgId) === session.orgId);
  if (!owns) return NextResponse.json({ title: "Forbidden", status: 403 }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!mongoose.isValidObjectId(b.lotObjectId)) return NextResponse.json({ title: "Choose a material lot", status: 400 }, { status: 400 });

  const result = await linkMaterialToProduct({
    productId: id,
    weaverId: session.role === "WEAVER" ? session.weaverId : undefined,
    lotObjectId: String(b.lotObjectId),
    role: String(b.role || ""),
    grams: Number(b.grams),
    actorId: session.userId,
    actorName: session.name,
  });
  if (!result.ok) return NextResponse.json({ title: result.error, status: 422 }, { status: 422 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
