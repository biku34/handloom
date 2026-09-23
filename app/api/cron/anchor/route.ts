import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { LedgerEntry } from "@/lib/models";
import { anchorLedgerEntry } from "@/lib/ledger";
import { isChainEnabled } from "@/lib/chain";

// Each anchor waits for a block (~2–5 s on Amoy), so give the function room
// and stop well before the limit; call again (or let the cron) for the rest.
export const maxDuration = 60;
const TIME_BUDGET_MS = 40_000;

/**
 * POST/GET /api/cron/anchor — reconciler. Anchors any ledger entries that are
 * still PENDING or FAILED (e.g. the server restarted mid-anchor, or the RPC was
 * briefly down). Safe to call repeatedly. Protect with CRON_SECRET in prod —
 * accepted as ?secret=, x-cron-secret, or Vercel Cron's `Authorization: Bearer`.
 */
async function run(req: NextRequest) {
  if (!isChainEnabled()) {
    return NextResponse.json({ ok: false, reason: "chain disabled — set CHAIN_ENABLED + ALCHEMY_API_KEY + CHAIN_PRIVATE_KEY" });
  }
  const secret = process.env.CRON_SECRET?.trim();
  if (
    secret &&
    req.nextUrl.searchParams.get("secret") !== secret &&
    req.headers.get("x-cron-secret") !== secret &&
    req.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return NextResponse.json({ title: "Forbidden", status: 403 }, { status: 403 });
  }
  await dbConnect();
  const filter = { "chain.status": { $in: ["PENDING", "FAILED"] }, "chain.attempts": { $lt: 6 } };
  const pending = await LedgerEntry.find(filter).sort({ seq: 1 }).limit(25).lean<{ _id: unknown; entryHash: string }[]>();

  const started = Date.now();
  let processed = 0;
  for (const e of pending) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    await anchorLedgerEntry(String(e._id), e.entryHash);
    processed++;
  }
  const remaining = await LedgerEntry.countDocuments(filter);
  return NextResponse.json({ ok: true, processed, remaining });
}

export const GET = run;
export const POST = run;
