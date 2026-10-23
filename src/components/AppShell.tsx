"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore, type SyncStatus } from "./store";
import { IconBooks, IconExam, IconPlan, IconQuiz, IconSettings, IconTests, IconTimer, IconToday } from "./icons";
import { TimerBadge } from "./TimerBadge";

const NAV = [
  { href: "/", label: "Today", icon: IconToday },
  { href: "/subjects", label: "Subjects", icon: IconBooks },
  { href: "/exam", label: "Exam", icon: IconExam },
  { href: "/practice", label: "Practice", icon: IconQuiz },
  { href: "/timer", label: "Timer", icon: IconTimer },
  { href: "/planner", label: "Planner", icon: IconPlan },
  { href: "/tests", label: "Tests", icon: IconTests },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function syncText(s: SyncStatus): { text: string; tone: "ok" | "warn" | "muted" } {
  switch (s.kind) {
    case "loading":
      return { text: "Loading", tone: "muted" };
    case "local":
      return { text: "Saved on this device", tone: "muted" };
    case "locked":
      return {
        text: s.reason === "passcode" ? "Enter passcode to sync" : "Sync needs setup",
        tone: "warn",
      };
    case "syncing":
      return { text: "Syncing", tone: "muted" };
    case "synced":
      return { text: "Synced", tone: "ok" };
    case "offline":
      return { text: "Offline, saved here", tone: "warn" };
  }
}

function SyncPill({ dotOnly = false }: { dotOnly?: boolean }) {
  const { sync } = useStore();
  const { text, tone } = syncText(sync);
  const color = tone === "ok" ? "var(--done)" : tone === "warn" ? "var(--warn)" : "var(--muted)";
  return (
    <Link
      href="/settings#sync"
      title={text}
      className="inline-flex items-center gap-1.5 p-1 text-xs text-muted hover:text-ink"
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      <span className={dotOnly ? "sr-only" : ""}>{text}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop rail */}
      <aside className="hidden print:!hidden md:flex md:w-56 md:flex-col md:border-r md:border-line md:bg-surface md:px-3 md:py-5 sticky top-0 h-dvh">
        <Link href="/" className="px-3 pb-6">
          <span className="block font-serif text-2xl font-semibold leading-none">Study Register</span>
          <span className="mt-1 block text-xs text-muted">ICS Part-II, 2026-27</span>
        </Link>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {[...NAV, { href: "/settings", label: "Settings", icon: IconSettings }].map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[0.95rem] ${
                  active ? "bg-sunk font-semibold text-ink" : "text-muted hover:bg-sunk hover:text-ink"
                }`}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-3">
          <TimerBadge />
          <SyncPill />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur md:hidden print:hidden"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
          <Link href="/" className="font-serif text-lg font-semibold">
            Study Register
          </Link>
          <div className="flex items-center gap-3">
            <TimerBadge compact />
            <SyncPill dotOnly />
            <Link href="/settings" aria-label="Settings" className="text-muted hover:text-ink">
              <IconSettings />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8 print:p-0">{children}</main>

        {/* Mobile tab bar */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t border-line bg-surface md:hidden print:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center gap-0.5 py-2 text-[0.66rem] ${
                  active ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
