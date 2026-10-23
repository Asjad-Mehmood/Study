"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { ProgressBar } from "@/components/ui";
import { uid, today } from "@/lib/utils";
import type { SubjectId } from "@/lib/syllabus";

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  /** Where the question comes from, shown in mixed quizzes. */
  from?: string;
  /** Chapter number, kept so results can be traced back. */
  chapter: number;
  /** Index of the question inside its chapter. */
  index: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LETTERS = ["a", "b", "c", "d", "e"];

export function Quiz({
  subject,
  chapter,
  title,
  questions,
  limit,
  backHref,
}: {
  subject: SubjectId;
  chapter: number;
  title: string;
  questions: QuizQuestion[];
  limit?: number;
  backHref: string;
}) {
  const { put } = useStore();
  const [round, setRound] = useState(0);
  // Shuffled in the browser only, so the server-rendered page and the first client render match.
  const [order, setOrder] = useState<QuizQuestion[] | null>(null);
  useEffect(() => {
    // Shuffle the questions, and the options inside each one, so answers can't be learnt by position.
    const q = shuffle(questions).map((item) => {
      // Keep the book order when an option refers to the others ("all of the above", "both (a) and (b)").
      if (item.options.some((o) => /all of|above|both|\([a-d]\)/i.test(o))) return item;
      const perm = shuffle(item.options.map((_, k) => k));
      return { ...item, options: perm.map((k) => item.options[k]), answer: perm.indexOf(item.answer) };
    });
    setOrder(limit ? q.slice(0, limit) : q);
  }, [questions, limit, round]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);

  if (!order) return <div className="h-64" aria-busy="true" />;
  const list = order;

  const finished = answers.length === order.length && order.length > 0;
  const score = answers.filter((a, k) => a === order[k].answer).length;

  function choose(opt: number) {
    if (picked !== null) return;
    setPicked(opt);
  }

  function next() {
    if (picked === null) return;
    const nextAnswers = [...answers, picked];
    setAnswers(nextAnswers);
    setPicked(null);
    if (nextAnswers.length < list.length) {
      setI(i + 1);
    } else if (!saved) {
      const s = nextAnswers.filter((a, k) => a === list[k].answer).length;
      put("quizzes", {
        id: uid(),
        updatedAt: 0,
        subject,
        chapter,
        score: s,
        total: list.length,
        date: today(),
        wrong: list.map((q, k) => (nextAnswers[k] === q.answer ? -1 : q.index)).filter((x) => x >= 0),
      });
      setSaved(true);
    }
  }

  function restart() {
    setRound((r) => r + 1);
    setI(0);
    setPicked(null);
    setAnswers([]);
    setSaved(false);
  }

  if (order.length === 0) {
    return <p className="text-muted">No questions available yet.</p>;
  }

  if (finished) {
    const p = score / order.length;
    const wrong = order.map((q, k) => ({ q, a: answers[k] })).filter(({ q, a }) => a !== q.answer);
    return (
      <div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-1 font-serif text-4xl font-semibold tabular-nums">
            {score} / {order.length}
          </p>
          <p className="mt-1" style={{ color: p >= 0.8 ? "var(--done)" : p < 0.5 ? "var(--mark)" : "var(--ink)" }}>
            {p === 1
              ? "Full marks."
              : p >= 0.8
                ? "Strong result. Review the misses below."
                : p >= 0.5
                  ? "Passing, but revise the misses before moving on."
                  : "Re-read the key ideas for this chapter, then try again."}
          </p>
          <p className="mt-1 text-xs text-muted">Saved to your practice history.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={restart}>
              Try again
            </button>
            <Link href={backHref} className="btn btn-quiet">
              Back
            </Link>
          </div>
        </div>
        {wrong.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-bold">Review your mistakes</h2>
            <ol className="flex flex-col gap-3">
              {wrong.map(({ q, a }, k) => (
                <li key={k} className="rounded-xl border border-line bg-surface p-4">
                  {q.from && <p className="mb-1 text-xs text-muted">{q.from}</p>}
                  <p className="font-semibold">{q.question}</p>
                  <p className="mt-2 text-sm">
                    <span className="text-mark">Your answer: ({LETTERS[a]}) {q.options[a]}</span>
                    <br />
                    <span className="text-done">
                      Correct: ({LETTERS[q.answer]}) {q.options[q.answer]}
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  const q = order[i];
  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm tabular-nums text-muted">
          {i + 1} of {order.length}
        </span>
        <div className="flex-1">
          <ProgressBar value={i / order.length} label="Quiz progress" />
        </div>
        <span className="text-sm tabular-nums text-muted">{answers.filter((a, k) => a === order[k].answer).length} right</span>
      </div>
      {q.from && <p className="mb-1 text-sm text-muted">{q.from}</p>}
      <h2 className="font-serif text-2xl leading-snug">{q.question}</h2>
      <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label="Options">
        {q.options.map((o, k) => {
          const isRight = k === q.answer;
          const isPicked = picked === k;
          let style = "border-line bg-surface hover:border-accent";
          if (picked !== null) {
            if (isRight) style = "border-done bg-[color-mix(in_oklab,var(--done)_12%,var(--surface))]";
            else if (isPicked) style = "border-mark bg-[color-mix(in_oklab,var(--mark)_10%,var(--surface))]";
            else style = "border-line bg-surface opacity-70";
          }
          return (
            <button
              key={k}
              role="radio"
              aria-checked={isPicked}
              disabled={picked !== null}
              onClick={() => choose(k)}
              className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left ${style}`}
            >
              <span className="font-bold text-muted">({LETTERS[k]})</span>
              <span className="flex-1">{o}</span>
              {picked !== null && isRight && <span className="text-sm font-semibold text-done">Correct</span>}
              {picked !== null && isPicked && !isRight && <span className="text-sm font-semibold text-mark">Your pick</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn btn-primary" onClick={next} disabled={picked === null}>
          {i + 1 === order.length ? "See result" : "Next question"}
        </button>
      </div>
    </div>
  );
}
