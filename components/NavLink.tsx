"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

export default function NavLink({ href, label, icon }: { href: string; label: string; icon?: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
        active
          ? "bg-silk-200 text-maroon-900 shadow-sm"
          : "text-silk-100/75 hover:text-white hover:bg-white/10"
      }`}
    >
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {label}
    </Link>
  );
}
