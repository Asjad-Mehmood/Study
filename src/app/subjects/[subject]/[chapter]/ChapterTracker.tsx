"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { useTimer } from "@/components/timer";
import { ProgressBar, STATUS_LABEL } from "@/components/ui";
import { IconPlay } from "@/components/icons";
import { CHECKS, chapterKey, getSubject, type SubjectId } from "@/lib/syllabus";
import type { ChapterStatus } from "@/lib/types";
import { chapterCompletion, formatMinutes, live } from "@/lib/utils";

const STATUSES: ChapterStatus[] = ["not-started", "reading", "revising", "done"];

export function ChapterTracker({ subjectId, chapter, mcqCount }: { subjectId: SubjectId; chapter: number; mcqCount: number }) {
  const { state, ready, updateChapter } = useStore();
  const { timer, start } = useTimer();
  const s = getSubject(subjectId)!;
  const p = state.progress[chapterKey(subjectId, chapter)];
  const live_ = p && !p.deleted ? p : undefined;
  const status = live_?.status ?? "not-started";
  const [note, setNote] = useState("");

  // Remember the last chapter opened, for "pick up where you left off".
  useEffect(() => {
    if (!ready) return;
    updateChapter(subjectId, chapter, { lastOpened: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, subjectId, chapter]);

  useEffect(() => {
    setNote(live_?.note ?? "");
  }, [live_?.note, chapter]);

  const minutes = live(state.sessions)
    .filter((x) => x.subject === subjectId && x.chapter === chapter)
    .reduce((m, x) => m + x.minutes, 0);
  const quizzes = live(state.quizzes).filter((q) => q.subject === subjectId && q.chapter === chapter);
  const best = quizzes.reduce((m, q) => Math.max(m, q.total ? q.score / q.total : 0), -1);

  const running = timer && timer.subject === subjectId && timer.chapter === chapter;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">Your progress</h2>
        <span className="text-sm tabular-nums text-muted">{Math.round(chapterCompletion(live_) * 100)}%</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={chapterCompletion(live_)} color={s.color} label="Chapter progress" />
      </div>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-sm font-semibold">Status</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => updateChapter(subjectId, chapter, { status: st })}
              aria-pressed={status === st}
              className={`rounded-lg border px-2 py-1.5 text-sm ${
                status === st ? "border-accent bg-accent font-semibold text-accent-ink" : "border-line hover:bg-sunk"
              }`}
            >
              {STATUS_LABEL[st]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-1 text-sm font-semibold">Checklist</legend>
        <ul className="flex flex-col">
          {CHECKS.map((c) => {
            const on = Boolean(live_?.checks?.[c.id]);
            return (
              <li key={c.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 hover:bg-sunk">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--done)]"
                    checked={on}
                    onChange={(e) => updateChapter(subjectId, chapter, { checks: { [c.id]: e.target.checked } })}
                  />
                  <span className="text-sm leading-snug">
                    {c.label}
                    <span className="block text-xs text-muted">{c.hint}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="mt-3">
        <legend className="mb-1 text-sm font-semibold">How confident are you?</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Confidence">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={(live_?.confidence ?? 0) === v}
              aria-label={`${v} of 5`}
              onClick={() => updateChapter(subjectId, chapter, { confidence: (live_?.confidence ?? 0) === v ? 0 : v })}
              className={`h-8 flex-1 rounded-md border text-sm font-semibold ${
                (live_?.confidence ?? 0) >= v ? "border-transparent text-white" : "border-line text-muted"
              }`}
              style={(live_?.confidence ?? 0) >= v ? { background: s.color } : undefined}
            >
              {v}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-sm font-semibold" htmlFor={`note-${subjectId}-${chapter}`}>
        My notes for this chapter
      </label>
      <textarea
        id={`note-${subjectId}-${chapter}`}
        className="input mt-1 min-h-20 text-sm"
        placeholder="Weak points, teacher's tips, questions to ask…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note !== (live_?.note ?? "")) updateChapter(subjectId, chapter, { note });
        }}
      />

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted">Time studied</dt>
          <dd className="font-semibold tabular-nums">{formatMinutes(minutes)}</dd>
        </div>
        <div>
          <dt className="text-muted">Best quiz</dt>
          <dd className="font-semibold tabular-nums">{best >= 0 ? `${Math.round(best * 100)}%` : "None yet"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {running ? (
          <Link href="/timer" className="btn btn-quiet">
            Timer running
          </Link>
        ) : (
          <button className="btn btn-quiet" onClick={() => start(subjectId, chapter)} disabled={Boolean(timer)}>
            <IconPlay /> Time this chapter
          </button>
        )}
        {mcqCount > 0 && (
          <Link href={`/practice/${subjectId}/${chapter}`} className="btn btn-primary">
            Practise {mcqCount} MCQs
          </Link>
        )}
      </div>
      {timer && !running && <p className="mt-2 text-xs text-muted">Another timer is running. Stop it on the Timer page first.</p>}
    </div>
  );
}
