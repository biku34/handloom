import { LedgerEntry } from "./models";
import { sha256, canonicalHash } from "./hash";
import { isChainEnabled, anchorOnChain } from "./chain";

/*
 * The SUTRA integrity ledger — hash-chained locally AND anchored to a public
 * blockchain (Polygon) when configured. Append-only: entry N commits to entry
 * N-1's hash, so editing an old entry invalidates every entry after it. When a
 * chain wallet is configured, each entry's hash is also written on-chain by the
 * platform (no user ever signs) so anyone can verify it independently.
 */

/** Anchor one entry's hash on-chain in the background and record the result. */
export async function anchorLedgerEntry(entryId: string, entryHash: string): Promise<void> {
  if (!isChainEnabled()) return;
  await LedgerEntry.updateOne({ _id: entryId }, { $set: { "chain.status": "PENDING" }, $inc: { "chain.attempts": 1 } });
  const res = await anchorOnChain(entryHash);
  if (res.ok) {
    await LedgerEntry.updateOne(
      { _id: entryId },
      { $set: { "chain.status": "CONFIRMED", "chain.txHash": res.txHash, "chain.blockNumber": res.blockNumber, "chain.network": res.network, "chain.anchoredAt": new Date(), "chain.error": null } }
    );
  } else {
    await LedgerEntry.updateOne({ _id: entryId }, { $set: { "chain.status": "FAILED", "chain.error": res.error } });
  }
}

export async function appendLedgerEntry(opts: {
  type: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  summary: string;
}) {
  // Retry on the (rare) unique-index race for seq.
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await LedgerEntry.findOne().sort({ seq: -1 }).lean<{ seq: number; entryHash: string } | null>();
    const seq = last ? last.seq + 1 : 1;
    const prevHash = last ? last.entryHash : sha256("SUTRA_GENESIS");
    const dataHash = canonicalHash(opts.payload);
    const at = new Date();
    const entryHash = sha256(`${seq}|${opts.type}|${dataHash}|${prevHash}|${at.toISOString()}`);
    try {
      const entry = await LedgerEntry.create({
        seq,
        type: opts.type,
        entityType: opts.entityType,
        entityId: opts.entityId,
        dataHash,
        prevHash,
        entryHash,
        at,
        summary: opts.summary,
        chain: { status: isChainEnabled() ? "PENDING" : "LOCAL" },
      });
      // Fire-and-forget: anchor on-chain in the background so the user's action
      // is never blocked by ~2s block time (SRS §3.3 async write pipeline).
      if (isChainEnabled()) {
        void anchorLedgerEntry(String(entry._id), entryHash);
      }
      return entry;
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 11000) continue; // seq collision — retry
      throw e;
    }
  }
  throw new Error("Ledger append failed after retries");
}

/** Recompute the chain and report whether it is intact. */
export async function verifyLedgerChain(limit = 5000): Promise<{ intact: boolean; checked: number; brokenAtSeq?: number }> {
  const entries = await LedgerEntry.find().sort({ seq: 1 }).limit(limit).lean<
    { seq: number; type: string; dataHash: string; prevHash: string; entryHash: string; at: Date }[]
  >();
  let prevHash = sha256("SUTRA_GENESIS");
  for (const e of entries) {
    const expected = sha256(`${e.seq}|${e.type}|${e.dataHash}|${prevHash}|${new Date(e.at).toISOString()}`);
    if (e.prevHash !== prevHash || e.entryHash !== expected) {
      return { intact: false, checked: entries.length, brokenAtSeq: e.seq };
    }
    prevHash = e.entryHash;
  }
  return { intact: true, checked: entries.length };
}
