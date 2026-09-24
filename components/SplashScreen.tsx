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

    // Installed app: mark <html> so CSS shows the splash on iOS too, then hold
    // it briefly and fade out.
    document.documentElement.classList.add("pwa");
    const t1 = window.setTimeout(() => setPhase("hiding"), 1200);
    const t2 = window.setTimeout(() => setPhase("gone"), 1200 + 650);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div id="sutra-splash" aria-hidden="true" className={phase === "hiding" ? "is-hiding" : undefined}>
      <div className="sutra-splash__inner">
        <svg viewBox="0 0 64 64" className="sutra-splash__mark" aria-hidden="true">
          <rect width="64" height="64" rx="16" fill="#40101a" />
          <path
            d="M44.5 19.5C41 14 23 13 22.5 23.5 22 32.5 42 30.5 42 41.5 42 51.5 24 52 19.5 45"
            fill="none"
            stroke="#e5c383"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="44.5" cy="19.5" r="2" fill="#40101a" />
        </svg>
        <div className="sutra-splash__word">SUTRA</div>
        <div className="sutra-splash__tag">Every thread has a story</div>
      </div>
      <div className="sutra-splash__weave" />
    </div>
  );
}
