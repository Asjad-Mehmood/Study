import { COLLECTIONS, emptyState, type Base, type StudyState } from "./types";

/** Accepts anything that came from storage or the network and returns a well-formed state. */
export function normalizeState(input: unknown): StudyState {
  const out = emptyState();
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const name of COLLECTIONS) {
    const col = src[name];
    if (!col || typeof col !== "object") continue;
    for (const [id, rec] of Object.entries(col as Record<string, unknown>)) {
      if (!rec || typeof rec !== "object") continue;
      const r = rec as Base;
      if (typeof r.updatedAt !== "number") continue;
      (out[name] as Record<string, Base>)[id] = { ...r, id };
    }
  }
  return out;
}

/**
 * Merges two states record by record: for each id, the version changed most recently wins.
 * Deletions are kept as records with `deleted: true`, so a delete on one device reaches the other.
 */
export function mergeStates(a: StudyState, b: StudyState): StudyState {
  const out = emptyState();
  for (const name of COLLECTIONS) {
    const ca = a[name] as Record<string, Base>;
    const cb = b[name] as Record<string, Base>;
    const target = out[name] as Record<string, Base>;
    for (const id of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
      const x = ca[id];
      const y = cb[id];
      target[id] = !x ? y : !y ? x : y.updatedAt > x.updatedAt ? y : x;
    }
  }
  return out;
}

export function sameState(a: StudyState, b: StudyState): boolean {
  for (const name of COLLECTIONS) {
    const ca = a[name] as Record<string, Base>;
    const cb = b[name] as Record<string, Base>;
    const ka = Object.keys(ca);
    if (ka.length !== Object.keys(cb).length) return false;
    for (const id of ka) {
      if (!cb[id] || cb[id].updatedAt !== ca[id].updatedAt) return false;
    }
  }
  return true;
}
