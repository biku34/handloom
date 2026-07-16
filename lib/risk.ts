import { Product, Scan, FraudReport } from "./models";
import { reportRef } from "./ids";

/*
 * Anomaly scoring (SRS §5.2 Layer 3 / FR-G1), simplified for local build.
 * Signals accumulate into product.authenticity.riskScore (0–100).
 * ≥70 → flagged (admin queue); a duplicate claim is a conclusive signal.
 */

export const SIGNAL_WEIGHTS: Record<string, number> = {
  DUPLICATE_CLAIM: 80, // claim attempt on an already-claimed tag — conclusive
  SCAN_VELOCITY: 25, // many scans from many places in a short window
  GEO_SPREAD: 20, // scans from >3 cities within 24h
  REPEATED_FAILED_CLAIMS: 30,
  CONSUMER_REPORT: 35,
};

export async function assessProductRisk(productId: string): Promise<number> {
  const product = await Product.findById(productId);
  if (!product) return 0;

  const signals: { signal: string; weight: number; detail: string }[] = [];
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);

  const recent = await Scan.find({ productId, at: { $gte: dayAgo }, "client.isBot": { $ne: true } }).lean<
    { network?: { city?: string; ipHash?: string } }[]
  >();
  if (recent.length > 30) {
    signals.push({ signal: "SCAN_VELOCITY", weight: SIGNAL_WEIGHTS.SCAN_VELOCITY, detail: `${recent.length} scans in 24h` });
  }
  const cities = new Set(recent.map((s) => s.network?.city).filter(Boolean));
  if (cities.size > 3) {
    signals.push({ signal: "GEO_SPREAD", weight: SIGNAL_WEIGHTS.GEO_SPREAD, detail: `Scanned in ${cities.size} cities within 24h: ${[...cities].join(", ")}` });
  }

  const openReports = await FraudReport.countDocuments({ productId, status: { $in: ["OPEN", "INVESTIGATING", "CONFIRMED_FRAUD"] } });
  if (openReports > 0) {
    signals.push({ signal: "CONSUMER_REPORT", weight: SIGNAL_WEIGHTS.CONSUMER_REPORT, detail: `${openReports} open fraud report(s)` });
  }

  const dupClaim = await FraudReport.exists({ productId, reason: "DUPLICATE_CLAIM" });
  if (dupClaim) {
    signals.push({ signal: "DUPLICATE_CLAIM", weight: SIGNAL_WEIGHTS.DUPLICATE_CLAIM, detail: "Claim attempted on an already-claimed tag" });
  }

  const score = Math.min(100, signals.reduce((a, s) => a + s.weight, 0));
  product.authenticity.riskScore = score;
  product.authenticity.flagged = score >= 70;
  product.authenticity.flagReasons = signals.map((s) => `${s.signal}: ${s.detail}`);
  product.authenticity.lastAssessedAt = new Date();
  if (score >= 70 && product.status === "MINTED") product.status = "FLAGGED";
  if (score < 70 && product.status === "FLAGGED") product.status = "MINTED";
  await product.save();
  return score;
}

/** Raised when a claim hits an already-claimed tag — the clone alarm (FR-F5 AC-3). */
export async function raiseCloneAlarm(opts: { productId: string; passportId: string; scanId?: string; contact?: string }) {
  const ref = reportRef();
  await FraudReport.create({
    passportId: opts.passportId,
    productId: opts.productId,
    reportRef: ref,
    reportedBy: { type: "SYSTEM", scanId: opts.scanId, contact: opts.contact },
    reason: "DUPLICATE_CLAIM",
    description:
      "A claim was attempted on a tag whose secret was already claimed. This is a conclusive clone signal: either the physical tag was duplicated or the secret leaked.",
    autoSignals: [{ signal: "DUPLICATE_CLAIM", weight: SIGNAL_WEIGHTS.DUPLICATE_CLAIM, detail: "Second claim attempt" }],
    riskScore: SIGNAL_WEIGHTS.DUPLICATE_CLAIM,
    status: "OPEN",
  });
  await assessProductRisk(opts.productId);
  return ref;
}
