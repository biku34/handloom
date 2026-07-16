"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";

function ReportForm() {
  const params = useSearchParams();
  const [passportId, setPassportId] = useState(params.get("code") || "");
  const [reason, setReason] = useState("PHYSICAL_MISMATCH");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reportRef: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passportId, reason, description, contact }),
      });
      const data = await res.json();
      if (res.ok) setDone(data);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <div className="text-4xl">🙏</div>
        <h2 className="font-display mt-2 text-xl font-bold text-maroon-900">Thank you</h2>
        <p className="mt-2 text-sm text-stone-600">
          Your report is in the investigation queue. Keep this reference:
        </p>
        <p className="mt-3 font-mono text-lg font-bold text-maroon-800">{done.reportRef}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div>
        <label className="label" htmlFor="pid">Tag / passport code (if any)</label>
        <input id="pid" className="input font-mono" value={passportId} onChange={(e) => setPassportId(e.target.value)} placeholder="Code printed on the tag" />
      </div>
      <div>
        <label className="label" htmlFor="reason">What seems wrong?</label>
        <select id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="PHYSICAL_MISMATCH">The item doesn&apos;t match the photos / description</option>
          <option value="DUPLICATE_SCAN">I&apos;ve seen the same code on another item</option>
          <option value="TAG_TAMPERED">The tag looks tampered with or re-attached</option>
          <option value="PRICE_ANOMALY">Price far below plausible for genuine handloom</option>
          <option value="OTHER">Something else</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="desc">Tell us what you saw</label>
        <textarea id="desc" className="input min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shop name, location, what made you suspicious…" required />
      </div>
      <div>
        <label className="label" htmlFor="contact">Email or phone (optional — for follow-up)</label>
        <input id="contact" className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      <button className="btn-primary w-full" disabled={busy || !description.trim()}>
        {busy ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}

export default function ReportPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-maroon-900 text-center">Report a suspicious item</h1>
        <p className="mt-3 text-center text-sm text-stone-600">
          Counterfeits steal from weavers. Your report goes straight to the investigation queue — no account needed.
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <ReportForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
