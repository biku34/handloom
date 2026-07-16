import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { FraudReport, Product } from "@/lib/models";
import { appendLedgerEntry } from "@/lib/ledger";
import { assessProductRisk } from "@/lib/risk";
import { audit } from "@/lib/provenance";
import mongoose from "mongoose";

/**
 * PATCH /api/admin/fraud/[id] — resolve a fraud report (FR-G3).
 * { action: "dismiss" | "investigate" | "confirm" | "void", resolution }
 * Voiding requires a reason and is shown publicly on the verify page.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  const report = await FraudReport.findById(id);
  if (!report) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  const resolution = String(b.resolution || "").slice(0, 500);

  if (action === "dismiss") {
    report.status = "FALSE_POSITIVE";
    report.resolution = resolution || "Dismissed after review";
    report.resolvedAt = new Date();
  } else if (action === "investigate") {
    report.status = "INVESTIGATING";
    report.assignedTo = session.userId;
  } else if (action === "confirm") {
    report.status = "CONFIRMED_FRAUD";
    report.resolution = resolution || "Confirmed after investigation";
    report.resolvedAt = new Date();
  } else if (action === "void") {
    if (!resolution) return NextResponse.json({ title: "Voiding requires a reason (shown publicly)", status: 422 }, { status: 422 });
    report.status = "CONFIRMED_FRAUD";
    report.resolution = resolution;
    report.resolvedAt = new Date();
    if (report.productId) {
      const product = await Product.findById(report.productId);
      if (product) {
        product.authenticity.voided = true;
        product.authenticity.voidReason = resolution;
        product.status = "VOID";
        await product.save();
        await appendLedgerEntry({
          type: "PASSPORT_VOIDED",
          entityType: "product",
          entityId: product.passportId,
          payload: { passportId: product.passportId, reason: resolution },
          summary: `Passport ${product.passportId} voided: ${resolution}`,
        });
      }
    }
  } else {
    return NextResponse.json({ title: "action must be dismiss | investigate | confirm | void", status: 400 }, { status: 400 });
  }
  await report.save();
  if (report.productId && action !== "void") await assessProductRisk(String(report.productId));
  await audit({ actorUserId: session.userId, actorRole: "ADMIN", action: `FRAUD_${action.toUpperCase()}`, targetType: "fraudReport", targetId: report.reportRef, detail: resolution });
  return NextResponse.json({ ok: true, status: report.status });
}
