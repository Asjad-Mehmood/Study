"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { formatClock, useTimer } from "@/components/timer";
import { ChapterSelect, Empty, Field, PageHeader, Section, SubjectName, SubjectSelect } from "@/components/ui";
import { IconPause, IconPlay, IconStop, IconTrash } from "@/components/icons";
import { SUBJECTS, getChapter, type SubjectId } from "@/lib/syllabus";
import { addDays, formatDate, formatMinutes, live, today, uid } from "@/lib/utils";

const TARGETS = [25, 45, 60, 90];

export default function TimerPage() {
  const { state, put, remove } = useStore();
  const { timer, elapsed, running, start, pause, resume, stop, update } = useTimer();
  const [subject, setSubject] = useState<SubjectId | "other">("physics");
  const [chapter, setChapter] = useState<number | undefined>(1);
  const [target, setTarget] = useState<number | undefined>(45);
  const [note, setNote] = useState("");

  // Manual log form
  const [mSubject, setMSubject] = useState<SubjectId | "other">("physics");
  const [mChapter, setMChapter] = useState<number | undefined>();
  const [mMinutes, setMMinutes] = useState("60");
  const [mDate, setMDate] = useState("");
  useEffect(() => setMDate(today()), []);
  const [mNote, setMNote] = useState("");
  const [logged, setLogged] = useState<string | null>(null);

  const activeSubject = timer?.subject ?? subject;
  const activeChapter = timer ? timer.chapter : chapter;
  const targetMs = (timer?.targetMin ?? 0) * 60000;
  const reached = targetMs > 0 && elapsed >= targetMs;

  function finish() {
    const r = stop();
    if (!r) return;
    const minutes = Math.round(r.minutes);
    if (minutes < 1) {
      setLogged("Under a minute, so nothing was saved.");
      return;
    }
    put("sessions", {
      id: uid(),
      updatedAt: 0,
      subject: r.timer.subject,
      chapter: r.timer.chapter,
      minutes,
      date: today(),
      note: note.trim() || undefined,
    });
    setNote("");
    setLogged(`Saved ${formatMinutes(minutes)}.`);
  }

  function logManual(e: React.FormEvent) {
    e.preventDefault();
    const m = Math.round(Number(mMinutes));
    if (!m || m < 1 || m > 960) {
      setLogged("Enter minutes between 1 and 960.");
      return;
    }
    put("sessions", {
      id: uid(),
      updatedAt: 0,
      subject: mSubject,
      chapter: mSubject === "other" ? undefined : mChapter,
      minutes: m,
      date: mDate,
      note: mNote.trim() || undefined,
    });
    setMNote("");
    setLogged(`Logged ${formatMinutes(m)} for ${formatDate(mDate)}.`);
  }

  const sessions = useMemo(
    () => live(state.sessions).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt),
    [state.sessions],
  );

  const weekStart = addDays(today(), -6);
  const weekBySubject = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of sessions) if (s.date >= weekStart) out[s.subject] = (out[s.subject] ?? 0) + s.minutes;
    return out;
  }, [sessions, weekStart]);
  const weekMax = Math.max(1, ...Object.values(weekBySubject));

  const grouped = useMemo(() => {
    const g: { date: string; items: typeof sessions; total: number }[] = [];
    for (const s of sessions.slice(0, 60)) {
      let last = g[g.length - 1];
      if (!last || last.date !== s.date) {
        last = { date: s.date, items: [], total: 0 };
        g.push(last);
      }
      last.items.push(s);
      last.total += s.minutes;
    }
    return g;
  }, [sessions]);

  return (
    <div>
      <PageHeader title="Study timer" lead="Time your study blocks. Each finished block is saved to your hours." />

      <div className="mb-10 rounded-xl border border-line bg-surface p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject" htmlFor="t-subject">
            <SubjectSelect
              id="t-subject"
              value={activeSubject}
              allowOther
              onChange={(v) => {
                if (timer) update({ subject: v, chapter: undefined });
                else {
                  setSubject(v);
                  setChapter(undefined);
                }
              }}
            />
          </Field>
          <Field label="Chapter" htmlFor="t-chapter">
            <ChapterSelect
              id="t-chapter"
              subject={activeSubject}
              value={activeChapter}
              onChange={(v) => (timer ? update({ chapter: v }) : setChapter(v))}
            />
          </Field>
        </div>

        <div className="my-6 text-center">
          <p
            className="font-serif text-7xl font-semibold tabular-nums md:text-8xl"
            style={{ color: reached ? "var(--done)" : undefined }}
            aria-live="off"
          >
            {formatClock(elapsed)}
          </p>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {!timer
              ? "Ready when you are."
              : reached
                ? `Target of ${timer.targetMin} min reached. Take a short break, then stop to save.`
                : timer.targetMin
                  ? `Focus block of ${timer.targetMin} min${running ? "" : ", paused"}.`
                  : running
                    ? "Running."
                    : "Paused."}
          </p>
        </div>

        {!timer && (
          <fieldset className="mb-5 text-center">
            <legend className="mb-2 w-full text-sm font-semibold">Focus block</legend>
            <div className="flex flex-wrap justify-center gap-2">
              {TARGETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setTarget(target === m ? undefined : m)}
                  aria-pressed={target === m}
                  className={`rounded-full border px-3 py-1 text-sm ${target === m ? "border-accent bg-accent text-accent-ink" : "border-line"}`}
                >
                  {m} min
                </button>
              ))}
              <button
                onClick={() => setTarget(undefined)}
                aria-pressed={target === undefined}
                className={`rounded-full border px-3 py-1 text-sm ${target === undefined ? "border-accent bg-accent text-accent-ink" : "border-line"}`}
              >
                No limit
              </button>
            </div>
          </fieldset>
        )}

        {timer && (
          <div className="mx-auto mb-5 max-w-md">
            <Field label="What did you cover? (optional)" htmlFor="t-note">
              <input
                id="t-note"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Derivation of P = ⅓ρ⟨v²⟩, MCQs 1–8"
              />
            </Field>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {!timer && (
            <button className="btn btn-primary px-6 py-3 text-base" onClick={() => start(subject, chapter, target)}>
              <IconPlay /> Start
            </button>
          )}
          {timer && running && (
            <button className="btn btn-quiet px-5 py-3 text-base" onClick={pause}>
              <IconPause /> Pause
            </button>
          )}
          {timer && !running && (
            <button className="btn btn-primary px-5 py-3 text-base" onClick={resume}>
              <IconPlay /> Resume
            </button>
          )}
          {timer && (
            <button className="btn btn-primary px-5 py-3 text-base" onClick={finish}>
              <IconStop /> Stop and save
            </button>
          )}
        </div>
        {logged && (
          <p className="mt-4 text-center text-sm text-done" role="status">
            {logged}
          </p>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Log time by hand">
          <form id="log" onSubmit={logManual} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject" htmlFor="m-subject">
                <SubjectSelect id="m-subject" value={mSubject} allowOther onChange={(v) => { setMSubject(v); setMChapter(undefined); }} />
              </Field>
              <Field label="Chapter" htmlFor="m-chapter">
                <ChapterSelect id="m-chapter" subject={mSubject} value={mChapter} onChange={setMChapter} />
              </Field>
              <Field label="Minutes" htmlFor="m-min">
                <input id="m-min" className="input" type="number" min={1} max={960} inputMode="numeric" value={mMinutes} onChange={(e) => setMMinutes(e.target.value)} />
              </Field>
              <Field label="Date" htmlFor="m-date">
                <input id="m-date" className="input" type="date" value={mDate} max={mDate ? today() : undefined} onChange={(e) => setMDate(e.target.value)} />
              </Field>
            </div>
            <Field label="Note (optional)" htmlFor="m-note">
              <input id="m-note" className="input" value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="Academy class, self study, revision…" />
            </Field>
            <button className="btn btn-primary self-start" type="submit">
              Log time
            </button>
          </form>
        </Section>

        <Section title="This week by subject" aside="Last 7 days">
          {Object.keys(weekBySubject).length === 0 ? (
            <Empty>No study time logged in the last 7 days.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {[...SUBJECTS.map((s) => s.id as string), "other"]
                .filter((id) => weekBySubject[id])
                .map((id) => (
                  <li key={id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <SubjectName id={id} />
                      <span className="tabular-nums text-muted">{formatMinutes(weekBySubject[id])}</span>
                    </div>
                    <div className="h-2 rounded-full bg-sunk">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(weekBySubject[id] / weekMax) * 100}%`,
                          background: SUBJECTS.find((s) => s.id === id)?.color ?? "var(--muted)",
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Session history">
        {grouped.length === 0 ? (
          <Empty>Finished timer blocks and logged time appear here.</Empty>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map((g) => (
              <div key={g.date}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold">{g.date === today() ? "Today" : formatDate(g.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className="tabular-nums text-muted">{formatMinutes(g.total)}</span>
                </div>
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {g.items.map((s) => {
                    const c = s.subject !== "other" && s.chapter ? getChapter(s.subject, s.chapter) : undefined;
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <SubjectName id={s.subject} />
                          {c && <span className="text-muted"> {c.n}. {c.title}</span>}
                          {s.note && <span className="block truncate text-xs text-muted">{s.note}</span>}
                        </span>
                        <span className="tabular-nums">{formatMinutes(s.minutes)}</span>
                        <button aria-label="Delete session" className="text-muted hover:text-mark" onClick={() => remove("sessions", s.id)}>
                          <IconTrash />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
