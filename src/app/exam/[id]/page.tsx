"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { aiPost, compressPhoto } from "@/components/ai";
import { RichText } from "@/components/RichText";
import { useStore } from "@/components/store";
import { IconCamera, IconTrash } from "@/components/icons";
import {
  DIFFICULTY_LABEL,
  KIND_LABEL,
  chapterScores,
  scorePaper,
  writtenQuestions,
  type Mark,
  type Paper,
  type PaperSection,
  type Question,
} from "@/lib/exam";
import { getChapter, getSubject } from "@/lib/syllabus";
import type { ExamRecord } from "@/lib/types";
import { formatMinutes, pct, today, uid } from "@/lib/utils";

type Photo = { mime: string; data: string; preview: string };
const MAX_PHOTOS = 10;
const LETTERS = ["A", "B", "C", "D"];

function clock(ms: number) {
  const neg = ms < 0;
  const t = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const body = h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  return neg ? `+${body}` : body;
}

function chaptersText(p: Paper) {
  const s = getSubject(p.subject)!;
  return p.chapters.length === s.chapters.length ? "All chapters" : `Chapter${p.chapters.length > 1 ? "s" : ""} ${p.chapters.join(", ")}`;
}

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const { state, ready } = useStore();
  const exam = state.exams[id];
  if (!ready) return <div className="h-64 animate-pulse rounded-xl bg-sunk" />;
  if (!exam || exam.deleted)
    return (
      <div className="py-10">
        <h1 className="font-serif text-3xl font-semibold">Paper not found</h1>
        <p className="mt-2 text-muted">It may have been deleted, or it was made on a device that hasn&rsquo;t synced yet.</p>
        <Link href="/exam" className="mt-4 inline-block text-accent underline">
          Back to the exam maker
        </Link>
      </div>
    );
  if (!exam.paper)
    return (
      <div className="py-10">
        <h1 className="font-serif text-3xl font-semibold">{exam.title}</h1>
        <p className="mt-2 text-muted">
          {exam.score !== undefined ? `You scored ${exam.score}/${exam.total}. ` : ""}The questions of older papers are cleared to keep your saved data small.
        </p>
        <Link href="/exam" className="mt-4 inline-block text-accent underline">
          Back to the exam maker
        </Link>
      </div>
    );
  return <ExamView key={exam.id} exam={exam} paper={exam.paper} />;
}

function ExamView({ exam, paper }: { exam: ExamRecord; paper: Paper }) {
  const { put, state } = useStore();
  const latest = useRef(exam);
  latest.current = state.exams[exam.id] ?? exam;
  const [drafts, setDrafts] = useState<Record<string, string>>(() => ({ ...exam.answers }));
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const subject = getSubject(paper.subject)!;
  const ur = paper.lang === "ur";
  const status = exam.status === "marking" && !busy ? "in-progress" : exam.status;

  useEffect(() => {
    if (status !== "in-progress") return;
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, [status]);

  const flush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = null;
    const cur = latest.current;
    const merged = { ...cur.answers, ...draftsRef.current };
    for (const k of Object.keys(merged)) if (merged[k] === "") delete merged[k];
    const same = Object.keys(merged).length === Object.keys(cur.answers).length && Object.entries(merged).every(([k, v]) => cur.answers[k] === v);
    if (!same) put("exams", { ...cur, answers: merged });
    return merged;
  }, [put]);

  useEffect(() => () => void flush(), [flush]);

  function setAnswer(qid: string, value: string, immediate = false) {
    setDrafts((d) => ({ ...d, [qid]: value }));
    draftsRef.current = { ...draftsRef.current, [qid]: value };
    if (immediate) flush();
    else {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flush, 900);
    }
  }

  function start() {
    put("exams", { ...latest.current, status: "in-progress", startedAt: Date.now() });
    window.scrollTo({ top: 0 });
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoMsg(null);
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, room);
    const out: Photo[] = [];
    for (const f of list) {
      try {
        out.push(await compressPhoto(f));
      } catch {
        setPhotoMsg(`Could not read ${f.name}. Use a JPEG or PNG photo.`);
      }
    }
    if (files.length > room) setPhotoMsg(`Up to ${MAX_PHOTOS} pages. The extra photos were left out.`);
    setPhotos((p) => [...p, ...out]);
  }

  async function submit() {
    setConfirm(false);
    setError(null);
    const answers = flush();
    const items = writtenQuestions(paper).map((q) => ({
      id: q.id,
      label: q.label,
      text: q.text,
      marks: q.marks,
      points: q.points ?? [],
      answer: answers[q.id] ?? "",
    }));
    const needsAi = items.some((x) => x.answer.trim()) || photos.length > 0;
    const first = !latest.current.submittedAt;
    setBusy(true);
    put("exams", { ...latest.current, answers, status: "marking" });
    let marks: Record<string, Mark> = {};
    if (needsAi) {
      const r = await aiPost<{ marks: Record<string, Mark> }>("/api/exam/mark", {
        subject: paper.subject,
        lang: paper.lang,
        items,
        images: photos.map(({ mime, data }) => ({ mime, data })),
      });
      if (!r.ok) {
        setBusy(false);
        put("exams", { ...latest.current, status: first ? "in-progress" : "marked" });
        setError(r.message);
        return;
      }
      marks = r.data.marks;
    }
    const { score, total } = scorePaper(paper, answers, marks);
    const testId = latest.current.testId ?? uid();
    put("tests", {
      id: testId,
      updatedAt: 0,
      subject: paper.subject,
      title: `${KIND_LABEL[paper.kind]} (${DIFFICULTY_LABEL[paper.difficulty].toLowerCase()})`,
      kind: "ai-paper",
      date: today(),
      obtained: score,
      total,
      chapters: paper.chapters.length === subject.chapters.length ? "all" : paper.chapters.join(", "),
      note: "Made and marked by the exam maker",
    });
    if (first && latest.current.startedAt) {
      const minutes = Math.min(Math.round((Date.now() - latest.current.startedAt) / 60000), Math.round(paper.minutes * 1.5));
      if (minutes >= 1)
        put("sessions", {
          id: uid(),
          updatedAt: 0,
          subject: paper.subject,
          minutes,
          date: today(),
          note: `Practice paper: ${KIND_LABEL[paper.kind].toLowerCase()}`,
        });
    }
    put("exams", {
      ...latest.current,
      answers,
      marks,
      score,
      total,
      testId,
      status: "marked",
      submittedAt: latest.current.submittedAt ?? Date.now(),
      photos: photos.length || latest.current.photos,
    });
    setBusy(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const answered = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of paper.sections) out[s.key] = s.questions.filter((q) => (drafts[q.id] ?? "").trim() !== "").length;
    return out;
  }, [drafts, paper.sections]);

  const remaining = exam.startedAt ? exam.startedAt + paper.minutes * 60000 - now : paper.minutes * 60000;
  const marked = status === "marked";
  const result = marked ? scorePaper(paper, exam.answers, exam.marks) : null;

  return (
    <div>
      <Link href="/exam" className="text-sm text-accent print:hidden">
        Exam maker
      </Link>
      <header className="mb-5 mt-1">
        <h1 className="font-serif text-3xl font-semibold leading-tight text-balance md:text-4xl">{paper.title}</h1>
        <p className="mt-1 text-muted">
          {chaptersText(paper)}. {DIFFICULTY_LABEL[paper.difficulty]}. {paper.total} marks, {formatMinutes(paper.minutes)}.
        </p>
        {!paper.basedOnNotes && (
          <p className="mt-2 max-w-prose text-sm text-warn print:hidden">
            Some chapters have no notes yet, so their questions come from the chapter topic. Check anything doubtful with your book.
          </p>
        )}
      </header>

      {status === "ready" && (
        <div className="mb-8 rounded-xl border border-line bg-surface p-5 print:hidden">
          <h2 className="text-lg font-bold">Before you start</h2>
          <ul className="mt-2 flex max-w-prose list-disc flex-col gap-1 pl-5 text-sm">
            {paper.sections.map((s) => (
              <li key={s.key}>
                Q{s.number}: {s.kind === "mcq" ? `${s.questions.length} MCQs` : `${s.questions.length} ${s.kind} questions, answer ${s.attempt}`}, {s.marksEach} mark
                {s.marksEach > 1 ? "s" : ""} each
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-prose text-sm text-muted">
            Type your answers on screen, or write them on paper and add photos of your answer sheet before you submit. Write question
            numbers like 2(iii) clearly. MCQs are always answered on screen.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary px-5 py-2.5 text-base" onClick={start}>
              Start exam ({formatMinutes(paper.minutes)})
            </button>
            <button className="btn btn-quiet" onClick={() => window.print()}>
              Print paper
            </button>
          </div>
        </div>
      )}

      {status === "in-progress" && (
        <div
          className="sticky top-12 z-10 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur md:top-0 md:mx-0 md:rounded-xl md:border print:hidden"
          role="timer"
        >
          <span className="text-sm">
            <span className={`font-serif text-2xl font-semibold tabular-nums ${remaining < 0 ? "text-mark" : remaining < 5 * 60000 ? "text-warn" : ""}`}>
              {clock(remaining)}
            </span>
            <span className="ml-2 text-muted">{remaining < 0 ? "time is up" : "left"}</span>
          </span>
          <button className="btn btn-primary" onClick={() => setConfirm(true)} disabled={busy}>
            Submit
          </button>
        </div>
      )}

      {(busy || status === "marking") && (
        <div className="mb-6 rounded-xl border border-accent bg-surface p-4 text-sm" role="status">
          Marking your answers{photos.length ? ` and reading ${photos.length} photo${photos.length > 1 ? "s" : ""}` : ""}. This takes up to a minute…
        </div>
      )}

      {error && (
        <p className="mb-6 rounded-lg border border-mark/40 px-3 py-2 text-sm text-mark print:hidden" role="alert">
          {error}
        </p>
      )}

      {marked && result && <Result exam={exam} paper={paper} result={result} />}

      <div className={status === "ready" ? "hidden print:block" : ""}>
        {paper.sections.map((s) => (
          <SectionView
            key={s.key}
            section={s}
            ur={ur}
            mode={status === "ready" ? "print" : marked ? "review" : "answer"}
            answers={marked ? exam.answers : drafts}
            marks={exam.marks}
            counted={result?.sections.find((x) => x.key === s.key)?.counted ?? []}
            answeredCount={answered[s.key]}
            onAnswer={setAnswer}
            sectionScore={result?.sections.find((x) => x.key === s.key)}
          />
        ))}
      </div>

      {(status === "in-progress" || marked) && paper.sections.some((s) => s.kind !== "mcq") && (
        <section className="mb-8 rounded-xl border border-line bg-surface p-4 md:p-5 print:hidden">
          <h2 className="text-lg font-bold">{marked ? "Mark again" : "Answered on paper?"}</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            {marked
              ? "Changed your mind about a mark? Add the answer-sheet photos again (they aren't saved) and mark the paper again."
              : "Add a photo of each page of your answer sheet, in order. Typed answers and photos can be mixed."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <figure key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Answer sheet page ${i + 1}`} className="h-28 w-20 rounded-md border border-line object-cover" />
                <figcaption className="text-center text-xs text-muted">Page {i + 1}</figcaption>
                <button
                  aria-label={`Remove page ${i + 1}`}
                  className="absolute -right-2 -top-2 rounded-full border border-line bg-surface p-1 text-muted hover:text-mark"
                  onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </figure>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-28 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-xs text-muted hover:border-accent hover:text-accent">
                <IconCamera />
                Add page
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          {photoMsg && <p className="mt-2 text-sm text-warn">{photoMsg}</p>}
          {marked && (
            <button className="btn btn-quiet mt-4" onClick={submit} disabled={busy}>
              Mark again
            </button>
          )}
        </section>
      )}

      {status === "in-progress" && (
        <div className="mb-10 print:hidden">
          <button className="btn btn-primary px-5 py-2.5 text-base" onClick={() => setConfirm(true)} disabled={busy}>
            Submit for marking
          </button>
        </div>
      )}
      {confirm && status === "in-progress" && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 shadow-lg md:left-56 print:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          role="dialog"
          aria-label="Submit for marking"
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 md:px-4">
            <p className="text-sm font-semibold">
              Submit for marking now?
              {photos.length === 0 && Object.values(answered).every((n, i) => paper.sections[i].kind === "mcq" || n === 0) && paper.sections.some((x) => x.kind !== "mcq")
                ? " You haven't typed any written answers or added photos, so only the MCQs will be marked."
                : ""}
            </p>
            <div className="flex flex-1 justify-end gap-2">
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                Yes, mark it
              </button>
              <button className="btn btn-quiet" onClick={() => setConfirm(false)}>
                Keep working
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Result({
  exam,
  paper,
  result,
}: {
  exam: ExamRecord;
  paper: Paper;
  result: ReturnType<typeof scorePaper>;
}) {
  const p = result.total ? result.score / result.total : 0;
  const tone = p >= 0.8 ? "var(--done)" : p < 0.5 ? "var(--mark)" : "var(--ink)";
  const subject = getSubject(paper.subject)!;
  const byChapter = Object.entries(chapterScores(paper, exam.answers, exam.marks))
    .map(([n, v]) => ({ n: Number(n), ...v, p: v.of ? v.got / v.of : 0 }))
    .sort((a, b) => a.p - b.p);
  const again = `/exam?subject=${paper.subject}&kind=${paper.kind}&level=${paper.difficulty}&chapters=${paper.chapters.join(",")}`;
  return (
    <section className="mb-8 rounded-xl border border-line bg-surface p-4 md:p-5 print:hidden" aria-label="Result">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Your mark</p>
          <p className="font-serif text-5xl font-semibold tabular-nums" style={{ color: tone }}>
            {result.score}
            <span className="text-2xl text-muted">/{result.total}</span>
          </p>
          <p className="text-sm font-semibold" style={{ color: tone }}>
            {pct(p)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={again} className="btn btn-primary">
            Make another like this
          </Link>
          <Link href="/tests" className="btn btn-quiet">
            Saved in Tests
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-sm font-bold">By question</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {result.sections.map((r) => {
              const s = paper.sections.find((x) => x.key === r.key)!;
              return (
                <li key={r.key} className="flex justify-between gap-3">
                  <a href={`#q-${s.key}`} className="text-accent">
                    Q{s.number} {s.kind === "mcq" ? "MCQs" : s.kind === "short" ? "short" : "long"}
                  </a>
                  <span className="tabular-nums">
                    {r.score}/{r.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {byChapter.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-bold">By chapter, weakest first</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {byChapter.map((c) => {
                const ch = getChapter(paper.subject, c.n);
                return (
                  <li key={c.n} className="flex items-baseline justify-between gap-3">
                    <Link href={`/subjects/${paper.subject}/${c.n}`} className="min-w-0 truncate text-accent">
                      {c.n}. <bdi className={subject.rtl ? "urdu" : ""}>{ch?.title}</bdi>
                    </Link>
                    <span
                      className="shrink-0 tabular-nums"
                      style={{ color: c.p >= 0.8 ? "var(--done)" : c.p < 0.5 ? "var(--mark)" : undefined }}
                    >
                      {pct(c.p)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted">
        Written answers are marked by the AI against the key points. Read the feedback below; if a mark looks wrong, check the key points
        with your notes.
      </p>
    </section>
  );
}

function SectionView({
  section,
  ur,
  mode,
  answers,
  marks,
  counted,
  answeredCount,
  onAnswer,
  sectionScore,
}: {
  section: PaperSection;
  ur: boolean;
  mode: "print" | "answer" | "review";
  answers: Record<string, string>;
  marks: Record<string, Mark>;
  counted: string[];
  answeredCount: number;
  onAnswer: (id: string, v: string, immediate?: boolean) => void;
  sectionScore?: { score: number; total: number };
}) {
  const over = section.kind !== "mcq" && answeredCount > section.attempt;
  return (
    <section id={`q-${section.key}`} className="mb-8 scroll-mt-28 break-inside-avoid-page" dir={ur ? "rtl" : undefined}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2">
        <h2 className="text-lg font-bold">
          <bdi dir="ltr" className="me-1.5">Q{section.number}.</bdi>
          <span className={ur ? "urdu font-normal" : ""} dir="auto">
            {section.title}
          </span>
        </h2>
        <span className="text-sm text-muted" dir="ltr">
          {sectionScore ? (
            <span className="font-semibold text-ink">
              {sectionScore.score}/{sectionScore.total}
            </span>
          ) : (
            <>
              {section.marksEach} mark{section.marksEach > 1 ? "s" : ""} each
              {mode === "answer" && section.kind !== "mcq" && `, answered ${answeredCount} of ${section.attempt}`}
              {mode === "answer" && section.kind === "mcq" && `, ${answeredCount} of ${section.questions.length} done`}
            </>
          )}
        </span>
      </div>
      {over && mode === "answer" && (
        <p className="mb-3 text-sm text-warn print:hidden" dir="ltr">
          You&rsquo;ve answered {answeredCount}. Only your best {section.attempt} count, like in the board exam.
        </p>
      )}
      <ol className="flex flex-col gap-4">
        {section.questions.map((q) =>
          section.kind === "mcq" ? (
            <McqItem key={q.id} q={q} ur={ur} mode={mode} chosen={answers[q.id]} onChoose={(v) => onAnswer(q.id, v, true)} />
          ) : (
            <WrittenItem
              key={q.id}
              q={q}
              ur={ur}
              mode={mode}
              long={section.kind === "long"}
              value={answers[q.id] ?? ""}
              mark={marks[q.id]}
              counted={counted.includes(q.id)}
              onChange={(v) => onAnswer(q.id, v)}
            />
          ),
        )}
      </ol>
    </section>
  );
}

function McqItem({
  q,
  ur,
  mode,
  chosen,
  onChoose,
}: {
  q: Question;
  ur: boolean;
  mode: "print" | "answer" | "review";
  chosen?: string;
  onChoose: (v: string) => void;
}) {
  const pick = chosen === undefined || chosen === "" ? -1 : Number(chosen);
  const right = mode === "review" && pick === q.answer;
  return (
    <li className="break-inside-avoid">
      <fieldset>
        <legend className={`mb-1.5 flex gap-2 leading-relaxed ${ur ? "urdu" : ""}`}>
          <span className="shrink-0 font-semibold tabular-nums" dir="ltr">
            ({q.label.split("(")[1]}
          </span>
          <RichText text={q.text} />
        </legend>
        {mode === "print" ? (
          <ol className="grid gap-x-6 gap-y-1 ps-7 sm:grid-cols-2">
            {q.options!.map((o, i) => (
              <li key={i} className={`flex gap-1.5 ${ur ? "urdu" : ""}`}>
                <bdi dir="ltr" className="font-semibold">{LETTERS[i]}.</bdi>{" "}
                <RichText text={o} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {q.options!.map((o, i) => {
              const isAnswer = mode === "review" && i === q.answer;
              const wrongPick = mode === "review" && i === pick && pick !== q.answer;
              return (
                <label
                  key={i}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                    isAnswer
                      ? "border-done bg-done/10"
                      : wrongPick
                        ? "border-mark bg-mark/10"
                        : pick === i
                          ? "border-accent bg-sunk"
                          : "border-line"
                  } ${mode === "answer" ? "cursor-pointer hover:border-accent" : ""}`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="mt-1 shrink-0 accent-[var(--accent)]"
                    checked={pick === i}
                    disabled={mode !== "answer"}
                    onChange={() => onChoose(String(i))}
                  />
                  <span className={`min-w-0 ${ur ? "urdu" : ""}`}>
                    <bdi dir="ltr" className="font-semibold">{LETTERS[i]}.</bdi>{" "}
                    <RichText text={o} />
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {mode === "review" && (
          <p className="mt-1.5 text-sm">
            <bdi dir="ltr" className="font-semibold" style={{ color: right ? "var(--done)" : "var(--mark)" }}>
              {right ? "Correct." : pick < 0 ? `Not answered. Answer: ${LETTERS[q.answer!]}.` : `Answer: ${LETTERS[q.answer!]}.`}
            </bdi>{" "}
            {q.explanation && <RichText text={q.explanation} className={`text-muted ${ur ? "urdu" : ""}`} />}
          </p>
        )}
      </fieldset>
    </li>
  );
}

function WrittenItem({
  q,
  ur,
  mode,
  long,
  value,
  mark,
  counted,
  onChange,
}: {
  q: Question;
  ur: boolean;
  mode: "print" | "answer" | "review";
  long: boolean;
  value: string;
  mark?: Mark;
  counted: boolean;
  onChange: (v: string) => void;
}) {
  const label = long ? `Q${q.label}` : `(${q.label.split("(")[1]}`;
  return (
    <li className="break-inside-avoid">
      <div className={`flex gap-2 leading-relaxed ${ur ? "urdu" : ""}`}>
        <span className="shrink-0 font-semibold tabular-nums" dir="ltr">
          {label}
        </span>
        <div className="min-w-0 flex-1">
          <RichText text={q.text} />
          {long && <bdi dir="ltr" className="ms-2 text-sm text-muted">[{q.marks}]</bdi>}
        </div>
        {mode === "review" && mark && (
          <span
            className="shrink-0 self-start rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums"
            dir="ltr"
            style={{
              background: "var(--sunk)",
              color: mark.awarded >= q.marks * 0.8 ? "var(--done)" : mark.awarded < q.marks * 0.5 ? "var(--mark)" : "var(--ink)",
            }}
          >
            {mark.awarded}/{q.marks}
          </span>
        )}
      </div>
      {mode === "answer" && (
        <textarea
          className={`input mt-2 w-full ${ur ? "urdu leading-loose" : ""}`}
          rows={long ? 7 : 3}
          dir="auto"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ur ? "یہاں جواب لکھیں، یا کاغذ پر لکھ کر تصویر لگائیں" : "Type your answer, or write it on paper and add a photo at the end"}
          aria-label={`Answer to ${q.label}`}
        />
      )}
      {mode === "review" && (
        <div className="mt-2 flex flex-col gap-2 sm:ps-8">
          {value ? (
            <p className={`whitespace-pre-wrap rounded-lg bg-sunk px-3 py-2 text-sm ${ur ? "urdu leading-loose" : ""}`} dir="auto">
              {value}
            </p>
          ) : (
            <p className="text-sm text-muted" dir="ltr">{mark ? "Answered on paper." : "Not answered."}</p>
          )}
          {mark && (
            <div className="text-sm">
              {!counted && <p className="text-xs text-muted" dir="ltr">Not counted: your best answers in this question were counted instead.</p>}
              {mark.feedback && <RichText text={mark.feedback} className={ur ? "urdu leading-loose" : ""} />}
              {mark.missing && mark.missing.length > 0 && (
                <ul className={`mt-1 list-disc ps-5 text-muted ${ur ? "urdu" : ""}`}>
                  {mark.missing.map((m, i) => (
                    <li key={i}>
                      <RichText text={m} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {q.points && q.points.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-accent">{ur ? "مکمل نمبروں کے لیے اہم نکات" : "Key points for full marks"}</summary>
              <ul className={`mt-1 list-disc ps-5 ${ur ? "urdu leading-loose" : ""}`}>
                {q.points.map((p, i) => (
                  <li key={i}>
                    <RichText text={p} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </li>
  );
}
