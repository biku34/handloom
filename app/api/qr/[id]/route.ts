import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/** GET /api/qr/[id] — QR PNG for a passport's public verify URL (Level H per SRS §5.4). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const url = `${base}/p/${id}`;
  const png = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    width: 480,
    margin: 2,
    color: { dark: "#40101a", light: "#ffffff" },
  });
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
