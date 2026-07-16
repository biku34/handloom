import { dbConnect } from "./db";
import { Product, Weaver, Tag, Certificate, ProvenanceEvent, MediaAsset } from "./models";
import { appendLedgerEntry } from "./ledger";
import { sha256, generateTagSecret, hashTagSecret } from "./hash";
import { mediaUrl } from "./storage";

/* ── PassportService: issue, freeze, tag, and the public projection ── */

export async function computeMediaHash(productId: string): Promise<string | null> {
  const product = await Product.findById(productId).lean<{ media?: Record<string, unknown> } | null>();
  if (!product?.media) return null;
  const m = product.media as {
    primaryAssetId?: unknown;
    gallery?: unknown[];
    onLoomAssetId?: unknown;
    voiceNoteAssetId?: unknown;
  };
  const ids = [m.primaryAssetId, m.onLoomAssetId, m.voiceNoteAssetId, ...(m.gallery || [])]
    .filter(Boolean)
    .map((x) => String(x));
  if (!ids.length) return null;
  const assets = await MediaAsset.find({ _id: { $in: ids } }).lean<{ file?: { sha256?: string } }[]>();
  const hashes = assets.map((a) => a.file?.sha256 || "").filter(Boolean).sort();
  if (!hashes.length) return null;
  return sha256(hashes.join("|"));
}

/**
 * Issue the Digital Product Passport (the local equivalent of minting):
 * verifies the weaver, computes the media hash, appends a ledger entry,
 * generates the physical tag secret, and activates the passport.
 * Returns the plaintext tag secret ONCE — it is never stored or shown again.
 */
export async function issuePassport(productId: string): Promise<{ ok: true; secret: string; entrySeq: number } | { ok: false; error: string }> {
  await dbConnect();
  const product = await Product.findById(productId);
  if (!product) return { ok: false, error: "Product not found" };
  if (product.status === "MINTED" || product.passport?.issuedAt) return { ok: false, error: "Passport already issued" };

  const weaver = await Weaver.findById(product.weaverId);
  if (!weaver) return { ok: false, error: "Weaver not found" };
  if (weaver.verification?.status !== "VERIFIED") {
    return { ok: false, error: `Weaver is not verified (status: ${weaver.verification?.status}). A passport can only be issued for a physically verified weaver.` };
  }
  if (weaver.verification.expiresAt && new Date(weaver.verification.expiresAt) < new Date()) {
    return { ok: false, error: "Weaver credential has expired; re-verification required." };
  }
  if (!product.media?.primaryAssetId && !product.media?.onLoomAssetId) {
    return { ok: false, error: "At least one photo is required before issuing a passport." };
  }

  const mediaHash = await computeMediaHash(productId);
  product.media.mediaHash = mediaHash;

  const payload = {
    passportId: product.passportId,
    weaverHash: weaver.ledger?.weaverHash,
    mediaHash,
    craft: product.item?.craft?.name,
    category: product.item?.category,
  };
  const entry = await appendLedgerEntry({
    type: "PASSPORT_ISSUED",
    entityType: "product",
    entityId: product.passportId,
    payload,
    summary: `Passport ${product.passportId} issued for ${product.item?.name || "product"}`,
  });

  product.passport = {
    ...(product.passport || {}),
    issuedAt: new Date(),
    entrySeq: entry.seq,
    recordHash: entry.dataHash,
  };
  product.status = "MINTED";

  // Tag: generate + bind (FR-D1/D2)
  const secret = generateTagSecret();
  const tag = await Tag.findOneAndUpdate(
    { tagCode: product.passportId },
    {
      tagCode: product.passportId,
      productId: product._id,
      type: "QR_SCRATCH",
      "secret.hmacHash": hashTagSecret(secret),
      status: "ACTIVE",
    },
    { upsert: true, new: true }
  );
  const bindEntry = await appendLedgerEntry({
    type: "TAG_BOUND",
    entityType: "tag",
    entityId: product.passportId,
    payload: { tagCode: product.passportId, secretHash: hashTagSecret(secret) },
    summary: `Physical tag bound to passport ${product.passportId}`,
  });
  tag.ledger = { bindEntrySeq: bindEntry.seq };
  await tag.save();
  product.tagId = tag._id;
  await product.save();

  await Weaver.updateOne({ _id: weaver._id }, { $inc: { "stats.productsRegistered": 1 } });

  return { ok: true, secret, entrySeq: entry.seq };
}

/** Freeze on dispatch (FR-C6). Irreversible; no admin override exists. */
export async function freezePassport(productId: string) {
  const product = await Product.findById(productId);
  if (!product || product.passport?.frozen) return;
  const entry = await appendLedgerEntry({
    type: "PASSPORT_FROZEN",
    entityType: "product",
    entityId: product.passportId,
    payload: { passportId: product.passportId, mediaHash: product.media?.mediaHash },
    summary: `Record sealed for passport ${product.passportId}`,
  });
  product.passport.frozen = true;
  product.passport.frozenAt = new Date();
  product.passport.freezeEntrySeq = entry.seq;
  await product.save();
}

export type PassportView = NonNullable<Awaited<ReturnType<typeof buildPassportView>>>;

/** The public projection — powers /p/[id] and GET /api/v1/passports/[id]. */
export async function buildPassportView(passportId: string) {
  await dbConnect();
  const product = await Product.findOne({ passportId }).lean<Record<string, any> | null>();
  if (!product) return null;
  const weaver = await Weaver.findById(product.weaverId).lean<Record<string, any> | null>();
  const certs = await Certificate.find({ productId: product._id }).lean<Record<string, any>[]>();
  const events = await ProvenanceEvent.find({ productId: product._id }).sort({ eventIndex: 1 }).lean<Record<string, any>[]>();

  const a = product.authenticity || {};
  let verdictStatus: "GENUINE" | "PENDING" | "FLAGGED" | "VOIDED" = "GENUINE";
  const warnings: string[] = [];
  if (a.voided) {
    verdictStatus = "VOIDED";
    warnings.push(a.voidReason || "This passport has been voided by the platform.");
  } else if (a.flagged || a.riskScore >= 70) {
    verdictStatus = "FLAGGED";
    warnings.push("This item is under investigation for possible duplication. Please verify with the retailer before purchase.");
  } else if (product.status !== "MINTED" || !product.passport?.issuedAt) {
    verdictStatus = "PENDING";
    warnings.push("This record exists but its integrity confirmation is still pending.");
  }
  if (weaver?.verification?.status === "REVOKED") {
    warnings.push(`Note: the weaver's credential was revoked on ${weaver.verification?.revocation?.at ? new Date(weaver.verification.revocation.at).toDateString() : "a later date"}. Passports issued before revocation remain valid.`);
  }

  return {
    passportId,
    verdict: {
      status: verdictStatus,
      confidence: verdictStatus === "GENUINE" ? "HIGH" : "REVIEW",
      verifiedAt: product.passport?.issuedAt || null,
      message:
        verdictStatus === "GENUINE"
          ? "Verified handloom, recorded on a tamper-evident ledger and unchanged since."
          : verdictStatus === "PENDING"
          ? "Registered — integrity confirmation pending."
          : verdictStatus === "FLAGGED"
          ? "Caution: this code has raised authenticity signals."
          : "This passport has been voided.",
      warnings,
      riskScore: a.riskScore || 0,
    },
    weaver: weaver
      ? {
          handle: weaver.handle,
          displayName: weaver.profile?.displayName,
          photoUrl: mediaUrl(weaver.profile?.photoAssetId),
          yearsWeaving: weaver.profile?.yearsWeaving,
          generation: weaver.profile?.generation,
          cluster: [weaver.profile?.cluster?.name, weaver.profile?.cluster?.state].filter(Boolean).join(", "),
          verification: {
            status: weaver.verification?.status,
            verifiedBy: weaver.verification?.verifierOrgName || weaver.verification?.verifierName,
            verifiedAt: weaver.verification?.verifiedAt,
          },
          story: {
            audioUrl: mediaUrl(weaver.story?.audioAssetId),
            durationSec: weaver.story?.audioDurationSec,
            language: weaver.story?.audioLanguage,
            transcript: weaver.story?.transcript,
            highlights: weaver.story?.highlights || [],
          },
        }
      : null,
    product: {
      name: product.item?.name,
      craft: product.item?.craft?.name,
      category: product.item?.category,
      images: {
        primary: mediaUrl(product.media?.primaryAssetId),
        onLoom: mediaUrl(product.media?.onLoomAssetId),
        gallery: (product.media?.gallery || []).map((g: unknown) => mediaUrl(g as string)),
      },
      voiceNoteUrl: mediaUrl(product.media?.voiceNoteAssetId),
      specs: product.item?.specs,
      production: product.item?.production,
      priceRange: product.item?.priceRange,
      narrative: product.narrative,
      giTag: product.item?.giTag,
    },
    certificates: certs.map((c) => ({ type: c.type, number: c.number, issuedBy: c.issuedBy, verified: c.status === "VALID" })),
    materials: (product.materials || []).map((m: Record<string, any>) => ({
      role: m.role,
      type: m.type,
      lotId: m.lotIdLabel,
      grams: m.quantityGrams,
      supplier: m.supplierName,
      certification: m.certification && m.certification !== "NONE" ? m.certification : null,
      isHankYarn: !!m.isHankYarn,
    })),
    journey: {
      stepCount: events.length,
      firstEventAt: events[0]?.occurredAt || null,
      lastEventAt: events.at(-1)?.occurredAt || null,
      currentStage: events.at(-1)?.eventType || null,
      steps: events.map((e) => ({
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        recordedAt: e.recordedAt,
        actor: e.actor?.displayName,
        actorType: e.actor?.type,
        note: e.detail?.note,
        location: e.detail?.location,
        media: (e.detail?.mediaAssetIds || []).map((m: unknown) => mediaUrl(m as string)),
        ledgerSeq: e.ledger?.entrySeq ?? null,
      })),
    },
    proof: {
      ledger: "SUTRA Integrity Ledger (local)",
      entrySeq: product.passport?.entrySeq ?? null,
      recordHash: product.passport?.recordHash ?? null,
      mediaHash: product.media?.mediaHash ?? null,
      materialHash: product.materialHash ?? null,
      sealed: !!product.passport?.frozen,
      sealedAt: product.passport?.frozenAt ?? null,
    },
    ownership: { claimed: !!a.claimedByConsumer, claimedAt: a.claimedAt || null },
    custody: { currentHolderType: product.custody?.currentHolderType, currentHolderName: product.custody?.currentHolderName },
    _productId: String(product._id),
  };
}
