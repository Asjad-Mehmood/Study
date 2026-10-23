import "server-only";

// Google Gemini API (free tier works). https://ai.google.dev/api/generate-content

export class AiError extends Error {
  constructor(
    public code: "no_key" | "rate_limited" | "blocked" | "bad_output" | "upstream" | "timeout",
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function models(): string[] {
  const first = process.env.GEMINI_MODEL?.trim();
  const list = [first, "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"].filter(Boolean) as string[];
  return [...new Set(list)];
}

export type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

type Opts = {
  system: string;
  parts: Part[];
  schema?: object;
  temperature?: number;
  timeoutMs?: number;
};

async function callOnce(model: string, opts: Opts, withSchema: boolean, signal: AbortSignal) {
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  const res = await fetch(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: opts.parts }],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: 60000,
        response_mime_type: "application/json",
        ...(withSchema && opts.schema ? { response_schema: opts.schema } : {}),
      },
    }),
    signal,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as GeminiResponse | null;
  return { status: res.status, json };
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("not json");
  }
}

/** Calls Gemini and returns parsed JSON. Tries the next model when one is busy or out of free quota. */
export async function generateJson<T>(opts: Opts): Promise<{ data: T; model: string }> {
  if (!aiConfigured()) throw new AiError("no_key", "Add GEMINI_API_KEY in your hosting settings to use the exam maker.", 503);
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 170_000);
  let last: AiError | null = null;
  for (const model of models()) {
    let withSchema = true;
    for (let attempt = 0; attempt < 2; attempt++) {
      let r: Awaited<ReturnType<typeof callOnce>>;
      try {
        r = await callOnce(model, opts, withSchema, signal);
      } catch (e) {
        if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError")
          throw new AiError("timeout", "The AI took too long. Try again, or choose fewer chapters.", 504);
        throw new AiError("upstream", "Could not reach the AI service.");
      }
      const { status, json } = r;
      if (status === 400 && withSchema && /schema/i.test(json?.error?.message ?? "")) {
        withSchema = false; // fall back to plain JSON mode
        continue;
      }
      if (status === 429) {
        last = new AiError("rate_limited", "The free AI limit is used up for now. Wait a minute, or try again tomorrow if the daily limit is reached.", 429);
        break;
      }
      if (status === 404 || status === 503 || status === 500) {
        last = new AiError("upstream", json?.error?.message ?? `AI service error ${status}`);
        break;
      }
      if (status === 400 || status === 401 || status === 403) {
        const msg = json?.error?.message ?? "";
        throw new AiError(
          "upstream",
          /api key/i.test(msg) ? "The Gemini API key was rejected. Check GEMINI_API_KEY in your hosting settings." : msg || `AI request failed (${status}).`,
          502,
        );
      }
      if (status !== 200 || !json) throw new AiError("upstream", `AI service error ${status}`);
      if (json.promptFeedback?.blockReason) throw new AiError("blocked", "The AI refused this request. Try different chapters.");
      const cand = json.candidates?.[0];
      const text = (cand?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("");
      if (!text) {
        if (cand?.finishReason === "SAFETY") throw new AiError("blocked", "The AI refused this request. Try different chapters.");
        last = new AiError("bad_output", "The AI returned an empty answer. Try again.");
        continue;
      }
      try {
        return { data: parseJson(text) as T, model };
      } catch {
        last = new AiError(
          "bad_output",
          cand?.finishReason === "MAX_TOKENS" ? "The paper was too long for the AI. Choose fewer chapters." : "The AI's answer was not in the right format. Try again.",
        );
        continue;
      }
    }
  }
  throw last ?? new AiError("upstream", "The AI service is not available right now.");
}
