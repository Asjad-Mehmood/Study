"use client";

import Link from "next/link";
import { useStore } from "@/components/store";
import { PageHeader, ProgressBar } from "@/components/ui";
import { SUBJECTS, chapterKey } from "@/lib/syllabus";
import { pct, subjectCompletion } from "@/lib/utils";

export function SubjectsOverview({ notes }: { notes: Record<string, number[]> }) {
  const { state } = useStore();
  return (
    <div>
      <PageHeader
        title="Subjects"
        lead="All six books of ICS Part-II (Physics group), PECTAA session 2026-27. Open a subject to see its chapters, notes and your progress."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {SUBJECTS.map((s) => {
          const done = s.chapters.filter((c) => state.progress[chapterKey(s.id, c.n)]?.status === "done").length;
          const ready = notes[s.id]?.length ?? 0;
          return (
            <li key={s.id}>
              <Link
                href={`/subjects/${s.id}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-4 hover:border-accent"
                style={{ borderLeft: `4px solid ${s.color}` }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold">{s.name}</h2>
                  <span className="text-sm text-muted tabular-nums">{pct(subjectCompletion(state, s.id))}</span>
                </div>
                <ProgressBar value={subjectCompletion(state, s.id)} color={s.color} label={`${s.name} progress`} />
                <p className="text-sm text-muted">
                  {s.chapters.length} {s.id === "urdu" ? "lessons" : s.unitLabel === "Unit" ? "units" : "chapters"}, {done} done.{" "}
                  {ready === s.chapters.length
                    ? "All notes ready."
                    : ready > 0
                      ? `Notes ready for ${ready}.`
                      : `Notes come in phase ${s.phase}.`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
