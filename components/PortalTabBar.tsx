"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

type Item = { href: string; label: string; short?: string; icon?: string };

/** Phone bottom tab bar for the weaver / co-op / admin portals (hidden from md up). */
export default function PortalTabBar({ nav }: { nav: Item[] }) {
  const pathname = usePathname() || "";
  // Sub-pages that no tab owns (e.g. /w/products/…) belong to the first, "home" tab.
  const activeHref = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.href ?? nav[0]?.href;

  return (
    <nav
      aria-label="Portal"
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-silk-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-16">
        {nav.map((n) => {
          const on = n.href === activeHref;
          return (
            <li key={n.href} className="flex-1">
              <Link
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${on ? "text-maroon-800" : "text-stone-500"}`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-silk-200" : ""}`}>
                  <Icon name={n.icon || "grid"} className="h-5 w-5" strokeWidth={on ? 2.2 : 1.7} />
                </span>
                {n.short || n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
