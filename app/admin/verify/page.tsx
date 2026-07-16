import PortalShell from "@/components/PortalShell";
import { ADMIN_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver } from "@/lib/models";
import AttestPanel from "./AttestPanel";

export const dynamic = "force-dynamic";

/** The verification queue — the trust root of the system (FR-A3). */
export default async function VerifyQueuePage() {
  const session = await getSession();
  await dbConnect();
  const pending = await Weaver.find({ "verification.status": "PENDING" }).sort({ createdAt: 1 }).lean<Record<string, any>[]>();
  const verified = await Weaver.find({ "verification.status": "VERIFIED" }).sort({ "verification.verifiedAt": -1 }).limit(20).lean<Record<string, any>[]>();

  const toPanel = (w: Record<string, any>) => ({
    _id: String(w._id),
    weaverId: w.weaverId,
    name: w.profile?.displayName || w.personal?.fullName,
    village: [w.personal?.address?.village, w.personal?.address?.district].filter(Boolean).join(", "),
    craft: w.profile?.crafts?.[0]?.name,
    loom: w.profile?.looms?.[0]?.type || "",
    status: w.verification?.status,
  });

  return (
    <PortalShell title={session?.role === "VERIFIER" ? "Verifier" : "Platform Admin"} nav={session?.role === "VERIFIER" ? [{ href: "/admin/verify", label: "✅ Verification queue" }] : ADMIN_NAV} userName={session?.name}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">The trust root</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">Verification queue</h1>
      <p className="mt-1.5 text-sm text-stone-600 max-w-2xl">
        This attestation is the trust root of SUTRA. Attest only after physically visiting the weaver: see the loom,
        confirm it is human-powered, and check the ID document. Everything the consumer trusts flows from this moment.
      </p>

      <h2 className="mt-6 font-bold text-maroon-900">Awaiting physical verification ({pending.length})</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {pending.map((w) => (
          <AttestPanel key={String(w._id)} weaver={toPanel(w)} />
        ))}
        {pending.length === 0 && <p className="text-sm text-stone-500">The queue is clear.</p>}
      </div>

      <h2 className="mt-10 font-bold text-maroon-900">Recently verified</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {verified.map((w) => (
          <AttestPanel key={String(w._id)} weaver={toPanel(w)} />
        ))}
      </div>
    </PortalShell>
  );
}
