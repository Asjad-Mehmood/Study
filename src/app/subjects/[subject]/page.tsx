import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { notesIndex, readNotesMarkdown, extractMcqs, subjectIntro, renderMarkdown } from "@/lib/content";
import { SUBJECT_IDS, getSubject } from "@/lib/syllabus";
import { ChapterList } from "./ChapterList";

export function generateStaticParams() {
  return SUBJECT_IDS.map((subject) => ({ subject }));
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }): Promise<Metadata> {
  const { subject } = await params;
  return { title: getSubject(subject)?.name ?? "Subject" };
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const s = getSubject(subject);
  if (!s) notFound();
  const notes = notesIndex()[s.id] ?? [];
  const mcqCounts: Record<number, number> = {};
  for (const n of notes) {
    const md = readNotesMarkdown(s.id, n);
    if (md) mcqCounts[n] = extractMcqs(md).length;
  }
  const intro = subjectIntro(s.id);
  const introHtml = intro ? await renderMarkdown(intro) : null;
  return <ChapterList subjectId={s.id} notes={notes} mcqCounts={mcqCounts} introHtml={introHtml} />;
}
