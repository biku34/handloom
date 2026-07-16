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

async function main() {
  await dbConnect();
  const p = await Product.findOne({ passportId: "fPE4EPouYSs21Q8b" }).lean<any>();
  const events = await ProvenanceEvent.find({ productId: p._id }).sort({ eventIndex: 1 }).lean<any[]>();
  for (const e of events) {
    console.log(`idx=${e.eventIndex} ${e.eventType} ledgerSeq=${e.ledger?.entrySeq} at=${new Date(e.occurredAt).toISOString()} note="${e.detail?.note || ""}"`);
  }
  const maxSeq = await LedgerEntry.findOne().sort({ seq: -1 }).lean<any>();
  console.log("max ledger seq:", maxSeq.seq);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
