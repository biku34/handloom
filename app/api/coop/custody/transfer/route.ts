import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Product } from "@/lib/models";
import { recordProvenanceEvent } from "@/lib/provenance";
import { freezePassport } from "@/lib/passport";

/**
 * POST /api/coop/custody/transfer — record custody transfer (FR-E2).
 * { productIds: [], toHolderType: "RETAILER", toHolderName, note }
 * DISPATCHED freezes the passport (FR-C6).
 */
export async function POST(req: NextRequest) {
  const session = await requireRole("COOP_OFFICER", "RETAILER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const b = await req.json().catch(() => ({}));
  const productIds: string[] = Array.isArray(b.productIds) ? b.productIds.slice(0, 500) : [];
  const toHolderType = ["COOP", "RETAILER", "CONSUMER"].includes(b.toHolderType) ? b.toHolderType : "RETAILER";
  const toHolderName = String(b.toHolderName || "").slice(0, 120);
  if (!productIds.length || !toHolderName) {
    return NextResponse.json({ title: "productIds and toHolderName are required", status: 400 }, { status: 400 });
  }

  const results: { productId: string; ok: boolean; error?: string }[] = [];
  for (const pid of productIds) {
    try {
      const product = await Product.findById(pid);
      if (!product) throw new Error("not found");
      const isReceive = session.role === "RETAILER";
      // An item is dispatched exactly once (FR-E2): once custody has left the
      // weaver/co-op, it cannot be dispatched again.
      if (!isReceive) {
        const holder = product.custody?.currentHolderType;
        if (holder === "RETAILER") throw new Error(`already dispatched to ${product.custody?.currentHolderName || "a retailer"}`);
        if (holder === "CONSUMER") throw new Error("already claimed by a consumer — custody cannot move again");
      }
      await recordProvenanceEvent({
        productId: pid,
        eventType: isReceive ? "RECEIVED" : "DISPATCHED",
        actorType: isReceive ? "RETAILER" : "COOP",
        actorId: session.userId,
        actorName: session.name,
        note: b.note ? String(b.note).slice(0, 300) : `${isReceive ? "Received by" : "Dispatched to"} ${toHolderName}`,
      });
      const prev = product.custody || {};
      product.custody = {
        currentHolderType: toHolderType,
        currentHolderName: toHolderName,
        since: new Date(),
        history: [
          ...(prev.history || []),
          { holderType: prev.currentHolderType, holderName: prev.currentHolderName, from: prev.since, to: new Date() },
        ],
      };
      await product.save();
      if (!isReceive && product.passport?.issuedAt && !product.passport?.frozen) {
        await freezePassport(pid); // dispatch seals the record
      }
      results.push({ productId: pid, ok: true });
    } catch (e) {
      results.push({ productId: pid, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ transferred: results.filter((r) => r.ok).length, results });
}
