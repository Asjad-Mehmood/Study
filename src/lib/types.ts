import type { CheckId, SubjectId } from "./syllabus";

/** Every stored record carries an id and a last-change time, so two devices can be merged safely. */
export type Base = { id: string; updatedAt: number; deleted?: boolean };

export type ChapterStatus = "not-started" | "reading" | "revising" | "done";

export type ChapterProgress = Base & {
  /** id = "<subject>:<chapter>" */
  status: ChapterStatus;
  checks: Partial<Record<CheckId, boolean>>;
  confidence: number; // 0–5
  note?: string;
  lastOpened?: number;
};

export type Session = Base & {
  subject: SubjectId | "other";
  chapter?: number;
  minutes: number;
  date: string; // YYYY-MM-DD (local)
  note?: string;
};

export type Task = Base & {
  title: string;
  subject?: SubjectId;
  chapter?: number;
  due?: string; // YYYY-MM-DD
  done: boolean;
  priority?: "high" | "normal";
  createdAt: number;
};

export type TestKind = "class-test" | "monthly" | "send-up" | "board" | "other";

export type TestRecord = Base & {
  subject: SubjectId;
  title: string;
  kind: TestKind;
  date: string; // YYYY-MM-DD
  obtained: number;
  total: number;
  chapters?: string;
  note?: string;
};

export type QuizAttempt = Base & {
  subject: SubjectId;
  chapter: number;
  score: number;
  total: number;
  date: string;
  wrong: number[];
};

export type Settings = Base & {
  name: string;
  examDate?: string; // YYYY-MM-DD
  dailyGoal: number; // minutes
};

export type StudyState = {
  v: 1;
  progress: Record<string, ChapterProgress>;
  sessions: Record<string, Session>;
  tasks: Record<string, Task>;
  tests: Record<string, TestRecord>;
  quizzes: Record<string, QuizAttempt>;
  settings: Record<string, Settings>;
};

export const COLLECTIONS = ["progress", "sessions", "tasks", "tests", "quizzes", "settings"] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export function emptyState(): StudyState {
  return { v: 1, progress: {}, sessions: {}, tasks: {}, tests: {}, quizzes: {}, settings: {} };
}

export const DEFAULT_SETTINGS: Settings = {
  id: "settings",
  updatedAt: 0,
  name: "",
  dailyGoal: 180,
};
