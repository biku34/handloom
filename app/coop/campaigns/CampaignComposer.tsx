"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotifTemplate } from "@/lib/notificationTemplates";

const LINK_OPTIONS = [
  { value: "/explore", label: "Explore catalog" },
  { value: "/purchases", label: "My purchases" },
  { value: "/", label: "Home" },
];

export default function CampaignComposer({
  templates,
  subscriberCount,
  canSend,
}: {
  templates: NotifTemplate[];
  subscriberCount: number;
  canSend: boolean;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>("custom");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/explore");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickTemplate(t: NotifTemplate) {
    setTemplateId(t.id);
    setTitle(t.title);
    setBody(t.body);
    if (t.url) setUrl(t.url);
    setResult(null);
    setError(null);
    setConfirming(false);
  }

  function startCustom() {
    setTemplateId("custom");
    setTitle("");
    setBody("");
    setConfirming(false);
  }

  const ready = title.trim().length > 0 && body.trim().length > 0;

  async function send() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/coop/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url, templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.title || "Send failed");
      setResult(
        `Sent to ${data.delivered}/${data.targeted} phone${data.targeted === 1 ? "" : "s"}` +
          (data.failed ? ` · ${data.failed} couldn't be reached.` : ".")
      );
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── left: compose ── */}
      <div className="order-2 lg:order-1">
        {/* templates */}
        <div>
          <div className="flex items-center justify-between">
            <label className="label mb-0">Start from a template</label>
            <button
              type="button"
              onClick={startCustom}
              className={`text-xs font-semibold ${templateId === "custom" ? "text-maroon-800" : "text-maroon-600 hover:text-maroon-800"}`}
            >
              + Write my own
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t)}
                className={`rounded-xl border p-3 text-left transition ${
                  templateId === t.id
                    ? "border-maroon-600 bg-silk-50 ring-1 ring-maroon-600/30"
                    : "border-silk-200 bg-white hover:border-silk-300"
                }`}
              >
                <div className="text-lg leading-none">{t.emoji}</div>
                <div className="mt-1.5 text-xs font-bold text-maroon-900 leading-snug">{t.label}</div>
                <div className="mt-0.5 text-[11px] text-stone-500 line-clamp-2 leading-snug">{t.body}</div>
              </button>
            ))}
          </div>
        </div>

        {/* editable fields */}
        <div className="mt-6 card p-5">
          <label className="label" htmlFor="c-title">Title</label>
          <input
            id="c-title"
            className="input"
            value={title}
            maxLength={80}
            onChange={(e) => {
              setTitle(e.target.value);
              setTemplateId("custom");
            }}
            placeholder="e.g. Your closet just called 📞"
          />
          <div className="mt-1 text-right text-[11px] text-stone-400">{title.length}/80</div>

          <label className="label mt-2" htmlFor="c-body">Message</label>
          <textarea
            id="c-body"
            className="input min-h-24 resize-y"
            value={body}
            maxLength={200}
            onChange={(e) => {
              setBody(e.target.value);
              setTemplateId("custom");
            }}
            placeholder="Say something they'll want to tap. Keep it warm and short."
          />
          <div className="mt-1 text-right text-[11px] text-stone-400">{body.length}/200</div>

          <label className="label mt-2" htmlFor="c-url">When tapped, open</label>
          <select id="c-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)}>
            {LINK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* send */}
        <div className="mt-4">
          {result && (
            <div className="mb-3 rounded-xl border border-leaf-600/25 bg-leaf-600/10 px-4 py-3 text-sm text-leaf-700">
              ✓ {result}
            </div>
          )}
          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              ✕ {error}
            </div>
          )}

          {!confirming ? (
            <button
              className="btn-primary btn-lg w-full sm:w-auto"
              disabled={!ready || !canSend || subscriberCount === 0}
              onClick={() => setConfirming(true)}
              title={
                !canSend
                  ? "Push isn't configured on the server"
                  : subscriberCount === 0
                  ? "No customers have opted in yet"
                  : ""
              }
            >
              Send to {subscriberCount} phone{subscriberCount === 1 ? "" : "s"}
            </button>
          ) : (
            <div className="card p-4 flex flex-col gap-3 border-maroon-600/30">
              <p className="text-sm text-maroon-900">
                Send <span className="font-semibold">&ldquo;{title}&rdquo;</span> to{" "}
                <span className="font-semibold">{subscriberCount}</span> customer
                {subscriberCount === 1 ? "" : "s"} now? This can&apos;t be unsent.
              </p>
              <div className="flex gap-3">
                <button className="btn-primary" onClick={send} disabled={busy}>
                  {busy ? "Sending…" : "Yes, send it"}
                </button>
                <button className="btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {subscriberCount === 0 && (
            <p className="mt-2 text-xs text-stone-500">
              No customers have turned on updates yet. They opt in from the &ldquo;My purchases&rdquo; page.
            </p>
          )}
        </div>
      </div>

      {/* ── right: live phone preview (rises above the templates on phones) ── */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-24 self-start">
        <label className="label">Preview</label>
        <div className="mt-2 rounded-[2rem] bg-maroon-900 p-3 shadow-lg">
          <div className="rounded-[1.5rem] bg-gradient-to-b from-stone-800 to-stone-900 p-4 min-h-52">
            <div className="text-center text-[10px] font-medium text-stone-400">9:41</div>
            <div className="mt-6 rounded-2xl bg-white/95 p-3 shadow-md backdrop-blur">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192.png" alt="" className="h-5 w-5 rounded" />
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">SUTRA</span>
                <span className="text-[11px] text-stone-400">· now</span>
              </div>
              <div className="mt-1.5 text-sm font-bold text-stone-900 break-words">
                {title || "Your title appears here"}
              </div>
              <div className="mt-0.5 text-[13px] text-stone-600 break-words">
                {body || "And your message shows right below it, just like this."}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          This is how it lands on a customer&apos;s lock screen. Emojis work — use them sparingly.
        </p>
      </div>
    </div>
  );
}
