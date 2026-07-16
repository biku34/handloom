/** One-off repair: restore CONSUMER custody for items that were re-dispatched
 *  after being claimed (bug fixed in the custody API on 2026-07-16). */
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
import { Product, Claim } from "../lib/models";

async function main() {
  await dbConnect();
  const claimed = await Product.find({ "authenticity.claimedByConsumer": true, "custody.currentHolderType": { $ne: "CONSUMER" } });
  for (const p of claimed) {
    const claim = await Claim.findOne({ productId: p._id, status: "CLAIMED" }).sort({ claimedAt: -1 });
    p.custody.currentHolderType = "CONSUMER";
    p.custody.currentHolderName = claim?.claimantName || "Consumer";
    p.custody.since = claim?.claimedAt || p.authenticity.claimedAt;
    await p.save();
    console.log(`repaired: ${p.passportId} -> CONSUMER: ${p.custody.currentHolderName}`);
  }
  console.log(`done, ${claimed.length} repaired`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
