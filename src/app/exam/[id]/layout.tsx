import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exam paper" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
