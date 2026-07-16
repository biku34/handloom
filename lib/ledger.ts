import { LedgerEntry } from "./models";
import { sha256, canonicalHash } from "./hash";

/*
 * The SUTRA integrity ledger — the local stand-in for the blockchain layer.
 * Append-only and hash-chained: entry N commits to entry N-1's hash, so any
 * after-the-fact edit of an old entry invalidates every entry that follows.
 * The public proof page recomputes and displays this chain.
 */

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
      });
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
