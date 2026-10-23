import { NextResponse, type NextRequest } from "next/server";
import { denyWithoutPasscode } from "@/lib/auth";
import { AiError, generateJson, type Part } from "@/lib/gemini";
import { SUBJECT_IDS, getSubject, type SubjectId } from "@/lib/syllabus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

type Item = { id: string; label: string; text: string; marks: number; points: string[]; answer: string };

const SCHEMA = {
  type: "OBJECT",
  properties: {
    results: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          awarded: { type: "NUMBER" },
          feedback: { type: "STRING" },
          missing: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["id", "awarded", "feedback"],
      },
    },
  },
  required: ["results"],
};

function system(lang: "en" | "ur", language: boolean) {
  return `You are an experienced, fair Punjab board examiner marking a 2nd-year (Intermediate Part-II) student's practice paper.

Rules:
- Mark each answer against its question and key points. Give marks in steps of 0.5, from 0 up to the question's marks.
- Give full marks for a correct, complete answer even if it is worded differently from the key points. Do not reward padding or length.
- Numericals and maths: give method marks for correct steps even when the final answer is wrong. Deduct for a missing or wrong unit.
- Long questions with parts: mark each part out of its marks in [brackets] and add them up.
- Some answers are typed (given with the question). Others are handwritten on the attached answer-sheet photos, labelled with question numbers like 2(iii) or 5(a). Read handwriting carefully.
- Mark only questions the student actually answered, typed or in the photos. Leave out questions with no answer at all.
- If the same question is answered both typed and in a photo, mark the better one.
- ${language ? "This is a language paper, so grammar, spelling and expression count." : "Spelling and grammar mistakes do not lose marks unless they change the meaning."}
- "feedback": one or two short sentences in simple ${lang === "ur" ? "Urdu" : "English"}: what was right and what would earn the missing marks.
- "missing": the key points the answer left out, as short phrases (empty when nothing is missing).
- Return JSON only.`;
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
  const lang = body.lang === "ur" ? "ur" : "en";

  const items: Item[] = (Array.isArray(body.items) ? body.items : [])
    .slice(0, 80)
    .map((x: Record<string, unknown>) => ({
      id: String(x?.id ?? "").slice(0, 40),
      label: String(x?.label ?? "").slice(0, 20),
      text: String(x?.text ?? "").slice(0, 4000),
      marks: Math.max(0, Math.min(30, Number(x?.marks) || 0)),
      points: Array.isArray(x?.points) ? (x.points as unknown[]).map((p) => String(p).slice(0, 600)).slice(0, 8) : [],
      answer: String(x?.answer ?? "").slice(0, 8000).trim(),
    }))
    .filter((x) => x.id && x.marks > 0);

  const images = (Array.isArray(body.images) ? body.images : [])
    .slice(0, 10)
    .filter(
      (x: Record<string, unknown>) =>
        typeof x?.data === "string" &&
        (x.data as string).length < 2_000_000 &&
        /^image\/(jpeg|png|webp)$/.test(String(x?.mime)),
    ) as { mime: string; data: string }[];

  const typed = items.filter((x) => x.answer);
  if (!typed.length && !images.length) {
    return NextResponse.json({ error: "nothing", message: "Write some answers or add photos of your answer sheet first." }, { status: 400 });
  }

  const s = getSubject(subject)!;
  const parts: Part[] = [
    {
      text: [
        `Subject: ${s.name}`,
        "Questions (JSON). typedAnswer is empty when the student did not type an answer:",
        JSON.stringify(
          items.map((x) => ({ id: x.id, number: x.label, marks: x.marks, question: x.text, keyPoints: x.points, typedAnswer: x.answer })),
        ),
        images.length ? `\n${images.length} answer-sheet photo(s) follow.` : "\nThere are no photos; mark the typed answers only.",
      ].join("\n"),
    },
  ];
  images.forEach((im, i) => {
    parts.push({ text: `Answer sheet page ${i + 1}:` });
    parts.push({ inline_data: { mime_type: im.mime, data: im.data } });
  });

  try {
    const { data } = await generateJson<{ results?: { id?: unknown; awarded?: unknown; feedback?: unknown; missing?: unknown }[] }>({
      system: system(lang, subject === "english" || subject === "urdu"),
      parts,
      schema: SCHEMA,
      temperature: 0.2,
    });
    const byId = new Map(items.map((x) => [x.id, x]));
    const out: Record<string, { awarded: number; feedback: string; missing: string[] }> = {};
    for (const r of Array.isArray(data?.results) ? data.results : []) {
      const it = byId.get(String(r?.id));
      if (!it) continue;
      const v = Math.round(Math.max(0, Math.min(it.marks, Number(r?.awarded) || 0)) * 2) / 2;
      out[it.id] = {
        awarded: v,
        feedback: String(r?.feedback ?? "").slice(0, 1000),
        missing: Array.isArray(r?.missing) ? (r.missing as unknown[]).map((m) => String(m).slice(0, 300)).slice(0, 8) : [],
      };
    }
    // A typed answer the examiner skipped still counts as attempted.
    for (const it of typed) {
      if (!out[it.id]) out[it.id] = { awarded: 0, feedback: "This answer could not be marked. Try marking again.", missing: [] };
    }
    return NextResponse.json({ marks: out });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    console.error("mark failed", e);
    return NextResponse.json({ error: "server", message: "Something went wrong while marking." }, { status: 500 });
  }
}
