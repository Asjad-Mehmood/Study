import { notesIndex } from "@/lib/content";
import { Dashboard } from "./Dashboard";

export default function Home() {
  return <Dashboard notes={notesIndex()} />;
}
