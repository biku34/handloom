import mongoose, { Schema, model, models, Types } from "mongoose";

/* ────────────────────────────────────────────────────────────────────────
   SUTRA data model — adapted from SRS §6 for a local, chain-free build.
   PII is stored plaintext here (local dev). In production it would be
   field-level encrypted (CSFLE) per SRS §11.3.
   The on-chain anchor is replaced by `LedgerEntry` — an append-only,
   hash-chained collection (see lib/ledger.ts).
   ──────────────────────────────────────────────────────────────────────── */

const Geo = { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], default: undefined } };

/* ── organizations ── */
const OrganizationSchema = new Schema(
  {
    orgId: { type: String, unique: true },
    type: { type: String, enum: ["COOPERATIVE", "RETAILER", "VERIFIER_BODY", "MARKETPLACE"], required: true },
    name: { type: String, required: true },
    registrationNo: String,
    address: { village: String, district: String, state: String, pincode: String },
    contact: { phone: String, email: String },
    weaverCount: { type: Number, default: 0 },
    productCount: { type: Number, default: 0 },
    status: { type: String, default: "ACTIVE" },
  },
  { timestamps: true }
);

/* ── users (auth principals) ── */
const UserSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: String,
    email: String,
    role: { type: String, enum: ["WEAVER", "COOP_OFFICER", "VERIFIER", "RETAILER", "ADMIN", "CONSUMER"], required: true },
    orgId: { type: Types.ObjectId, ref: "Organization" },
    weaverId: { type: Types.ObjectId, ref: "Weaver" },
    locale: { type: String, default: "en" },
    auth: {
      otpHash: String,
      otpExpiresAt: Date,
      otpAttempts: { type: Number, default: 0 },
      lastLoginAt: Date,
    },
    status: { type: String, default: "ACTIVE" },
  },
  { timestamps: true }
);

/* ── weavers ── */
const WeaverSchema = new Schema(
  {
    weaverId: { type: String, unique: true }, // WVR-TN-KAN-000431
    handle: { type: String, unique: true },
    personal: {
      fullName: String,
      phone: String,
      govtIdType: { type: String, enum: ["AADHAAR", "VOTER", "HANDLOOM_ID", "PAN"], default: "HANDLOOM_ID" },
      govtIdHash: String, // sha256 — the number itself is never stored
      govtIdLast4: String,
      address: {
        village: String,
        district: String,
        state: String,
        pincode: String,
        geo: Geo,
      },
    },
    profile: {
      displayName: String,
      photoAssetId: { type: Types.ObjectId, ref: "MediaAsset" },
      yearsWeaving: Number,
      generation: Number,
      cluster: { code: Number, name: String, state: String },
      crafts: [{ code: Number, name: String, isPrimary: Boolean }],
      looms: [{ type: { type: String }, count: Number, jacquardHooks: Number, installedYear: Number }],
      languages: [String],
      guruLineage: String,
      awards: [{ title: String, year: Number, issuer: String }],
    },
    story: {
      audioAssetId: { type: Types.ObjectId, ref: "MediaAsset" },
      audioDurationSec: Number,
      audioLanguage: String,
      transcript: {
        original: { lang: String, text: String, source: String },
        translations: [{ lang: String, text: String, source: String }],
      },
      highlights: [String],
      consentGiven: { type: Boolean, default: false },
      consentAt: Date,
    },
    verification: {
      status: { type: String, enum: ["UNVERIFIED", "PENDING", "VERIFIED", "EXPIRED", "REVOKED", "SUSPENDED"], default: "PENDING" },
      method: { type: String, enum: ["IN_PERSON", "VIDEO_KYC", "COOP_ATTESTED"], default: "IN_PERSON" },
      verifiedBy: { type: Types.ObjectId, ref: "User" },
      verifierName: String,
      verifierOrgId: { type: Types.ObjectId, ref: "Organization" },
      verifierOrgName: String,
      verifiedAt: Date,
      expiresAt: Date,
      revocation: { reason: String, at: Date, by: { type: Types.ObjectId, ref: "User" } },
    },
    // Ledger anchor (stand-in for the on-chain credential)
    ledger: {
      weaverSalt: String, // delete to crypto-shred (DPDP erasure)
      weaverHash: String, // sha256(weaverId ‖ salt)
      profileHash: String,
      credentialEntrySeq: Number, // LedgerEntry.seq of the attestation
      anchoredAt: Date,
    },
    orgId: { type: Types.ObjectId, ref: "Organization" },
    stats: {
      productsRegistered: { type: Number, default: 0 },
      totalScans: { type: Number, default: 0 },
      uniqueScanners: { type: Number, default: 0 },
      countriesReached: { type: Number, default: 0 },
    },
    status: { type: String, default: "ACTIVE" },
    createdBy: { type: Types.ObjectId, ref: "User" },
    registrationMode: { type: String, enum: ["SELF", "ASSISTED"], default: "SELF" },
  },
  { timestamps: true }
);
WeaverSchema.index({ orgId: 1, "verification.status": 1 });
WeaverSchema.index({ "profile.cluster.code": 1 });

/* ── materials (weaver-owned yarn / zari / dye lots) ── */
const MaterialLotSchema = new Schema(
  {
    lotId: { type: String, unique: true },
    type: { type: String, enum: ["SILK_YARN", "COTTON_YARN", "WOOL_YARN", "ZARI", "DYE"], required: true },
    supplier: { name: String, gstin: String },
    spec: {
      denier: Number,
      ply: Number,
      colour: String,
      certification: String, // SILK_MARK | HANDLOOM_HANK | AZO_FREE | ORGANIC | NONE
      dyeChemistry: String,
      isHankYarn: Boolean, // legally reserved for handloom — a real authenticity signal
    },
    quantity: { value: Number, unit: { type: String, default: "GRAMS" } },
    remainingGrams: Number,
    receivedAt: Date,
    weaverId: { type: Types.ObjectId, ref: "Weaver" }, // the lot belongs to the weaver
    orgId: { type: Types.ObjectId, ref: "Organization" },
    ledger: { materialHash: String, entrySeq: Number },
  },
  { timestamps: true }
);
MaterialLotSchema.index({ weaverId: 1, createdAt: -1 });

/* ── products ── */
const ProductSchema = new Schema(
  {
    passportId: { type: String, unique: true }, // base58, public, in the QR
    internalSku: String,
    weaverId: { type: Types.ObjectId, ref: "Weaver", required: true },
    orgId: { type: Types.ObjectId, ref: "Organization" },
    item: {
      name: String,
      craft: { code: Number, name: String },
      category: { type: String, enum: ["SAREE", "DHOTI", "STOLE", "SHAWL", "FABRIC", "DUPATTA", "TOWEL", "OTHER"], default: "SAREE" },
      giTag: { registered: Boolean, giNumber: String, name: String },
      specs: {
        lengthCm: Number,
        widthCm: Number,
        weightGrams: Number,
        threadCount: { warp: Number, weft: Number },
        zariType: String,
        zariGrams: Number,
        colours: [String],
        motifs: [String],
        weaveTechnique: String,
        dyeType: String,
      },
      production: { startedAt: Date, completedAt: Date, loomHours: Number, weaverCount: Number },
      priceRange: { min: Number, max: Number, currency: { type: String, default: "INR" } },
    },
    materials: [
      {
        materialLotId: { type: Types.ObjectId, ref: "MaterialLot" },
        lotIdLabel: String, // denormalised for display without a join
        type: { type: String }, // wrapped so Mongoose treats "type" as a field name, not the type keyword
        role: { type: String, enum: ["WARP", "WEFT", "ZARI", "DYE"] },
        quantityGrams: Number,
        supplierName: String,
        certification: String,
        isHankYarn: Boolean,
        materialHash: String,
        linkedAt: Date,
      },
    ],
    materialHash: String, // sha256 over sorted linked-lot hashes (FR-B2 commitment)
    media: {
      primaryAssetId: { type: Types.ObjectId, ref: "MediaAsset" },
      gallery: [{ type: Types.ObjectId, ref: "MediaAsset" }],
      onLoomAssetId: { type: Types.ObjectId, ref: "MediaAsset" },
      voiceNoteAssetId: { type: Types.ObjectId, ref: "MediaAsset" },
      mediaHash: String, // sha256 over sorted asset content hashes
    },
    narrative: { title: String, body: String, inspiration: String, culturalNote: String },
    passport: {
      issuedAt: Date,
      entrySeq: Number, // LedgerEntry.seq of the PASSPORT_ISSUED record
      recordHash: String,
      frozen: { type: Boolean, default: false },
      frozenAt: Date,
      freezeEntrySeq: Number,
    },
    tagId: { type: Types.ObjectId, ref: "Tag" },
    certificates: [{ type: Types.ObjectId, ref: "Certificate" }],
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_MEDIA", "QUEUED", "MINTED", "FAILED", "FLAGGED", "VOID"],
      default: "DRAFT",
    },
    custody: {
      currentHolderType: { type: String, enum: ["WEAVER", "COOP", "RETAILER", "CONSUMER"], default: "WEAVER" },
      currentHolderName: String,
      since: Date,
      history: [
        {
          holderType: String,
          holderName: String,
          from: Date,
          to: Date,
        },
      ],
    },
    authenticity: {
      riskScore: { type: Number, default: 0 },
      flagged: { type: Boolean, default: false },
      flagReasons: [String],
      lastAssessedAt: Date,
      claimedByConsumer: { type: Boolean, default: false },
      claimedAt: Date,
      voided: { type: Boolean, default: false },
      voidReason: String,
    },
    stats: {
      scanCount: { type: Number, default: 0 },
      uniqueScanners: { type: Number, default: 0 },
      lastScanAt: Date,
      firstScanAt: Date,
      scanCountries: [String],
    },
    createdBy: { type: Types.ObjectId, ref: "User" },
    registrationMode: { type: String, enum: ["SELF", "ASSISTED", "BULK_IMPORT"], default: "SELF" },
  },
  { timestamps: true }
);
ProductSchema.index({ weaverId: 1, createdAt: -1 });
ProductSchema.index({ orgId: 1, status: 1 });
ProductSchema.index({ "authenticity.flagged": 1, "authenticity.riskScore": -1 });

/* ── tags (physical QR ↔ passport binding) ── */
const TagSchema = new Schema(
  {
    tagCode: { type: String, unique: true }, // == passportId
    productId: { type: Types.ObjectId, ref: "Product", unique: true },
    type: { type: String, enum: ["QR", "QR_SCRATCH", "NFC_424"], default: "QR_SCRATCH" },
    secret: {
      hmacHash: String, // sha256 of the printed secret — plaintext never persisted
      claimed: { type: Boolean, default: false },
      claimedAt: Date,
      claimAttempts: { type: Number, default: 0 },
      failedAttempts: { type: Number, default: 0 },
      lockedUntil: Date,
    },
    print: { batchId: String, printedAt: Date, printedBy: { type: Types.ObjectId, ref: "User" }, voided: { type: Boolean, default: false }, voidReason: String },
    status: { type: String, enum: ["GENERATED", "PRINTED", "APPLIED", "ACTIVE", "CLAIMED", "VOIDED", "SUSPECTED_CLONE"], default: "GENERATED" },
    ledger: { bindEntrySeq: Number },
  },
  { timestamps: true }
);

/* ── scans (highest-volume) ── */
const ScanSchema = new Schema(
  {
    passportId: { type: String, index: true },
    productId: { type: Types.ObjectId, ref: "Product" },
    scanId: { type: String, unique: true },
    at: { type: Date, default: Date.now },
    source: { type: String, enum: ["QR", "NFC", "MANUAL_ENTRY", "API", "MARKETPLACE_EMBED"], default: "QR" },
    network: {
      ipHash: String, // salted hash, never the raw IP
      country: String,
      region: String,
      city: String,
    },
    client: { uaFamily: String, os: String, deviceClass: String, language: String, isBot: { type: Boolean, default: false } },
    session: { anonId: String, isFirstScan: Boolean, referrer: String },
    engagement: { dwellMs: Number, viewedStory: Boolean, playedVoiceNote: Boolean, viewedJourney: Boolean },
    risk: { score: { type: Number, default: 0 }, signals: [String] },
  },
  { timestamps: true }
);
ScanSchema.index({ passportId: 1, at: -1 });
ScanSchema.index({ "network.ipHash": 1, at: -1 });

/* ── provenanceEvents (append-only — no update/delete path exists) ── */
export const PROVENANCE_EVENT_TYPES = [
  "YARN_SOURCED",
  "DYED",
  "WARPED",
  "WEAVING_STARTED",
  "WEAVING_COMPLETED",
  "FINISHED",
  "QC_PASSED",
  "CERTIFIED",
  "DISPATCHED",
  "RECEIVED",
  "RETAIL_LISTED",
  "SOLD",
  "OWNERSHIP_CLAIMED",
  "RESOLD",
  "REPAIRED",
  "DISPUTED",
] as const;

const ProvenanceEventSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    passportId: String,
    eventType: { type: String, enum: PROVENANCE_EVENT_TYPES, required: true },
    eventIndex: { type: Number, required: true },
    occurredAt: { type: Date, required: true },
    recordedAt: { type: Date, default: Date.now },
    actor: { type: { type: String }, id: { type: Types.ObjectId }, displayName: String },
    detail: {
      note: String,
      mediaAssetIds: [{ type: Types.ObjectId, ref: "MediaAsset" }],
      location: String,
    },
    ledger: { dataHash: String, entrySeq: Number },
  },
  { timestamps: true }
);
ProvenanceEventSchema.index({ productId: 1, eventIndex: 1 }, { unique: true });
ProvenanceEventSchema.index({ passportId: 1, occurredAt: 1 });

/* ── claims ── */
const ClaimSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product" },
    passportId: String,
    claimantName: String,
    claimantPhone: String, // normalised 10-digit — the key for the public "my purchases" lookup
    claimantEmail: String,
    method: { type: String, enum: ["SCRATCH_SECRET", "RETAILER_ISSUED"], default: "SCRATCH_SECRET" },
    scanId: String,
    status: { type: String, default: "CLAIMED" },
    claimedAt: Date,
  },
  { timestamps: true }
);
ClaimSchema.index({ claimantPhone: 1, claimedAt: -1 });

/* ── certificates ── */
const CertificateSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product" },
    weaverId: { type: Types.ObjectId, ref: "Weaver" },
    type: { type: String, enum: ["HANDLOOM_MARK", "SILK_MARK", "GI", "INDIA_HANDLOOM_BRAND", "ORGANIC", "FAIR_TRADE"], required: true },
    number: String,
    issuedBy: String,
    issuedAt: Date,
    validUntil: Date,
    documentAssetId: { type: Types.ObjectId, ref: "MediaAsset" },
    documentHash: String,
    status: { type: String, default: "VALID" },
    ledger: { entrySeq: Number },
  },
  { timestamps: true }
);

/* ── fraudReports ── */
const FraudReportSchema = new Schema(
  {
    passportId: String,
    productId: { type: Types.ObjectId, ref: "Product" },
    reportRef: { type: String, unique: true }, // FR-2026-0417
    reportedBy: {
      type: { type: String, enum: ["CONSUMER", "SYSTEM", "WEAVER", "RETAILER"], default: "CONSUMER" },
      userId: { type: Types.ObjectId, ref: "User" },
      contact: String,
      scanId: String,
    },
    reason: {
      type: String,
      enum: ["DUPLICATE_CLAIM", "DUPLICATE_SCAN", "PHYSICAL_MISMATCH", "PRICE_ANOMALY", "TAG_TAMPERED", "OTHER"],
      default: "OTHER",
    },
    description: String,
    autoSignals: [{ signal: String, weight: Number, detail: String }],
    riskScore: { type: Number, default: 0 },
    status: { type: String, enum: ["OPEN", "INVESTIGATING", "CONFIRMED_FRAUD", "FALSE_POSITIVE", "CLOSED"], default: "OPEN" },
    assignedTo: { type: Types.ObjectId, ref: "User" },
    resolution: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);
FraudReportSchema.index({ status: 1, riskScore: -1 });

/* ── mediaAssets (local-disk storage instead of IPFS/R2) ── */
const MediaAssetSchema = new Schema(
  {
    kind: { type: String, enum: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"], required: true },
    purpose: String,
    ownerType: String,
    ownerId: { type: Types.ObjectId },
    file: {
      path: String, // relative path under uploads/
      mime: String,
      bytes: Number,
      sha256: String, // content hash — the integrity anchor
      originalName: String,
    },
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ── ledgerEntries — the append-only, hash-chained integrity log.
      Stand-in for the blockchain: each entry commits to the previous one,
      so any retro-active edit breaks every hash after it. ── */
const LedgerEntrySchema = new Schema(
  {
    seq: { type: Number, unique: true },
    type: {
      type: String,
      enum: ["GENESIS", "WEAVER_ATTESTED", "WEAVER_REVOKED", "PASSPORT_ISSUED", "TAG_BOUND", "PASSPORT_FROZEN", "PROVENANCE_EVENT", "CERTIFICATE_ANCHORED", "OWNERSHIP_CLAIMED", "MATERIAL_REGISTERED", "PASSPORT_VOIDED"],
      required: true,
    },
    entityType: String,
    entityId: String,
    dataHash: { type: String, required: true }, // sha256 of the canonical payload
    prevHash: { type: String, required: true },
    entryHash: { type: String, required: true }, // sha256(seq ‖ type ‖ dataHash ‖ prevHash ‖ at)
    at: { type: Date, default: Date.now },
    summary: String,
    // Public-chain anchor (Polygon). LOCAL until anchored; automated in the backend.
    chain: {
      status: { type: String, enum: ["LOCAL", "PENDING", "CONFIRMED", "FAILED"], default: "LOCAL" },
      network: String,
      txHash: String,
      blockNumber: Number,
      anchoredAt: Date,
      error: String,
      attempts: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
LedgerEntrySchema.index({ "chain.status": 1 });

/* ── auditLog (append-only) ── */
const AuditLogSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    actorUserId: { type: Types.ObjectId, ref: "User" },
    actorRole: String,
    action: String,
    targetType: String,
    targetId: String,
    detail: String,
  },
  { timestamps: true }
);

function m<T>(name: string, schema: Schema): mongoose.Model<T> {
  return (models[name] as mongoose.Model<T>) || model<T>(name, schema);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const Organization = m<any>("Organization", OrganizationSchema);
export const User = m<any>("User", UserSchema);
export const Weaver = m<any>("Weaver", WeaverSchema);
export const MaterialLot = m<any>("MaterialLot", MaterialLotSchema);
export const Product = m<any>("Product", ProductSchema);
export const Tag = m<any>("Tag", TagSchema);
export const Scan = m<any>("Scan", ScanSchema);
export const ProvenanceEvent = m<any>("ProvenanceEvent", ProvenanceEventSchema);
export const Claim = m<any>("Claim", ClaimSchema);
export const Certificate = m<any>("Certificate", CertificateSchema);
export const FraudReport = m<any>("FraudReport", FraudReportSchema);
export const MediaAsset = m<any>("MediaAsset", MediaAssetSchema);
export const LedgerEntry = m<any>("LedgerEntry", LedgerEntrySchema);
export const AuditLog = m<any>("AuditLog", AuditLogSchema);

export const CRAFTS = [
  { code: 1, name: "Kanjivaram Silk" },
  { code: 2, name: "Banarasi" },
  { code: 3, name: "Jamdani" },
  { code: 4, name: "Pochampally Ikat" },
  { code: 5, name: "Chanderi" },
  { code: 6, name: "Maheshwari" },
  { code: 7, name: "Bhagalpuri Silk" },
  { code: 8, name: "Kullu Shawl" },
  { code: 9, name: "Muga Silk" },
  { code: 10, name: "Patola" },
  { code: 11, name: "Cotton Handloom" },
] as const;

export const CATEGORIES = ["SAREE", "DHOTI", "STOLE", "SHAWL", "FABRIC", "DUPATTA", "TOWEL", "OTHER"] as const;
