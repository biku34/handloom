"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

/* A small, centred "Install app" button for the landing page. It registers the
   service worker (so the browser marks the app installable and fires the install
   event), then clicking it opens the native install dialog. It hides only once
   the app is installed. */

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function getBIP(): BIP | null {
  return (window as unknown as { __sutraBIP?: BIP | null }).__sutraBIP || null;
}

export default function InstallAppButton() {
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let standalone = false;
    try {
      standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    } catch {
      /* ignore */
    }
    if (standalone) {
      setInstalled(true);
      return;
    }
    // Make sure the SW is registered so the browser fires the install event and
    // a native install becomes available for the click below.
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  async function onClick() {
    const e = getBIP();
    if (!e) return; // browser hasn't offered install yet — nothing we can force
    setBusy(true);
    try {
      await e.prompt();
      await e.userChoice;
    } catch {
      /* dismissed */
    }
    (window as unknown as { __sutraBIP?: BIP | null }).__sutraBIP = null;
    setBusy(false);
  }

  if (installed) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          className="group inline-flex items-center gap-2.5 rounded-full bg-maroon-700 py-2.5 pl-2.5 pr-5 text-sm font-semibold text-silk-100 shadow-[0_8px_20px_-8px_rgba(64,16,26,0.6)] transition hover:bg-maroon-800 disabled:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-lg ring-1 ring-white/20" />
          <span>{busy ? "Installing…" : "Install the SUTRA app"}</span>
          <Icon name="chevron" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
        </button>
      </div>
    </section>
  );
}
