import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { extractHeadings, extractMcqs, readNotesMarkdown, renderMarkdown } from "@/lib/content";
import { SUBJECTS, getChapter, getSubject } from "@/lib/syllabus";
import { ChapterTracker } from "./ChapterTracker";

type Params = Promise<{ subject: string; chapter: string }>;

export function generateStaticParams() {
  return SUBJECTS.flatMap((s) => s.chapters.map((c) => ({ subject: s.id, chapter: String(c.n) })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subject, chapter } = await params;
  const s = getSubject(subject);
  const c = getChapter(subject, Number(chapter));
  return { title: s && c ? `${s.name} ${c.n}: ${c.title}` : "Chapter" };
}

export default async function ChapterPage({ params }: { params: Params }) {
  const { subject, chapter } = await params;
  const s = getSubject(subject);
  const n = Number(chapter);
  const c = getChapter(subject, n);
  if (!s || !c) notFound();

  const md = readNotesMarkdown(s.id, n);
  const html = md ? await renderMarkdown(md) : null;
  const headings = md ? extractHeadings(md) : [];
  const mcqCount = md ? extractMcqs(md).length : 0;
  const prev = s.chapters.find((x) => x.n === n - 1);
  const next = s.chapters.find((x) => x.n === n + 1);
  const label = (x: { n: number; title: string }) => (s.rtl ? x.title : `${s.unitLabel} ${x.n}: ${x.title}`);

  return (
    <div>
      <Link href={`/subjects/${s.id}`} className="text-sm text-accent">
        {s.name}
      </Link>
      <div className="mb-6 mt-1">
        <h1
          className={`font-serif text-3xl font-semibold leading-tight text-balance md:text-4xl ${s.rtl ? "urdu text-right" : ""}`}
        >
          {s.rtl ? c.title : `${s.unitLabel} ${c.n}: ${c.title}`}
        </h1>
        <p className="mt-1 text-muted">
          {c.sub && (
            <>
              <bdi className={s.rtl && /[\u0600-\u06ff]/.test(c.sub) ? "urdu" : ""}>{c.sub}</bdi>.{" "}
            </>
          )}
          {c.pages && <>Book pages {c.pages}</>}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 lg:order-1">
          {html ? (
            <>
              {headings.length > 0 && (
                <nav aria-label="In this chapter" className="mb-6 flex flex-wrap gap-2 lg:hidden">
                  {headings.map((h) => (
                    <a key={h.id} href={`#${h.id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
                      {h.text}
                    </a>
                  ))}
                </nav>
              )}
              <article className="notes" dangerouslySetInnerHTML={{ __html: html }} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-6">
              <h2 className="text-lg font-bold">Notes for this chapter come in phase {s.phase}</h2>
              <p className="mt-2 max-w-prose text-muted">
                Phase {s.phase} of the study plan writes the {s.name} notes: key ideas, MCQs, short and long questions and the
                solved exercise. Until then, study from the book (pages {c.pages}) and keep tracking your progress on the right.
              </p>
              <Link href="/planner#plan" className="mt-4 inline-block text-accent underline">
                See the study plan
              </Link>
            </div>
          )}

          <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-sm">
            {prev ? (
              <Link href={`/subjects/${s.id}/${prev.n}`} className="text-accent">
                Previous: <span className={s.rtl ? "urdu" : ""}>{label(prev)}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/subjects/${s.id}/${next.n}`} className="text-right text-accent">
                Next: <span className={s.rtl ? "urdu" : ""}>{label(next)}</span>
              </Link>
            )}
          </div>
        </div>

        <aside className="lg:order-2">
          <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pb-4">
            <ChapterTracker subjectId={s.id} chapter={n} mcqCount={mcqCount} />
            {headings.length > 0 && (
              <nav aria-label="In this chapter" className="hidden lg:block">
                <h2 className="mb-2 text-sm font-bold">In this chapter</h2>
                <ul className="flex flex-col gap-1 text-sm">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="text-muted hover:text-ink">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
