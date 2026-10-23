import "server-only";
import fs from "node:fs";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { getSubject, type SubjectId } from "./syllabus";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type Heading = { id: string; text: string };

export type Mcq = {
  question: string;
  options: string[];
  answer: number; // index into options
};

function notesPath(subject: string, n: number | string) {
  return path.join(CONTENT_DIR, subject, `${n}.md`);
}

export function hasNotes(subject: string, n: number): boolean {
  return fs.existsSync(notesPath(subject, n));
}

export function readNotesMarkdown(subject: string, n: number | string): string | null {
  const p = notesPath(subject, n);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

export async function renderMarkdown(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeKatex, { throwOnError: false, strict: false })
    .use(rehypeStringify)
    .process(plainSubscripts(md));
  // Wrap wide tables so they scroll inside their own box on phones.
  return String(file)
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

/**
 * The notes write subscripts in plain text (v_rms, N_A, K.E._max). Outside maths and code,
 * turn them into real subscripts.
 */
function plainSubscripts(md: string): string {
  const parts = md.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|`[^`\n]*`)/);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(
      /([A-Za-z\u0370-\u03ff.)₀-₉²³⁴ᴬ])\\?_(\([^ )]+\)|[A-Za-z0-9\u0370-\u03ff]+)/g,
      (_, base: string, sub: string) => `${base}<sub>${sub.replace(/^\(|\)$/g, "")}</sub>`,
    );
  }
  return parts.join("");
}

/** "### 1. Key ideas" headings, used for the in-page contents. */
export function extractHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  for (const line of md.split("\n")) {
    const m = /^###\s+(.+)$/.exec(line);
    if (m) {
      const text = m[1].trim();
      out.push({ id: slugify(text), text: text.replace(/^\d+\.\s*/, "") });
    }
  }
  return out;
}

// Same algorithm as github-slugger (used by rehype-slug) for plain headings.
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");
}

function cleanInline(s: string) {
  return s
    .replace(/\*\*/g, "")
    .replace(/\\_/g, "_")
    .replace(/\\\*/g, "*")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pulls the "Extra practice MCQs" list out of a chapter's notes.
 * Each item looks like: "Question: (a) … (b) … (c) … (d) …. **Answer: (b)**"
 */
export function extractMcqs(md: string): Mcq[] {
  const start = md.indexOf("**Extra practice MCQs**");
  if (start < 0) return [];
  const rest = md.slice(start);
  const end = rest.indexOf("\n### ");
  const block = end > 0 ? rest.slice(0, end) : rest;
  const items = block.split(/\n\d+\.\s+/).slice(1);
  const mcqs: Mcq[] = [];
  for (const raw of items) {
    const item = raw.split("\n")[0];
    const ans = /Answer:\s*\(([a-d])\)/i.exec(item);
    if (!ans) continue;
    const body = item.slice(0, ans.index).replace(/\*\*\s*$/, "").trim();
    const firstOpt = body.search(/\(a\)\s/);
    if (firstOpt < 0) continue;
    let question = body.slice(0, firstOpt).trim().replace(/:\s*$/, "");
    if (!/[?.]$/.test(question)) question += "";
    const optsPart = body.slice(firstOpt);
    const options = optsPart
      .split(/\(([a-d])\)\s*/)
      .filter((_, i) => i % 2 === 0)
      .slice(1)
      .map((o) => cleanInline(o).replace(/[.;]\s*$/, "").trim());
    if (options.length < 2) continue;
    mcqs.push({
      question: cleanInline(question),
      options,
      answer: ans[1].toLowerCase().charCodeAt(0) - 97,
    });
  }
  return mcqs;
}

export function subjectIntro(subject: SubjectId): string | null {
  const p = path.join(CONTENT_DIR, subject, "_intro.md");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

/** Which chapters of each subject have notes written. */
export function notesIndex(): Record<string, number[]> {
  const idx: Record<string, number[]> = {};
  for (const id of ["physics", "maths", "cs", "english", "urdu", "pakstudies"]) {
    const s = getSubject(id)!;
    idx[id] = s.chapters.filter((c) => hasNotes(id, c.n)).map((c) => c.n);
  }
  return idx;
}
