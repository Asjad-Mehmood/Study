# Study Register

A personal study site for 2nd-year ICS (Physics group), Punjab board. It holds the chapter notes and tracks everything around them: chapter progress, study time, tasks, MCQ practice and test marks.

## What's in it

| Page | What it does |
| --- | --- |
| **Today** | Exam countdown, today's study time against your daily goal, streak, last 7 days, whole-syllabus map, next tasks, the chapter to pick up, latest tests |
| **Subjects** | All six books (Physics, Maths, Computer Science, English, Urdu, Pakistan Studies) with every chapter. Each chapter page shows the notes and a tracker: status, a checklist (read, formulas, derivations, MCQs, short questions, numericals, revised), confidence 1–5, your own note and time studied |
| **Practice** | MCQ quizzes built from each chapter's notes, plus a mixed quiz across a whole book. Mistakes are reviewed at the end and your best score is saved |
| **Timer** | Focus-block timer (25/45/60/90 min or no limit) that saves each block to your hours, a form to log time by hand, this week by subject, full history |
| **Planner** | Tasks with due dates and priority, weekly pace towards the exam date, the notes plan (one phase per book) |
| **Tests** | Record class, monthly, send-up and board results. Trend chart, subject averages, full list |
| **Settings** | Name, exam date, daily goal, device sync, backup export/import |

Urdu and Pakistan Studies pages use right-to-left Nastaliq text.

## Saving and sync

Everything is saved in the browser first, so the site works offline and without any setup.

To keep phone and laptop in step, connect a free Postgres database (Neon). The site then syncs every change to it. Each record is merged on its own, so editing on two devices at once doesn't overwrite the other device's work. A passcode keeps the data private.

## Deploy on Vercel with Neon

1. **Create the database.** Sign in at [neon.tech](https://neon.tech), create a project, and copy the **pooled** connection string (it looks like `postgresql://user:pass@ep-…-pooler.…neon.tech/neondb?sslmode=require`). The table is created automatically on first use.
2. **Import the repo.** In [Vercel](https://vercel.com), choose *Add New → Project*, pick this repository and keep the default Next.js settings.
3. **Add two environment variables** before deploying (Project → Settings → Environment Variables):
   - `DATABASE_URL`: the Neon connection string
   - `STUDY_PASSCODE`: a passcode you choose (use 8 or more characters)
4. **Deploy.** If you add the variables after the first deploy, redeploy so they take effect.
5. **Unlock each device.** Open the site, go to *Settings → Sync*, enter the passcode. Do this once on every phone or laptop you use.

Without `DATABASE_URL` the site still works, saving only in that browser. Use *Settings → Backup* to move data by file.

## Run it locally

```bash
npm install
cp .env.example .env.local   # optional: fill in to test sync
npm run dev
```

Open http://localhost:3000.

## Adding notes

Notes are Markdown files at `content/<subject>/<chapter>.md`, e.g. `content/maths/3.md`. Subject ids are `physics`, `maths`, `cs`, `english`, `urdu` and `pakstudies`.

- Maths uses `$…$` and `$$…$$` (KaTeX).
- Use `###` headings for the sections; they become the chapter's contents list.
- An `**Extra practice MCQs**` list with lines like `1. Question: (a) … (b) … (c) … (d) … **Answer: (b)**` becomes that chapter's quiz.

Commit the file and Vercel rebuilds the site. The chapter list and syllabus live in `src/lib/syllabus.ts`.

## Built with

Next.js 15 (App Router, static pages), React 19, TypeScript, Tailwind CSS 4, unified/remark/rehype with KaTeX for notes, and `pg` for the sync API (`/api/state`).
