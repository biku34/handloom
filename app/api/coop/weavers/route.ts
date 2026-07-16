import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Weaver, User, Organization, CRAFTS } from "@/lib/models";
import { sha256, randomHex } from "@/lib/hash";
import { weaverIdFor, slugify } from "@/lib/ids";
import { audit } from "@/lib/provenance";

/** GET /api/coop/weavers — roster for the officer's org */
export async function GET(req: NextRequest) {
  const session = await requireRole("COOP_OFFICER", "VERIFIER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();
  const url = new URL(req.url);
  const filter: Record<string, unknown> = {};
  if (session.role === "COOP_OFFICER" && session.orgId) filter.orgId = session.orgId;
  if (url.searchParams.get("status")) filter["verification.status"] = url.searchParams.get("status");
  const weavers = await Weaver.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return NextResponse.json({ weavers });
}

/**
 * POST /api/coop/weavers — assisted registration (FR-A2).
 * Officer registers the weaver in their presence; verification stays PENDING
 * until a verifier physically attests (FR-A3).
 */
export async function POST(req: NextRequest) {
  const session = await requireRole("COOP_OFFICER", "ADMIN");
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const b = await req.json().catch(() => ({}));
  const fullName = String(b.fullName || "").trim();
  const phone = String(b.phone || "").replace(/[\s+]/g, "").slice(-10);
  if (!fullName || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ title: "fullName and a 10-digit phone are required", status: 400 }, { status: 400 });
  }
  if (!b.consentGiven) {
    return NextResponse.json({ title: "Recorded consent is mandatory for assisted registration (FR-A2)", status: 422 }, { status: 422 });
  }
  if (await User.exists({ phone })) {
    return NextResponse.json({ title: "This phone number is already registered", status: 409 }, { status: 409 });
  }

  const state = String(b.state || "Tamil Nadu");
  const district = String(b.district || "");
  const count = await Weaver.countDocuments();
  const weaverId = weaverIdFor(state, district, count + 1);
  let handle = slugify(`${fullName}-${b.village || district || state}`);
  while (await Weaver.exists({ handle })) handle = `${handle}-${randomHex(2)}`;

  const craft = CRAFTS.find((c) => c.code === Number(b.craftCode)) || CRAFTS[10];
  const salt = randomHex(32);

  const weaver = await Weaver.create({
    weaverId,
    handle,
    personal: {
      fullName,
      phone,
      govtIdType: b.govtIdType || "HANDLOOM_ID",
      govtIdHash: b.govtIdNumber ? sha256(String(b.govtIdNumber)) : undefined,
      govtIdLast4: b.govtIdNumber ? String(b.govtIdNumber).slice(-4) : undefined,
      address: { village: b.village, district, state, pincode: b.pincode },
    },
    profile: {
      displayName: b.displayName || fullName,
      yearsWeaving: Number(b.yearsWeaving) || undefined,
      generation: Number(b.generation) || undefined,
      cluster: { code: Number(b.clusterCode) || 0, name: b.clusterName || district, state },
      crafts: [{ code: craft.code, name: craft.name, isPrimary: true }],
      looms: b.loomType ? [{ type: b.loomType, count: Number(b.loomCount) || 1 }] : [],
      languages: [b.language || "en"],
      guruLineage: b.guruLineage,
    },
    story: {
      transcript: b.storyText ? { original: { lang: b.language || "en", text: String(b.storyText).slice(0, 3000), source: "TYPED" } } : undefined,
      highlights: [],
      consentGiven: true,
      consentAt: new Date(),
    },
    verification: { status: "PENDING", method: "IN_PERSON" },
    ledger: { weaverSalt: salt, weaverHash: sha256(weaverId + salt) },
    orgId: session.orgId,
    createdBy: session.userId,
    registrationMode: "ASSISTED",
  });

  await User.create({
    phone,
    name: fullName,
    role: "WEAVER",
    orgId: session.orgId,
    weaverId: weaver._id,
    locale: b.language || "en",
  });
  await Organization.updateOne({ _id: session.orgId }, { $inc: { weaverCount: 1 } });
  await audit({ actorUserId: session.userId, actorRole: session.role, action: "WEAVER_REGISTERED_ASSISTED", targetType: "weaver", targetId: weaverId });

  return NextResponse.json({ weaverId, handle, _id: String(weaver._id), verificationStatus: "PENDING" }, { status: 201 });
}
