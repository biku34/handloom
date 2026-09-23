"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { currentState, ensureSubscribed, getPushConfig, pushSupported, unsubscribePush, type PushState } from "@/lib/pushClient";

/* The on/off notification toggle in the purchases section. It reflects the
   current state and lets the customer switch it on or off. The initial
   permission prompt happens on app open (see components/NotificationGate);
   here the customer stays in control afterwards. Renders nothing until we know
   push is supported and configured on the server. */

export default function NotificationOptIn({ phone }: { phone?: string }) {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pushSupported()) return alive && setState("unsupported");
      const cfg = await getPushConfig();
      if (!alive) return;
      if (!cfg.enabled || !cfg.publicKey) return setState("unsupported");
      keyRef.current = cfg.publicKey;
      setState(await currentState(cfg.publicKey));
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function turnOn() {
    if (!keyRef.current) return;
    setBusy(true);
    setMsg(null);
    try {
      const next = await ensureSubscribed(keyRef.current, phone, true);
      setState(next);
      if (next === "on") setMsg("You're in! We'll ping this phone when something new is woven.");
    } catch (err) {
      setMsg(`✕ ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMsg(null);
    try {
      await unsubscribePush();
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
