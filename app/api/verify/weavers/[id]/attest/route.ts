import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Weaver, Organization } from "@/lib/models";
import { appendLedgerEntry } from "@/lib/ledger";
import { canonicalHash } from "@/lib/hash";
import { audit } from "@/lib/provenance";
import mongoose from "mongoose";

/**
 * POST /api/verify/weavers/[id]/attest — the trust root (FR-A3).
 * A verifier attests that they physically confirmed the weaver and the loom.
 * Credential is valid 730 days and anchored in the integrity ledger.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("VERIFIER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });

  const weaver = await Weaver.findById(id);
  if (!weaver) return NextResponse.json({ title: "Weaver not found", status: 404 }, { status: 404 });
  if (weaver.verification?.status === "VERIFIED") {
    return NextResponse.json({ title: "Already attested", status: 409 }, { status: 409 });
  }
  const b = await req.json().catch(() => ({}));
  if (!b.loomConfirmed || !b.identityConfirmed) {
    return NextResponse.json(
      { title: "Attestation requires confirming both the loom and the weaver's identity in person", status: 422 },
      { status: 422 }
    );
  }

  const verifierOrg = session.orgId ? await Organization.findById(session.orgId).lean<{ name?: string } | null>() : null;
  const profileHash = canonicalHash({
    displayName: weaver.profile?.displayName,
    cluster: weaver.profile?.cluster,
    crafts: weaver.profile?.crafts,
    yearsWeaving: weaver.profile?.yearsWeaving,
  });
  const expiresAt = new Date(Date.now() + 730 * 24 * 3600 * 1000);

  const entry = await appendLedgerEntry({
    type: "WEAVER_ATTESTED",
    entityType: "weaver",
    entityId: weaver.weaverId,
    payload: { weaverHash: weaver.ledger?.weaverHash, profileHash, verifier: session.name, expiresAt: expiresAt.toISOString() },
    summary: `Weaver ${weaver.profile?.displayName || weaver.weaverId} attested by ${session.name || "verifier"}`,
  });

  weaver.verification = {
    ...(weaver.verification?.toObject?.() || weaver.verification || {}),
    status: "VERIFIED",
    method: b.method === "VIDEO_KYC" ? "VIDEO_KYC" : "IN_PERSON",
    verifiedBy: session.userId,
    verifierName: session.name,
    verifierOrgId: session.orgId,
    verifierOrgName: verifierOrg?.name || "Weavers' Service Centre",
    verifiedAt: new Date(),
    expiresAt,
  };
  weaver.ledger.profileHash = profileHash;
  weaver.ledger.credentialEntrySeq = entry.seq;
  weaver.ledger.anchoredAt = new Date();
  await weaver.save();

  await audit({ actorUserId: session.userId, actorRole: session.role, action: "WEAVER_VERIFIED", targetType: "weaver", targetId: weaver.weaverId });
  return NextResponse.json({ attested: true, credentialEntrySeq: entry.seq, expiresAt });
}
