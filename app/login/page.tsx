"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { LogoMark } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(e: { preventDefault(): void }) {
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

  const digits = phone.replace(/\D/g, "");

  return (
    <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-silk-200 shadow-[0_12px_40px_-20px_rgba(64,16,26,0.35)]">
      {/* step indicator */}
      <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${stage === "phone" ? "bg-maroon-700 text-white" : "bg-leaf-600 text-white"}`}>
          {stage === "phone" ? "1" : "✓"}
        </span>
        <span className={stage === "phone" ? "text-maroon-900" : "text-stone-400"}>Phone</span>
        <span className="h-px flex-1 bg-silk-200" />
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${stage === "otp" ? "bg-maroon-700 text-white" : "bg-silk-100 text-stone-400"}`}>2</span>
        <span className={stage === "otp" ? "text-maroon-900" : "text-stone-400"}>Verify</span>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}

      {stage === "phone" ? (
        <form onSubmit={requestOtp} className="space-y-5">
          <div>
            <label className="label" htmlFor="phone">Mobile number</label>
            <div className="flex h-13 items-stretch overflow-hidden rounded-xl border border-silk-300 bg-white focus-within:border-maroon-600 focus-within:ring-3 focus-within:ring-maroon-600/15">
              <span className="flex items-center gap-1.5 border-r border-silk-200 bg-silk-50 px-3.5 text-base font-semibold text-stone-600">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                className="min-w-0 flex-1 bg-transparent px-3.5 text-lg tracking-wide outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                autoFocus
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">We&apos;ll text you a 6-digit code.</p>
          </div>
          <button className="btn-primary btn-lg w-full" disabled={busy || digits.length < 10}>
            {busy ? "Sending code…" : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-5">
          <p className="text-sm text-stone-600">
            Code sent to <strong className="text-maroon-900">+91 {digits.slice(-10)}</strong>{" "}
            <button type="button" className="font-semibold text-maroon-700 underline-offset-2 hover:underline" onClick={() => { setStage("phone"); setOtp(""); setDevOtp(null); setError(null); }}>
              Change
            </button>
          </p>
          {devOtp && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900">
              <strong>DEV MODE</strong> — no SMS provider configured. Your code is{" "}
              <button type="button" className="font-mono text-lg font-bold underline decoration-dotted" onClick={() => setOtp(devOtp)}>
                {devOtp}
              </button>
              <span className="block text-xs mt-0.5">Tap it to fill in.</span>
            </div>
          )}
          <div>
            <label className="label" htmlFor="otp">Enter 6-digit code</label>
            <input
              id="otp"
              className="input h-14 font-mono text-center text-2xl tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              autoFocus
            />
          </div>
          <button className="btn-primary btn-lg w-full" disabled={busy || otp.length !== 6}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <button type="button" className="w-full text-sm font-semibold text-maroon-700 hover:underline disabled:opacity-50" disabled={busy} onClick={(e) => requestOtp(e)}>
            Didn&apos;t get it? Resend code
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
      <main className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="text-center">
          <LogoMark className="mx-auto h-14 w-14 rounded-2xl shadow-md" />
          <h1 className="font-display mt-4 text-3xl font-bold text-maroon-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-stone-600">Sign in for weavers, cooperatives, verifiers and admins.</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="mt-6 rounded-2xl bg-silk-100/70 p-4 text-center">
          <p className="text-sm font-semibold text-maroon-900">Just shopping?</p>
          <p className="mt-0.5 text-xs text-stone-600">You don&apos;t need an account to browse, scan or find your purchases.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/explore" className="btn-secondary">Browse the shop</Link>
            <Link href="/verify" className="btn-secondary">Scan a tag</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
