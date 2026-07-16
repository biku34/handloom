import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { MediaAsset } from "@/lib/models";
import { readMediaFile } from "@/lib/storage";
import mongoose from "mongoose";

/** GET /api/media/[id] — serves the stored file (public; media on passports is public content). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return new NextResponse("Not found", { status: 404 });
  await dbConnect();
  const asset = await MediaAsset.findById(id).lean<{ file?: { path: string; mime: string } } | null>();
  if (!asset?.file?.path) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readMediaFile(asset.file.path);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": asset.file.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
