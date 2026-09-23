import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PushSubscription } from "@/lib/models";
import { pushConfigured } from "@/lib/push";

/** GET /api/push/subscribe — feature-detect: is push configured on the server? */
export async function GET() {
  return NextResponse.json({
    enabled: pushConfigured(),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null,
  });
}

/**
 * POST /api/push/subscribe — a customer's browser opts in.
 * Upserts on the unique push endpoint, so re-subscribing is idempotent.
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  const b = await req.json().catch(() => ({}));
  const sub = b.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ title: "A valid push subscription is required", status: 400 }, { status: 400 });
  }
  const phone = b.phone ? String(b.phone).replace(/\D/g, "").slice(-10) : undefined;

  await PushSubscription.updateOne(
    { endpoint: sub.endpoint },
    {
      $set: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        ...(phone && phone.length === 10 ? { phone } : {}),
        ua: (req.headers.get("user-agent") || "").slice(0, 240),
        lastSeenAt: new Date(),
        status: "ACTIVE",
        failCount: 0,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/push/subscribe — a customer opts out (unsubscribed in-browser). */
export async function DELETE(req: NextRequest) {
  await dbConnect();
  const b = await req.json().catch(() => ({}));
  const endpoint = b.endpoint || b.subscription?.endpoint;
  if (!endpoint) return NextResponse.json({ ok: true });
  await PushSubscription.deleteOne({ endpoint });
  return NextResponse.json({ ok: true });
}
