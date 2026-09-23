import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/Icon";
import { getHomeData } from "@/lib/catalog";
import { mediaUrl } from "@/lib/storage";

// Rebuilt at most once a minute (and immediately when a passport is minted)
// instead of querying MongoDB on every visit.
export const revalidate = 60;

type Home = Awaited<ReturnType<typeof getHomeData>>;

const TRUST = [
  { icon: "badge", title: "Verified weavers", body: "Attested in person at the loom" },
  { icon: "seal", title: "Tamper-evident", body: "Every step sealed on a ledger" },
  { icon: "users", title: "Meet the maker", body: "Face, voice and village" },
  { icon: "scan", title: "Scan to verify", body: "No app, no login needed" },
];

export default async function LandingPage() {
  let data: Home = { stats: { weavers: 0, passports: 0, scans: 0, ledger: 0 }, latest: [], crafts: [], makers: [] };
  try {
    data = await getHomeData();
  } catch {
    /* DB down — render the storefront shell anyway (P6: degrade gracefully) */
  }
  const { stats, latest, crafts, makers } = data;
  const heroImages = latest.map((p) => mediaUrl(p.media?.primaryAssetId) || mediaUrl(p.media?.onLoomAssetId)).filter(Boolean).slice(0, 3) as string[];

  return (
    <div>
      <SiteHeader />
      <main>
        {/* ── Hero banner ── */}
        <section className="bg-maroon-900 text-silk-100 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-7 md:py-16 grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left">
              <h1 className="font-display text-[28px] leading-[1.15] sm:text-5xl font-bold">
                Handloom you can <span className="text-silk-300">trust</span>, woven by people you can meet.
              </h1>
              <p className="mx-auto md:mx-0 mt-3 max-w-lg text-[15px] sm:text-lg text-silk-100/80">
                Every piece carries a Digital Product Passport — scan it to see the weaver, hear their voice and
                check every step from yarn to shelf.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-center md:justify-start">
                <Link href="/explore" className="btn-gold btn-lg">
                  <Icon name="grid" className="h-5 w-5" strokeWidth={2} />
                  Shop now
                </Link>
                <Link href="/verify" className="btn-outline-light btn-lg">
                  <Icon name="scan" className="h-5 w-5" strokeWidth={2} />
                  Scan a tag
                </Link>
              </div>
            </div>

            {heroImages.length > 0 && (
              <div className="relative hidden md:grid grid-cols-2 gap-3 h-[400px]">
                <div className="relative row-span-2 overflow-hidden rounded-3xl ring-1 ring-white/10">
                  <Image src={heroImages[0]} alt="" fill priority sizes="300px" className="object-cover" />
                </div>
                {heroImages.slice(1).map((src) => (
                  <div key={src} className="relative overflow-hidden rounded-3xl ring-1 ring-white/10">
                    <Image src={src} alt="" fill sizes="300px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Trust strip ── */}
        <section className="border-b border-silk-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
            {TRUST.map((t) => (
              <div key={t.title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-silk-100 text-maroon-700">
                  <Icon name={t.icon} className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-maroon-900 leading-tight">{t.title}</p>
                  <p className="text-[11px] text-stone-500 leading-tight mt-0.5">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Shop by craft ── */}
        {crafts.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pt-10">
            <SectionHead title="Shop by craft" href="/explore" />
            <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x">
              {crafts.map((c) => (
                <Link
                  key={c}
                  href={`/explore?craft=${encodeURIComponent(c)}`}
                  className="snap-start shrink-0 rounded-2xl bg-white px-4 py-3 ring-1 ring-silk-200 hover:ring-maroon-600 transition-shadow"
                >
                  <span className="weave-border block w-8 rounded-full mb-2" />
                  <span className="text-sm font-semibold text-maroon-900 whitespace-nowrap">{c}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── New arrivals ── */}
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <SectionHead title="New arrivals" subtitle="Freshly verified, straight from the loom" href="/explore" />
          {latest.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {latest.map((p, i) => (
                <ProductCard key={p.passportId} p={p} priority={i < 2} />
              ))}
            </div>
          ) : (
            <div className="mt-4 card p-10 text-center text-sm text-stone-500">New pieces are on the loom — check back soon.</div>
          )}
          <div className="mt-6 flex justify-center">
            <Link href="/explore" className="btn-primary btn-lg w-full sm:w-auto">
              View the full collection
              <Icon name="chevron" className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>
        </section>

        {/* ── Meet the makers ── */}
        {makers.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pt-12">
            <SectionHead title="Meet the makers" subtitle="Every weaver is verified in person" />
            <div className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-1 snap-x">
              {makers.map((w) => {
                const photo = mediaUrl(w.profile?.photoAssetId);
                return (
                  <Link key={w.handle} href={`/weaver/${w.handle}`} className="group snap-start shrink-0 w-24 text-center">
                    <span className="relative mx-auto block h-20 w-20 overflow-hidden rounded-full bg-silk-100 ring-2 ring-silk-200 group-hover:ring-maroon-600 transition-all">
                      {photo && <Image src={photo} alt="" fill sizes="80px" className="object-cover" />}
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-maroon-900 truncate">{w.profile?.displayName}</span>
                    <span className="block text-[10px] text-stone-500 truncate">{w.profile?.cluster?.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── How it works ── */}
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <SectionHead title="How SUTRA works" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["1", "The weaver registers", "A photo on the loom and a voice note. The cooperative verifies the weaver in person."],
              ["2", "A passport is issued", "The piece gets a QR tag bound to an append-only ledger — sealed once it ships."],
              ["3", "You scan, and you know", "A green tick, the weaver's face, and their voice telling you about your piece."],
            ].map(([n, title, body]) => (
              <div key={n} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-silk-200">
                <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon-900 text-lg font-bold text-silk-200">{n}</span>
                <div>
                  <h3 className="font-bold text-maroon-900">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Owner lookup ── */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl bg-gradient-to-br from-maroon-800 to-maroon-900 p-6 sm:p-8 text-silk-100 sm:flex items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-silk-200">
                <Icon name="bag" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold">Already own a SUTRA piece?</h2>
                <p className="mt-1.5 text-sm text-silk-100/75 max-w-md">
                  Enter the phone number you claimed with — no account needed — and revisit every piece and its story.
                </p>
              </div>
            </div>
            <Link href="/purchases" className="btn-gold btn-lg mt-5 sm:mt-0 w-full sm:w-auto shrink-0">
              Find my purchases
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [stats.weavers, "Verified weavers"],
              [stats.passports, "Passports issued"],
              [stats.scans, "Consumer scans"],
              [stats.ledger, "Ledger records"],
            ].map(([n, label]) => (
              <div key={String(label)} className="rounded-2xl bg-white p-4 text-center ring-1 ring-silk-200">
                <div className="font-display text-2xl font-bold text-maroon-700">{Number(n).toLocaleString()}</div>
                <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-silk-700">{label}</div>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-stone-500">
            <strong className="text-maroon-900">Our honest promise:</strong> technology proves a claim was made and never altered.
            The guarantee that it was true comes from the human verifier who stood at the loom — SUTRA makes that
            attestation permanent and impossible to quietly rewrite.
          </p>
        </section>
      </main>
      <footer className="bg-maroon-900 text-silk-100/70 text-center text-xs py-6">
        SUTRA · Handloom Provenance & Weaver Stories
      </footer>
    </div>
  );
}

function SectionHead({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-maroon-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-semibold text-maroon-700 hover:text-maroon-900 whitespace-nowrap">
          See all <Icon name="chevron" className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      )}
    </div>
  );
}
