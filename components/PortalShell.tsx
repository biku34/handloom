import Link from "next/link";
import LogoutButton from "./LogoutButton";
import NavLink from "./NavLink";
import Logo from "./Logo";
import PortalTabBar from "./PortalTabBar";

export default function PortalShell({
  title,
  nav,
  userName,
  children,
}: {
  title: string;
  nav: { href: string; label: string; short?: string; icon?: string }[];
  userName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-gradient-to-b from-maroon-900 to-maroon-800 text-silk-100 shadow-md">
        <div className="mx-auto max-w-6xl px-4 pt-3 pb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" aria-label="SUTRA home" className="shrink-0">
              <Logo />
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full border border-silk-200/25 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-silk-200/80">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            {userName && (
              <span className="hidden sm:flex items-center gap-2 opacity-85">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-silk-200 text-maroon-900 text-xs font-bold">
                  {userName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                {userName}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
        {/* tablets & desktop: pill nav under the header (phones use the bottom tab bar) */}
        <nav className="mx-auto max-w-6xl px-4 pb-3 hidden md:flex gap-1.5 overflow-x-auto">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} icon={n.icon} />
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 md:py-8 pb-10 md:pb-20 flex-1">{children}</main>
      <PortalTabBar nav={nav} />
      <footer className="border-t border-silk-200 py-4 text-center text-[11px] tracking-wide text-stone-400">
        SUTRA · every thread has a story
      </footer>
    </div>
  );
}
