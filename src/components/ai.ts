"use client";

import { getPasscode } from "./store";

export type AiStatus = { ai: boolean; passcode: boolean; unlocked: boolean };

export type AiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; message: string };

export async function aiStatus(): Promise<AiStatus | null> {
  try {
    const res = await fetch("/api/exam/status", { headers: { "x-study-passcode": getPasscode() }, cache: "no-store" });
    return (await res.json()) as AiStatus;
  } catch {
    return null;
  }
}

export async function aiPost<T>(path: string, body: unknown): Promise<AiResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", "x-study-passcode": getPasscode() },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: json as T };
    return {
      ok: false,
      status: res.status,
      error: json?.error ?? "error",
      message:
        json?.message ??
        (res.status === 413
          ? "The photos are too large together. Remove a page or two and try again."
          : res.status === 504
            ? "The AI took too long. Try again."
            : `Request failed (${res.status}).`),
    };
  } catch {
    return { ok: false, status: 0, error: "offline", message: "No connection. Check your internet and try again." };
  }
}

/** Shrinks a photo to a JPEG the AI can read and the server accepts (about 200–400 KB). */
export async function compressPhoto(file: File, maxSide = 1600, quality = 0.72): Promise<{ mime: string; data: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", quality);
  return { mime: "image/jpeg", data: url.slice(url.indexOf(",") + 1), preview: url };
}
