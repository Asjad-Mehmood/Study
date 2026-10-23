import type { Metadata } from "next";
import { notesIndex } from "@/lib/content";
import { ExamHome } from "./ExamHome";

export const metadata: Metadata = { title: "Exam maker" };

export default function ExamPage() {
  return <ExamHome notes={notesIndex()} />;
}
