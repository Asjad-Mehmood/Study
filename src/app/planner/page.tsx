import type { Metadata } from "next";
import { notesIndex } from "@/lib/content";
import { Planner } from "./Planner";

export const metadata: Metadata = { title: "Planner" };

export default function PlannerPage() {
  return <Planner notes={notesIndex()} />;
}
