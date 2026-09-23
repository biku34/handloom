/**
 * One-off: copy media stored on local disk (uploads/) into MongoDB GridFS so
 * it is served on Vercel too. Safe to re-run — assets already in GridFS are
 * skipped, and the disk files are left untouched.
 * Run: npx tsx scripts/migrate-media-to-gridfs.ts
 */
import fs from "fs";
import path from "path";

// Load .env.local before importing anything that reads process.env
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

import mongoose from "mongoose";
import { dbConnect } from "../lib/db";
import { MediaAsset } from "../lib/models";
import { sha256 } from "../lib/hash";
import { putGridFile, readLegacyFile } from "../lib/storage";

async function main() {
  await dbConnect();
  const pending = await MediaAsset.find({ "file.path": { $exists: true, $ne: null }, "file.gridfsId": { $exists: false } }).lean<
    { _id: mongoose.Types.ObjectId; file: { path: string; mime: string; sha256?: string } }[]
  >();
  console.log(`${pending.length} asset(s) to migrate`);

  let moved = 0, missing = 0, mismatched = 0;
  for (const a of pending) {
    let buf: Buffer;
    try {
      buf = await readLegacyFile(a.file.path);
    } catch {
      console.warn(`  missing on disk: ${a._id} (${a.file.path})`);
      missing++;
      continue;
    }
    if (a.file.sha256 && sha256(buf) !== a.file.sha256) {
      console.warn(`  hash mismatch, skipped: ${a._id} (${a.file.path})`);
      mismatched++;
      continue;
    }
    const gridfsId = await putGridFile(buf, path.basename(a.file.path), a.file.mime);
    await MediaAsset.updateOne({ _id: a._id }, { $set: { "file.gridfsId": gridfsId } });
    moved++;
  }
  console.log(`done: ${moved} migrated, ${missing} missing on disk, ${mismatched} hash mismatches`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
