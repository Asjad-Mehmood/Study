"use client";

import { SUBJECTS, type SubjectId } from "@/lib/syllabus";
import type { ChapterStatus } from "@/lib/types";

export function PageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-semibold leading-tight text-balance md:text-4xl">{title}</h1>
        {lead && <p className="mt-1.5 max-w-prose text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside && <div className="text-sm text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function ProgressBar({ value, color = "var(--accent)", label }: { value: number; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-sunk"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

export const STATUS_LABEL: Record<ChapterStatus, string> = {
  "not-started": "Not started",
  reading: "Reading",
  revising: "Revising",
  done: "Done",
};

export const STATUS_COLOR: Record<ChapterStatus, string> = {
  "not-started": "var(--s-none)",
  reading: "var(--s-reading)",
  revising: "var(--s-revising)",
  done: "var(--s-done)",
};

export function StatusDot({ status }: { status: ChapterStatus }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} />;
}

export function SubjectSelect({
  value,
  onChange,
  allowOther = false,
  id,
}: {
  value: string;
  onChange: (v: SubjectId | "other") => void;
  allowOther?: boolean;
  id?: string;
}) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value as SubjectId | "other")}>
      {SUBJECTS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
      {allowOther && <option value="other">Other / general</option>}
    </select>
  );
}

export function ChapterSelect({
  subject,
  value,
  onChange,
  id,
}: {
  subject: string;
  value?: number;
  onChange: (n: number | undefined) => void;
  id?: string;
}) {
  const s = SUBJECTS.find((x) => x.id === subject);
  return (
    <select
      id={id}
      className="input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      disabled={!s}
    >
      <option value="">Whole subject</option>
      {s?.chapters.map((c) => (
        <option key={c.n} value={c.n}>
          {s.unitLabel === "سبق" || s.unitLabel === "باب" ? `${c.n}. ${c.title}` : `${s.unitLabel} ${c.n}: ${c.title}`}
        </option>
      ))}
    </select>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">{children}</div>;
}

export function SubjectName({ id }: { id: string }) {
  const s = SUBJECTS.find((x) => x.id === id);
  if (!s) return <>Other</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
      {s.name}
    </span>
  );
}
