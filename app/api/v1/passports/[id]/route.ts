import { NextRequest, NextResponse } from "next/server";
import { buildPassportView } from "@/lib/passport";

/** GET /api/v1/passports/[id] — the public projection (SRS §8.2). No auth. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const view = await buildPassportView(id);
  if (!view) {
    return NextResponse.json(
      {
        passportId: id,
        verdict: {
          status: "UNKNOWN",
          message: "We have no record of this code.",
          possibleReasons: [
            "The tag may be counterfeit",
            "The code may have been mistyped",
            "The tag may be damaged",
            "The product may not be activated yet",
          ],
          actions: [
            { label: "Report this", href: `/report?code=${encodeURIComponent(id)}` },
            { label: "Re-enter the code", href: "/verify" },
          ],
        },
      },
      { status: 404 }
    );
  }
  const { _productId, ...publicView } = view;
  void _productId;
  return NextResponse.json(publicView, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" },
  });
}
