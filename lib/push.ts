import webpush from "web-push";
import { PushSubscription } from "./models";

/* Web Push sender. VAPID keys identify us to the push services (FCM, Mozilla,
   Apple) so they accept our messages. Generate a pair with:
     node -e "console.log(require('web-push').generateVAPIDKeys())"
   and put them in .env.local / Vercel env (see .env.local for the names). */

let configured = false;

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured) return;
  if (!pushConfigured()) throw new Error("VAPID keys are not set — push is disabled.");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@sutra.example",
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
};

type SubRow = {
  _id: unknown;
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

/**
 * Fan a payload out to a set of stored subscriptions. Dead endpoints
 * (HTTP 404/410 — the user uninstalled or revoked) are marked EXPIRED so we
 * stop paying to message them. Returns delivery counts.
 */
export async function sendToSubscriptions(subs: SubRow[], payload: PushPayload) {
  ensureConfigured();
  const data = JSON.stringify(payload);
  let delivered = 0;
  let failed = 0;
  const expire: unknown[] = [];

  await Promise.all(
    subs.map(async (s) => {
      if (!s.endpoint || !s.keys?.p256dh || !s.keys?.auth) {
        failed++;
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } },
          data,
          { TTL: 60 * 60 * 24 } // hold for a day if the device is offline
        );
        delivered++;
      } catch (err: unknown) {
        failed++;
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) expire.push(s._id);
      }
    })
  );

  if (expire.length) {
    await PushSubscription.updateMany(
      { _id: { $in: expire } },
      { $set: { status: "EXPIRED" } }
    );
  }

  return { delivered, failed };
}
