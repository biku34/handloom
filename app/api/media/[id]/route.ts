import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { MediaAsset } from "@/lib/models";
import { readMedia } from "@/lib/storage";
import mongoose from "mongoose";

// s-maxage lets Vercel's CDN keep the file at the edge, so repeat requests
// never reach this function or MongoDB. Content is immutable per asset id.
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

/** GET /api/media/[id] — serves the stored file (public; media on passports is public content). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return new NextResponse("Not found", { status: 404 });
  await dbConnect();
  const asset = await MediaAsset.findById(id).lean<{ file?: { gridfsId?: unknown; path?: string; mime: string } } | null>();
  if (!asset?.file || (!asset.file.gridfsId && !asset.file.path)) return new NextResponse("Not found", { status: 404 });

  let buf: Buffer;
  try {
    buf = await readMedia(asset.file);
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": asset.file.mime,
    "Cache-Control": CACHE,
    "Accept-Ranges": "bytes",
  };

  // Byte ranges — iOS Safari refuses to play <audio>/<video> without them.
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const size = buf.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (Number.isNaN(start) || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new NextResponse(new Uint8Array(buf.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new NextResponse(new Uint8Array(buf), { headers: { ...headers, "Content-Length": String(buf.length) } });
}
