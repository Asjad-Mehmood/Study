"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { Empty, Field, PageHeader, Section, SubjectName, SubjectSelect } from "@/components/ui";
import { IconTrash } from "@/components/icons";
import { SUBJECTS, getSubject, type SubjectId } from "@/lib/syllabus";
import type { TestKind, TestRecord } from "@/lib/types";
import { formatDate, live, pct, today, uid } from "@/lib/utils";

const KINDS: { id: TestKind; label: string }[] = [
  { id: "class-test", label: "Class test" },
  { id: "monthly", label: "Monthly test" },
  { id: "send-up", label: "Send-up / pre-board" },
  { id: "board", label: "Board exam" },
  { id: "ai-paper", label: "AI practice paper" },
  { id: "other", label: "Other" },
];

function tone(p: number) {
  return p >= 0.8 ? "var(--done)" : p < 0.5 ? "var(--mark)" : "var(--ink)";
}

export default function TestsPage() {
  const { state, put, remove } = useStore();
  const [subject, setSubject] = useState<SubjectId>("physics");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TestKind>("class-test");
  const [date, setDate] = useState("");
  useEffect(() => setDate(today()), []);
  const [obtained, setObtained] = useState("");
  const [total, setTotal] = useState("25");
  const [chapters, setChapters] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<SubjectId | "all">("all");

  const tests = useMemo(() => live(state.tests).sort((a, b) => a.date.localeCompare(b.date)), [state.tests]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const o = Number(obtained);
    const tt = Number(total);
    if (!(tt > 0) || o < 0 || o > tt || obtained === "") {
      setMsg("Marks must be between 0 and the total.");
      return;
    }
    put("tests", {
      id: uid(),
      updatedAt: 0,
      subject,
      title: title.trim() || KINDS.find((k) => k.id === kind)!.label,
      kind,
      date,
      obtained: o,
      total: tt,
      chapters: chapters.trim() || undefined,
    });
    setObtained("");
    setTitle("");
    setChapters("");
    setMsg(`Saved: ${o}/${tt} (${pct(o / tt)}).`);
  }

  const bySubject = SUBJECTS.map((s) => {
    const mine = tests.filter((x) => x.subject === s.id);
    const avg = mine.length ? mine.reduce((m, x) => m + x.obtained / x.total, 0) / mine.length : null;
    const last = mine[mine.length - 1];
    return { s, mine, avg, last };
  });

  const shown = (filter === "all" ? tests : tests.filter((x) => x.subject === filter)).slice().reverse();

  return (
    <div>
      <PageHeader title="Tests and marks" lead="Record every test so you can see each subject's trend before the board exams." />

      <Section title="Add a result">
        <form onSubmit={add} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject" htmlFor="ts-subject">
              <SubjectSelect id="ts-subject" value={subject} onChange={(v) => setSubject(v as SubjectId)} />
            </Field>
            <Field label="Type" htmlFor="ts-kind">
              <select id="ts-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as TestKind)}>
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date" htmlFor="ts-date">
              <input id="ts-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Marks obtained" htmlFor="ts-ob">
              <input id="ts-ob" type="number" inputMode="decimal" step="0.5" min={0} className="input" value={obtained} onChange={(e) => setObtained(e.target.value)} required />
            </Field>
            <Field label="Total marks" htmlFor="ts-total">
              <input id="ts-total" type="number" inputMode="decimal" min={1} className="input" value={total} onChange={(e) => setTotal(e.target.value)} required />
            </Field>
            <Field label="Name (optional)" htmlFor="ts-title">
              <input id="ts-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Academy test 3" />
            </Field>
          </div>
          <Field label="Chapters covered (optional)" htmlFor="ts-ch">
            <input id="ts-ch" className="input" value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="e.g. 1–3" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" type="submit">
              Save result
            </button>
            {msg && (
              <span className="text-sm text-muted" role="status">
                {msg}
              </span>
            )}
          </div>
        </form>
      </Section>

      <Section title="Trend" aside="Percentage per test, by date">
        {tests.length < 2 ? (
          <Empty>The chart appears once you have saved two or more results.</Empty>
        ) : (
          <TrendChart tests={tests} />
        )}
      </Section>

      <Section title="Subject averages">
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-sunk text-left">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2 text-right">Tests</th>
                <th className="px-3 py-2 text-right">Average</th>
                <th className="px-3 py-2 text-right">Latest</th>
              </tr>
            </thead>
            <tbody>
              {bySubject.map(({ s, mine, avg, last }) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <SubjectName id={s.id} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{mine.length}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: avg === null ? undefined : tone(avg) }}>
                    {avg === null ? "–" : pct(avg)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {last ? `${last.obtained}/${last.total}` : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="All results"
        aside={
          <select className="input py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as SubjectId | "all")} aria-label="Filter by subject">
            <option value="all">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        }
      >
        {shown.length === 0 ? (
          <Empty>No results saved yet.</Empty>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {shown.map((x) => {
              const p = x.obtained / x.total;
              return (
                <li key={x.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <SubjectName id={x.subject} /> <span className="font-normal">{x.title}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(x.date, { day: "numeric", month: "short", year: "numeric" })}
                      {x.chapters ? `, chapters ${x.chapters}` : ""}
                    </p>
                  </div>
                  <span className="text-right font-semibold tabular-nums" style={{ color: tone(p) }}>
                    {x.obtained}/{x.total}
                    <span className="block text-xs font-normal">{pct(p)}</span>
                  </span>
                  <button aria-label="Delete result" className="text-muted hover:text-mark" onClick={() => remove("tests", x.id)}>
                    <IconTrash />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function TrendChart({ tests }: { tests: TestRecord[] }) {
  const W = 640;
  const H = 240;
  const pad = { l: 38, r: 12, t: 12, b: 28 };
  const times = tests.map((x) => new Date(x.date).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const span = Math.max(t1 - t0, 86_400_000);
  const x = (d: string) => pad.l + ((new Date(d).getTime() - t0) / span) * (W - pad.l - pad.r);
  const y = (p: number) => pad.t + (1 - p) * (H - pad.t - pad.b);
  const subjects = SUBJECTS.filter((s) => tests.some((t) => t.subject === s.id));

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label="Test percentages over time by subject">
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <g key={g}>
              <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeDasharray={g === 0.5 ? "0" : "3 4"} />
              <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                {g * 100}%
              </text>
            </g>
          ))}
          <text x={pad.l} y={H - 8} fontSize="11" fill="var(--muted)">
            {formatDate(tests[0].date)}
          </text>
          <text x={W - pad.r} y={H - 8} fontSize="11" fill="var(--muted)" textAnchor="end">
            {formatDate(tests[tests.length - 1].date)}
          </text>
          {subjects.map((s) => {
            const pts = tests.filter((t) => t.subject === s.id);
            const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.obtained / p.total).toFixed(1)}`).join(" ");
            return (
              <g key={s.id}>
                {pts.length > 1 && <path d={d} fill="none" stroke={s.color} strokeWidth="2" />}
                {pts.map((p) => (
                  <circle key={p.id} cx={x(p.date)} cy={y(p.obtained / p.total)} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="1.5">
                    <title>{`${getSubject(s.id)!.name}, ${p.title}: ${p.obtained}/${p.total} (${pct(p.obtained / p.total)}) on ${formatDate(p.date)}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {subjects.map((s) => (
          <SubjectName key={s.id} id={s.id} />
        ))}
      </div>
    </div>
  );
}
