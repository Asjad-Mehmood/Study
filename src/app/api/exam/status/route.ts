import { NextResponse, type NextRequest } from "next/server";
import { passcodeOk, passcodeRequired } from "@/lib/auth";
import { aiConfigured } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(req: NextRequest) {
  return NextResponse.json({ ai: aiConfigured(), passcode: passcodeRequired(), unlocked: passcodeOk(req) });
}
