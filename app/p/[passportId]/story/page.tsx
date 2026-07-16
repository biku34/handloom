import Link from "next/link";
import { buildPassportView } from "@/lib/passport";
import AudioPlayer from "@/components/AudioPlayer";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }: { params: Promise<{ passportId: string }> }) {
  const { passportId } = await params;
  const view = await buildPassportView(passportId).catch(() => null);
  if (!view) {
    return (
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-10 text-center">
          <p>No record of this code.</p>
          <Link className="btn-primary mt-4" href="/verify">Verify a tag</Link>
        </main>
      </div>
    );
  }
  const w = view.weaver;
  const n = view.product.narrative;

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
        <Link href={`/p/${passportId}`} className="text-sm text-maroon-700 font-semibold">← Back to passport</Link>

      {w && (
        <section className="mt-4">
          <h1 className="font-display text-2xl font-bold text-maroon-900">{w.displayName}&apos;s story</h1>
          {w.story?.audioUrl && (
            <div className="mt-4">
              <AudioPlayer src={w.story.audioUrl} label={`In ${w.displayName?.split(" ")[0]}'s own voice`} durationSec={w.story.durationSec} />
              <p className="mt-2 text-xs text-stone-400">The original recording is always kept — the transcript below is derived from it.</p>
            </div>
          )}
          {w.story?.transcript?.original?.text && (
            <blockquote className="card mt-5 p-5 text-[15px] leading-relaxed text-stone-800 italic">
              “{w.story.transcript.original.text}”
              {w.story.transcript.original.lang && w.story.transcript.original.lang !== "en" && (
                <footer className="mt-3 not-italic text-xs text-stone-400">Spoken in {w.story.transcript.original.lang} · transcript</footer>
              )}
            </blockquote>
          )}
          {(w.story?.transcript?.translations?.length ?? 0) > 0 && (
            <div className="mt-4 space-y-3">
              {w.story.transcript.translations.map((t: { lang: string; text: string; source?: string }) => (
                <details key={t.lang} className="card p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-maroon-800">Read in {t.lang === "en" ? "English" : t.lang}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">{t.text}</p>
                  {t.source === "MT" && <p className="mt-2 text-xs text-stone-400">Machine-translated — not yet human-reviewed.</p>}
                </details>
              ))}
            </div>
          )}
          {(w.story?.highlights?.length ?? 0) > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {w.story.highlights.map((h: string) => (
                <span key={h} className="rounded-full bg-silk-100 border border-silk-300 px-3 py-1 text-xs font-semibold text-maroon-800">{h}</span>
              ))}
            </div>
          )}
        </section>
      )}

      {(n?.title || n?.body || n?.culturalNote) && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-maroon-900">{n.title || "About this piece"}</h2>
          {n.body && <p className="mt-3 text-[15px] leading-relaxed text-stone-800">{n.body}</p>}
          {n.culturalNote && (
            <div className="card mt-4 p-4 bg-silk-50">
              <p className="text-xs font-bold uppercase tracking-wide text-silk-700">Cultural note</p>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{n.culturalNote}</p>
            </div>
          )}
        </section>
      )}

      {w?.handle && (
        <Link href={`/weaver/${w.handle}`} className="btn-secondary mt-8 w-full">
          See all of {w.displayName?.split(" ")[0]}&apos;s work →
        </Link>
      )}
      </main>
    </div>
  );
}
