/**
 * Client-side photo compression before upload.
 *
 * Vercel rejects request bodies over 4.5 MB, and phone camera photos are
 * routinely 3–12 MB. We downscale to at most MAX_EDGE px on the long side and
 * re-encode as JPEG, stepping quality/size down until the file fits.
 * Re-encoding through a canvas also drops EXIF metadata (incl. GPS location)
 * — SRS FR-C3 AC-2.
 */

const MAX_EDGE = 2048;
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024; // headroom under Vercel's 4.5 MB

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // "from-image" applies the EXIF rotation so portrait shots stay upright.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img> decoding (older Safari, some formats) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Returns a JPEG File small enough to upload. Throws if the photo can't be
 * decoded and is too large to send as-is.
 */
export async function compressImage(file: File): Promise<File> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    if (file.size <= MAX_UPLOAD_BYTES) return file; // can't decode (e.g. HEIC on desktop) but small enough
    throw new Error("This photo format can't be processed here — please choose a JPEG or PNG photo.");
  }

  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
  const baseName = (file.name.replace(/\.[^.]+$/, "") || "photo") + ".jpg";

  let edge = MAX_EDGE;
  let quality = 0.85;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, edge / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // JPEG has no alpha — flatten transparent PNGs onto white
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, w, h);

    const blob = await toJpeg(canvas, quality);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      if ("close" in source) source.close();
      return new File([blob], baseName, { type: "image/jpeg", lastModified: Date.now() });
    }
    // Too big: lower quality first, then shrink dimensions.
    if (quality > 0.6) quality -= 0.1;
    else edge = Math.round(edge * 0.8);
  }

  if ("close" in source) source.close();
  throw new Error("Couldn't make this photo small enough to upload — please try a different photo.");
}
