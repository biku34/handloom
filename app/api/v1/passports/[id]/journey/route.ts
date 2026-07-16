import { NextRequest, NextResponse } from "next/server";
import { buildPassportView } from "@/lib/passport";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const view = await buildPassportView(id);
  if (!view) return NextResponse.json({ title: "Unknown passport", status: 404 }, { status: 404 });
  return NextResponse.json({ passportId: id, journey: view.journey });
}
