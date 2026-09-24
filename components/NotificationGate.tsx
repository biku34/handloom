"use client";

import { useEffect } from "react";
import { OPTOUT_KEY, ensureSubscribed, getPushConfig, isStandalone, ls, pushSupported } from "@/lib/pushClient";

/**
 * Fires only inside the installed app (display-mode: standalone). Every time the
 * app opens with notifications not yet on, it surfaces the OS permission prompt.
 * On the website (a normal browser tab) it does nothing — there we only offer
 * "Install app". The on/off toggle lives in the purchases section, and if the
 * user explicitly turned notifications OFF we respect that and don't nag.
 *
 * Renders nothing; it's just a side-effect on app open.
 */
export default function NotificationGate() {
  useEffect(() => {
    if (!pushSupported() || !isStandalone()) return;
    if (ls(OPTOUT_KEY) === "1") return; // user explicitly turned it off — don't nag
    if (Notification.permission === "denied") return; // browser-blocked; can't re-prompt

    let alive = true;
    (async () => {
      const cfg = await getPushConfig();
      if (!alive || !cfg.enabled || !cfg.publicKey) return;

      // granted → subscribe silently; default → prompt (every app open until decided).
      const ask = Notification.permission !== "granted";
      await ensureSubscribed(cfg.publicKey, undefined, ask).catch(() => {});
    })();
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
