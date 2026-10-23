import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { extractMcqs, readNotesMarkdown } from "@/lib/content";
import { SUBJECTS, getChapter, getSubject, type SubjectId } from "@/lib/syllabus";
import { Quiz, type QuizQuestion } from "../../Quiz";

type Params = Promise<{ subject: string; chapter: string }>;

export function generateStaticParams() {
  const out: { subject: string; chapter: string }[] = [];
  for (const s of SUBJECTS) {
    out.push({ subject: s.id, chapter: "all" });
    for (const c of s.chapters) out.push({ subject: s.id, chapter: String(c.n) });
  }
  return out;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subject, chapter } = await params;
  const s = getSubject(subject);
  return { title: `${s?.name ?? ""} practice${chapter === "all" ? "" : ` ${chapter}`}` };
}

export default async function PracticeChapter({ params }: { params: Params }) {
  const { subject, chapter } = await params;
  const s = getSubject(subject);
  if (!s) notFound();

  let questions: QuizQuestion[] = [];
  let title: string;
  let limit: number | undefined;
  let n: number;

  if (chapter === "all") {
    n = 0;
    title = `${s.name}: mixed quiz`;
    limit = 15;
    for (const c of s.chapters) {
      const md = readNotesMarkdown(s.id, c.n);
      if (!md) continue;
      questions.push(
        ...extractMcqs(md).map((q, index) => ({ ...q, chapter: c.n, index, from: `${s.unitLabel} ${c.n}: ${c.title}` })),
      );
    }
  } else {
    n = Number(chapter);
    const c = getChapter(s.id, n);
    if (!c) notFound();
    title = `${s.unitLabel} ${c.n}: ${c.title}`;
    const md = readNotesMarkdown(s.id, n);
    questions = md ? extractMcqs(md).map((q, index) => ({ ...q, chapter: n, index })) : [];
  }

  return (
    <div>
      <Link href="/practice" className="text-sm text-accent">
        Practice
      </Link>
      <h1 className="mb-6 mt-1 font-serif text-3xl font-semibold leading-tight">{title}</h1>
      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-muted">
          Practice questions for this {chapter === "all" ? "subject" : "chapter"} arrive with its notes in phase {s.phase}.
        </div>
      ) : (
        <Quiz
          subject={s.id as SubjectId}
          chapter={n}
          title={title}
          questions={questions}
          limit={limit}
          backHref={chapter === "all" ? "/practice" : `/subjects/${s.id}/${n}`}
        />
      )}
    </div>
  );
}
