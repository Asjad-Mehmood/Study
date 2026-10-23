"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mergeStates, normalizeState, sameState } from "@/lib/merge";
import {
  DEFAULT_SETTINGS,
  emptyState,
  type Base,
  type ChapterProgress,
  type CollectionName,
  type Settings,
  type StudyState,
} from "@/lib/types";
import { chapterKey } from "@/lib/syllabus";

const LS_STATE = "study-state-v1";
const LS_PASSCODE = "study-passcode";

export type SyncStatus =
  | { kind: "loading" }
  | { kind: "local" } // no database configured on the server
  | { kind: "locked"; reason: "passcode" | "server_passcode_missing" }
  | { kind: "syncing" }
  | { kind: "synced"; at: number }
  | { kind: "offline"; message: string };

type StoreValue = {
  state: StudyState;
  ready: boolean;
  sync: SyncStatus;
  settings: Settings;
  put: <K extends CollectionName>(name: K, record: StudyState[K][string]) => void;
  remove: (name: CollectionName, id: string) => void;
  updateChapter: (subject: string, n: number, patch: Partial<ChapterProgress>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  importState: (data: unknown, mode: "merge" | "replace") => void;
  setPasscode: (code: string) => Promise<SyncStatus>;
  clearPasscode: () => void;
  syncNow: () => void;
};

const StoreCtx = createContext<StoreValue | null>(null);

function readLocal(): StudyState {
  try {
    const raw = localStorage.getItem(LS_STATE);
    return raw ? normalizeState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

function writeLocal(s: StudyState) {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the in-memory copy still works */
  }
}

export function getPasscode(): string {
  try {
    return localStorage.getItem(LS_PASSCODE) ?? "";
  } catch {
    return "";
  }
}

export function savePasscode(code: string) {
  try {
    localStorage.setItem(LS_PASSCODE, code.trim());
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudyState>(emptyState);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<SyncStatus>({ kind: "loading" });
  const stateRef = useRef(state);
  const syncRef = useRef(sync);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServer = useRef<StudyState | null>(null);

  stateRef.current = state;
  syncRef.current = sync;

  const commit = useCallback((next: StudyState) => {
    stateRef.current = next;
    setState(next);
    writeLocal(next);
  }, []);

  const request = useCallback(async (method: "GET" | "PUT", body?: StudyState) => {
    const res = await fetch("/api/state", {
      method,
      headers: { "content-type": "application/json", "x-study-passcode": getPasscode() },
      body: body ? JSON.stringify({ data: body }) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }, []);

  /** Pull from the server, merge with this device, push back anything the server is missing. */
  const pullAndMerge = useCallback(async (): Promise<SyncStatus> => {
    try {
      setSync((s) => (s.kind === "synced" || s.kind === "loading" ? s : { kind: "syncing" }));
      const { status, json } = await request("GET");
      if (json?.mode === "off") return { kind: "local" };
      if (status === 401) return { kind: "locked", reason: "passcode" };
      if (status === 503 && json?.error === "server_passcode_missing")
        return { kind: "locked", reason: "server_passcode_missing" };
      if (status !== 200 || !json?.data) return { kind: "offline", message: json?.message ?? `Server error ${status}` };
      const server = normalizeState(json.data);
      lastServer.current = server;
      const merged = mergeStates(stateRef.current, server);
      if (!sameState(merged, stateRef.current)) commit(merged);
      if (!sameState(merged, server)) {
        const put = await request("PUT", merged);
        if (put.status === 200 && put.json?.data) {
          const saved = normalizeState(put.json.data);
          lastServer.current = saved;
          const again = mergeStates(stateRef.current, saved);
          if (!sameState(again, stateRef.current)) commit(again);
        }
      }
      return { kind: "synced", at: Date.now() };
    } catch {
      return { kind: "offline", message: "No connection. Changes are saved on this device and will sync later." };
    }
  }, [commit, request]);

  const runSync = useCallback(async () => {
    const result = await pullAndMerge();
    setSync(result);
    return result;
  }, [pullAndMerge]);

  // First load: this device's copy, then the server.
  useEffect(() => {
    commit(readLocal());
    setReady(true);
    runSync();
    const onFocus = () => {
      const k = syncRef.current.kind;
      if (k === "synced" || k === "offline") runSync();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [commit, runSync]);

  const schedulePush = useCallback(() => {
    const k = syncRef.current.kind;
    if (k === "local" || k === "locked" || k === "loading") return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      runSync();
    }, 1200);
  }, [runSync]);

  const mutate = useCallback(
    (fn: (s: StudyState) => StudyState) => {
      const next = fn(stateRef.current);
      commit(next);
      schedulePush();
    },
    [commit, schedulePush],
  );

  const stamp = (prev?: Base) => Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1);

  const put = useCallback<StoreValue["put"]>(
    (name, record) => {
      mutate((s) => {
        const col = s[name] as Record<string, Base>;
        const prev = col[record.id];
        return { ...s, [name]: { ...col, [record.id]: { ...record, updatedAt: stamp(prev) } } };
      });
    },
    [mutate],
  );

  const remove = useCallback<StoreValue["remove"]>(
    (name, id) => {
      mutate((s) => {
        const col = s[name] as Record<string, Base>;
        const prev = col[id];
        if (!prev) return s;
        return { ...s, [name]: { ...col, [id]: { ...prev, deleted: true, updatedAt: stamp(prev) } } };
      });
    },
    [mutate],
  );

  const updateChapter = useCallback<StoreValue["updateChapter"]>(
    (subject, n, patch) => {
      const id = chapterKey(subject, n);
      mutate((s) => {
        const prev = s.progress[id];
        const base: ChapterProgress = prev && !prev.deleted
          ? prev
          : { id, updatedAt: 0, status: "not-started", checks: {}, confidence: 0 };
        const next: ChapterProgress = {
          ...base,
          ...patch,
          checks: { ...base.checks, ...(patch.checks ?? {}) },
          deleted: undefined,
          id,
          updatedAt: stamp(prev),
        };
        return { ...s, progress: { ...s.progress, [id]: next } };
      });
    },
    [mutate],
  );

  const settings = useMemo<Settings>(() => {
    const s = state.settings["settings"];
    return s && !s.deleted ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS;
  }, [state.settings]);

  const updateSettings = useCallback<StoreValue["updateSettings"]>(
    (patch) => {
      mutate((s) => {
        const prev = s.settings["settings"];
        const next: Settings = { ...DEFAULT_SETTINGS, ...prev, ...patch, id: "settings", updatedAt: stamp(prev) };
        return { ...s, settings: { ...s.settings, settings: next } };
      });
    },
    [mutate],
  );

  const importState = useCallback<StoreValue["importState"]>(
    (data, mode) => {
      const incoming = normalizeState(data);
      if (mode === "merge") {
        mutate((s) => mergeStates(s, incoming));
      } else {
        // Replace: everything not in the backup is deleted, everything in it is re-stamped as newest.
        const now = Date.now();
        mutate((s) => {
          const out = mergeStates(s, emptyState());
          for (const name of Object.keys(out) as (keyof StudyState)[]) {
            if (name === "v") continue;
            const col = out[name] as Record<string, Base>;
            const inc = incoming[name] as Record<string, Base>;
            for (const id of Object.keys(col)) col[id] = { ...col[id], deleted: true, updatedAt: now };
            for (const [id, r] of Object.entries(inc)) col[id] = { ...r, updatedAt: now + 1 };
          }
          return out;
        });
      }
    },
    [mutate],
  );

  const setPasscode = useCallback(
    async (code: string) => {
      try {
        localStorage.setItem(LS_PASSCODE, code.trim());
      } catch {
        /* ignore */
      }
      setSync({ kind: "syncing" });
      return runSync();
    },
    [runSync],
  );

  const clearPasscode = useCallback(() => {
    try {
      localStorage.removeItem(LS_PASSCODE);
    } catch {
      /* ignore */
    }
    setSync({ kind: "locked", reason: "passcode" });
  }, []);

  const value: StoreValue = {
    state,
    ready,
    sync,
    settings,
    put,
    remove,
    updateChapter,
    updateSettings,
    importState,
    setPasscode,
    clearPasscode,
    syncNow: () => {
      setSync({ kind: "syncing" });
      runSync();
    },
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
