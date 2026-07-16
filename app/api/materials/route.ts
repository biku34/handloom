import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { MaterialLot } from "@/lib/models";
import { registerMaterialLot } from "@/lib/materials";

/** GET /api/materials — the weaver's own lots (FR-B1). */
export async function GET() {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const filter = session.role === "WEAVER" ? { weaverId: session.weaverId } : session.orgId ? { orgId: session.orgId } : {};
  const lots = await MaterialLot.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  return NextResponse.json({ lots });
}

/** POST /api/materials — register a new lot (weaver-owned). */
export async function POST(req: NextRequest) {
  const session = await requireRole("WEAVER", "ADMIN");
  if (session instanceof NextResponse) return session;
  if (!session.weaverId && session.role !== "ADMIN") {
    return NextResponse.json({ title: "Only a weaver account can own material lots", status: 403 }, { status: 403 });
  }
  await dbConnect();
  const b = await req.json().catch(() => ({}));
  try {
    const lot = await registerMaterialLot({
      weaverId: session.weaverId || b.weaverId,
      orgId: session.orgId,
      type: b.type,
      supplierName: b.supplierName ? String(b.supplierName).slice(0, 120) : undefined,
      supplierGstin: b.supplierGstin ? String(b.supplierGstin).slice(0, 20) : undefined,
      colour: b.colour ? String(b.colour).slice(0, 60) : undefined,
      denier: b.denier ? Number(b.denier) : undefined,
      ply: b.ply ? Number(b.ply) : undefined,
      certification: b.certification,
      dyeChemistry: b.dyeChemistry ? String(b.dyeChemistry).slice(0, 60) : undefined,
      isHankYarn: !!b.isHankYarn,
      quantityGrams: Number(b.quantityGrams),
    });
    return NextResponse.json({ lotId: lot.lotId, _id: String(lot._id), ledgerSeq: lot.ledger?.entrySeq }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ title: (e as Error).message, status: 400 }, { status: 400 });
  }
}
