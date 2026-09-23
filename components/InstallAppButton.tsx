"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

/* A small, centred "Install app" button for the landing page. It's always
   visible (unless the app is already installed). If the browser has offered a
   native install (Chrome/Edge on Android & desktop), one tap installs it;
   otherwise it reveals a short how-to, so the button is never a dead end. */

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function getBIP(): BIP | null {
  return (window as unknown as { __sutraBIP?: BIP | null }).__sutraBIP || null;
}

export default function InstallAppButton() {
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
    const check = () => setCanPrompt(!!getBIP());
    check(); // the event may have been captured before this mounted

    const onInstalled = () => setInstalled(true);
    window.addEventListener("sutra-bip", check); // fired by the layout capture script
    window.addEventListener("beforeinstallprompt", check);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("sutra-bip", check);
      window.removeEventListener("beforeinstallprompt", check);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function onClick() {
    const e = getBIP();
    if (e) {
      setBusy(true);
      try {
        await e.prompt();
        await e.userChoice;
      } catch {
        /* dismissed */
      }
      (window as unknown as { __sutraBIP?: BIP | null }).__sutraBIP = null;
      setBusy(false);
      setCanPrompt(false);
      return;
    }
    // No native prompt available yet → show how to install manually.
    setShowHelp((v) => !v);
  }

  if (installed) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          className="group inline-flex items-center gap-2.5 rounded-full bg-maroon-700 py-2.5 pl-2.5 pr-5 text-sm font-semibold text-silk-100 shadow-[0_8px_20px_-8px_rgba(64,16,26,0.6)] transition hover:bg-maroon-800 disabled:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-lg ring-1 ring-white/20" />
          <span>{busy ? "Opening…" : "Install the SUTRA app"}</span>
          <Icon name="chevron" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
        </button>
        {showHelp && !canPrompt && (
          <p className="max-w-xs text-center text-xs leading-relaxed text-stone-500">
            On Android Chrome, open the <strong className="text-maroon-800">⋮</strong> menu and tap{" "}
            <strong className="text-maroon-800">Install app</strong>. On iPhone, use{" "}
            <strong className="text-maroon-800">Share → Add to Home Screen</strong>. On desktop, click the install icon in
            the address bar.
          </p>
        )}
      </div>
    </section>
  );
}
