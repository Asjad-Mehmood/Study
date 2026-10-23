import type { ChapterProgress, StudyState } from "./types";
import { CHECKS, SUBJECTS, chapterKey, type SubjectId } from "./syllabus";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Local calendar date as YYYY-MM-DD. */
export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return today(dt);
}

export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", opts);
}

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function live<T extends { deleted?: boolean }>(col: Record<string, T>): T[] {
  return Object.values(col).filter((r) => !r.deleted);
}

/** 0–1 completion of one chapter. "done" counts as complete. */
export function chapterCompletion(p?: ChapterProgress): number {
  if (!p || p.deleted) return 0;
  if (p.status === "done") return 1;
  const done = CHECKS.filter((c) => p.checks?.[c.id]).length;
  return done / CHECKS.length;
}

export function subjectCompletion(state: StudyState, subject: SubjectId): number {
  const s = SUBJECTS.find((x) => x.id === subject)!;
  if (!s.chapters.length) return 0;
  const total = s.chapters.reduce(
    (sum, c) => sum + chapterCompletion(state.progress[chapterKey(subject, c.n)]),
    0,
  );
  return total / s.chapters.length;
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function minutesByDay(state: StudyState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of live(state.sessions)) out[s.date] = (out[s.date] ?? 0) + s.minutes;
  return out;
}

/** Consecutive days (ending today or yesterday) with at least one session. */
export function streak(state: StudyState): number {
  const byDay = minutesByDay(state);
  let d = today();
  if (!byDay[d]) d = addDays(d, -1);
  let n = 0;
  while (byDay[d] > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
