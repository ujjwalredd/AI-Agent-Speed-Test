"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/test", label: "Run test" },
  { href: "/compare", label: "Compare" },
];

// Text-only navigation — the identity is typographic, no logo mark anywhere.
export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex items-center gap-6 sm:gap-8">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className="nav-link inline-flex min-h-11 items-center text-sm uppercase tracking-wide"
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
