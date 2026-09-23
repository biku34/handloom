import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");

/* Access rules, most-specific prefix first. A request is allowed only if the
   session role is in the matched rule's list (ADMIN is allowed everywhere).
   Ordering matters: /admin/verify must be checked before /admin so a VERIFIER
   can reach the verify desk but NOT the admin dashboard or fraud console. */
const RULES: [string, string[]][] = [
  ["/admin/verify", ["VERIFIER", "ADMIN"]],
  ["/admin", ["ADMIN"]],
  ["/coop/campaigns", ["COOP_OFFICER", "ADMIN"]],
  ["/coop/weavers", ["COOP_OFFICER", "ADMIN"]],
  ["/coop", ["COOP_OFFICER", "RETAILER", "ADMIN"]],
  ["/w", ["WEAVER", "ADMIN"]],
];

function homeFor(role?: string): string {
  switch (role) {
    case "WEAVER":
      return "/w/dashboard";
    case "COOP_OFFICER":
    case "RETAILER":
      return "/coop/dashboard";
    case "VERIFIER":
      return "/admin/verify";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/";
  }
}

function matchRule(pathname: string): [string, string[]] | undefined {
  return RULES.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("sutra_session")?.value;
  let role: string | undefined;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      role = payload.role as string;
    } catch {
      role = undefined; // bad/expired token → treat as logged out
    }
  }

  // A signed-in user hitting /login is bounced to their home.
  if (pathname === "/login") {
    if (role) return NextResponse.redirect(new URL(homeFor(role), req.url));
    return NextResponse.next();
  }

  const rule = matchRule(pathname);
  if (!rule) return NextResponse.next();

  // Not signed in → login, remembering where they were headed.
  if (!role) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    const res = NextResponse.redirect(login);
    // If the token was present but invalid, clear it so we don't loop.
    if (token) res.cookies.set("sutra_session", "", { path: "/", maxAge: 0 });
    return res;
  }

  // Signed in but wrong role for this area → send to their own home.
  const allowed = rule[1].includes(role) || role === "ADMIN";
  if (!allowed) return NextResponse.redirect(new URL(homeFor(role), req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/w/:path*", "/coop/:path*", "/admin/:path*"],
};
