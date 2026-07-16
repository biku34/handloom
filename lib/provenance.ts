import { ProvenanceEvent, Product, AuditLog } from "./models";
import { appendLedgerEntry } from "./ledger";
import { canonicalHash } from "./hash";

/** Append a provenance event (FR-E1). Append-only — no update/delete exists. */
export async function recordProvenanceEvent(opts: {
  productId: string;
  eventType: string;
  occurredAt?: Date;
  actorType: string;
  actorId?: string;
  actorName?: string;
  note?: string;
  location?: string;
  mediaAssetIds?: string[];
}) {
  const product = await Product.findById(opts.productId);
  if (!product) throw new Error("Product not found");

  // Gapless, monotonic eventIndex; retry on the unique-index race.
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await ProvenanceEvent.findOne({ productId: product._id })
      .sort({ eventIndex: -1 })
      .lean<{ eventIndex: number } | null>();
    const eventIndex = last ? last.eventIndex + 1 : 0;
    const detail = { note: opts.note, location: opts.location, mediaAssetIds: opts.mediaAssetIds || [] };
    const dataHash = canonicalHash({ passportId: product.passportId, eventType: opts.eventType, eventIndex, detail });
    try {
      const event = await ProvenanceEvent.create({
        productId: product._id,
        passportId: product.passportId,
        eventType: opts.eventType,
        eventIndex,
        occurredAt: opts.occurredAt || new Date(),
        recordedAt: new Date(),
        actor: { type: opts.actorType, id: opts.actorId, displayName: opts.actorName },
        detail,
        ledger: { dataHash },
      });
      const entry = await appendLedgerEntry({
        type: "PROVENANCE_EVENT",
        entityType: "provenanceEvent",
        entityId: `${product.passportId}#${eventIndex}`,
        payload: { dataHash, eventType: opts.eventType, eventIndex },
        summary: `${opts.eventType} recorded for ${product.passportId}`,
      });
      event.ledger.entrySeq = entry.seq;
      await event.save();
      return event;
    } catch (e: unknown) {
      if ((e as { code?: number }).code === 11000) continue;
      throw e;
    }
  }
  throw new Error("Failed to append provenance event after retries");
}

export async function audit(opts: { actorUserId?: string; actorRole?: string; action: string; targetType?: string; targetId?: string; detail?: string }) {
  await AuditLog.create({ ...opts, at: new Date() });
}
