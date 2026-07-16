"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.title || "Could not send OTP");
        return;
      }
      if (data.devOtp) setDevOtp(data.devOtp);
      setStage("otp");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.title || "Verification failed");
        return;
      }
      router.push(params.get("next") || data.home || "/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-8 p-6">
      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
      {stage === "phone" ? (
        <form onSubmit={requestOtp} className="space-y-4">
          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <input id="phone" className="input text-lg" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" autoFocus />
          </div>
          <button className="btn-primary w-full" disabled={busy || phone.replace(/\D/g, "").length < 10}>
            {busy ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          {devOtp && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900">
              <strong>DEV MODE</strong> — no SMS provider configured. Your OTP is:{" "}
              <span className="font-mono text-lg font-bold">{devOtp}</span>
            </div>
          )}
          <div>
            <label className="label" htmlFor="otp">Enter the 6-digit OTP</label>
            <input id="otp" className="input font-mono text-center text-2xl tracking-[0.4em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} autoFocus />
          </div>
          <button className="btn-primary w-full" disabled={busy || otp.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button type="button" className="btn-secondary w-full" onClick={() => { setStage("phone"); setOtp(""); setDevOtp(null); }}>
            Change number
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-maroon-900 text-center">Sign in</h1>
        <p className="mt-2 text-center text-sm text-stone-600">Weavers, cooperatives, verifiers and admins — one door for everyone.</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
