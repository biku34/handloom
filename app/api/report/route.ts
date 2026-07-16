import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product, FraudReport } from "@/lib/models";
import { reportRef } from "@/lib/ids";
import { assessProductRisk } from "@/lib/risk";

/** POST /api/report — public consumer fraud report (FR-G2). No login. */
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const passportId = String(body.passportId || "").slice(0, 32);
  const reason = ["DUPLICATE_SCAN", "PHYSICAL_MISMATCH", "PRICE_ANOMALY", "TAG_TAMPERED", "OTHER"].includes(body.reason) ? body.reason : "OTHER";
  const description = String(body.description || "").slice(0, 1000);
  const contact = String(body.contact || "").slice(0, 120);

  const product = passportId ? await Product.findOne({ passportId }).select("_id").lean<{ _id: unknown } | null>() : null;
  const ref = reportRef();
  await FraudReport.create({
    passportId: passportId || undefined,
    productId: product?._id,
    reportRef: ref,
    reportedBy: { type: "CONSUMER", contact: contact || undefined },
    reason,
    description,
    riskScore: 35,
    status: "OPEN",
  });
  if (product?._id) await assessProductRisk(String(product._id));
  return NextResponse.json({ reportRef: ref, message: "Thank you. Your report has been queued for investigation." }, { status: 201 });
}
