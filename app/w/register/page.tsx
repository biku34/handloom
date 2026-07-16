import PortalShell from "@/components/PortalShell";
import RegisterFlow from "./RegisterFlow";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Weaver } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  await dbConnect();
  const weaver = session?.weaverId ? await Weaver.findById(session.weaverId).lean<Record<string, any> | null>() : null;

  return (
    <PortalShell
      title="Weaver"
      nav={[
        { href: "/w/dashboard", label: "🏠 My work" },
        { href: "/w/register", label: "➕ Register a piece" },
        { href: "/w/insights", label: "📊 Who saw my work" },
      ]}
      userName={session?.name}
    >
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-bold text-maroon-900 text-center">Register a new piece</h1>
        <p className="mt-1 mb-6 text-center text-sm text-stone-500">Four taps. Under two minutes.</p>
        <RegisterFlow defaultCraftCode={weaver?.profile?.crafts?.[0]?.code} />
      </div>
    </PortalShell>
  );
}
