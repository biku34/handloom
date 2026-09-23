import PortalShell from "@/components/PortalShell";
import Icon from "@/components/Icon";
import { COOP_NAV } from "@/components/nav";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Campaign, PushSubscription } from "@/lib/models";
import { pushConfigured } from "@/lib/push";
import { NOTIF_TEMPLATES } from "@/lib/notificationTemplates";
import CampaignComposer from "./CampaignComposer";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const session = await getSession();
  await dbConnect();

  const [subscriberCount, recent] = await Promise.all([
    PushSubscription.countDocuments({ status: "ACTIVE" }),
    Campaign.find(session?.role === "ADMIN" ? {} : { orgId: session?.orgId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean<Record<string, any>[]>(),
  ]);

  return (
    <PortalShell title="Cooperative" nav={COOP_NAV} userName={session?.name}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Marketing</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-maroon-900">Campaigns</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-stone-500">
        Send a notification to every customer who&apos;s turned on updates. It lands on their phone like any
        other app — even when SUTRA is closed. Pick a ready-made line or write your own.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-maroon-700/10 text-maroon-700">
            <Icon name="users" className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold leading-none text-maroon-800">{subscriberCount}</div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Subscribed phones
            </div>
          </div>
        </div>
        {!pushConfigured() && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            Push isn&apos;t configured — set the VAPID keys in your environment to enable sending.
          </div>
        )}
      </div>

      <div className="mt-8">
        <CampaignComposer
          templates={NOTIF_TEMPLATES}
          subscriberCount={subscriberCount}
          canSend={pushConfigured()}
        />
      </div>

      {recent.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-maroon-900">Recently sent</h2>
          <div className="mt-3 card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-silk-700 border-b border-silk-200">
                  <th className="px-4 py-3">Notification</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silk-100">
                {recent.map((c) => (
                  <tr key={String(c._id)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-maroon-900">{c.title}</div>
                      <div className="text-xs text-stone-500 line-clamp-1">{c.body}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {c.stats?.delivered ?? 0}
                      <span className="text-stone-400"> / {c.stats?.targeted ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {new Date(c.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{c.sentByName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
