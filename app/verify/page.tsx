"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";

export default function VerifyEntryPage() {
  const [code, setCode] = useState("");
  const router = useRouter();
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-maroon-900 text-center">Verify a tag</h1>
        <p className="mt-3 text-center text-sm text-stone-600">
          Scan the QR code with your phone camera, or type the code printed below it.
        </p>
        <form
          className="card mt-8 p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) router.push(`/p/${encodeURIComponent(code.trim())}`);
          }}
        >
          <div>
            <label className="label" htmlFor="code">Passport code</label>
            <input
              id="code"
              className="input font-mono text-center text-lg"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 7Xk9mQr2Fvbz"
              autoFocus
            />
          </div>
          <button className="btn-primary w-full" disabled={!code.trim()}>Check authenticity</button>
        </form>
        <p className="mt-6 text-center text-xs text-stone-400">
          No app. No account. Verification is free and anonymous.
        </p>
      </main>
    </div>
  );
}
