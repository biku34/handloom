"use client";

import { useEffect } from "react";

/** Fire-and-forget scan telemetry (FR-F2) — never blocks render. */
export default function ScanBeacon({ passportId }: { passportId: string }) {
  useEffect(() => {
    const key = `scanned:${passportId}`;
    if (sessionStorage.getItem(key)) return; // one beacon per session per passport
    sessionStorage.setItem(key, "1");
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passportId, source: "QR", referrer: document.referrer ? "link" : "camera", clientTs: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  }, [passportId]);
  return null;
}
