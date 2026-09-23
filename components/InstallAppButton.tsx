"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

/* A small, centred "Install app" button for the landing page. It reuses the
   install event captured in the layout (window.__sutraBIP) and only renders
   when the app is actually installable — so it never shows a dead button on
   iOS, in the installed app, or where Chrome hasn't offered install. */

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function getBIP(): BIP | null {
  return (window as unknown as { __sutraBIP?: BIP | null }).__sutraBIP || null;
}

export default function InstallAppButton() {
  const [available, setAvailable] = useState(false);
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
    if (standalone) return; // already installed

    const check = () => setAvailable(!!getBIP());
    check(); // event may already be captured before this mounted

    const onInstalled = () => setAvailable(false);
    window.addEventListener("sutra-bip", check); // fired by the layout capture script
    window.addEventListener("beforeinstallprompt", check);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("sutra-bip", check);
      window.removeEventListener("beforeinstallprompt", check);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const e = getBIP();
    if (!e) return;
    setBusy(true);
    try {
      await e.prompt();
      await e.userChoice;
    } catch {
      /* dismissed */
    }
    (window as unknown as { __sutraBIP?: BIP | null }).__sutraBIP = null;
    setBusy(false);
    setAvailable(false);
  }

  if (!available) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={install}
          disabled={busy}
          className="group inline-flex items-center gap-2.5 rounded-full bg-maroon-700 py-2.5 pl-2.5 pr-5 text-sm font-semibold text-silk-100 shadow-[0_8px_20px_-8px_rgba(64,16,26,0.6)] transition hover:bg-maroon-800 disabled:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-lg ring-1 ring-white/20" />
          <span>{busy ? "Opening…" : "Install the SUTRA app"}</span>
          <Icon name="chevron" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
        </button>
      </div>
    </section>
  );
}
