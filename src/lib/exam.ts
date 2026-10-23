// Exam papers: patterns, the plan sent to the AI, and scoring. Shared by server and browser.
import { getSubject, type SubjectId } from "./syllabus";

export type ExamKind = "board" | "chapter" | "mcq";
export type Difficulty = "easy" | "board" | "hard";
export type PaperLang = "en" | "ur";
export type QuestionKind = "mcq" | "short" | "long";

export type Question = {
  id: string;
  /** What the student writes on the answer sheet, e.g. "2(iii)" or "5" */
  label: string;
  chapter?: number;
  text: string;
  marks: number;
  options?: string[];
  answer?: number;
  explanation?: string;
  /** Key points the examiner looks for */
  points?: string[];
};

export type PaperSection = {
  key: string;
  number: number;
  title: string;
  kind: QuestionKind;
  attempt: number;
  marksEach: number;
  questions: Question[];
};

export type Paper = {
  title: string;
  subject: SubjectId;
  kind: ExamKind;
  difficulty: Difficulty;
  chapters: number[];
  lang: PaperLang;
  minutes: number;
  total: number;
  basedOnNotes: boolean;
  model: string;
  sections: PaperSection[];
};

/** One section the AI has to write. */
export type PlanSection = {
  key: string;
  number: number;
  title: string;
  kind: QuestionKind;
  count: number;
  attempt: number;
  marksEach: number;
  chapters: number[];
  guide: string;
};

export type Plan = {
  subject: SubjectId;
  kind: ExamKind;
  difficulty: Difficulty;
  lang: PaperLang;
  chapters: number[];
  minutes: number;
  total: number;
  sections: PlanSection[];
};

type SectionSpec = Omit<PlanSection, "chapters" | "number"> & { split?: number };

/** Board pattern per subject. Short sections are split over the chapters the way board papers spread them. */
const BOARD: Record<SubjectId, { minutes: number; sections: SectionSpec[]; exact: boolean }> = {
  physics: {
    minutes: 180,
    exact: true,
    sections: [
      { key: "mcq", title: "Objective: choose the correct answer", kind: "mcq", count: 17, attempt: 17, marksEach: 1, guide: "Conceptual and simple numerical MCQs." },
      { key: "s1", title: "Write short answers to any eight", kind: "short", count: 12, attempt: 8, marksEach: 2, split: 0, guide: "Short conceptual questions answerable in 3–4 lines." },
      { key: "s2", title: "Write short answers to any eight", kind: "short", count: 12, attempt: 8, marksEach: 2, split: 1, guide: "Short conceptual questions answerable in 3–4 lines." },
      { key: "s3", title: "Write short answers to any six", kind: "short", count: 9, attempt: 6, marksEach: 2, split: 2, guide: "Short conceptual questions answerable in 3–4 lines." },
      { key: "long", title: "Attempt any three questions", kind: "long", count: 5, attempt: 3, marksEach: 8, guide: "Each question has part (a) a derivation or explanation for 5 marks and part (b) a numerical problem for 3 marks, from the same chapter." },
    ],
  },
  maths: {
    minutes: 180,
    exact: true,
    sections: [
      { key: "mcq", title: "Objective: choose the correct answer", kind: "mcq", count: 20, attempt: 20, marksEach: 1, guide: "Quick calculation and concept MCQs." },
      { key: "s1", title: "Write short answers to any eight", kind: "short", count: 12, attempt: 8, marksEach: 2, split: 0, guide: "Short problems solvable in a few steps." },
      { key: "s2", title: "Write short answers to any eight", kind: "short", count: 12, attempt: 8, marksEach: 2, split: 1, guide: "Short problems solvable in a few steps." },
      { key: "s3", title: "Write short answers to any nine", kind: "short", count: 13, attempt: 9, marksEach: 2, split: 2, guide: "Short problems solvable in a few steps." },
      { key: "long", title: "Attempt any three questions", kind: "long", count: 5, attempt: 3, marksEach: 10, guide: "Each question has two parts (a) and (b) of 5 marks each: longer problems, proofs or graph work." },
    ],
  },
  cs: {
    minutes: 160,
    exact: true,
    sections: [
      { key: "mcq", title: "Objective: choose the correct answer", kind: "mcq", count: 15, attempt: 15, marksEach: 1, guide: "Concept and short code-reading MCQs." },
      { key: "s1", title: "Write short answers to any six", kind: "short", count: 9, attempt: 6, marksEach: 2, split: 0, guide: "Definitions, differences and short code questions." },
      { key: "s2", title: "Write short answers to any six", kind: "short", count: 9, attempt: 6, marksEach: 2, split: 1, guide: "Definitions, differences and short code questions." },
      { key: "s3", title: "Write short answers to any six", kind: "short", count: 9, attempt: 6, marksEach: 2, split: 2, guide: "Definitions, differences and short code questions." },
      { key: "long", title: "Attempt any three questions", kind: "long", count: 5, attempt: 3, marksEach: 8, guide: "Detailed explanations, and at least two Python programming questions where the chapters allow." },
    ],
  },
  english: {
    minutes: 180,
    exact: false,
    sections: [
      { key: "mcq", title: "Objective: choose the correct answer", kind: "mcq", count: 20, attempt: 20, marksEach: 1, guide: "Vocabulary from the units (meanings, synonyms), grammar (tenses, prepositions, voice) and questions on the units." },
      { key: "s1", title: "Write short answers to any eight", kind: "short", count: 12, attempt: 8, marksEach: 2, guide: "Questions on the content of the units, answerable in 2–3 sentences." },
      { key: "grammar", title: "Do any ten", kind: "short", count: 12, attempt: 10, marksEach: 1, guide: "One-line grammar tasks: change the voice or narration, correct the sentence, use the phrase in a sentence." },
      { key: "long", title: "Answer any two in detail", kind: "long", count: 3, attempt: 2, marksEach: 7, guide: "Questions on themes and characters of the units, about 120 words each." },
      { key: "letter", title: "Write a letter or application on one", kind: "long", count: 2, attempt: 1, marksEach: 10, guide: "Formal or informal letter or application topics a Pakistani student would write." },
      { key: "essay", title: "Write an essay on one", kind: "long", count: 3, attempt: 1, marksEach: 15, guide: "Essay topics of about 300 words, linked to the themes of the units." },
      { key: "comp", title: "Read the passage and answer the questions", kind: "long", count: 1, attempt: 1, marksEach: 15, guide: "An original unseen passage of about 200 words, followed by five questions of 3 marks each. Put the passage and the five questions in the question text." },
    ],
  },
  urdu: {
    minutes: 180,
    exact: false,
    sections: [
      { key: "mcq", title: "معروضی: درست جواب کا انتخاب کریں", kind: "mcq", count: 20, attempt: 20, marksEach: 1, guide: "Questions on the lessons, writers and poets, and Urdu grammar (قواعد)." },
      { key: "s1", title: "کوئی سے آٹھ سوالات کے مختصر جوابات لکھیں", kind: "short", count: 12, attempt: 8, marksEach: 2, split: 0, guide: "Short questions on the prose and poetry lessons." },
      { key: "s2", title: "کوئی سے آٹھ سوالات کے مختصر جوابات لکھیں", kind: "short", count: 12, attempt: 8, marksEach: 2, split: 1, guide: "Short questions on the prose and poetry lessons." },
      { key: "long", title: "کوئی سے تین سوالات کے جوابات لکھیں", kind: "long", count: 4, attempt: 3, marksEach: 5, guide: "Questions on the central idea (مرکزی خیال) or main points of lessons." },
      { key: "summary", title: "کسی ایک سبق کا خلاصہ لکھیں", kind: "long", count: 2, attempt: 1, marksEach: 8, guide: "Ask for the summary (خلاصہ) of a prose lesson, naming the lesson and its writer." },
      { key: "letter", title: "خط یا درخواست لکھیں", kind: "long", count: 2, attempt: 1, marksEach: 10, guide: "A letter or application topic." },
      { key: "essay", title: "کسی ایک موضوع پر مضمون لکھیں", kind: "long", count: 3, attempt: 1, marksEach: 15, guide: "Essay topics." },
    ],
  },
  pakstudies: {
    minutes: 105,
    exact: false,
    sections: [
      { key: "mcq", title: "Objective: choose the correct answer", kind: "mcq", count: 10, attempt: 10, marksEach: 1, guide: "Facts, dates and concepts from the chapters." },
      { key: "s1", title: "Write short answers to any eight", kind: "short", count: 12, attempt: 8, marksEach: 2, guide: "Short questions answerable in 3–4 lines." },
      { key: "long", title: "Attempt any three questions", kind: "long", count: 5, attempt: 3, marksEach: 8, guide: "Detailed questions answerable in about one page." },
    ],
  },
};

/** Long-question marks in a chapter test, per subject. */
const LONG_MARKS: Record<SubjectId, number> = { physics: 8, maths: 10, cs: 8, english: 7, urdu: 8, pakstudies: 8 };

export const KIND_LABEL: Record<ExamKind, string> = {
  board: "Full board paper",
  chapter: "Chapter test",
  mcq: "MCQ test",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  board: "Board level",
  hard: "Hard",
};

/** Whether the board pattern for this subject follows the published board scheme or is our board-style version. */
export function boardPatternIsExact(subject: SubjectId) {
  return BOARD[subject].exact;
}

export function defaultLang(subject: SubjectId): PaperLang {
  return subject === "urdu" || subject === "pakstudies" ? "ur" : "en";
}

function splitChapters(chapters: number[], parts: number): number[][] {
  const out: number[][] = Array.from({ length: parts }, () => []);
  const size = Math.ceil(chapters.length / parts);
  chapters.forEach((c, i) => out[Math.min(parts - 1, Math.floor(i / Math.max(size, 1)))].push(c));
  // Fewer chapters than parts: every part uses all chapters.
  return out.map((p) => (p.length ? p : chapters));
}

export function buildPlan(opts: {
  subject: SubjectId;
  kind: ExamKind;
  difficulty: Difficulty;
  chapters: number[];
  lang?: PaperLang;
}): Plan {
  const s = getSubject(opts.subject)!;
  const chapters = [...new Set(opts.chapters)].filter((n) => s.chapters.some((c) => c.n === n)).sort((a, b) => a - b);
  const lang = opts.subject === "urdu" ? "ur" : (opts.lang ?? defaultLang(opts.subject));
  let specs: SectionSpec[];
  let minutes: number;
  if (opts.kind === "board") {
    specs = BOARD[opts.subject].sections;
    minutes = BOARD[opts.subject].minutes;
  } else if (opts.kind === "chapter") {
    const mcqTitle = lang === "ur" ? "معروضی: درست جواب کا انتخاب کریں" : "Objective: choose the correct answer";
    specs = [
      { key: "mcq", title: mcqTitle, kind: "mcq", count: 10, attempt: 10, marksEach: 1, guide: BOARD[opts.subject].sections[0].guide },
      {
        key: "s1",
        title: lang === "ur" ? "کوئی سے پانچ سوالات کے مختصر جوابات لکھیں" : "Write short answers to any five",
        kind: "short",
        count: 8,
        attempt: 5,
        marksEach: 2,
        guide: BOARD[opts.subject].sections[1].guide,
      },
      {
        key: "long",
        title: lang === "ur" ? "کوئی سا ایک سوال حل کریں" : "Attempt any one question",
        kind: "long",
        count: 2,
        attempt: 1,
        marksEach: LONG_MARKS[opts.subject],
        guide: BOARD[opts.subject].sections.find((x) => x.key === "long")!.guide,
      },
    ];
    minutes = 45;
  } else {
    specs = [
      {
        key: "mcq",
        title: lang === "ur" ? "درست جواب کا انتخاب کریں" : "Choose the correct answer",
        kind: "mcq",
        count: 20,
        attempt: 20,
        marksEach: 1,
        guide: BOARD[opts.subject].sections[0].guide,
      },
    ];
    minutes = 20;
  }
  const shortSplits = Math.max(0, ...specs.map((x) => (x.split ?? -1) + 1));
  const groups = shortSplits > 0 && opts.kind === "board" ? splitChapters(chapters, shortSplits) : [];
  const sections: PlanSection[] = specs.map((x, i) => ({
    key: x.key,
    number: i + 1,
    title: x.title,
    kind: x.kind,
    count: x.count,
    attempt: x.attempt,
    marksEach: x.marksEach,
    guide: x.guide,
    chapters: x.split !== undefined && groups.length ? groups[x.split] : chapters,
  }));
  return {
    subject: opts.subject,
    kind: opts.kind,
    difficulty: opts.difficulty,
    lang,
    chapters,
    minutes,
    total: sections.reduce((m, x) => m + x.attempt * x.marksEach, 0),
    sections,
  };
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx"];

/** "Q1 (3)" style labels: sub-numbers for MCQ and short sections, whole numbers for long questions. */
export function labelQuestions(sections: PaperSection[]): PaperSection[] {
  let q = 0;
  return sections.map((s) => {
    if (s.kind === "long") {
      return { ...s, questions: s.questions.map((x) => ({ ...x, label: String(++q) })) };
    }
    const n = ++q;
    return {
      ...s,
      questions: s.questions.map((x, i) => ({
        ...x,
        label: s.kind === "mcq" ? `${n}(${i + 1})` : `${n}(${ROMAN[i] ?? i + 1})`,
      })),
    };
  });
}

export type Mark = { awarded: number; feedback?: string; missing?: string[] };

/** Section scores. MCQs: every correct option. Written sections: the best `attempt` answers, like a board examiner. */
export function scorePaper(paper: Paper, answers: Record<string, string>, marks: Record<string, Mark>) {
  const sections = paper.sections.map((s) => {
    if (s.kind === "mcq") {
      const correct = s.questions.filter((q) => answers[q.id] !== undefined && Number(answers[q.id]) === q.answer).length;
      return { key: s.key, score: correct * s.marksEach, total: s.attempt * s.marksEach, counted: s.questions.map((q) => q.id) };
    }
    const scored = s.questions
      .filter((q) => marks[q.id])
      .map((q) => ({ id: q.id, v: marks[q.id].awarded }))
      .sort((a, b) => b.v - a.v)
      .slice(0, s.attempt);
    return {
      key: s.key,
      score: scored.reduce((m, x) => m + x.v, 0),
      total: s.attempt * s.marksEach,
      counted: scored.map((x) => x.id),
    };
  });
  return {
    sections,
    score: Math.round(sections.reduce((m, x) => m + x.score, 0) * 2) / 2,
    total: sections.reduce((m, x) => m + x.total, 0),
  };
}

/** Score per chapter across MCQs and marked answers, for the "work on these" list. */
export function chapterScores(paper: Paper, answers: Record<string, string>, marks: Record<string, Mark>) {
  const by: Record<number, { got: number; of: number }> = {};
  for (const s of paper.sections) {
    for (const q of s.questions) {
      if (!q.chapter) continue;
      let got: number | null = null;
      if (s.kind === "mcq") got = answers[q.id] !== undefined && Number(answers[q.id]) === q.answer ? q.marks : 0;
      else if (marks[q.id]) got = marks[q.id].awarded;
      if (got === null) continue;
      const e = (by[q.chapter] ??= { got: 0, of: 0 });
      e.got += got;
      e.of += q.marks;
    }
  }
  return by;
}

export function writtenQuestions(paper: Paper): Question[] {
  return paper.sections.filter((s) => s.kind !== "mcq").flatMap((s) => s.questions);
}
