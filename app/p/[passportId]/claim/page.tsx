import Link from "next/link";
import { buildPassportView } from "@/lib/passport";
import ClaimForm from "./ClaimForm";

export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: Promise<{ passportId: string }> }) {
  const { passportId } = await params;
  const view = await buildPassportView(passportId).catch(() => null);
  if (!view) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center">
        <p>No record of this code.</p>
        <Link className="btn-primary mt-4" href="/verify">Verify a tag</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <Link href={`/p/${passportId}`} className="text-sm text-maroon-700 font-semibold">← Back to passport</Link>
      <h1 className="font-display mt-3 text-2xl font-bold text-maroon-900">Claim this piece</h1>
      <p className="mt-1 text-sm text-stone-600">{view.product.name}</p>

      {view.ownership.claimed ? (
        <div className="card mt-5 p-5">
          <p className="text-sm text-stone-700">
            This piece was claimed on <strong>{new Date(view.ownership.claimedAt!).toLocaleDateString("en-IN")}</strong>.
          </p>
          <p className="mt-3 text-sm text-stone-600">
            Just bought it and seeing this? The tag may have been duplicated — that matters to us.
          </p>
          <Link href={`/report?code=${encodeURIComponent(passportId)}`} className="btn-primary mt-4 w-full">Report a problem</Link>
        </div>
      ) : (
        <div className="mt-5">
          <ClaimForm passportId={passportId} />
          <p className="mt-4 text-xs text-stone-400">
            Claiming records you as the owner, notifies the weaver their work found its home, and permanently locks this tag —
            any future claim on it will trigger a counterfeit alert.
          </p>
        </div>
      )}
    </main>
  );
}
