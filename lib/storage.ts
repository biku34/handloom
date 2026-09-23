import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { sha256 } from "./hash";
import { MediaAsset } from "./models";
import { dbConnect } from "./db";

/* Media lives in MongoDB GridFS (bucket "media") so it works on serverless
   hosts like Vercel, whose filesystem is read-only and not shared between
   instances. Assets saved by older builds point at a file under uploads/;
   those are still read from disk when present (local dev). */

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const BUCKET = "media";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "audio/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "video/webm": ".webm",
  "video/mp4": ".mp4",
  "application/pdf": ".pdf",
};

const ALLOWED_MIMES = new Set(Object.keys(EXT_BY_MIME));

async function bucket() {
  const conn = await dbConnect();
  return new mongoose.mongo.GridFSBucket(conn.connection.db!, { bucketName: BUCKET });
}

/** Write a buffer into GridFS and return the new file's id. */
export async function putGridFile(buffer: Buffer, filename: string, contentType: string): Promise<mongoose.Types.ObjectId> {
  const b = await bucket();
  return new Promise((resolve, reject) => {
    const up = b.openUploadStream(filename, { metadata: { contentType } });
    up.once("error", reject);
    up.once("finish", () => resolve(up.id as mongoose.Types.ObjectId));
    up.end(buffer);
  });
}

async function getGridFile(id: mongoose.Types.ObjectId | string): Promise<Buffer> {
  const b = await bucket();
  const chunks: Buffer[] = [];
  for await (const chunk of b.openDownloadStream(new mongoose.Types.ObjectId(String(id)))) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** Remove every stored media file (used by the seed script's wipe). */
export async function clearMediaBucket() {
  const b = await bucket();
  await b.drop().catch(() => {
    /* bucket doesn't exist yet */
  });
}

export async function saveMedia(opts: {
  buffer: Buffer;
  mime: string;
  originalName?: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  purpose?: string;
  ownerType?: string;
  ownerId?: string;
  createdBy?: string;
}) {
  if (!ALLOWED_MIMES.has(opts.mime)) throw new Error(`Unsupported media type: ${opts.mime}`);
  if (opts.buffer.length > 12 * 1024 * 1024) throw new Error("File exceeds 12 MB limit");

  const hash = sha256(opts.buffer);
  // NOTE: EXIF stripping (SRS FR-C3 AC-2) is skipped in the pilot build; in
  // production images are re-encoded server-side before storage.
  const gridfsId = await putGridFile(opts.buffer, `${hash.slice(0, 16)}${EXT_BY_MIME[opts.mime]}`, opts.mime);

  const asset = await MediaAsset.create({
    kind: opts.kind,
    purpose: opts.purpose,
    ownerType: opts.ownerType,
    ownerId: opts.ownerId,
    file: { gridfsId, mime: opts.mime, bytes: opts.buffer.length, sha256: hash, originalName: opts.originalName },
    createdBy: opts.createdBy,
  });
  return asset;
}

/** Read a stored media file: GridFS first, then the legacy uploads/ path. */
export async function readMedia(file: { gridfsId?: unknown; path?: string }): Promise<Buffer> {
  if (file.gridfsId) return getGridFile(String(file.gridfsId));
  if (file.path) return readLegacyFile(file.path);
  throw new Error("Asset has no stored file");
}

export async function readLegacyFile(relPath: string): Promise<Buffer> {
  const safe = path.normalize(relPath).replace(/^([.][.][/\\])+/, "");
  const full = path.join(UPLOAD_DIR, safe);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("Invalid path");
  return fs.readFile(full);
}

export function mediaUrl(assetId?: { toString(): string } | string | null): string | null {
  if (!assetId) return null;
  return `/api/media/${assetId.toString()}`;
}
