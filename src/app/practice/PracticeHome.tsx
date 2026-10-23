"use client";

import Link from "next/link";
import { useStore } from "@/components/store";
import { Empty, PageHeader, Section, SubjectName } from "@/components/ui";
import { SUBJECTS, getChapter } from "@/lib/syllabus";
import { formatDate, live, pct } from "@/lib/utils";

export function PracticeHome({ counts }: { counts: Record<string, Record<number, number>> }) {
  const { state } = useStore();
  const attempts = live(state.quizzes).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div>
      <PageHeader
        title="Practice"
        lead="MCQ quizzes built from your notes. Every attempt is saved so you can see which chapters need another pass."
      />

      {SUBJECTS.map((s) => {
        const chapters = s.chapters.filter((c) => counts[s.id]?.[c.n]);
        const total = chapters.reduce((m, c) => m + (counts[s.id][c.n] ?? 0), 0);
        return (
          <Section
            key={s.id}
            title={s.name}
            aside={total > 0 ? `${total} questions` : `Arrives in phase ${s.phase}`}
          >
            {chapters.length === 0 ? (
              <Empty>Quizzes for {s.name} are added when its notes are written.</Empty>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/practice/${s.id}/all`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-accent bg-surface px-4 py-3 font-semibold text-accent"
                >
                  Mixed quiz: 15 random questions from all chapters
                </Link>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {chapters.map((c) => {
                    const mine = attempts.filter((a) => a.subject === s.id && a.chapter === c.n);
                    const best = mine.reduce((m, a) => Math.max(m, a.total ? a.score / a.total : 0), -1);
                    return (
                      <li key={c.n}>
                        <Link
                          href={`/practice/${s.id}/${c.n}`}
                          className="flex h-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent"
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold leading-snug">
                              {c.n}. {c.title}
                            </span>
                            <span className="text-xs text-muted">
                              {counts[s.id][c.n]} questions
                              {mine.length ? `, ${mine.length} attempt${mine.length > 1 ? "s" : ""}` : ""}
                            </span>
                          </span>
                          <span
                            className="shrink-0 text-sm font-semibold tabular-nums"
                            style={{ color: best < 0 ? "var(--muted)" : best >= 0.8 ? "var(--done)" : best < 0.5 ? "var(--mark)" : "var(--ink)" }}
                          >
                            {best < 0 ? "Not tried" : `Best ${pct(best)}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Section>
        );
      })}

      <Section title="Recent attempts">
        {attempts.length === 0 ? (
          <Empty>Your quiz results will be listed here.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-sunk text-left">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Quiz</th>
                  <th className="px-3 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 15).map((a) => {
                  const c = getChapter(a.subject, a.chapter);
                  const p = a.total ? a.score / a.total : 0;
                  return (
                    <tr key={a.id} className="border-t border-line">
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{formatDate(a.date)}</td>
                      <td className="px-3 py-2">
                        <SubjectName id={a.subject} /> <span className="text-muted">{c ? `${c.n}. ${c.title}` : "Mixed"}</span>
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums"
                        style={{ color: p >= 0.8 ? "var(--done)" : p < 0.5 ? "var(--mark)" : "var(--ink)" }}
                      >
                        {a.score}/{a.total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
