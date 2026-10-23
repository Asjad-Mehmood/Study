"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { ChapterSelect, Empty, Field, PageHeader, Section, SubjectName, SubjectSelect } from "@/components/ui";
import { IconTrash } from "@/components/icons";
import { PHASES, SUBJECTS, chapterKey, getChapter, getSubject, type SubjectId } from "@/lib/syllabus";
import type { Task } from "@/lib/types";
import { addDays, daysBetween, formatDate, live, today, uid } from "@/lib/utils";

export function Planner({ notes }: { notes: Record<string, number[]> }) {
  const { state, settings, put, remove } = useStore();
  const t = today();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectId | "other">("physics");
  const [chapter, setChapter] = useState<number | undefined>();
  const [due, setDue] = useState("");
  useEffect(() => setDue(today()), []);
  const [high, setHigh] = useState(false);
  const [showDone, setShowDone] = useState(false);

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    put("tasks", {
      id: uid(),
      updatedAt: 0,
      title: text,
      subject: subject === "other" ? undefined : subject,
      chapter: subject === "other" ? undefined : chapter,
      due: due || undefined,
      done: false,
      priority: high ? "high" : "normal",
      createdAt: Date.now(),
    });
    setTitle("");
    setHigh(false);
  }

  const tasks = live(state.tasks);
  const open = tasks.filter((x) => !x.done);
  const groups: { title: string; items: Task[]; tone?: string }[] = [
    { title: "Overdue", items: open.filter((x) => x.due && x.due < t), tone: "var(--mark)" },
    { title: "Today", items: open.filter((x) => x.due === t) },
    { title: "Next 7 days", items: open.filter((x) => x.due && x.due > t && x.due <= addDays(t, 7)) },
    { title: "Later", items: open.filter((x) => x.due && x.due > addDays(t, 7)) },
    { title: "No date", items: open.filter((x) => !x.due) },
  ].map((g) => ({
    ...g,
    items: g.items.sort(
      (a, b) =>
        (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1) ||
        (a.due ?? "").localeCompare(b.due ?? "") ||
        a.createdAt - b.createdAt,
    ),
  }));
  const done = tasks.filter((x) => x.done).sort((a, b) => b.updatedAt - a.updatedAt);

  // Pace: chapters left vs weeks left
  const weeksLeft = settings.examDate ? Math.max(0, daysBetween(t, settings.examDate)) / 7 : null;
  const pace = useMemo(
    () =>
      SUBJECTS.map((s) => {
        const left = s.chapters.filter((c) => state.progress[chapterKey(s.id, c.n)]?.status !== "done");
        return { s, left };
      }),
    [state.progress],
  );
  const totalLeft = pace.reduce((m, p) => m + p.left.length, 0);

  function addPaceTasks() {
    // One task per subject: the next unfinished chapter, due within the week.
    let k = 0;
    for (const { s, left } of pace) {
      const next = left[0];
      if (!next) continue;
      const exists = open.some((x) => x.subject === s.id && x.chapter === next.n);
      if (exists) continue;
      put("tasks", {
        id: uid(),
        updatedAt: 0,
        title: s.rtl ? `${s.name}: ${next.title}` : `Finish ${s.name} ${s.unitLabel.toLowerCase()} ${next.n}: ${next.title}`,
        subject: s.id,
        chapter: next.n,
        due: addDays(t, 2 + k),
        done: false,
        priority: "normal",
        createdAt: Date.now() + k,
      });
      k++;
    }
  }

  return (
    <div>
      <PageHeader title="Planner" lead="Your tasks, your weekly pace and the plan for writing every book's notes." />

      <Section title="Add a task">
        <form onSubmit={addTask} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <Field label="Task" htmlFor="task-title">
            <input
              id="task-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solve Physics ch. 4 numericals 16.1–16.5"
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject" htmlFor="task-subject">
              <SubjectSelect id="task-subject" value={subject} allowOther onChange={(v) => { setSubject(v); setChapter(undefined); }} />
            </Field>
            <Field label="Chapter" htmlFor="task-chapter">
              <ChapterSelect id="task-chapter" subject={subject} value={chapter} onChange={setChapter} />
            </Field>
            <Field label="Due" htmlFor="task-due">
              <input id="task-due" className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={high} onChange={(e) => setHigh(e.target.checked)} className="h-4 w-4 accent-[var(--mark)]" />
              High priority
            </label>
            <button className="btn btn-primary" type="submit">
              Add task
            </button>
          </div>
        </form>
      </Section>

      <Section title="Tasks" aside={`${open.length} open`}>
        {open.length === 0 ? (
          <Empty>No open tasks. Add one above, or use the weekly pace below to fill your week.</Empty>
        ) : (
          <div className="flex flex-col gap-5">
            {groups
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.title}>
                  <h3 className="mb-1.5 text-sm font-bold" style={{ color: g.tone }}>
                    {g.title}
                  </h3>
                  <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                    {g.items.map((x) => (
                      <TaskRow key={x.id} task={x} onToggle={() => put("tasks", { ...x, done: !x.done })} onDelete={() => remove("tasks", x.id)} />
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
        {done.length > 0 && (
          <div className="mt-5">
            <button className="text-sm text-accent underline" onClick={() => setShowDone(!showDone)}>
              {showDone ? "Hide" : "Show"} {done.length} completed
            </button>
            {showDone && (
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface opacity-80">
                {done.slice(0, 50).map((x) => (
                  <TaskRow key={x.id} task={x} onToggle={() => put("tasks", { ...x, done: !x.done })} onDelete={() => remove("tasks", x.id)} />
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      <Section title="Weekly pace">
        <div className="rounded-xl border border-line bg-surface p-4">
          {weeksLeft === null ? (
            <p className="text-sm text-muted">
              <Link href="/settings" className="text-accent underline">Set your exam date</Link> to see how many chapters you need to finish each week.
            </p>
          ) : (
            <p>
              <strong>{totalLeft}</strong> chapters left and <strong>{weeksLeft.toFixed(1)}</strong> weeks until exams. Aim for{" "}
              <strong>{weeksLeft > 0 ? Math.ceil(totalLeft / Math.max(weeksLeft - 4, 1)) : totalLeft}</strong> chapters a week, which
              leaves the last 4 weeks for full-book revision and past papers.
            </p>
          )}
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {pace.map(({ s, left }) => (
              <li key={s.id} className="flex min-w-0 items-baseline justify-between gap-2">
                <span className="shrink-0">
                  <SubjectName id={s.id} />
                </span>
                <span className="min-w-0 truncate text-muted">
                  {left.length === 0 ? (
                    "All done"
                  ) : (
                    <>
                      {left.length} left, next:{" "}
                      {s.rtl ? <bdi className="urdu leading-normal">{left[0].title}</bdi> : `${left[0].n}. ${left[0].title}`}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <button className="btn btn-quiet mt-4" onClick={addPaceTasks}>
            Add next chapter of each subject as tasks
          </button>
        </div>
      </Section>

      <Section title="Notes plan" className="scroll-mt-20" aside="One phase per book">
        <ol id="plan" className="flex flex-col gap-2">
          {PHASES.map((p) => {
            const s = getSubject(p.subject)!;
            const ready = notes[p.subject]?.length ?? 0;
            const total = s.chapters.length;
            const status = ready === total ? "Notes ready" : ready > 0 ? `${ready} of ${total} written` : "Not started";
            return (
              <li key={p.n} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                  style={{ background: ready === total ? "var(--done)" : "var(--sunk)", color: ready === total ? "#fff" : "var(--ink)" }}
                >
                  {p.n}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">
                    Phase {p.n}: {p.title} <span className="font-normal text-muted">({status})</span>
                  </p>
                  <p className="text-sm text-muted">{p.detail}</p>
                  {ready > 0 && (
                    <Link href={`/subjects/${s.id}`} className="text-sm text-accent">
                      Open {s.name}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const t = today();
  const c = task.subject && task.chapter ? getChapter(task.subject, task.chapter) : undefined;
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--done)]"
        checked={task.done}
        onChange={onToggle}
        aria-label={`Mark "${task.title}" ${task.done ? "not done" : "done"}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`leading-snug ${task.done ? "text-muted line-through" : ""}`}>
          {task.priority === "high" && !task.done && <span className="mr-1.5 text-xs font-bold text-mark">High</span>}
          {task.title}
        </p>
        <p className="text-xs text-muted">
          {task.subject && <SubjectName id={task.subject} />}
          {c && task.subject && (
            <Link href={`/subjects/${task.subject}/${c.n}`} className="ml-1.5 text-accent">
              open chapter
            </Link>
          )}
          {task.due && (
            <span className={`ml-2 ${!task.done && task.due < t ? "font-semibold text-mark" : ""}`}>
              {task.due === t ? "Today" : formatDate(task.due, { weekday: "short", day: "numeric", month: "short" })}
            </span>
          )}
        </p>
      </div>
      <button aria-label="Delete task" className="text-muted hover:text-mark" onClick={onDelete}>
        <IconTrash />
      </button>
    </li>
  );
}
