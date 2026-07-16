import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { FraudReport } from "@/lib/models";

/** GET /api/admin/fraud — queue sorted by risk (FR-G3). */
export async function GET(req: NextRequest) {
  const session = await requireRole("ADMIN", "VERIFIER");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const filter = status ? { status } : { status: { $in: ["OPEN", "INVESTIGATING"] } };
  const reports = await FraudReport.find(filter).sort({ riskScore: -1, createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ reports });
}
