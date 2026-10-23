import "server-only";
import { Pool } from "pg";
import { mergeStates, normalizeState } from "./merge";
import type { StudyState } from "./types";

const ROW_ID = "main";

declare global {
  // Reuse one pool across hot reloads and warm serverless invocations.
  var __studyPool: Pool | undefined;
}

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function pool(): Pool {
  if (!globalThis.__studyPool) {
    const url = process.env.DATABASE_URL!;
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("host=/");
    globalThis.__studyPool = new Pool({
      connectionString: url,
      ssl: local ? undefined : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return globalThis.__studyPool;
}

let tableReady: Promise<void> | null = null;

function ensureTable() {
  tableReady ??= pool()
    .query(
      `CREATE TABLE IF NOT EXISTS study_state (
         id text PRIMARY KEY,
         data jsonb NOT NULL,
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
    )
    .then(() => undefined)
    .catch((e) => {
      tableReady = null;
      throw e;
    });
  return tableReady;
}

export async function loadState(): Promise<StudyState> {
  await ensureTable();
  const r = await pool().query("SELECT data FROM study_state WHERE id = $1", [ROW_ID]);
  return normalizeState(r.rows[0]?.data);
}

/** Merges the incoming state into the stored one inside a transaction and returns the result. */
export async function saveState(incoming: StudyState): Promise<StudyState> {
  await ensureTable();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO study_state (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [ROW_ID, JSON.stringify({ v: 1 })],
    );
    const r = await client.query("SELECT data FROM study_state WHERE id = $1 FOR UPDATE", [ROW_ID]);
    const merged = mergeStates(normalizeState(r.rows[0]?.data), incoming);
    await client.query("UPDATE study_state SET data = $2, updated_at = now() WHERE id = $1", [
      ROW_ID,
      JSON.stringify(merged),
    ]);
    await client.query("COMMIT");
    return merged;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
