import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product, Scan, Weaver } from "@/lib/models";
import { sha256 } from "@/lib/hash";
import { scanId } from "@/lib/ids";

/**
 * POST /api/scan — fire-and-forget scan telemetry (FR-F2).
 * Privacy-minimised: the IP is salted-hashed, never stored raw; the anonId
 * rotates daily so devices are not trackable across days.
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const passportId = String(body.passportId || "");
  if (!passportId) return NextResponse.json({ title: "passportId required", status: 400 }, { status: 400 });

  const product = await Product.findOne({ passportId }).select("_id weaverId stats").lean<{ _id: unknown; weaverId: unknown } | null>();
  if (!product) return NextResponse.json({ scanId: null, known: false }, { status: 202 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const salt = process.env.SESSION_SECRET || "salt";
  const ua = req.headers.get("user-agent") || "";
  const day = new Date().toISOString().slice(0, 10);
  const isBot = /bot|crawler|spider|curl|wget/i.test(ua);

  const sid = scanId();
  await Scan.create({
    passportId,
    productId: product._id,
    scanId: sid,
    at: new Date(),
    source: ["QR", "NFC", "MANUAL_ENTRY", "API", "MARKETPLACE_EMBED"].includes(body.source) ? body.source : "QR",
    network: {
      ipHash: sha256(ip + salt),
      country: "IN", // no geo-IP provider in the local build
      city: body.city || undefined,
    },
    client: {
      uaFamily: ua.slice(0, 80),
      deviceClass: /mobile|android|iphone/i.test(ua) ? "MOBILE" : "DESKTOP",
      language: req.headers.get("accept-language")?.split(",")[0],
      isBot,
    },
    session: {
      anonId: sha256(ip + ua + day + salt), // rotates every 24h
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 40) : "direct",
    },
    engagement: {},
  });

  if (!isBot) {
    await Product.updateOne(
      { _id: product._id },
      { $inc: { "stats.scanCount": 1 }, $set: { "stats.lastScanAt": new Date() }, $setOnInsert: {} }
    );
    await Weaver.updateOne({ _id: product.weaverId }, { $inc: { "stats.totalScans": 1 } });
  }

  return NextResponse.json({ scanId: sid, risk: { showCaution: false } }, { status: 202 });
}
