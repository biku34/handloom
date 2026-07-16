import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { dbConnect } from "@/lib/db";
import { Weaver, Product, Scan, LedgerEntry } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let stats = { weavers: 0, passports: 0, scans: 0, ledger: 0 };
  try {
    await dbConnect();
    const [weavers, passports, scans, ledger] = await Promise.all([
      Weaver.countDocuments({ "verification.status": "VERIFIED" }),
      Product.countDocuments({ status: { $in: ["MINTED", "FLAGGED"] } }),
      Scan.countDocuments(),
      LedgerEntry.countDocuments(),
    ]);
    stats = { weavers, passports, scans, ledger };
  } catch {
    /* DB down — render marketing shell anyway (P6: degrade gracefully) */
  }

  return (
    <div>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="bg-maroon-900 text-silk-100">
          <div className="mx-auto max-w-5xl px-4 pt-14 pb-16 text-center">
            <p className="text-silk-300 text-sm font-semibold tracking-[0.25em] uppercase">Digital Product Passports for Indian Handloom</p>
            <h1 className="font-display mt-4 text-4xl sm:text-5xl font-bold leading-tight">
              A 120-hour Kanjivaram should never<br className="hidden sm:block" /> lose to a 40-minute imitation.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-silk-100/80">
              Every genuine piece carries a tag. Scan it and meet the person who wove it — their face, their voice,
              their village, and a tamper-evident record of every step from yarn to shelf.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/verify" className="btn bg-silk-200 text-maroon-900 hover:bg-silk-300 text-base px-6 py-3">Verify a tag</Link>
              <Link href="/explore" className="btn border border-silk-200/40 text-silk-100 hover:bg-white/10 text-base px-6 py-3">Meet the weavers</Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-5xl px-4 -mt-8">
          <div className="card grid grid-cols-2 sm:grid-cols-4 divide-x divide-silk-200 text-center py-5">
            {[
              [stats.weavers, "Verified weavers"],
              [stats.passports, "Passports issued"],
              [stats.scans, "Consumer scans"],
              [stats.ledger, "Ledger records"],
            ].map(([n, label]) => (
              <div key={String(label)} className="px-2">
                <div className="font-display text-3xl font-bold text-maroon-700">{Number(n).toLocaleString()}</div>
                <div className="mt-1 text-xs text-silk-700 font-semibold uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-silk-700">From loom to your hands</p>
          <h2 className="font-display mt-2 text-2xl sm:text-3xl font-bold text-center text-maroon-900">How SUTRA works</h2>
          <div className="mx-auto mt-5 flex items-center justify-center gap-3" aria-hidden="true">
            <span className="h-px w-16 bg-silk-300" />
            <svg width="54" height="10" viewBox="0 0 54 10" className="text-maroon-600">
              <path d="M5 1 L9 5 L5 9 L1 5 Z" fill="currentColor" opacity="0.35" />
              <path d="M27 1 L31 5 L27 9 L23 5 Z" fill="currentColor" />
              <path d="M49 1 L53 5 L49 9 L45 5 Z" fill="currentColor" opacity="0.35" />
            </svg>
            <span className="h-px w-16 bg-silk-300" />
          </div>

          <div className="mt-10 grid sm:grid-cols-3 sm:divide-x divide-silk-200 border-y border-silk-200">
            {[
              ["01", "The weaver registers", "One photograph of the piece on the loom, one voice note, four taps. The cooperative verifies the weaver in person — a human attestation, made tamper-evident."],
              ["02", "A passport is issued", "The item receives a QR tag bound to an append-only integrity ledger. Once dispatched, the record is sealed forever — exactly when the incentive to falsify appears."],
              ["03", "You scan, and you know", "No app, no login. In two seconds: a green tick, the weaver's face, and their voice telling you about the piece in your hands."],
            ].map(([n, title, body]) => (
              <div key={n} className="relative px-6 py-10 sm:px-8">
                <span className="font-display text-5xl italic text-silk-300 select-none">{n}</span>
                <h3 className="font-display mt-4 text-lg font-bold text-maroon-800">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Owner lookup entry point */}
        <section className="mx-auto max-w-5xl px-4 pb-4">
          <div className="card overflow-hidden sm:flex items-center justify-between gap-6 p-6 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Already own a SUTRA piece?</p>
              <h2 className="font-display mt-1.5 text-2xl font-bold text-maroon-900">See everything you&apos;ve bought</h2>
              <p className="mt-2 text-sm text-stone-600 max-w-md">
                Enter the phone number you claimed with — no account, no login — and revisit every piece and its story.
              </p>
            </div>
            <Link href="/purchases" className="btn-primary mt-4 sm:mt-0 shrink-0 text-base px-6 py-3">
              Find my purchases →
            </Link>
          </div>
        </section>

        {/* Honest positioning (P4) */}
        <section className="bg-silk-100 border-y border-silk-200">
          <div className="mx-auto max-w-3xl px-4 py-10 text-center">
            <h2 className="font-display text-xl font-bold text-maroon-900">What we promise — honestly</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Technology proves that a claim was made and never altered afterwards. It cannot prove the claim was true —
              that guarantee comes from the <strong>human verifier</strong>: the cooperative officer or Weavers&apos; Service Centre
              official who physically stood at the loom. SUTRA makes that human attestation portable, permanent, and impossible to quietly rewrite.
            </p>
          </div>
        </section>
      </main>
      <footer className="bg-maroon-900 text-silk-100/70 text-center text-xs py-6">
        SUTRA · Handloom Provenance & Weaver Stories · Local pilot build
      </footer>
    </div>
  );
}
