import PortalShell from "@/components/PortalShell";
import { COOP_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import AssistedRegistrationForm from "./AssistedRegistrationForm";

export const dynamic = "force-dynamic";

export default async function NewWeaverPage() {
  const session = await getSession();
  return (
    <PortalShell title="Cooperative Console" nav={COOP_NAV} userName={session?.name}>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-maroon-900">Assisted registration</h1>
        <p className="mt-1 mb-6 text-sm text-stone-600">
          Register a weaver on their behalf, in their presence. After this, a verifier must physically attest the weaver
          and their loom before any passport can be issued — that visit is the trust root of the whole system.
        </p>
        <AssistedRegistrationForm />
      </div>
    </PortalShell>
  );
}
