"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/* Customer-side push opt-in. On the purchases page it auto-enables: if the
   browser has already granted permission we subscribe silently; on a first
   visit we ask once. The customer can turn it off, and that choice is
   remembered so we never auto-re-subscribe them against their wishes. */

const OPTOUT_KEY = "sutra_push_optout"; // set when the user turns notifications off
const ASKED_KEY = "sutra_push_asked"; // so we auto-prompt at most once per browser

function ls(get: string): string | null {
  try {
    return localStorage.getItem(get);
  } catch {
    return null;
  }
}
function lsSet(key: string, val: string | null) {
  try {
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch {
    /* storage blocked */
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/* True only if an existing subscription was created with the same VAPID public
   key the server now uses. A mismatch means the key changed — the subscription
   is stale and must be replaced, or it silently stops working. */
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

type State = "loading" | "unsupported" | "off" | "on" | "denied";

export default function NotificationOptIn({ phone }: { phone?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null); // VAPID public key, available to handlers

  /* Create (or repair) the push subscription and register it. `silent` skips
     the confirmation copy — used for the automatic path. Returns true on
     success. Never prompts if permission is already resolved. */
  async function subscribe(pubKey: string, silent: boolean): Promise<boolean> {
    try {
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const keyBytes = urlBase64ToUint8Array(pubKey);
      let sub = await reg.pushManager.getSubscription();
      // Drop a subscription left over from an old VAPID key — otherwise the
      // browser keeps a stale one that never receives pushes.
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
      setState("on");
      if (!silent) setMsg("You're in! We'll ping this phone when something new is woven.");
      return true;
    } catch (err) {
      if (!silent) setMsg(`✕ ${(err as Error).message}`);
      return false;
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) return alive && setState("unsupported");

      try {
        const cfg = await fetch("/api/push/subscribe").then((r) => r.json());
        if (!cfg.enabled || !cfg.publicKey) return alive && setState("unsupported");
        if (!alive) return;
        keyRef.current = cfg.publicKey;

        if (Notification.permission === "denied") return setState("denied");

        const reg = await navigator.serviceWorker.register("/sw.js");
        const keyBytes = urlBase64ToUint8Array(cfg.publicKey);
        const existing = await reg.pushManager.getSubscription();
        if (!alive) return;

        const live =
          !!existing && Notification.permission === "granted" && subMatchesKey(existing, keyBytes);
        if (live) return setState("on");

        // Respect an explicit opt-out — never auto-re-subscribe over it.
        if (ls(OPTOUT_KEY) === "1") return setState("off");

        // Auto-enable: silent when already granted; a one-time ask otherwise.
        if (Notification.permission === "granted") {
          await subscribe(cfg.publicKey, true);
        } else if (!ls(ASKED_KEY)) {
          lsSet(ASKED_KEY, "1");
          await subscribe(cfg.publicKey, true);
        } else {
          setState("off");
        }
      } catch {
        if (alive) setState("unsupported");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function turnOn() {
    if (!keyRef.current) return;
    setBusy(true);
    setMsg(null);
    await subscribe(keyRef.current, false);
    setBusy(false);
  }

  async function turnOff() {
    setBusy(true);
    setMsg(null);
    try {
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
      lsSet(OPTOUT_KEY, "1"); // remember: don't auto-re-subscribe on next visit
      setState("off");
      setMsg("Notifications turned off. Come back anytime.");
    } catch (err) {
      setMsg(`✕ ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-maroon-700/10 text-maroon-700">
          <Icon name="badge" className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-maroon-900">Get updates from the cooperative</h3>
          <p className="mt-0.5 text-sm text-stone-600">
            New drops, festive collections and weaver stories — straight to your phone.
          </p>
          {msg && <p className="mt-1.5 text-xs font-semibold text-maroon-700">{msg}</p>}
          {state === "denied" && (
            <p className="mt-1.5 text-xs text-stone-500">
              Notifications are blocked in your browser settings. Allow them for this site, then reload.
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {state === "on" ? (
          <button className="btn-secondary" onClick={turnOff} disabled={busy}>
            {busy ? "…" : "Turn off"}
          </button>
        ) : (
          <button className="btn-primary" onClick={turnOn} disabled={busy || state === "denied"}>
            {busy ? "Enabling…" : "Turn on updates"}
          </button>
        )}
      </div>
    </div>
  );
}
