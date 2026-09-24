"use client";

import { useEffect, useState } from "react";

/**
 * Launch splash — shown only when SUTRA is opened as an installed app
 * (home-screen / desktop, i.e. display-mode: standalone). It paints the brand
 * mark, the SUTRA wordmark and a tagline over a maroon field, then fades out
 * once the page is ready. In a normal browser tab it stays hidden (CSS) and
 * unmounts right after mount, so web visitors never see it.
 *
 * Notes learned the hard way:
 *  - No inline <script> in the tree — that caused a hydration mismatch.
 *  - Never remove the node by hand (el.remove()) — React still owns it and
 *    later throws NotFoundError. Unmount it through state instead so React
 *    does the DOM removal itself.
 */
export default function SplashScreen() {
  // "show" → "hiding" (fade) → "gone" (unmounted). Server renders "show" so the
  // splash is in the initial HTML and can paint instantly via CSS.
  const [phase, setPhase] = useState<"show" | "hiding" | "gone">("show");

  useEffect(() => {
    let standalone = false;
    try {
      standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    } catch {
      /* matchMedia unavailable — treat as a browser tab */
    }

    // Browser tab: it was never visible (CSS keeps it display:none) — drop it.
    if (!standalone) {
      setPhase("gone");
      return;
    }

    // Installed app: mark <html> so CSS shows the splash on iOS too.
    document.documentElement.classList.add("pwa");

    // Launch sequence: SUTRA screen → homepage. Hold the splash for at least
    // MIN_MS from launch and until the streamed page HTML has fully arrived
    // (readyState leaves "loading" once the last streamed chunk is parsed), so
    // the "Weaving the page…" loader underneath never flashes on a normal
    // connection. On a slow network we stop waiting at MAX_MS and fade anyway —
    // the loader then shows until the page arrives.
    const MIN_MS = 1200;
    const MAX_MS = 2500;
    const FADE_MS = 650;
    const timers: number[] = [];
    let done = false;
    const fade = () => {
      if (done) return;
      done = true;
      setPhase("hiding");
      timers.push(window.setTimeout(() => setPhase("gone"), FADE_MS));
    };
    const elapsed = () => performance.now(); // ms since the app was launched
    const onReady = () => timers.push(window.setTimeout(fade, Math.max(0, MIN_MS - elapsed())));

    if (document.readyState !== "loading") onReady();
    else document.addEventListener("DOMContentLoaded", onReady, { once: true });
    timers.push(window.setTimeout(fade, Math.max(0, MAX_MS - elapsed())));

    return () => {
      document.removeEventListener("DOMContentLoaded", onReady);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div id="sutra-splash" aria-hidden="true" className={phase === "hiding" ? "is-hiding" : undefined}>
      {/* The first screen the user sees: the OS launch screen is a plain maroon
          field (manifest launch icon is blank maroon), and this wordmark appears
          on it — no S logo anywhere in the launch sequence. */}
      <div className="sutra-splash__inner">
        <div className="sutra-splash__word">SUTRA</div>
        <div className="sutra-splash__tag">Every thread has a story</div>
      </div>
      <div className="sutra-splash__weave" />
    </div>
  );
}
