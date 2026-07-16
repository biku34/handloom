/** One-off: remove the duplicate DISPATCHED event (idx=4, ledger #94) on
 *  passport fPE4EPouYSs21Q8b — created by the double-dispatch bug, at the
 *  user's request. Both records are the tail of their sequences, so the
 *  hash chain remains intact. Verified with verifyLedgerChain() after. */
import fs from "fs";
import path from "path";
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
import mongoose from "mongoose";
import { dbConnect } from "../lib/db";
import { Product, ProvenanceEvent, LedgerEntry } from "../lib/models";
import { verifyLedgerChain } from "../lib/ledger";

async function main() {
  await dbConnect();
  const p = await Product.findOne({ passportId: "fPE4EPouYSs21Q8b" });
  if (!p) throw new Error("product not found");

  const dup = await ProvenanceEvent.findOne({ productId: p._id, eventType: "DISPATCHED", eventIndex: 4 });
  if (!dup) {
    console.log("duplicate already removed");
  } else {
    const seq = dup.ledger?.entrySeq;
    // Safety: only proceed if both records are the tail of their sequences.
    const lastEvent = await ProvenanceEvent.findOne({ productId: p._id }).sort({ eventIndex: -1 }).lean<any>();
    const lastLedger = await LedgerEntry.findOne().sort({ seq: -1 }).lean<any>();
    if (lastEvent.eventIndex !== dup.eventIndex) throw new Error("duplicate is not the last event — aborting");
    if (seq && lastLedger.seq !== seq) throw new Error(`ledger #${seq} is not the chain tip (#${lastLedger.seq}) — aborting`);

    await ProvenanceEvent.deleteOne({ _id: dup._id });
    if (seq) await LedgerEntry.deleteOne({ seq });
    console.log(`removed duplicate DISPATCHED (event idx=4, ledger #${seq})`);
  }

  const chain = await verifyLedgerChain();
  console.log("ledger chain:", chain.intact ? `INTACT (${chain.checked} entries)` : `BROKEN at #${chain.brokenAtSeq}`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
