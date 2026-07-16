import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="bg-maroon-900 text-silk-100">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-wide text-silk-200">SUTRA</span>
          <span className="hidden sm:inline text-xs opacity-70">सूत्र · every thread has a story</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/explore" className="hover:text-white">Explore</Link>
          <Link href="/verify" className="hover:text-white">Verify a tag</Link>
          <Link href="/purchases" className="hover:text-white">My purchases</Link>
          <Link href="/login" className="rounded-lg bg-silk-200 text-maroon-900 px-3 py-1.5 font-semibold hover:bg-silk-300">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}
