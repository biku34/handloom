import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveMedia } from "@/lib/storage";
import { NextResponse as NR } from "next/server";

/** POST /api/media/upload — multipart form: file, kind, purpose */
export async function POST(req: NextRequest) {
  const session = await requireRole("WEAVER", "COOP_OFFICER", "VERIFIER", "RETAILER", "ADMIN");
  if (session instanceof NR) return session;
  await dbConnect();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ title: "file field is required (multipart/form-data)", status: 400 }, { status: 400 });
  }
  const kindRaw = String(form.get("kind") || "");
  const kind = (["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"].includes(kindRaw) ? kindRaw : file.type.startsWith("audio") ? "AUDIO" : file.type.startsWith("video") ? "VIDEO" : "IMAGE") as
    | "IMAGE"
    | "VIDEO"
    | "AUDIO"
    | "DOCUMENT";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await saveMedia({
      buffer,
      mime: file.type,
      originalName: file.name,
      kind,
      purpose: String(form.get("purpose") || ""),
      createdBy: session.userId,
    });
    return NextResponse.json({ assetId: String(asset._id), url: `/api/media/${asset._id}`, sha256: asset.file.sha256, bytes: asset.file.bytes }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ title: (e as Error).message, status: 400 }, { status: 400 });
  }
}
