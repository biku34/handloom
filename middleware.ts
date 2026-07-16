import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");

const AREA_ROLES: Record<string, string[]> = {
  "/w": ["WEAVER", "ADMIN"],
  "/coop": ["COOP_OFFICER", "RETAILER", "ADMIN"],
  "/admin": ["ADMIN", "VERIFIER"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const area = Object.keys(AREA_ROLES).find((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!area) return NextResponse.next();

  const token = req.cookies.get("sutra_session")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      const role = payload.role as string;
      if (AREA_ROLES[area].includes(role) || role === "ADMIN") return NextResponse.next();
      // Wrong area for this role — send them to their home.
      const home = role === "WEAVER" ? "/w/dashboard" : role === "COOP_OFFICER" || role === "RETAILER" ? "/coop/dashboard" : role === "VERIFIER" ? "/admin/verify" : "/";
      return NextResponse.redirect(new URL(home, req.url));
    } catch {
      /* fall through to login */
    }
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/w/:path*", "/coop/:path*", "/admin/:path*"],
};
