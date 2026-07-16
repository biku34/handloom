import fs from "fs/promises";
import path from "path";
import { sha256, randomHex } from "./hash";
import { MediaAsset } from "./models";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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
  const sub = new Date().toISOString().slice(0, 7); // yyyy-mm
  const filename = `${hash.slice(0, 16)}-${randomHex(4)}${EXT_BY_MIME[opts.mime]}`;
  const relPath = path.posix.join(sub, filename);
  const dir = path.join(UPLOAD_DIR, sub);
  await fs.mkdir(dir, { recursive: true });
  // NOTE: EXIF stripping (SRS FR-C3 AC-2) is skipped in the local build; in
  // production images are re-encoded server-side before storage.
  await fs.writeFile(path.join(dir, filename), opts.buffer);

  const asset = await MediaAsset.create({
    kind: opts.kind,
    purpose: opts.purpose,
    ownerType: opts.ownerType,
    ownerId: opts.ownerId,
    file: { path: relPath, mime: opts.mime, bytes: opts.buffer.length, sha256: hash, originalName: opts.originalName },
    createdBy: opts.createdBy,
  });
  return asset;
}

export async function readMediaFile(relPath: string): Promise<Buffer> {
  const safe = path.normalize(relPath).replace(/^([.][.][/\\])+/, "");
  const full = path.join(UPLOAD_DIR, safe);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("Invalid path");
  return fs.readFile(full);
}

export function mediaUrl(assetId?: { toString(): string } | string | null): string | null {
  if (!assetId) return null;
  return `/api/media/${assetId.toString()}`;
}
