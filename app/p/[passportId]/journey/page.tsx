import Link from "next/link";
import { buildPassportView } from "@/lib/passport";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

const EVENT_META: Record<string, { icon: string; label: string }> = {
  YARN_SOURCED: { icon: "🧶", label: "Yarn sourced" },
  DYED: { icon: "🎨", label: "Dyed" },
  WARPED: { icon: "📏", label: "Warp prepared" },
  WEAVING_STARTED: { icon: "🪡", label: "Weaving started" },
  WEAVING_COMPLETED: { icon: "🧵", label: "Weaving completed" },
  FINISHED: { icon: "✨", label: "Finishing done" },
  QC_PASSED: { icon: "🔍", label: "Quality checked" },
  CERTIFIED: { icon: "📜", label: "Certified" },
  DISPATCHED: { icon: "📦", label: "Dispatched" },
  RECEIVED: { icon: "🏬", label: "Received" },
  RETAIL_LISTED: { icon: "🏷️", label: "Listed at retail" },
  SOLD: { icon: "🤝", label: "Sold" },
  OWNERSHIP_CLAIMED: { icon: "💚", label: "Ownership claimed" },
  RESOLD: { icon: "🔄", label: "Passed to a new owner" },
  REPAIRED: { icon: "🪛", label: "Repaired" },
  DISPUTED: { icon: "⚠️", label: "Disputed" },
};

export default async function JourneyPage({ params }: { params: Promise<{ passportId: string }> }) {
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

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
        <Link href={`/p/${passportId}`} className="text-sm text-maroon-700 font-semibold">← Back to passport</Link>
        <h1 className="font-display mt-3 text-2xl sm:text-3xl font-bold text-maroon-900">The journey</h1>
        <p className="mt-1 text-sm text-stone-600">{view.product.name}</p>

      <ol className="mt-6 relative border-l-2 border-silk-300 pl-6 space-y-7">
        {view.journey.steps.map((step: { eventType: string; occurredAt: string | Date; recordedAt?: string | Date; actor?: string; actorType?: string; note?: string; location?: string; ledgerSeq?: number | null }, i: number) => {
          const meta = EVENT_META[step.eventType] ?? { icon: "•", label: step.eventType };
          const occurred = new Date(step.occurredAt);
          const recorded = step.recordedAt ? new Date(step.recordedAt) : null;
          const gapHours = recorded ? (recorded.getTime() - occurred.getTime()) / 3600000 : 0;
          return (
            <li key={i} className="relative">
              <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-maroon-600 text-xs">
                {meta.icon}
              </span>
              <div className="card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-bold text-maroon-900">{meta.label}</h2>
                  <time className="text-xs text-stone-500 whitespace-nowrap">
                    {occurred.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </time>
                </div>
                {(step.actor || step.location) && (
                  <p className="mt-1 text-xs text-stone-500">
                    {[step.actor, step.location].filter(Boolean).join(" · ")}
                  </p>
                )}
                {step.note && <p className="mt-2 text-sm text-stone-700">{step.note}</p>}
                {gapHours > 24 && (
                  <p className="mt-2 text-xs text-stone-400 italic">
                    Recorded {Math.round(gapHours / 24)} day(s) after it happened — weaving villages often have limited network. Both times are shown for honesty.
                  </p>
                )}
                {step.ledgerSeq != null && (
                  <p className="mt-2 text-[11px] text-stone-400 font-mono">ledger entry #{step.ledgerSeq}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {view.journey.steps.length === 0 && <p className="mt-6 text-sm text-stone-500">No journey events recorded yet.</p>}
      </main>
    </div>
  );
}
