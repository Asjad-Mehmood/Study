import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export function passcodeRequired() {
  return Boolean(process.env.STUDY_PASSCODE);
}

export function passcodeOk(req: NextRequest): boolean {
  const expected = process.env.STUDY_PASSCODE;
  if (!expected) return true;
  const a = Buffer.from(req.headers.get("x-study-passcode") ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** For the AI routes: when STUDY_PASSCODE is set, only devices that know it may use your AI quota. */
export function denyWithoutPasscode(req: NextRequest): NextResponse | null {
  if (passcodeOk(req)) return null;
  return NextResponse.json({ error: "passcode", message: "Enter your passcode to use the exam maker." }, { status: 401 });
}
