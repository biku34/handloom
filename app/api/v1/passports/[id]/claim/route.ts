import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product, Tag, Claim } from "@/lib/models";
import { hashTagSecret } from "@/lib/hash";
import { raiseCloneAlarm } from "@/lib/risk";
import { recordProvenanceEvent } from "@/lib/provenance";
import { appendLedgerEntry } from "@/lib/ledger";

/**
 * POST /api/v1/passports/[id]/claim — consumer ownership claim (FR-F5).
 * A claim on an already-claimed tag is a conclusive clone signal → 409 + alarm.
 * 5 failed secret attempts → 1-hour lockout.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const secret = String(body.secret || "").trim().toUpperCase();
  const email = String(body.email || "").trim().slice(0, 120);
  const name = String(body.name || "").trim().slice(0, 80);

  const product = await Product.findOne({ passportId: id });
  if (!product) return NextResponse.json({ title: "Unknown passport", status: 404 }, { status: 404 });
  const tag = await Tag.findOne({ tagCode: id });
  if (!tag?.secret?.hmacHash) {
    return NextResponse.json({ title: "This passport has no claimable tag yet", status: 422 }, { status: 422 });
  }

  if (tag.secret.lockedUntil && new Date(tag.secret.lockedUntil) > new Date()) {
    const retryAfterSec = Math.ceil((new Date(tag.secret.lockedUntil).getTime() - Date.now()) / 1000);
    return NextResponse.json({ title: "Too many attempts", status: 429, retryAfterSec }, { status: 429 });
  }

  if (!secret || hashTagSecret(secret) !== tag.secret.hmacHash) {
    tag.secret.failedAttempts = (tag.secret.failedAttempts || 0) + 1;
    if (tag.secret.failedAttempts >= 5) {
      tag.secret.lockedUntil = new Date(Date.now() + 3600 * 1000);
      tag.secret.failedAttempts = 0;
    }
    await tag.save();
    return NextResponse.json({ title: "Incorrect code", detail: "Check the code under the scratch panel and try again.", status: 401 }, { status: 401 });
  }

  // ── Correct secret on an ALREADY-CLAIMED tag: the clone alarm (FR-F5 AC-3) ──
  if (tag.secret.claimed) {
    const ref = await raiseCloneAlarm({ productId: String(product._id), passportId: id, scanId: body.scanId, contact: email });
    return NextResponse.json(
      {
        type: "already-claimed",
        title: "This code has already been claimed",
        status: 409,
        detail: `Claimed on ${new Date(tag.secret.claimedAt).toDateString()}. If you just purchased this item, the product you are holding may not be genuine. The cooperative has been alerted.`,
        reportRef: ref,
      },
      { status: 409 }
    );
  }

  // Atomic claim (DI-09): status precondition prevents a double-claim race.
  const updated = await Tag.findOneAndUpdate(
    { _id: tag._id, "secret.claimed": false },
    { $set: { "secret.claimed": true, "secret.claimedAt": new Date(), status: "CLAIMED", "secret.claimAttempts": (tag.secret.claimAttempts || 0) + 1 } },
    { new: true }
  );
  if (!updated) {
    const ref = await raiseCloneAlarm({ productId: String(product._id), passportId: id, scanId: body.scanId, contact: email });
    return NextResponse.json({ title: "This code has already been claimed", status: 409, reportRef: ref }, { status: 409 });
  }

  await Claim.create({
    productId: product._id,
    passportId: id,
    claimantEmail: email || undefined,
    claimantName: name || undefined,
    method: "SCRATCH_SECRET",
    scanId: body.scanId,
    status: "CLAIMED",
    claimedAt: new Date(),
  });
  product.authenticity.claimedByConsumer = true;
  product.authenticity.claimedAt = new Date();
  product.custody.currentHolderType = "CONSUMER";
  product.custody.currentHolderName = name || "Consumer";
  product.custody.since = new Date();
  await product.save();

  await recordProvenanceEvent({
    productId: String(product._id),
    eventType: "OWNERSHIP_CLAIMED",
    actorType: "CONSUMER",
    actorName: name || "Consumer",
    note: "Ownership claimed with the scratch-panel code",
  });
  await appendLedgerEntry({
    type: "OWNERSHIP_CLAIMED",
    entityType: "product",
    entityId: id,
    payload: { passportId: id, claimedAt: new Date().toISOString() },
    summary: `Ownership of ${id} claimed by consumer`,
  });

  return NextResponse.json({
    claimed: true,
    claimedAt: product.authenticity.claimedAt,
    unlocked: {
      message: "You now hold the verified record of this piece. The weaver has been notified that their work found its home.",
      careInstructions: "Dry-clean only. Store wrapped in soft cotton, away from direct sunlight. Refold along different lines every few months to protect the zari.",
    },
  });
}
