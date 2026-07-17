import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { LedgerEntry } from "@/lib/models";
import { anchorLedgerEntry } from "@/lib/ledger";
import { isChainEnabled } from "@/lib/chain";

/**
 * POST/GET /api/cron/anchor — reconciler. Anchors any ledger entries that are
 * still PENDING or FAILED (e.g. the server restarted mid-anchor, or the RPC was
 * briefly down). Safe to call repeatedly. Protect with CRON_SECRET in prod.
 */
async function run(req: NextRequest) {
  if (!isChainEnabled()) {
    return NextResponse.json({ ok: false, reason: "chain disabled — set CHAIN_ENABLED + POLYGON_RPC_URL + CHAIN_PRIVATE_KEY" });
  }
  const secret = process.env.CRON_SECRET;
  if (secret && req.nextUrl.searchParams.get("secret") !== secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ title: "Forbidden", status: 403 }, { status: 403 });
  }
  await dbConnect();
  const pending = await LedgerEntry.find({
    "chain.status": { $in: ["PENDING", "FAILED"] },
    "chain.attempts": { $lt: 6 },
  })
    .sort({ seq: 1 })
    .limit(25)
    .lean<{ _id: unknown; entryHash: string }[]>();

  let anchored = 0;
  for (const e of pending) {
    await anchorLedgerEntry(String(e._id), e.entryHash);
    anchored++;
  }
  return NextResponse.json({ ok: true, processed: anchored });
}

export const GET = run;
export const POST = run;
