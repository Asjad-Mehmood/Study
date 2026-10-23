"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/components/store";
import { useTimer } from "@/components/timer";
import { ProgressBar, Section, STATUS_COLOR, STATUS_LABEL, SubjectName } from "@/components/ui";
import { IconCheck, IconPlay } from "@/components/icons";
import { SUBJECTS, chapterKey, getChapter, getSubject } from "@/lib/syllabus";
import {
  addDays,
  daysBetween,
  formatDate,
  formatMinutes,
  live,
  minutesByDay,
  pct,
  streak,
  subjectCompletion,
  today,
} from "@/lib/utils";
import type { ChapterStatus } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({ notes }: { notes: Record<string, number[]> }) {
  const { state, settings, ready, put } = useStore();
  const { timer, start } = useTimer();
  const t = today();

  const byDay = useMemo(() => minutesByDay(state), [state]);
  const todayMin = byDay[t] ?? 0;
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)), [t]);
  const weekMax = Math.max(settings.dailyGoal, ...week.map((d) => byDay[d] ?? 0));
  const weekTotal = week.reduce((s, d) => s + (byDay[d] ?? 0), 0);
  const days = streak(state);

  const tasks = live(state.tasks)
    .filter((x) => !x.done && (!x.due || x.due <= addDays(t, 2)))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt - b.createdAt)
    .slice(0, 5);

  const lastOpened = live(state.progress)
    .filter((p) => p.lastOpened)
    .sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))[0];
  const continueCh = lastOpened ? lastOpened.id.split(":") : null;

  const tests = live(state.tests)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const examDays = settings.examDate ? daysBetween(t, settings.examDate) : null;

  // Dates and greetings depend on the visitor's clock, so render them only in the browser.
  if (!ready) {
    return <div className="h-64" aria-busy="true" />;
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-sm text-muted">{formatDate(t, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">
          {greeting()}
          {settings.name ? `, ${settings.name}` : ""}
        </h1>
        <p className="mt-1 text-muted">
          {examDays === null ? (
            <>
              No exam date yet. <Link href="/settings" className="text-accent underline">Add your board exam date</Link> to see the countdown.
            </>
          ) : examDays > 0 ? (
            <>
              Board exams start in <strong className="text-ink">{examDays} days</strong> ({formatDate(settings.examDate!, { day: "numeric", month: "long", year: "numeric" })}).
            </>
          ) : examDays === 0 ? (
            <strong className="text-ink">Exams start today. Best of luck.</strong>
          ) : (
            <>Your exam date has passed. Update it in Settings.</>
          )}
        </p>
      </div>

      {/* Today strip */}
      <div className="mb-9 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold">Today</h2>
            <span className="text-sm text-muted">Goal {formatMinutes(settings.dailyGoal)}</span>
          </div>
          <p className="mt-2 font-serif text-4xl font-semibold tabular-nums">
            {formatMinutes(todayMin)}
          </p>
          <div className="mt-3">
            <ProgressBar value={todayMin / settings.dailyGoal} color="var(--done)" label="Today's study goal" />
          </div>
          <p className="mt-2 text-sm text-muted">
            {days > 0 ? `${days}-day study streak.` : "Log a session today to start a streak."}{" "}
            {formatMinutes(weekTotal)} in the last 7 days.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {timer ? (
              <Link href="/timer" className="btn btn-primary">
                Open running timer
              </Link>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  const [s, n] = continueCh ?? ["physics", "1"];
                  start(s as never, Number(n));
                }}
              >
                <IconPlay /> Start studying
              </button>
            )}
            <Link href="/timer#log" className="btn btn-quiet">
              Log time
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-bold">Last 7 days</h2>
          <div className="mt-3 flex h-28 gap-2" aria-label="Minutes studied per day, last 7 days">
            {week.map((d) => {
              const m = byDay[d] ?? 0;
              const h = weekMax ? (m / weekMax) * 100 : 0;
              const met = m >= settings.dailyGoal;
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-[4px]"
                      title={`${formatDate(d)}: ${formatMinutes(m)}`}
                      style={{
                        height: `${Math.max(h, m ? 4 : 2)}%`,
                        background: m ? (met ? "var(--done)" : "var(--accent)") : "var(--sunk)",
                      }}
                    />
                  </div>
                  <span className={`text-[0.7rem] ${d === t ? "font-bold text-ink" : "text-muted"}`}>
                    {formatDate(d, { weekday: "narrow" })}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Green bars met your daily goal.</p>
        </div>
      </div>

      {/* Study map */}
      <Section
        title="Study map"
        aside={
          <span className="hidden flex-wrap items-center gap-3 sm:flex">
            {(Object.keys(STATUS_LABEL) as ChapterStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          {SUBJECTS.map((s) => {
            const done = subjectCompletion(state, s.id);
            return (
              <div key={s.id} className="grid gap-2 sm:grid-cols-[11rem_1fr] sm:items-center">
                <Link href={`/subjects/${s.id}`} className="flex items-baseline justify-between gap-2 sm:block">
                  <span className="font-semibold">
                    <SubjectName id={s.id} />
                  </span>
                  <span className="text-sm text-muted sm:block">
                    {ready ? pct(done) : "…"} done
                    {notes[s.id]?.length ? "" : `, notes in phase ${s.phase}`}
                  </span>
                </Link>
                <div className="flex flex-wrap gap-1.5">
                  {s.chapters.map((c) => {
                    const p = state.progress[chapterKey(s.id, c.n)];
                    const status: ChapterStatus = p && !p.deleted ? p.status : "not-started";
                    return (
                      <Link
                        key={c.n}
                        href={`/subjects/${s.id}/${c.n}`}
                        title={`${c.n}. ${c.title}: ${STATUS_LABEL[status]}`}
                        aria-label={`${s.name} ${c.n}, ${c.title}: ${STATUS_LABEL[status]}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-xs font-semibold tabular-nums outline-offset-2 hover:ring-2 hover:ring-accent"
                        style={{
                          background: STATUS_COLOR[status],
                          color: status === "done" || status === "revising" ? "#fff" : "var(--ink)",
                          boxShadow: notes[s.id]?.includes(c.n) ? `inset 0 -3px 0 ${s.color}` : undefined,
                        }}
                      >
                        {c.n}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">A coloured underline means notes are ready for that chapter. Tap a square to open it.</p>
      </Section>

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Up next" aside={<Link href="/planner" className="text-accent">Planner</Link>}>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing due in the next two days. <Link href="/planner" className="text-accent underline">Add a task</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {tasks.map((x) => {
                const overdue = x.due && x.due < t;
                return (
                  <li key={x.id} className="flex items-start gap-3 px-3 py-2.5">
                    <button
                      aria-label={`Mark "${x.title}" done`}
                      onClick={() => put("tasks", { ...x, done: true })}
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-line text-transparent hover:text-done"
                    >
                      <IconCheck className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">{x.title}</p>
                      <p className="text-xs text-muted">
                        {x.subject && <SubjectName id={x.subject} />}
                        {x.due && (
                          <span className={overdue ? "ml-2 font-semibold text-mark" : "ml-2"}>
                            {overdue ? "Overdue, " : "Due "}
                            {x.due === t ? "today" : formatDate(x.due)}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Pick up where you left off">
          {continueCh ? (
            (() => {
              const s = getSubject(continueCh[0])!;
              const c = getChapter(continueCh[0], Number(continueCh[1]))!;
              return (
                <Link
                  href={`/subjects/${s.id}/${c.n}`}
                  className="block rounded-xl border border-line bg-surface p-4 hover:border-accent"
                >
                  <p className="text-sm text-muted">
                    <SubjectName id={s.id} />
                  </p>
                  <p className={`mt-1 text-lg font-semibold ${s.rtl ? "urdu text-right" : ""}`}>
                    {s.rtl ? c.title : `${s.unitLabel} ${c.n}: ${c.title}`}
                  </p>
                  <p className="mt-1 text-sm text-accent">Open chapter</p>
                </Link>
              );
            })()
          ) : (
            <p className="text-sm text-muted">
              Open any chapter from the <Link href="/subjects" className="text-accent underline">subjects list</Link> and it will show up here.
            </p>
          )}

          <h3 className="mb-2 mt-6 font-bold">Latest test marks</h3>
          {tests.length === 0 ? (
            <p className="text-sm text-muted">
              No tests recorded yet. <Link href="/tests" className="text-accent underline">Add your marks</Link> after each test.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tests.map((x) => {
                const p = x.total ? x.obtained / x.total : 0;
                return (
                  <li key={x.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <SubjectName id={x.subject} /> <span className="text-muted">{x.title}</span>
                    </span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{ color: p >= 0.8 ? "var(--done)" : p < 0.5 ? "var(--mark)" : "var(--ink)" }}
                    >
                      {x.obtained}/{x.total} ({pct(p)})
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
