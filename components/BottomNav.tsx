"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

/** App-style tab bar for phones (hidden from md up, where the header nav takes over).
    `account` is set when a user is signed in — the Account tab then deep-links to
    their portal/purchases instead of the login screen. */
export default function BottomNav({ account }: { account?: { home: string } | null }) {
  const pathname = usePathname() || "/";
  const accountHref = account?.home || "/login";
  const TABS = [
    { href: "/", label: "Home", icon: "home", match: (p: string) => p === "/" },
    { href: "/explore", label: "Shop", icon: "grid", match: (p: string) => p.startsWith("/explore") || p.startsWith("/p/") || p.startsWith("/weaver/") },
    { href: "/verify", label: "Scan", icon: "scan", match: (p: string) => p.startsWith("/verify"), primary: true },
    { href: "/purchases", label: "Purchases", icon: "bag", match: (p: string) => p.startsWith("/purchases") },
    { href: accountHref, label: "Account", icon: "user", match: (p: string) => p.startsWith("/login") || p.startsWith("/w") || p.startsWith("/coop") || p.startsWith("/admin") },
  ];
  return (
    <nav
      aria-label="Primary"
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-silk-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-5">
        {TABS.map((t) => {
          const on = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${on ? "text-maroon-800" : "text-stone-500"}`}
              >
                {t.primary ? (
                  <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-maroon-700 text-silk-100 shadow-lg ring-4 ring-white">
                    <Icon name={t.icon} className="h-6 w-6" strokeWidth={2} />
                  </span>
                ) : (
                  <Icon name={t.icon} className="h-6 w-6" strokeWidth={on ? 2.2 : 1.7} />
                )}
                <span className={t.primary ? "-mt-0.5" : ""}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
