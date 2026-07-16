import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function PortalShell({
  title,
  nav,
  userName,
  children,
}: {
  title: string;
  nav: { href: string; label: string }[];
  userName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="bg-maroon-900 text-silk-100">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="font-display text-xl font-bold text-silk-200">SUTRA</Link>
          <span className="text-xs uppercase tracking-widest opacity-70">{title}</span>
          <div className="flex items-center gap-3 text-sm">
            {userName && <span className="hidden sm:inline opacity-80">{userName}</span>}
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-4 pb-2 flex gap-1 overflow-x-auto">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm hover:bg-white/10 whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-16">{children}</main>
    </div>
  );
}
