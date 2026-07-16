import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models";
import { sha256 } from "@/lib/hash";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await dbConnect();
  const { phone, otp } = await req.json().catch(() => ({}));
  const normalized = String(phone || "").replace(/[\s+]/g, "").slice(-10);
  const user = await User.findOne({ phone: normalized });
  if (!user?.auth?.otpHash || !user.auth.otpExpiresAt) {
    return NextResponse.json({ title: "Request an OTP first", status: 400 }, { status: 400 });
  }
  if (new Date(user.auth.otpExpiresAt) < new Date()) {
    return NextResponse.json({ title: "OTP expired — request a new one", status: 400 }, { status: 400 });
  }
  if (user.auth.otpAttempts >= 5) {
    return NextResponse.json({ title: "Too many attempts — request a new OTP", status: 429 }, { status: 429 });
  }
  if (sha256(String(otp) + normalized) !== user.auth.otpHash) {
    user.auth.otpAttempts += 1;
    await user.save();
    return NextResponse.json({ title: "Incorrect OTP", status: 401 }, { status: 401 });
  }
  user.auth.otpHash = undefined;
  user.auth.lastLoginAt = new Date();
  await user.save();

  const token = await createSessionToken({
    userId: String(user._id),
    role: user.role,
    name: user.name,
    phone: user.phone,
    orgId: user.orgId ? String(user.orgId) : undefined,
    weaverId: user.weaverId ? String(user.weaverId) : undefined,
  });
  const home =
    user.role === "WEAVER" ? "/w/dashboard"
    : user.role === "COOP_OFFICER" || user.role === "RETAILER" ? "/coop/dashboard"
    : user.role === "VERIFIER" ? "/admin/verify"
    : user.role === "ADMIN" ? "/admin/dashboard"
    : "/";
  const res = NextResponse.json({ ok: true, role: user.role, home });
  await setSessionCookie(res, token);
  return res;
}
