import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models";
import { sha256 } from "@/lib/hash";
import crypto from "crypto";

/**
 * POST /api/auth/otp/request  { phone }
 * Local build: no SMS provider — the OTP is returned in the response and
 * shown on screen, clearly labelled as dev mode (SRS D-05 swapped out).
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  const { phone } = await req.json().catch(() => ({}));
  if (!phone || !/^\+?\d{10,13}$/.test(String(phone).replace(/\s/g, ""))) {
    return NextResponse.json({ title: "Enter a valid phone number", status: 400 }, { status: 400 });
  }
  const normalized = String(phone).replace(/[\s+]/g, "").slice(-10);
  const user = await User.findOne({ phone: normalized });
  if (!user) {
    return NextResponse.json(
      { title: "No account found for this number", detail: "Ask your cooperative to register you, or use a seeded demo number.", status: 404 },
      { status: 404 }
    );
  }
  const otp = String(crypto.randomInt(100000, 999999));
  user.auth = user.auth || {};
  user.auth.otpHash = sha256(otp + normalized);
  user.auth.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.auth.otpAttempts = 0;
  await user.save();

  const devMode = process.env.DEV_OTP_MODE === "true";
  return NextResponse.json({
    sent: true,
    ...(devMode ? { devOtp: otp, devNote: "DEV MODE — OTP shown because no SMS provider is configured" } : {}),
  });
}
