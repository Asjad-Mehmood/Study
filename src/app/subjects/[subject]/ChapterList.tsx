"use client";

import Link from "next/link";
import { useStore } from "@/components/store";
import { PageHeader, ProgressBar, STATUS_COLOR, STATUS_LABEL } from "@/components/ui";
import { getSubject, chapterKey, type SubjectId } from "@/lib/syllabus";
import { chapterCompletion, live, pct, subjectCompletion } from "@/lib/utils";

export function ChapterList({
  subjectId,
  notes,
  mcqCounts,
  introHtml,
}: {
  subjectId: SubjectId;
  notes: number[];
  mcqCounts: Record<number, number>;
  introHtml: string | null;
}) {
  const s = getSubject(subjectId)!;
  const { state } = useStore();
  const quizzes = live(state.quizzes).filter((q) => q.subject === subjectId);

  return (
    <div>
      <Link href="/subjects" className="text-sm text-accent">
        All subjects
      </Link>
      <PageHeader
        title={s.name}
        lead={
          <>
            {s.book}. {pct(subjectCompletion(state, s.id))} complete.{" "}
            {notes.length === 0 && <>Notes for this book are written in phase {s.phase} of the plan.</>}
          </>
        }
      />
      <div className="mb-6">
        <ProgressBar value={subjectCompletion(state, s.id)} color={s.color} label={`${s.name} progress`} />
      </div>

      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {s.chapters.map((c) => {
          const p = state.progress[chapterKey(s.id, c.n)];
          const status = p && !p.deleted ? p.status : "not-started";
          const best = quizzes
            .filter((q) => q.chapter === c.n)
            .reduce((m, q) => Math.max(m, q.total ? q.score / q.total : 0), -1);
          const hasNotes = notes.includes(c.n);
          return (
            <li key={c.n}>
              <Link href={`/subjects/${s.id}/${c.n}`} className="flex items-center gap-3 px-3 py-3 hover:bg-sunk sm:px-4">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-bold tabular-nums"
                  style={{
                    background: STATUS_COLOR[status],
                    color: status === "done" || status === "revising" ? "#fff" : "var(--ink)",
                  }}
                  title={STATUS_LABEL[status]}
                >
                  {c.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-semibold leading-snug ${s.rtl ? "urdu text-right" : ""}`}>{c.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {STATUS_LABEL[status]}
                    {c.sub ? `, ${c.sub}` : ""}
                    {c.pages ? `, book p. ${c.pages}` : ""}
                    {hasNotes ? ", notes ready" : ""}
                    {mcqCounts[c.n] ? `, ${mcqCounts[c.n]} practice MCQs` : ""}
                    {best >= 0 ? `, best quiz ${pct(best)}` : ""}
                  </span>
                </span>
                <span className="hidden w-24 shrink-0 sm:block">
                  <ProgressBar value={chapterCompletion(p)} color={s.color} label={`${c.title} progress`} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {introHtml && (
        <details className="mt-8 rounded-xl border border-line bg-surface p-4">
          <summary className="cursor-pointer font-semibold">How these notes are organised</summary>
          <div className="notes mt-3" dangerouslySetInnerHTML={{ __html: introHtml }} />
        </details>
      )}
    </div>
  );
}
