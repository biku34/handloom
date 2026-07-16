import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { dbConnect } from "./db";
import { User } from "./models";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");
const COOKIE = "sutra_session";

export type Session = {
  userId: string;
  role: "WEAVER" | "COOP_OFFICER" | "VERIFIER" | "RETAILER" | "ADMIN" | "CONSUMER";
  name?: string;
  phone: string;
  orgId?: string;
  weaverId?: string;
};

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** For API routes: returns session or a 401/403 response. */
export async function requireRole(...roles: Session["role"][]): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ title: "Not authenticated", status: 401 }, { status: 401 });
  }
  if (roles.length && !roles.includes(session.role) && session.role !== "ADMIN") {
    return NextResponse.json({ title: "Forbidden for role " + session.role, status: 403 }, { status: 403 });
  }
  return session;
}

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  await dbConnect();
  return User.findById(session.userId).lean();
}
