/* SUTRA service worker — receives Web Push campaigns and shows them as
   native OS notifications, even when the app/tab is closed (on supported
   platforms). Registered by components/NotificationOptIn.tsx. */

// Activate immediately on install/update so new pushes use the latest logic.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// A (pass-through) fetch handler is required for Chrome to treat the site as
// installable and fire `beforeinstallprompt`. We don't intercept anything —
// requests go to the network as normal.
self.addEventListener("fetch", () => {});

function b64ToU8(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const s = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// The browser fires this when it invalidates a subscription (push service
// rotation, or the VAPID key changed). Without handling it, the device goes
// silently unsubscribed. We re-subscribe with the current server key and
// re-register it, so opt-ins stay persistent across key changes.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cfg = await fetch("/api/push/subscribe").then((r) => r.json());
        if (!cfg || !cfg.enabled || !cfg.publicKey) return;
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64ToU8(cfg.publicKey),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub }),
        });
      } catch {
        /* the browser will fire this again on the next change */
      }
    })()
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SUTRA", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "SUTRA";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    // Maroon accent on Android's notification.
    image: data.image || undefined,
    tag: data.tag || "sutra-campaign",
    renotify: true,
    data: { url: data.url || "/purchases" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an existing tab or opens the deep link.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/purchases";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
