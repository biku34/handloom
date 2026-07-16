import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Weaver } from "@/lib/models";
import { appendLedgerEntry } from "@/lib/ledger";
import { audit } from "@/lib/provenance";
import mongoose from "mongoose";

/** POST — revoke a weaver credential (FR-A7). Existing passports stay valid but display a notice. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("VERIFIER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const reason = String(b.reason || "").trim();
  if (!reason) return NextResponse.json({ title: "A reason is mandatory for revocation", status: 422 }, { status: 422 });

  const weaver = await Weaver.findById(id);
  if (!weaver) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });

  await appendLedgerEntry({
    type: "WEAVER_REVOKED",
    entityType: "weaver",
    entityId: weaver.weaverId,
    payload: { weaverHash: weaver.ledger?.weaverHash, reason },
    summary: `Credential revoked for ${weaver.weaverId}: ${reason}`,
  });
  weaver.verification.status = "REVOKED";
  weaver.verification.revocation = { reason, at: new Date(), by: session.userId };
  await weaver.save();
  await audit({ actorUserId: session.userId, actorRole: session.role, action: "WEAVER_REVOKED", targetType: "weaver", targetId: weaver.weaverId, detail: reason });
  return NextResponse.json({ revoked: true });
}
