import { NextResponse, type NextRequest } from "next/server";
import { denyWithoutPasscode } from "@/lib/auth";
import { readNotesMarkdown } from "@/lib/content";
import {
  buildPlan,
  labelQuestions,
  type Difficulty,
  type ExamKind,
  type Paper,
  type PaperLang,
  type PaperSection,
  type Plan,
  type Question,
} from "@/lib/exam";
import { AiError, generateJson } from "@/lib/gemini";
import { SUBJECT_IDS, getChapter, getSubject, type SubjectId } from "@/lib/syllabus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const NOTES_CAP_PER_CHAPTER = 26_000;
const NOTES_CAP_TOTAL = 240_000;

const LEVEL: Record<Difficulty, string> = {
  easy: "Easier than the board exam: mostly direct recall and one-step questions.",
  board: "The same level as recent Punjab board papers.",
  hard: "Harder than the board exam: more application, tricky MCQs and multi-step problems, but still inside the syllabus.",
};

const SYSTEM = `You set practice exam papers for Punjab board (BISE) Intermediate Part-II (2nd year, ICS group) students, using the PECTAA 2026-27 textbooks. You write original, accurate questions at the requested level and language, and you follow the paper plan exactly.

Rules:
- Ask only about what is in the chapter material given. Where no material is given for a chapter, ask only about that textbook chapter's standard Intermediate-level content.
- Write exactly the requested number of questions for each section, using the section's key.
- Set "chapter" on every question to the chapter number it comes from, and spread questions fairly across the section's chapters.
- MCQs: exactly 4 options, exactly one correct. "answer" is the 0-based index of the correct option. Add a one-line "explanation". Never use "all of the above" or "none of the above". Do not prefix options with (a), (b) etc.
- Written questions: give "points", the 2–6 key points or steps a full-marks answer must contain. For numericals, give the formula, the working and the final answer with its unit.
- Long questions with parts: write the parts in "text" as "(a) … [5] (b) … [3]", with each part's marks in square brackets, adding up to the question's marks.
- Write maths and formulas in LaTeX between single dollar signs, e.g. $E = mc^2$. Never use $$ or HTML.
- No repeated questions. Mix recall, understanding and application as board papers do.
- Never invent quotations, verses or couplets. Refer to a poem or lesson by its name instead.
- Return JSON only.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: { type: "STRING" },
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                chapter: { type: "INTEGER" },
                text: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                answer: { type: "INTEGER" },
                explanation: { type: "STRING" },
                points: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["chapter", "text"],
            },
          },
        },
        required: ["key", "questions"],
      },
    },
  },
  required: ["sections"],
};

type RawQuestion = {
  chapter?: unknown;
  text?: unknown;
  options?: unknown;
  answer?: unknown;
  explanation?: unknown;
  points?: unknown;
};

function str(x: unknown, max = 4000): string {
  return typeof x === "string" ? x.trim().slice(0, max) : "";
}

function shuffleOptions(options: string[], answer: number) {
  // Keep the order when an option points at the others ("both a and b").
  if (options.some((o) => /\b(both|all|none|neither)\b|\(a\)|\(b\)/i.test(o))) return { options, answer };
  const idx = options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { options: idx.map((i) => options[i]), answer: idx.indexOf(answer) };
}

function normalize(plan: Plan, raw: unknown, model: string, basedOnNotes: boolean): Paper {
  const got = (raw as { sections?: { key?: unknown; questions?: unknown }[] })?.sections;
  const list = Array.isArray(got) ? got : [];
  const sections: PaperSection[] = [];
  plan.sections.forEach((ps, si) => {
    const match = list.find((x) => str(x?.key) === ps.key) ?? (list.length === plan.sections.length ? list[si] : undefined);
    const rawQs = Array.isArray(match?.questions) ? (match!.questions as RawQuestion[]) : [];
    const seen = new Set<string>();
    const qs: Question[] = [];
    for (const r of rawQs) {
      if (qs.length >= ps.count) break;
      const text = str(r?.text);
      if (!text || seen.has(text.toLowerCase())) continue;
      const ch = Number(r?.chapter);
      const chapter = plan.chapters.includes(ch) ? ch : undefined;
      const q: Question = { id: `${ps.key}-${qs.length + 1}`, label: "", chapter, text, marks: ps.marksEach };
      if (ps.kind === "mcq") {
        const opts = Array.isArray(r?.options)
          ? (r.options as unknown[]).map((o) => str(o, 500).replace(/^\(?[a-dA-D][).]\s+/, ""))
          : [];
        const ans = Number(r?.answer);
        if (opts.length !== 4 || opts.some((o) => !o) || !Number.isInteger(ans) || ans < 0 || ans > 3) continue;
        const sh = shuffleOptions(opts, ans);
        q.options = sh.options;
        q.answer = sh.answer;
        q.explanation = str(r?.explanation, 800) || undefined;
      } else {
        const pts = Array.isArray(r?.points) ? (r.points as unknown[]).map((p) => str(p, 600)).filter(Boolean).slice(0, 8) : [];
        q.points = pts;
      }
      seen.add(text.toLowerCase());
      qs.push(q);
    }
    if (!qs.length) return;
    sections.push({
      key: ps.key,
      number: 0,
      title: ps.title,
      kind: ps.kind,
      attempt: Math.min(ps.attempt, qs.length),
      marksEach: ps.marksEach,
      questions: qs,
    });
  });
  if (!sections.length) throw new AiError("bad_output", "The AI's paper came back empty. Try again.");
  const numbered = labelQuestions(sections.map((s, i) => ({ ...s, number: i + 1 })));
  const s = getSubject(plan.subject)!;
  const title =
    plan.kind === "board"
      ? `${s.name}: board paper`
      : plan.kind === "chapter"
        ? `${s.name}: chapter test`
        : `${s.name}: MCQ test`;
  return {
    title,
    subject: plan.subject,
    kind: plan.kind,
    difficulty: plan.difficulty,
    chapters: plan.chapters,
    lang: plan.lang,
    minutes: plan.minutes,
    total: numbered.reduce((m, x) => m + x.attempt * x.marksEach, 0),
    basedOnNotes,
    model,
    sections: numbered,
  };
}

export async function POST(req: NextRequest) {
  const denied = denyWithoutPasscode(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const subject = String(body.subject) as SubjectId;
  if (!SUBJECT_IDS.includes(subject)) return NextResponse.json({ error: "bad_subject" }, { status: 400 });
  const kind = (["board", "chapter", "mcq"].includes(String(body.kind)) ? body.kind : "chapter") as ExamKind;
  const difficulty = (["easy", "board", "hard"].includes(String(body.difficulty)) ? body.difficulty : "board") as Difficulty;
  const lang = (body.lang === "en" || body.lang === "ur" ? body.lang : undefined) as PaperLang | undefined;
  const chapters = Array.isArray(body.chapters) ? (body.chapters as unknown[]).map(Number).filter(Number.isInteger) : [];
  const plan = buildPlan({ subject, kind, difficulty, chapters, lang });
  if (!plan.chapters.length) return NextResponse.json({ error: "no_chapters", message: "Choose at least one chapter." }, { status: 400 });
  const avoid = Array.isArray(body.avoid) ? (body.avoid as unknown[]).map((x) => str(x, 120)).filter(Boolean).slice(0, 80) : [];

  const s = getSubject(subject)!;
  let budget = NOTES_CAP_TOTAL;
  const material: string[] = [];
  const missing: number[] = [];
  for (const n of plan.chapters) {
    const c = getChapter(subject, n)!;
    const head = `=== Chapter ${n}: ${c.title}${c.sub ? ` (${c.sub})` : ""} ===`;
    const md = readNotesMarkdown(subject, n);
    if (md && budget > 0) {
      const cut = md.slice(0, Math.min(NOTES_CAP_PER_CHAPTER, budget));
      budget -= cut.length;
      material.push(`${head}\n${cut}`);
    } else {
      missing.push(n);
      material.push(`${head}\n(No notes yet: use this textbook chapter's standard content.)`);
    }
  }

  const langLine =
    plan.lang === "ur"
      ? "Language: Urdu. Write every question, option, explanation and key point in Urdu script (technical terms may stay in English in brackets)."
      : "Language: English, in simple wording a Pakistani 2nd-year student understands.";
  const user = [
    `Subject: ${s.name} (${s.book})`,
    `Paper: ${plan.kind === "board" ? "full board paper" : plan.kind === "chapter" ? "chapter test" : "MCQ test"}.`,
    `Level: ${LEVEL[difficulty]}`,
    langLine,
    `Chapters: ${plan.chapters.map((n) => `${n}. ${getChapter(subject, n)!.title}`).join("; ")}`,
    "",
    "Sections to write (JSON):",
    JSON.stringify(
      plan.sections.map((x) => ({ key: x.key, kind: x.kind, count: x.count, marksEach: x.marksEach, chapters: x.chapters, guide: x.guide })),
    ),
    avoid.length ? `\nThe student has already seen these questions recently; write different ones:\n- ${avoid.join("\n- ")}` : "",
    "",
    "Chapter material:",
    material.join("\n\n"),
  ].join("\n");

  try {
    const { data, model } = await generateJson<unknown>({ system: SYSTEM, parts: [{ text: user }], schema: SCHEMA, temperature: 0.8 });
    const paper = normalize(plan, data, model, missing.length === 0);
    return NextResponse.json({ paper, missingNotes: missing });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    console.error("generate failed", e);
    return NextResponse.json({ error: "server", message: "Something went wrong making the paper." }, { status: 500 });
  }
}
