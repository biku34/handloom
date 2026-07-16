import { NextRequest, NextResponse } from "next/server";
import { buildPassportView } from "@/lib/passport";

/** GET /api/v1/badge/[id] — embeddable SVG verification badge (FR-G5). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const clean = id.replace(/\.svg$/i, "");
  const view = await buildPassportView(clean);
  const status = view?.verdict.status ?? "UNKNOWN";

  const palette: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
    GENUINE: { bg: "#0d7a3f", fg: "#ffffff", label: "Genuine Handloom", icon: "✓" },
    PENDING: { bg: "#8a6d1a", fg: "#ffffff", label: "Verification Pending", icon: "…" },
    FLAGGED: { bg: "#a33e12", fg: "#ffffff", label: "Under Review", icon: "!" },
    VOIDED: { bg: "#7a1d1d", fg: "#ffffff", label: "Record Voided", icon: "✕" },
    UNKNOWN: { bg: "#555555", fg: "#ffffff", label: "No Record Found", icon: "?" },
  };
  const p = palette[status];
  const weaver = view?.weaver?.displayName ? ` · ${view.weaver.displayName}` : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="48" role="img" aria-label="SUTRA: ${p.label}">
  <rect width="260" height="48" rx="8" fill="${p.bg}"/>
  <circle cx="24" cy="24" r="12" fill="${p.fg}" opacity="0.18"/>
  <text x="24" y="29" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${p.fg}">${p.icon}</text>
  <text x="46" y="21" font-family="system-ui,sans-serif" font-size="12.5" font-weight="700" fill="${p.fg}">${p.label}</text>
  <text x="46" y="37" font-family="system-ui,sans-serif" font-size="10" fill="${p.fg}" opacity="0.85">SUTRA verified${weaver}</text>
</svg>`;
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, s-maxage=3600" },
  });
}
