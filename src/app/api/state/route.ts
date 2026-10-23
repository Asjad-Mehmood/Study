import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dbConfigured, loadState, saveState } from "@/lib/db";
import { normalizeState } from "@/lib/merge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function checkPasscode(req: NextRequest): NextResponse | null {
  const expected = process.env.STUDY_PASSCODE;
  if (!expected) {
    return NextResponse.json(
      { error: "server_passcode_missing", message: "Set STUDY_PASSCODE in the hosting settings to turn on sync." },
      { status: 503 },
    );
  }
  const got = req.headers.get("x-study-passcode") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "passcode", message: "Wrong or missing passcode." }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!dbConfigured()) return NextResponse.json({ mode: "off" });
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    const data = await loadState();
    return NextResponse.json({ mode: "db", data });
  } catch (e) {
    console.error("loadState failed", e);
    return NextResponse.json({ error: "db", message: "Could not read from the database." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!dbConfigured()) return NextResponse.json({ mode: "off" });
  const denied = checkPasscode(req);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const raw = JSON.stringify(body ?? {});
  if (raw.length > 4_000_000) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  try {
    const data = await saveState(normalizeState((body as { data?: unknown })?.data));
    return NextResponse.json({ mode: "db", data });
  } catch (e) {
    console.error("saveState failed", e);
    return NextResponse.json({ error: "db", message: "Could not save to the database." }, { status: 500 });
  }
}
