/* Client-side Web Push helpers, shared by:
   - NotificationGate  — asks on app open (installed app only)
   - NotificationOptIn — the on/off toggle in the purchases section
   Keeping the logic in one place means the two can't drift apart. All of these
   touch browser APIs, so only call them in the browser (client components). */

export type PushState = "on" | "off" | "denied" | "unsupported";

export const OPTOUT_KEY = "sutra_push_optout"; // user turned notifications off
export const ASKED_KEY = "sutra_push_asked"; // auto-prompt at most once per browser

export function ls(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function lsSet(key: string, val: string | null) {
  try {
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch {
    /* storage blocked */
  }
}

/** Running as an installed app (home-screen / desktop), not a browser tab. */
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/* Does an existing subscription use the same VAPID key the server serves now?
   A mismatch means the key rotated — the sub is stale and must be replaced. */
function subMatchesKey(sub: PushSubscription | null, keyBytes: Uint8Array): boolean {
  try {
    const cur = sub?.options?.applicationServerKey;
    if (!cur) return false;
    const a = new Uint8Array(cur);
    if (a.length !== keyBytes.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== keyBytes[i]) return false;
    return true;
  } catch {
    return false;
  }
}

export type PushConfig = { enabled: boolean; publicKey: string | null };

export async function getPushConfig(): Promise<PushConfig> {
  try {
    const cfg = await fetch("/api/push/subscribe").then((r) => r.json());
    return { enabled: !!cfg?.enabled, publicKey: cfg?.publicKey || null };
  } catch {
    return { enabled: false, publicKey: null };
  }
}

/** Current state without changing anything — for rendering the toggle. */
export async function currentState(pubKey: string): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    await navigator.serviceWorker.register("/sw.js").catch(() => {});
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const live =
      !!existing &&
      Notification.permission === "granted" &&
      subMatchesKey(existing, urlBase64ToUint8Array(pubKey));
    return live ? "on" : "off";
  } catch {
    return "off";
  }
}

/**
 * Ensure this device is subscribed with the current key. `ask` controls whether
 * we're allowed to show the OS permission prompt (true) or must stay silent
 * when permission hasn't been decided yet (false). Throws on real failures so
 * the visible toggle can show an error; the silent gate ignores them.
 */
export async function ensureSubscribed(pubKey: string, phone: string | undefined, ask: boolean): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  let permission = Notification.permission;
  if (permission === "default") {
    if (!ask) return "off";
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  await navigator.serviceWorker.register("/sw.js").catch(() => {});
  const reg = await navigator.serviceWorker.ready;
  const keyBytes = urlBase64ToUint8Array(pubKey);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !subMatchesKey(sub, keyBytes)) {
    try {
      await sub.unsubscribe();
    } catch {
      /* ignore */
    }
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes });
  }
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub, phone }),
  });
  if (!res.ok) throw new Error("Could not save your subscription");
  lsSet(OPTOUT_KEY, null); // they're in — clear any prior opt-out
  return "on";
}

/** Unsubscribe this device and remember the opt-out. */
export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
  lsSet(OPTOUT_KEY, "1");
}
