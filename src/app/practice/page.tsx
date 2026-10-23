import type { Metadata } from "next";
import { extractMcqs, readNotesMarkdown } from "@/lib/content";
import { SUBJECTS } from "@/lib/syllabus";
import { PracticeHome } from "./PracticeHome";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  const counts: Record<string, Record<number, number>> = {};
  for (const s of SUBJECTS) {
    counts[s.id] = {};
    for (const c of s.chapters) {
      const md = readNotesMarkdown(s.id, c.n);
      if (md) counts[s.id][c.n] = extractMcqs(md).length;
    }
  }
  return <PracticeHome counts={counts} />;
}
