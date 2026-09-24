"use client";

import { useEffect, useState } from "react";

/**
 * Android/Chromium "Install app" prompt. It only appears where the browser
 * fires `beforeinstallprompt` — installable Chromium browsers, i.e. Android in
 * practice. iOS never fires the event, so it never shows there (by design).
 *
 * This only installs the PWA. Notifications are NOT requested here — that
 * happens inside the installed app on first open (see NotificationGate) and is
 * managed from the purchases section.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __sutraBIP?: InstallPromptEvent | null;
  }
}

const DISMISS_KEY = "sutra_install_dismissed_at";
const DISMISS_MS = 10 * 1000; // re-offer 10 seconds after a dismissal

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Already installed / running as an app → nothing to offer.
    let standalone = false;
    try {
      standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    } catch {
      /* matchMedia unavailable */
    }
    if (standalone) return;

    // Registering the SW is what makes Chrome evaluate installability and fire
    // `beforeinstallprompt`. Do this ALWAYS (even if the banner was dismissed),
    // so the "Install app" button on the page can still install.
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Respect a recent dismissal of THIS banner (now just one hour). The page's
    // own install button is unaffected by this.
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < DISMISS_MS) return;
    } catch {
      /* storage blocked — carry on */
    }

    // The event may already have fired (before this component mounted) and been
    // stashed by the early capture script in the layout. Pick it up if so.
    const pick = () => {
      const e = window.__sutraBIP;
      if (e) {
        setDeferred(e);
        setShow(true);
      }
    };
    pick();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar; we show our own
      window.__sutraBIP = e as InstallPromptEvent;
      setDeferred(e as InstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      window.__sutraBIP = null;
      setShow(false);
      setDeferred(null);
      remember();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("sutra-bip", pick); // fired by the early capture script
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("sutra-bip", pick);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function remember() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function handleInstall() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user dismissed or unsupported */
    }
    window.__sutraBIP = null; // consumed — a deferred prompt can only be used once
    setDeferred(null);
    setBusy(false);
    setShow(false);
    remember();
  }

  function dismiss() {
    setShow(false);
    remember();
  }

  if (!show || !deferred) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 sm:bottom-4 z-50 px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-white p-4 shadow-[0_14px_44px_-12px_rgba(64,16,26,0.5)] ring-1 ring-silk-200">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-bold text-maroon-900">Get the SUTRA app</p>
            <p className="mt-0.5 text-[13px] leading-snug text-stone-600">
              Add it to your home screen for one-tap access to your pieces and their stories.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Not now"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-silk-100 hover:text-maroon-700"
          >
            ✕
          </button>
        </div>
        <button type="button" onClick={handleInstall} disabled={busy} className="btn-primary btn-lg mt-3 w-full">
          {busy ? "Installing…" : "Install app"}
        </button>
      </div>
    </div>
  );
}
