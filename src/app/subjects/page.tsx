import type { Metadata } from "next";
import { notesIndex } from "@/lib/content";
import { SubjectsOverview } from "./SubjectsOverview";

export const metadata: Metadata = { title: "Subjects" };

export default function SubjectsPage() {
  return <SubjectsOverview notes={notesIndex()} />;
}
