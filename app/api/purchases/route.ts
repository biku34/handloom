import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Claim, Product, Weaver } from "@/lib/models";
import { mediaUrl } from "@/lib/storage";

/**
 * POST /api/purchases  { phone }
 * Public "my purchases" lookup — returns the items claimed with this phone.
 * Phone travels in the body (never a query string) per privacy rules.
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(phone)) {
    return NextResponse.json({ title: "Enter a valid 10-digit phone number", status: 400 }, { status: 400 });
  }

  const claims = await Claim.find({ claimantPhone: phone, status: "CLAIMED" }).sort({ claimedAt: -1 }).lean<Record<string, any>[]>();
  if (!claims.length) return NextResponse.json({ phone, count: 0, items: [] });

  const productIds = [...new Set(claims.map((c) => String(c.productId)))];
  const products = await Product.find({ _id: { $in: productIds } }).lean<Record<string, any>[]>();
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const weaverIds = [...new Set(products.map((p) => String(p.weaverId)))];
  const weavers = await Weaver.find({ _id: { $in: weaverIds } }).select("_id profile.displayName profile.cluster handle").lean<Record<string, any>[]>();
  const weaverById = new Map(weavers.map((w) => [String(w._id), w]));

  const items = claims
    .map((c) => {
      const p = productById.get(String(c.productId));
      if (!p) return null;
      const w = weaverById.get(String(p.weaverId));
      const a = p.authenticity || {};
      const verdict = a.voided ? "VOIDED" : a.flagged || a.riskScore >= 70 ? "FLAGGED" : "GENUINE";
      return {
        passportId: p.passportId,
        name: p.item?.name,
        craft: p.item?.craft?.name,
        image: mediaUrl(p.media?.primaryAssetId) || mediaUrl(p.media?.onLoomAssetId),
        weaver: w?.profile?.displayName,
        cluster: w?.profile?.cluster?.name,
        claimedAt: c.claimedAt,
        stillOwned: a.claimedByConsumer === true, // false if later resold/reset
        verdict,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ phone, count: items.length, items });
}
