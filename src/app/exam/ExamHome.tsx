"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { aiPost, aiStatus, type AiStatus } from "@/components/ai";
import { useStore } from "@/components/store";
import { Empty, Field, PageHeader, Section, SubjectName, SubjectSelect } from "@/components/ui";
import { IconTrash } from "@/components/icons";
import {
  DIFFICULTY_LABEL,
  KIND_LABEL,
  boardPatternIsExact,
  buildPlan,
  defaultLang,
  type Difficulty,
  type ExamKind,
  type Paper,
  type PaperLang,
} from "@/lib/exam";
import { getSubject, type SubjectId } from "@/lib/syllabus";
import type { ExamRecord } from "@/lib/types";
import { formatMinutes, live, pct, uid } from "@/lib/utils";

const KEEP_PAPERS = 12;

function describe(kind: ExamKind, subject: SubjectId) {
  const plan = buildPlan({ subject, kind, difficulty: "board", chapters: getSubject(subject)!.chapters.map((c) => c.n) });
  const merged: Record<string, number> = {};
  for (const s of plan.sections) {
    if (s.kind === "mcq") continue;
    merged[s.kind] = (merged[s.kind] ?? 0) + s.count;
  }
  const summary =
    kind === "mcq"
      ? `${plan.sections[0].count} MCQs`
      : `${plan.sections[0].count} MCQs, ${merged.short ?? 0} short, ${merged.long ?? 0} long`;
  return { summary, marks: plan.total, minutes: plan.minutes };
}

export function ExamHome({ notes }: { notes: Record<string, number[]> }) {
  const router = useRouter();
  const { state, ready, put, remove, setPasscode } = useStore();
  const [status, setStatus] = useState<AiStatus | null | "loading">("loading");
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  const [subject, setSubject] = useState<SubjectId>("physics");
  const [kind, setKind] = useState<ExamKind>("chapter");
  const [chapters, setChapters] = useState<number[]>([1]);
  const [difficulty, setDifficulty] = useState<Difficulty>("board");
  const [lang, setLang] = useState<PaperLang>("en");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aiStatus().then(setStatus);
    // "Make another like this" links pass the settings in the address.
    const q = new URLSearchParams(window.location.search);
    const s = q.get("subject") as SubjectId | null;
    if (s && getSubject(s)) {
      setSubject(s);
      setLang(defaultLang(s));
      const k = q.get("kind") as ExamKind | null;
      if (k && k in KIND_LABEL) setKind(k);
      const d = q.get("level") as Difficulty | null;
      if (d && d in DIFFICULTY_LABEL) setDifficulty(d);
      const ch = (q.get("chapters") ?? "").split(",").map(Number).filter((n) => getSubject(s)!.chapters.some((c) => c.n === n));
      if (ch.length) setChapters(ch);
    }
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now();
    const h = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(h);
  }, [busy]);

  const s = getSubject(subject)!;
  const withNotes = notes[subject] ?? [];
  const exams = useMemo(() => live(state.exams).sort((a, b) => b.createdAt - a.createdAt), [state.exams]);

  function pickSubject(v: SubjectId) {
    setSubject(v);
    setLang(defaultLang(v));
    setChapters(kind === "chapter" ? [1] : getSubject(v)!.chapters.map((c) => c.n));
  }

  function pickKind(k: ExamKind) {
    setKind(k);
    if (k !== "chapter") setChapters(s.chapters.map((c) => c.n));
  }

  function toggleChapter(n: number) {
    setChapters((cs) => (cs.includes(n) ? cs.filter((x) => x !== n) : [...cs, n].sort((a, b) => a - b)));
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setCodeMsg(null);
    await setPasscode(code);
    const st = await aiStatus();
    setStatus(st);
    if (st && !st.unlocked) setCodeMsg("That passcode is not right.");
  }

  async function make() {
    if (!chapters.length) {
      setError("Choose at least one chapter.");
      return;
    }
    setError(null);
    setElapsed(0);
    setBusy(true);
    // Recent questions in this subject, so the new paper doesn't repeat them.
    const avoid = exams
      .filter((x) => x.subject === subject && x.paper)
      .slice(0, 3)
      .flatMap((x) => x.paper!.sections.flatMap((sec) => sec.questions.map((q) => q.text.slice(0, 100))))
      .slice(0, 80);
    const r = await aiPost<{ paper: Paper }>("/api/exam/generate", { subject, kind, difficulty, chapters, lang, avoid });
    setBusy(false);
    if (!r.ok) {
      if (r.status === 401) setStatus((st) => (st && st !== "loading" ? { ...st, unlocked: false } : st));
      setError(r.message);
      return;
    }
    const id = uid();
    const rec: ExamRecord = {
      id,
      updatedAt: 0,
      subject,
      title: r.data.paper.title,
      createdAt: Date.now(),
      paper: r.data.paper,
      status: "ready",
      answers: {},
      marks: {},
      total: r.data.paper.total,
    };
    put("exams", rec);
    // Keep the saved data small: older papers keep their score but drop the questions.
    for (const old of exams.filter((x) => x.paper).slice(KEEP_PAPERS - 1)) {
      if (old.status === "in-progress") continue;
      put("exams", { ...old, paper: undefined });
    }
    router.push(`/exam/${id}`);
  }

  const kinds: ExamKind[] = ["chapter", "board", "mcq"];

  return (
    <div>
      <PageHeader
        title="Exam maker"
        lead="Make a fresh practice paper from your notes, take it on screen or on paper, and get it marked by the AI."
      />

      {status === "loading" ? (
        <div className="mb-8 h-40 animate-pulse rounded-xl bg-sunk" />
      ) : status === null ? (
        <div className="mb-8 rounded-xl border border-line bg-surface p-5 text-sm">
          Could not reach the site&rsquo;s server. Check your connection and reload.
        </div>
      ) : !status.ai ? (
        <SetupCard />
      ) : status.passcode && !status.unlocked ? (
        <form onSubmit={unlock} className="mb-8 flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-lg font-bold">Enter your passcode</h2>
          <p className="max-w-prose text-sm text-muted">
            The exam maker uses your AI key, so it only works on devices that know your passcode (the same one as sync).
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="input max-w-xs"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Passcode"
            />
            <button className="btn btn-primary" type="submit">
              Unlock
            </button>
          </div>
          {codeMsg && <p className="text-sm text-mark" role="alert">{codeMsg}</p>}
        </form>
      ) : (
        <Section title="Make a paper">
          <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 md:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Subject" htmlFor="ex-subject">
                <SubjectSelect id="ex-subject" value={subject} onChange={(v) => pickSubject(v as SubjectId)} />
              </Field>
              {subject === "pakstudies" && (
                <Field label="Paper language" htmlFor="ex-lang">
                  <select id="ex-lang" className="input" value={lang} onChange={(e) => setLang(e.target.value as PaperLang)}>
                    <option value="ur">Urdu</option>
                    <option value="en">English</option>
                  </select>
                </Field>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Type of paper</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {kinds.map((k) => {
                  const d = describe(k, subject);
                  const on = kind === k;
                  return (
                    <label
                      key={k}
                      className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 ${on ? "border-accent bg-sunk" : "border-line"}`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <input type="radio" name="kind" checked={on} onChange={() => pickKind(k)} className="accent-[var(--accent)]" />
                        {KIND_LABEL[k]}
                      </span>
                      <span className="text-xs text-muted">{d.summary}</span>
                      <span className="text-xs text-muted">
                        {d.marks} marks, {formatMinutes(d.minutes)}
                      </span>
                    </label>
                  );
                })}
              </div>
              {kind === "board" && !boardPatternIsExact(subject) && (
                <p className="mt-2 text-xs text-muted">
                  {s.name} uses a board-style pattern. Check your board&rsquo;s pairing scheme for the exact one.
                </p>
              )}
            </fieldset>

            <fieldset>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <legend className="text-sm font-semibold">Chapters ({chapters.length} chosen)</legend>
                <span className="flex gap-3 text-sm">
                  <button type="button" className="text-accent underline" onClick={() => setChapters(s.chapters.map((c) => c.n))}>
                    All
                  </button>
                  <button type="button" className="text-accent underline" onClick={() => setChapters([])}>
                    None
                  </button>
                </span>
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {s.chapters.map((c) => (
                  <li key={c.n}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-sunk">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                        checked={chapters.includes(c.n)}
                        onChange={() => toggleChapter(c.n)}
                      />
                      <span className="min-w-0 text-sm leading-snug">
                        {c.n}. <bdi className={s.rtl ? "urdu leading-loose" : ""}>{c.title}</bdi>
                        {withNotes.includes(c.n) && <span className="ml-1.5 text-xs text-done">notes</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                {withNotes.length === 0
                  ? `${s.name} notes come in phase ${s.phase}. Until then questions are written from the chapter topics, so check any doubtful one with your book.`
                  : chapters.some((n) => !withNotes.includes(n))
                    ? "Chapters marked “notes” get questions from your notes. The others use the chapter topic, so check doubtful questions with your book."
                    : "Questions come from your notes for these chapters."}
              </p>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Level</legend>
              <div className="inline-flex flex-wrap rounded-lg border border-line p-0.5">
                {(["easy", "board", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={difficulty === d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded-md px-3 py-1.5 text-sm ${difficulty === d ? "bg-accent font-semibold text-accent-ink" : ""}`}
                  >
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary px-5 py-2.5 text-base" onClick={make} disabled={busy || !ready}>
                {busy ? "Writing your paper…" : "Make paper"}
              </button>
              {busy && (
                <span className="text-sm text-muted" role="status">
                  {elapsed < 8
                    ? "Reading your notes…"
                    : elapsed < 30
                      ? `Writing questions… ${elapsed}s`
                      : `Almost there, a full paper takes up to a minute or two… ${elapsed}s`}
                </span>
              )}
            </div>
            {error && (
              <p className="rounded-lg border border-mark/40 px-3 py-2 text-sm text-mark" role="alert">
                {error}
              </p>
            )}
          </div>
        </Section>
      )}

      <Section title="Your papers" aside={exams.length ? `${exams.length}` : undefined}>
        {!ready ? null : exams.length === 0 ? (
          <Empty>Papers you make appear here, with your marks once they are checked.</Empty>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {exams.map((x) => (
              <PaperRow key={x.id} exam={x} onDelete={() => remove("exams", x.id)} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function PaperRow({ exam, onDelete }: { exam: ExamRecord; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const p = exam.paper;
  const s = getSubject(exam.subject);
  const chapters = p ? (p.chapters.length === s?.chapters.length ? "all chapters" : `ch. ${p.chapters.join(", ")}`) : "";
  const tone =
    exam.status === "marked" && exam.score !== undefined
      ? exam.score / exam.total >= 0.8
        ? "var(--done)"
        : exam.score / exam.total < 0.5
          ? "var(--mark)"
          : "var(--ink)"
      : "var(--muted)";
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Link href={`/exam/${exam.id}`} className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">
          <SubjectName id={exam.subject} /> <span className="font-normal">{p ? KIND_LABEL[p.kind].toLowerCase() : exam.title}</span>
        </span>
        <span className="block truncate text-xs text-muted">
          {new Date(exam.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {chapters && `, ${chapters}`}
          {p && `, ${DIFFICULTY_LABEL[p.difficulty].toLowerCase()}`}
        </span>
      </Link>
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums" style={{ color: tone }}>
        {exam.status === "marked" && exam.score !== undefined ? (
          <>
            {exam.score}/{exam.total}
            <span className="block text-xs font-normal">{pct(exam.score / exam.total)}</span>
          </>
        ) : exam.status === "ready" ? (
          "Not started"
        ) : (
          "In progress"
        )}
      </span>
      {confirm ? (
        <span className="flex shrink-0 gap-1">
          <button className="btn btn-danger px-2 py-1 text-xs" onClick={onDelete}>
            Delete
          </button>
          <button className="btn btn-quiet px-2 py-1 text-xs" onClick={() => setConfirm(false)}>
            Keep
          </button>
        </span>
      ) : (
        <button aria-label="Delete paper" className="shrink-0 text-muted hover:text-mark" onClick={() => setConfirm(true)}>
          <IconTrash />
        </button>
      )}
    </li>
  );
}

function SetupCard() {
  return (
    <div className="mb-8 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold">Connect the AI (free)</h2>
      <p className="mt-1 max-w-prose text-sm text-muted">
        The exam maker uses Google Gemini. Its free tier is enough for several papers a day. One-time setup:
      </p>
      <ol className="mt-3 flex max-w-prose list-decimal flex-col gap-1.5 pl-5 text-sm">
        <li>
          Open <span className="font-semibold">aistudio.google.com</span>, sign in with Google and choose <em>Get API key</em> → <em>Create API key</em>. No card needed.
        </li>
        <li>
          In Vercel, open this project → <em>Settings</em> → <em>Environment Variables</em> and add <code>GEMINI_API_KEY</code> with that key.
        </li>
        <li>
          Make sure <code>STUDY_PASSCODE</code> is set too, so only your devices can use the key.
        </li>
        <li>Redeploy (Deployments → ⋯ → Redeploy), then reload this page.</li>
      </ol>
      <p className="mt-3 text-xs text-muted">On the free tier Google may use what you send to improve its products, so keep personal details out of your answers.</p>
    </div>
  );
}
