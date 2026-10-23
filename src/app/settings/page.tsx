"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store";
import { Field, PageHeader, Section } from "@/components/ui";
import { live, today } from "@/lib/utils";

export default function SettingsPage() {
  const { state, settings, updateSettings, sync, setPasscode, clearPasscode, syncNow, importState } = useStore();
  const [name, setName] = useState(settings.name);
  const [examDate, setExamDate] = useState(settings.examDate ?? "");
  const [goal, setGoal] = useState(String(settings.dailyGoal));
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(settings.name);
    setExamDate(settings.examDate ?? "");
    setGoal(String(settings.dailyGoal));
  }, [settings.name, settings.examDate, settings.dailyGoal]);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const g = Math.max(15, Math.min(900, Math.round(Number(goal) || 180)));
    updateSettings({ name: name.trim(), examDate: examDate || undefined, dailyGoal: g });
    setGoal(String(g));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setCodeMsg("Checking…");
    const r = await setPasscode(code);
    setCodeMsg(
      r.kind === "synced"
        ? "Connected. This device now syncs."
        : r.kind === "locked"
          ? r.reason === "passcode"
            ? "That passcode was not accepted."
            : "The server has no passcode set yet. Add STUDY_PASSCODE in Vercel, then try again."
          : r.kind === "local"
            ? "No database is connected on the server yet."
            : "Could not reach the server. Try again when online.",
    );
    if (r.kind === "synced") setCode("");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onImport(mode: "merge" | "replace") {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setImportMsg("Choose a backup file first.");
      return;
    }
    if (mode === "replace" && !window.confirm("Replace everything on this device (and the synced copy) with this backup?")) return;
    try {
      const data = JSON.parse(await f.text());
      importState(data, mode);
      setImportMsg(mode === "merge" ? "Backup merged with your current data." : "Your data was replaced with the backup.");
    } catch {
      setImportMsg("That file is not a valid backup.");
    }
  }

  const counts = {
    sessions: live(state.sessions).length,
    tasks: live(state.tasks).length,
    tests: live(state.tests).length,
    quizzes: live(state.quizzes).length,
    chapters: live(state.progress).length,
  };

  return (
    <div>
      <PageHeader title="Settings" />

      <Section title="You and your goals">
        <form onSubmit={saveProfile} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Your name" htmlFor="s-name">
              <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shown in the greeting" />
            </Field>
            <Field label="Board exam start date" htmlFor="s-exam">
              <input id="s-exam" type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </Field>
            <Field label="Daily goal (minutes)" htmlFor="s-goal">
              <input id="s-goal" type="number" min={15} max={900} step={15} className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" type="submit">
              Save settings
            </button>
            {saved && <span className="text-sm text-done">Saved.</span>}
          </div>
          <p className="text-xs text-muted">
            Punjab boards announce the 2nd year date sheet in early spring; enter the date of the first paper once it is out.
          </p>
        </form>
      </Section>

      <Section title="Sync between devices" className="scroll-mt-20">
        <div id="sync" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <p>
            {sync.kind === "synced" && <>Synced with the database. Changes save automatically on every device you unlock.</>}
            {sync.kind === "syncing" && <>Syncing…</>}
            {sync.kind === "loading" && <>Checking the server…</>}
            {sync.kind === "local" && (
              <>
                No database is connected yet, so your progress is saved in this browser only. Follow the setup steps in the
                repository README (Neon + Vercel) to sync your phone and laptop.
              </>
            )}
            {sync.kind === "locked" && sync.reason === "passcode" && <>The database is connected. Enter your passcode to sync this device.</>}
            {sync.kind === "locked" && sync.reason === "server_passcode_missing" && (
              <>The database is connected, but STUDY_PASSCODE is not set on the server. Add it in Vercel and redeploy.</>
            )}
            {sync.kind === "offline" && <>{sync.message}</>}
          </p>

          {(sync.kind === "locked" || sync.kind === "offline") && (
            <form onSubmit={unlock} className="flex flex-wrap items-end gap-2">
              <Field label="Passcode" htmlFor="s-code">
                <input
                  id="s-code"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              <button className="btn btn-primary" type="submit" disabled={!code}>
                Unlock sync
              </button>
            </form>
          )}
          {codeMsg && (
            <p className="text-sm text-muted" role="status">
              {codeMsg}
            </p>
          )}
          {sync.kind === "synced" && (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-quiet" onClick={syncNow}>
                Sync now
              </button>
              <button className="btn btn-danger" onClick={clearPasscode}>
                Stop syncing on this device
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section title="Backup">
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">
            This device holds {counts.chapters} chapter records, {counts.sessions} study sessions, {counts.tasks} tasks, {counts.tests} test
            results and {counts.quizzes} quiz attempts.
          </p>
          <div>
            <button className="btn btn-quiet" onClick={exportData}>
              Download backup file
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="s-file" className="text-sm font-semibold">
              Restore from a backup file
            </label>
            <input id="s-file" ref={fileRef} type="file" accept="application/json,.json" className="text-sm" />
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-quiet" onClick={() => onImport("merge")}>
                Merge with my data
              </button>
              <button className="btn btn-danger" onClick={() => onImport("replace")}>
                Replace my data
              </button>
            </div>
            {importMsg && (
              <p className="text-sm text-muted" role="status">
                {importMsg}
              </p>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
