"use client";

import { useCallback, useEffect, useState } from "react";
import type { SubjectId } from "@/lib/syllabus";

const KEY = "study-timer";
const EVENT = "study-timer-change";

export type TimerState = {
  subject: SubjectId | "other";
  chapter?: number;
  /** When the current run started (ms), or null while paused / stopped. */
  startedAt: number | null;
  /** Time already counted before the current run. */
  elapsedMs: number;
  /** Optional target length for a focus block, in minutes. */
  targetMin?: number;
};

function read(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}

function write(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function elapsedMs(t: TimerState | null, now = Date.now()): number {
  if (!t) return 0;
  return t.elapsedMs + (t.startedAt ? now - t.startedAt : 0);
}

export function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Shared study timer, kept in this browser so it survives page changes and reloads. */
export function useTimer() {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setTimer(read());
    const sync = () => setTimer(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!timer?.startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer?.startedAt]);

  const start = useCallback((subject: TimerState["subject"], chapter?: number, targetMin?: number) => {
    write({ subject, chapter, startedAt: Date.now(), elapsedMs: 0, targetMin });
  }, []);

  const pause = useCallback(() => {
    const t = read();
    if (!t?.startedAt) return;
    write({ ...t, elapsedMs: elapsedMs(t), startedAt: null });
  }, []);

  const resume = useCallback(() => {
    const t = read();
    if (!t || t.startedAt) return;
    write({ ...t, startedAt: Date.now() });
  }, []);

  /** Ends the run and returns the minutes counted (the caller saves the session). */
  const stop = useCallback((): { minutes: number; timer: TimerState } | null => {
    const t = read();
    if (!t) return null;
    write(null);
    return { minutes: elapsedMs(t) / 60000, timer: t };
  }, []);

  const update = useCallback((patch: Partial<TimerState>) => {
    const t = read();
    if (!t) return;
    write({ ...t, ...patch });
  }, []);

  return { timer, elapsed: elapsedMs(timer, now), running: Boolean(timer?.startedAt), start, pause, resume, stop, update };
}
