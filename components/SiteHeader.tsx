import Link from "next/link";
import Logo from "./Logo";
import Icon from "./Icon";
import BottomNav from "./BottomNav";

/** Search box — a plain GET form, so it works before any JS has loaded. */
function SearchBar({ className = "" }: { className?: string }) {
  return (
    <form action="/explore" role="search" className={`relative ${className}`}>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        name="q"
        placeholder="Search sarees, crafts, weavers…"
        aria-label="Search the collection"
        className="h-11 w-full rounded-xl border-0 bg-white pl-11 pr-4 text-base text-stone-800 placeholder:text-stone-400 shadow-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-silk-300"
      />
    </form>
  );
}

export default function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-maroon-900 text-silk-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.35)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center gap-4">
            <Link href="/" aria-label="SUTRA home" className="shrink-0">
              <Logo tagline />
            </Link>

            <SearchBar className="hidden md:block flex-1 max-w-xl mx-auto" />

            <nav className="ml-auto hidden md:flex items-center gap-1 text-sm font-medium">
              <Link href="/explore" className="rounded-lg px-3 py-2 hover:bg-white/10">Shop</Link>
              <Link href="/verify" className="rounded-lg px-3 py-2 hover:bg-white/10">Verify a tag</Link>
              <Link href="/purchases" className="rounded-lg px-3 py-2 hover:bg-white/10">My purchases</Link>
            </nav>

            <Link
              href="/login"
              className="ml-auto md:ml-2 inline-flex h-10 items-center gap-2 rounded-full bg-silk-200 pl-2.5 pr-4 text-sm font-semibold text-maroon-900 hover:bg-silk-300 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-maroon-900/10">
                <Icon name="user" className="h-4 w-4" strokeWidth={2} />
              </span>
              Sign in
            </Link>
          </div>

          {/* phones: search gets its own full-width row */}
          <div className="pb-3 md:hidden">
            <SearchBar />
          </div>
        </div>
      </header>
      <BottomNav />
    </>
  );
}
