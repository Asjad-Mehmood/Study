"use client";

import Link from "next/link";
import { getSubject } from "@/lib/syllabus";
import { formatClock, useTimer } from "./timer";

export function TimerBadge({ compact = false }: { compact?: boolean }) {
  const { timer, elapsed, running } = useTimer();
  if (!timer) return null;
  const subj = timer.subject === "other" ? "Other" : getSubject(timer.subject)?.short;
  return (
    <Link
      href="/timer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold tabular-nums"
      title={running ? "Study timer running" : "Study timer paused"}
    >
      <span
        className={`h-2 w-2 rounded-full ${running ? "animate-pulse" : ""}`}
        style={{ background: running ? "var(--mark)" : "var(--muted)" }}
        aria-hidden
      />
      {formatClock(elapsed)}
      {!compact && <span className="font-normal text-muted">{subj}</span>}
    </Link>
  );
}
