"use client";

import { useEffect } from "react";
import { ASKED_KEY, OPTOUT_KEY, ensureSubscribed, getPushConfig, isStandalone, ls, lsSet, pushSupported } from "@/lib/pushClient";

/**
 * Fires only inside the installed app (display-mode: standalone). When the user
 * opens the app and notifications aren't on yet, it surfaces the OS permission
 * prompt once. On the website (a normal browser tab) it does nothing — there we
 * only offer "Install app". The on/off toggle lives in the purchases section.
 *
 * Renders nothing; it's just a side-effect on app open.
 */
export default function NotificationGate() {
  useEffect(() => {
    if (!pushSupported() || !isStandalone()) return;
    if (ls(OPTOUT_KEY) === "1") return; // user chose off — never re-ask

    let alive = true;
    (async () => {
      const cfg = await getPushConfig();
      if (!alive || !cfg.enabled || !cfg.publicKey) return;

      if (Notification.permission === "granted") {
        // Already allowed — just make sure a live subscription exists.
        await ensureSubscribed(cfg.publicKey, undefined, false).catch(() => {});
      } else if (Notification.permission === "default" && !ls(ASKED_KEY)) {
        // First app open — ask once.
        lsSet(ASKED_KEY, "1");
        await ensureSubscribed(cfg.publicKey, undefined, true).catch(() => {});
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
