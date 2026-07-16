import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Product, Certificate } from "@/lib/models";
import { appendLedgerEntry } from "@/lib/ledger";
import { recordProvenanceEvent } from "@/lib/provenance";
import { sha256 } from "@/lib/hash";
import mongoose from "mongoose";

const CERT_TYPES = ["HANDLOOM_MARK", "SILK_MARK", "GI", "INDIA_HANDLOOM_BRAND", "ORGANIC", "FAIR_TRADE"];

/** POST /api/products/[id]/certificates — attach a certificate (FR-A/§S-11), ledger-anchored. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "VERIFIER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  const owns =
    session.role !== "WEAVER" || String(product.weaverId) === session.weaverId;
  if (!owns) return NextResponse.json({ title: "Forbidden", status: 403 }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const type = String(b.type || "");
  if (!CERT_TYPES.includes(type)) return NextResponse.json({ title: `type must be one of: ${CERT_TYPES.join(", ")}`, status: 400 }, { status: 400 });
  const number = String(b.number || "").trim().slice(0, 60);
  if (!number) return NextResponse.json({ title: "Certificate number is required", status: 400 }, { status: 400 });

  const documentHash = sha256(`${type}|${number}`);
  const cert = await Certificate.create({
    productId: product._id,
    weaverId: product.weaverId,
    type,
    number,
    issuedBy: b.issuedBy ? String(b.issuedBy).slice(0, 120) : undefined,
    issuedAt: b.issuedAt ? new Date(b.issuedAt) : new Date(),
    validUntil: b.validUntil ? new Date(b.validUntil) : undefined,
    documentHash,
    status: "VALID",
  });
  const entry = await appendLedgerEntry({
    type: "CERTIFICATE_ANCHORED",
    entityType: "certificate",
    entityId: `${product.passportId}/${type}`,
    payload: { passportId: product.passportId, type, number, documentHash },
    summary: `${type.replace(/_/g, " ")} ${number} anchored for ${product.passportId}`,
  });
  cert.ledger = { entrySeq: entry.seq };
  await cert.save();
  await Product.updateOne({ _id: product._id }, { $push: { certificates: cert._id } });

  if (!product.passport?.frozen) {
    await recordProvenanceEvent({
      productId: String(product._id),
      eventType: "CERTIFIED",
      actorType: session.role === "WEAVER" ? "WEAVER" : session.role === "VERIFIER" ? "VERIFIER" : "COOP",
      actorId: session.userId,
      actorName: b.issuedBy || session.name,
      note: `${type.replace(/_/g, " ")} ${number}`,
    });
  }

  return NextResponse.json({ ok: true, certId: String(cert._id), ledgerSeq: entry.seq }, { status: 201 });
}
