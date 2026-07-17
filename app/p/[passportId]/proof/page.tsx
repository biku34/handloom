import Link from "next/link";
import { buildPassportView } from "@/lib/passport";
import { dbConnect } from "@/lib/db";
import { LedgerEntry } from "@/lib/models";
import { verifyLedgerChain } from "@/lib/ledger";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

/**
 * The proof page ("nerd mode", FR-F4) — for the 1% who want to check the maths.
 * Shows the integrity-ledger entries for this passport and live-verifies the
 * whole hash chain on every load.
 */
export default async function ProofPage({ params }: { params: Promise<{ passportId: string }> }) {
  const { passportId } = await params;
  const view = await buildPassportView(passportId).catch(() => null);
  if (!view) {
    return (
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-10 text-center">
          <p>No record of this code.</p>
          <Link className="btn-primary mt-4" href="/verify">Verify a tag</Link>
        </main>
      </div>
    );
  }

  await dbConnect();
  const entries = await LedgerEntry.find({
    $or: [{ entityId: passportId }, { entityId: new RegExp(`^${passportId}#`) }],
  })
    .sort({ seq: 1 })
    .lean<{ seq: number; type: string; dataHash: string; prevHash: string; entryHash: string; at: Date; summary: string; chain?: { status?: string; network?: string; txHash?: string; blockNumber?: number } }[]>();
  const proof = view.proof as typeof view.proof & { chainEnabled?: boolean; chainNetwork?: string | null };
  const chain = await verifyLedgerChain();

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <Link href={`/p/${passportId}`} className="text-sm text-maroon-700 font-semibold">← Back to passport</Link>
      <h1 className="font-display mt-3 text-2xl font-bold text-maroon-900">Verify it yourself</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Every meaningful claim about this item is committed to an <strong>append-only, hash-chained integrity ledger</strong>.
        Each entry contains the SHA-256 hash of the previous entry, so editing any historical record breaks every hash that follows it.
        {proof.chainEnabled
          ? ` Each entry is also written to ${proof.chainNetwork}, a public blockchain — so you can verify it without trusting our servers at all.`
          : " In the full deployment each entry is also written to a public blockchain (Polygon)."}
      </p>

      <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${chain.intact ? "bg-leaf-600/10 text-leaf-700 border border-leaf-600/30" : "bg-red-100 text-red-800 border border-red-300"}`}>
        {chain.intact
          ? `✓ Full chain verified just now — ${chain.checked} entries recomputed, all hashes consistent.`
          : `✕ CHAIN BROKEN at entry #${chain.brokenAtSeq} — the ledger has been tampered with.`}
      </div>

      {proof.chainEnabled && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-maroon-900 text-silk-100 px-4 py-3 text-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-silk-200 text-maroon-900 text-xs">⛓</span>
          Anchored on <strong>{proof.chainNetwork}</strong> — each record below links to its public transaction.
        </div>
      )}

      <div className="card mt-5 divide-y divide-silk-200">
        <div className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-silk-700">Record summary</div>
        {[
          ["Passport ID", passportId],
          ["Issue entry", view.proof.entrySeq != null ? `#${view.proof.entrySeq}` : "pending"],
          ["Record hash", view.proof.recordHash || "—"],
          ["Media hash", view.proof.mediaHash || "—"],
          ["Material hash", view.proof.materialHash || "—"],
          ["Sealed", view.proof.sealed ? `Yes — ${new Date(view.proof.sealedAt!).toLocaleString("en-IN")}` : "Not yet (seals at dispatch)"],
        ].map(([k, v]) => (
          <div key={String(k)} className="px-5 py-3 grid grid-cols-[110px_1fr] gap-3 text-sm">
            <span className="text-stone-500">{k}</span>
            <span className="font-mono text-xs break-all self-center">{String(v)}</span>
          </div>
        ))}
      </div>

      <h2 className="font-display mt-8 text-lg font-bold text-maroon-900">Ledger entries for this passport</h2>
      <div className="mt-3 space-y-3">
        {entries.map((e) => (
          <div key={e.seq} className="card p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs text-stone-400">#{e.seq}</span>
              <span className="text-xs text-stone-500">{new Date(e.at).toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 font-bold text-sm text-maroon-800">{e.type.replace(/_/g, " ")}</div>
            <div className="text-sm text-stone-600">{e.summary}</div>
            <dl className="mt-2 text-[11px] font-mono text-stone-400 space-y-0.5 break-all">
              <div><dt className="inline text-stone-500">data: </dt><dd className="inline">{e.dataHash}</dd></div>
              <div><dt className="inline text-stone-500">prev: </dt><dd className="inline">{e.prevHash}</dd></div>
              <div><dt className="inline text-stone-500">entry: </dt><dd className="inline">{e.entryHash}</dd></div>
            </dl>
            {e.chain?.status === "CONFIRMED" && e.chain.txHash ? (
              <a href={`${e.chain.network === "Polygon" ? "https://polygonscan.com" : "https://amoy.polygonscan.com"}/tx/${e.chain.txHash}`} target="_blank" rel="noopener noreferrer"
                 className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-leaf-700 hover:underline">
                ⛓ {e.chain.network} · block {e.chain.blockNumber?.toLocaleString()} · view tx ↗
              </a>
            ) : e.chain?.status === "PENDING" ? (
              <p className="mt-2 text-[11px] text-amber-700">⛓ writing to chain…</p>
            ) : null}
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-stone-500">No ledger entries yet — the passport has not been issued.</p>}
      </div>

      <div className="card mt-6 p-4 bg-stone-900 text-stone-200 border-0">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Check an entry without trusting this page</p>
        <pre className="mt-2 text-[11px] leading-relaxed overflow-x-auto">{`# entryHash = SHA256(seq|type|dataHash|prevHash|atISO)
node -e "const c=require('crypto');
console.log(c.createHash('sha256')
 .update('<seq>|<type>|<dataHash>|<prevHash>|<atISO>')
 .digest('hex'))"`}</pre>
      </div>
      </main>
    </div>
  );
}
