import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Campaign, PushSubscription } from "@/lib/models";
import { sendToSubscriptions, pushConfigured } from "@/lib/push";
import { audit } from "@/lib/provenance";

/**
 * POST /api/coop/campaigns/send — broadcast a marketing notification to every
 * customer who opted in. One button, many phones.
 */
export async function POST(req: NextRequest) {
  const session = await requireRole("COOP_OFFICER", "ADMIN");
  if (session instanceof NextResponse) return session;
  if (!pushConfigured()) {
    return NextResponse.json({ title: "Push notifications are not configured on the server (missing VAPID keys).", status: 503 }, { status: 503 });
  }
  await dbConnect();

  const b = await req.json().catch(() => ({}));
  const title = String(b.title || "").trim().slice(0, 80);
  const body = String(b.body || "").trim().slice(0, 200);
  const url = String(b.url || "/purchases").trim().slice(0, 300) || "/purchases";
  const templateId = b.templateId ? String(b.templateId).slice(0, 60) : "custom";
  if (!title || !body) {
    return NextResponse.json({ title: "A title and message are both required", status: 400 }, { status: 400 });
  }

  // Demo audience = everyone who opted in. (Scoping to this org's customers is a
  // one-line filter change once subscriptions carry orgId reliably.)
  const subs = await PushSubscription.find({ status: "ACTIVE" })
    .select({ endpoint: 1, keys: 1 })
    .lean<{ _id: unknown; endpoint: string; keys?: { p256dh?: string; auth?: string } }[]>();

  const { delivered, failed } = subs.length
    ? await sendToSubscriptions(subs, { title, body, url, tag: `campaign-${Date.now()}` })
    : { delivered: 0, failed: 0 };

  const status = delivered === 0 && subs.length > 0 ? "FAILED" : failed > 0 ? "PARTIAL" : "SENT";

  const campaign = await Campaign.create({
    orgId: session.orgId,
    title,
    body,
    url,
    templateId,
    audience: "ALL",
    sentBy: session.userId,
    sentByName: session.name,
    stats: { targeted: subs.length, delivered, failed },
    status,
  });

  await audit({
    actorUserId: session.userId,
    actorRole: session.role,
    action: "CAMPAIGN_SENT",
    targetType: "campaign",
    targetId: String(campaign._id),
    detail: `"${title}" → ${delivered}/${subs.length} delivered`,
  });

  return NextResponse.json({
    ok: true,
    targeted: subs.length,
    delivered,
    failed,
    status,
    campaignId: String(campaign._id),
  });
}
