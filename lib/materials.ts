import { dbConnect } from "./db";
import { MaterialLot, Product } from "./models";
import { appendLedgerEntry } from "./ledger";
import { canonicalHash, sha256 } from "./hash";
import { recordProvenanceEvent } from "./provenance";

/*
 * Materials traceability (SRS Module B, weaver-owned).
 * FR-B1: register a yarn/zari/dye lot — ledger-anchored at creation.
 * FR-B2: link a lot to a product — atomic stock decrement, over-consumption
 *        rejected ("you cannot weave 400 sarees from 5 kg of silk"), and the
 *        passport's materialHash commits to the linked lot hashes.
 */

export const MATERIAL_TYPES = ["SILK_YARN", "COTTON_YARN", "WOOL_YARN", "ZARI", "DYE"] as const;
export const MATERIAL_ROLES = ["WARP", "WEFT", "ZARI", "DYE"] as const;
export const CERTIFICATIONS = ["SILK_MARK", "HANDLOOM_HANK", "AZO_FREE", "ORGANIC", "NONE"] as const;

function lotPrefix(type: string): string {
  if (type === "ZARI") return "ZAR";
  if (type === "DYE") return "DYE";
  return "YRN";
}

export async function registerMaterialLot(opts: {
  weaverId: string;
  orgId?: string;
  type: string;
  supplierName?: string;
  supplierGstin?: string;
  colour?: string;
  denier?: number;
  ply?: number;
  certification?: string;
  dyeChemistry?: string;
  isHankYarn?: boolean;
  quantityGrams: number;
  receivedAt?: Date;
}) {
  await dbConnect();
  if (!MATERIAL_TYPES.includes(opts.type as (typeof MATERIAL_TYPES)[number])) throw new Error("Invalid material type");
  const grams = Number(opts.quantityGrams);
  if (!Number.isFinite(grams) || grams <= 0) throw new Error("Quantity must be a positive number of grams");

  const year = new Date().getFullYear();
  const seq = (await MaterialLot.countDocuments()) + 1;
  const lotId = `${lotPrefix(opts.type)}-${year}-${String(seq).padStart(4, "0")}`;

  const spec = {
    denier: opts.denier || undefined,
    ply: opts.ply || undefined,
    colour: opts.colour,
    certification: opts.certification || "NONE",
    dyeChemistry: opts.dyeChemistry,
    isHankYarn: !!opts.isHankYarn,
  };
  const materialHash = canonicalHash({
    lotId,
    type: opts.type,
    supplier: { name: opts.supplierName, gstin: opts.supplierGstin },
    spec,
    quantity: grams,
  });

  const lot = await MaterialLot.create({
    lotId,
    type: opts.type,
    supplier: { name: opts.supplierName, gstin: opts.supplierGstin },
    spec,
    quantity: { value: grams, unit: "GRAMS" },
    remainingGrams: grams,
    receivedAt: opts.receivedAt || new Date(),
    weaverId: opts.weaverId,
    orgId: opts.orgId,
    ledger: { materialHash },
  });

  const entry = await appendLedgerEntry({
    type: "MATERIAL_REGISTERED",
    entityType: "material",
    entityId: lotId,
    payload: { lotId, materialHash, type: opts.type, grams, certification: spec.certification, isHankYarn: spec.isHankYarn },
    summary: `Material lot ${lotId} registered (${opts.type.replace(/_/g, " ").toLowerCase()}, ${grams} g)`,
  });
  lot.ledger.entrySeq = entry.seq;
  await lot.save();
  return lot;
}

/** Deterministic commitment over a product's linked lots (FR-B2). */
export function computeMaterialHash(materials: { materialHash?: string }[]): string | null {
  const hashes = materials.map((m) => m.materialHash || "").filter(Boolean).sort();
  return hashes.length ? sha256(hashes.join("|")) : null;
}

export async function linkMaterialToProduct(opts: {
  productId: string;
  weaverId?: string;
  lotObjectId: string;
  role: string;
  grams: number;
  actorId?: string;
  actorName?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await dbConnect();
  if (!MATERIAL_ROLES.includes(opts.role as (typeof MATERIAL_ROLES)[number])) return { ok: false, error: "Invalid role" };
  const grams = Number(opts.grams);
  if (!Number.isFinite(grams) || grams <= 0) return { ok: false, error: "Enter a positive number of grams" };

  const product = await Product.findById(opts.productId);
  if (!product) return { ok: false, error: "Product not found" };
  if (opts.weaverId && String(product.weaverId) !== opts.weaverId) return { ok: false, error: "Not your product" };
  if (product.passport?.frozen) return { ok: false, error: "This record is sealed; materials can no longer be added." };
  if ((product.materials || []).some((m: { materialLotId?: unknown; role?: string }) => String(m.materialLotId) === opts.lotObjectId && m.role === opts.role)) {
    return { ok: false, error: "This lot is already linked in that role." };
  }

  // Ownership + existence first (clear, distinct errors)…
  const lotDoc = await MaterialLot.findById(opts.lotObjectId).lean<{ weaverId?: unknown; remainingGrams?: number } | null>();
  if (!lotDoc) return { ok: false, error: "Material lot not found" };
  if (String(lotDoc.weaverId) !== String(product.weaverId)) return { ok: false, error: "That lot belongs to a different weaver" };
  if ((lotDoc.remainingGrams ?? 0) < grams) {
    return { ok: false, error: `Only ${lotDoc.remainingGrams ?? 0} g left in this lot — you cannot use ${grams} g.` };
  }
  // …then an atomic decrement whose $gte guard still prevents oversell under concurrency.
  const lot = await MaterialLot.findOneAndUpdate(
    { _id: opts.lotObjectId, remainingGrams: { $gte: grams } },
    { $inc: { remainingGrams: -grams } },
    { new: true }
  );
  if (!lot) return { ok: false, error: "Stock just changed — please try again." };

  product.materials.push({
    materialLotId: lot._id,
    lotIdLabel: lot.lotId,
    type: lot.type,
    role: opts.role,
    quantityGrams: grams,
    supplierName: lot.supplier?.name,
    certification: lot.spec?.certification,
    isHankYarn: lot.spec?.isHankYarn,
    materialHash: lot.ledger?.materialHash,
    linkedAt: new Date(),
  });
  product.materialHash = computeMaterialHash(product.materials);
  await product.save();

  // Surface the origin on the public journey (FR-B2).
  await recordProvenanceEvent({
    productId: String(product._id),
    eventType: opts.role === "DYE" ? "DYED" : "YARN_SOURCED",
    actorType: "WEAVER",
    actorId: opts.actorId,
    actorName: opts.actorName,
    note: `${opts.role} · ${grams} g from ${lot.type.replace(/_/g, " ").toLowerCase()} lot ${lot.lotId}${lot.supplier?.name ? ` (${lot.supplier.name})` : ""}${lot.spec?.isHankYarn ? " · hank yarn" : ""}`,
  });

  return { ok: true };
}
