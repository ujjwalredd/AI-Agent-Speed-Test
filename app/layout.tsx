import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import SiteNav from "@/components/SiteNav";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import "./globals.css";

const display = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentSpeed — AI Agent Benchmarking",
  description:
    "Benchmark AI agents and LLMs across speed, quality, reliability, consistency, and cost. One clear score, 0–100.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link btn btn-ink px-4" href="#main">
          Skip to content
        </a>
        <ScrollProgress />
        <SmoothScroll>

        {/* Logo-less header: identity carried by type alone. */}
        <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link
              href="/"
              className="font-display inline-flex min-h-11 items-center text-base font-800 uppercase tracking-tight text-ink"
              style={{ fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              Agent<span className="text-signal-ink">Speed</span>
            </Link>
            <SiteNav />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 pb-28 sm:px-8" id="main">
          {children}
        </main>

        {/* Colophon footer — mono, hairline rule, print-style. */}
        <footer className="border-t border-rule">
          <div className="font-data mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-[11px] uppercase tracking-widest text-ink-soft sm:px-8">
            <span>AgentSpeed — Agent Performance Index</span>
            <span>6 tasks · 6 axes · score 0–100</span>
          </div>
        </footer>
        </SmoothScroll>
      </body>
    </html>
  );
}
