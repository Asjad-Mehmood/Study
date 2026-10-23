// Syllabus for ICS (Physics group) 2nd year, PECTAA books, session 2026-27.
// `notes: true` means a notes file exists in content/<subject>/<n>.md

export type SubjectId = "physics" | "maths" | "cs" | "english" | "urdu" | "pakstudies";

export type Chapter = {
  n: number;
  title: string;
  /** Second title (book numbering, Urdu title, theme, section…) */
  sub?: string;
  pages?: string;
  notes?: boolean;
};

export type Subject = {
  id: SubjectId;
  name: string;
  short: string;
  /** Right-to-left titles (Urdu medium books) */
  rtl?: boolean;
  unitLabel: string;
  color: string;
  phase: number;
  book: string;
  chapters: Chapter[];
};

export const SUBJECTS: Subject[] = [
  {
    id: "physics",
    name: "Physics",
    short: "PHY",
    unitLabel: "Chapter",
    color: "var(--c-physics)",
    phase: 1,
    book: "Physics 12, PECTAA (National Curriculum 2023)",
    chapters: [
      { n: 1, title: "Thermal Physics", sub: "Book ch. 13", pages: "1–14", notes: true },
      { n: 2, title: "Simple Harmonic Motion", sub: "Book ch. 14", pages: "15–41", notes: true },
      { n: 3, title: "Physical Optics", sub: "Book ch. 15", pages: "42–56", notes: true },
      { n: 4, title: "Electrostatics", sub: "Book ch. 16", pages: "57–80", notes: true },
      { n: 5, title: "Alternating Current", sub: "Book ch. 17", pages: "81–113", notes: true },
      { n: 6, title: "Quantum Physics", sub: "Book ch. 18", pages: "114–132", notes: true },
      { n: 7, title: "Nuclear and Particle Physics", sub: "Book ch. 19", pages: "133–151", notes: true },
      { n: 8, title: "Medical Physics", sub: "Book ch. 20", pages: "152–164", notes: true },
      { n: 9, title: "Space and Environment", sub: "Book ch. 21", pages: "165–182", notes: true },
    ],
  },
  {
    id: "maths",
    name: "Mathematics",
    short: "MATH",
    unitLabel: "Unit",
    color: "var(--c-maths)",
    phase: 2,
    book: "Mathematics 12, PECTAA (National Curriculum 2023)",
    chapters: [
      { n: 1, title: "Graphical Representation of Functions", pages: "1–33" },
      { n: 2, title: "Further Differentiation", pages: "34–70" },
      { n: 3, title: "Integration", pages: "71–123" },
      { n: 4, title: "Differential Equations", pages: "124–139" },
      { n: 5, title: "Analytical Geometry", pages: "140–162" },
      { n: 6, title: "Conic Section", pages: "163–216" },
      { n: 7, title: "Kinematics", pages: "217–231" },
      { n: 8, title: "Numerical Method", pages: "232–253" },
      { n: 9, title: "Inverse Trigonometric Functions and Their Graphs", pages: "254–273" },
      { n: 10, title: "Solution of Trigonometric Equations", pages: "274–285" },
      { n: 11, title: "Vector Valued Functions and Their Differentiation", pages: "286–296" },
    ],
  },
  {
    id: "cs",
    name: "Computer Science",
    short: "CS",
    unitLabel: "Chapter",
    color: "var(--c-cs)",
    phase: 3,
    book: "Computer Science and Entrepreneurship 12, PECTAA",
    chapters: [
      { n: 1, title: "Computer Networks", pages: "1–19" },
      { n: 2, title: "Computational Thinking & Algorithms", pages: "20–32" },
      { n: 3, title: "Object Oriented Programming Using Python", pages: "33–44" },
      { n: 4, title: "Development of Graphical User Interface (GUI)", pages: "45–59" },
      { n: 5, title: "Code Testing and Debugging", pages: "60–71" },
      { n: 6, title: "Data and Analysis", pages: "72–88" },
      { n: 7, title: "Hypothesis Testing", pages: "89–102" },
      { n: 8, title: "Applications of Computer Science", pages: "103–117" },
      { n: 9, title: "Cybersecurity and Safe Digital Collaboration", pages: "118–136" },
    ],
  },
  {
    id: "english",
    name: "English",
    short: "ENG",
    unitLabel: "Unit",
    color: "var(--c-english)",
    phase: 4,
    book: "English 12, PECTAA (National Curriculum 2023)",
    chapters: [
      { n: 1, title: "Journey to Taif", sub: "Ethics and Values / Tolerance", pages: "1–7" },
      { n: 2, title: "The Last Lesson", sub: "Patriotism / National Pride", pages: "8–16" },
      { n: 3, title: "On His Blindness (Poem)", sub: "Patience", pages: "17–21" },
      { n: 4, title: "The Power of Digital Learning", sub: "MOOCs, Twitter / LinkedIn", pages: "22–31" },
      { n: 5, title: "The Giving Tree", sub: "Unconditional Love / Sacrifice", pages: "32–37" },
      { n: 6, title: "The Fun They Had", sub: "Limitations of Technology", pages: "38–43" },
      { n: 7, title: "Because I Could Not Stop for Death (Poem)", sub: "Immortality and the Afterlife", pages: "44–48" },
      { n: 8, title: "The Devoted Friend", sub: "Hypocrisy and Moral Blindness", pages: "49–59" },
      { n: 9, title: "The Doll's House", sub: "Hope and Inner Beauty / Social Prejudice", pages: "60–69" },
      { n: 10, title: "All the World's a Stage (Poem)", sub: "Human Existence / Life's Stages", pages: "70–77" },
      { n: 11, title: "A Letter to God", sub: "Unshakable Faith / Human Kindness", pages: "78–83" },
      { n: 12, title: "A Visit to the Swat Valley", sub: "Travel and Tourism / Hospitality", pages: "84–91" },
      { n: 13, title: "The Pearl (Novel)", sub: "Greed Destroys / Illusion of Wealth", pages: "92–150" },
    ],
  },
  {
    id: "urdu",
    name: "Urdu",
    short: "URDU",
    rtl: true,
    unitLabel: "سبق",
    color: "var(--c-urdu)",
    phase: 5,
    book: "اردو 12، پیکٹا (قومی نصاب 2023)",
    chapters: [
      { n: 1, title: "حمد", sub: "حمد و نعت", pages: "3" },
      { n: 2, title: "نعت", sub: "حمد و نعت", pages: "8" },
      { n: 3, title: "ہجرتِ حبشہ", sub: "حصۂ نثر", pages: "13" },
      { n: 4, title: "ماں جی", sub: "حصۂ نثر", pages: "21" },
      { n: 5, title: "کافی", sub: "حصۂ نثر", pages: "29" },
      { n: 6, title: "رستم و سہراب", sub: "حصۂ نثر", pages: "38" },
      { n: 7, title: "محشر", sub: "حصۂ نثر", pages: "48" },
      { n: 8, title: "مینار", sub: "حصۂ نثر", pages: "57" },
      { n: 9, title: "سیر دوسرے درویش کی", sub: "حصۂ نثر", pages: "64" },
      { n: 10, title: "بہادر خان کی سرگزشت", sub: "حصۂ نثر", pages: "71" },
      { n: 11, title: "حکیم احسن اللہ خان", sub: "حصۂ نثر", pages: "79" },
      { n: 12, title: "نظریۂ پاکستان", sub: "حصۂ نثر", pages: "88" },
      { n: 13, title: "انسانِ کامل کی برکات", sub: "حصۂ نظم", pages: "96" },
      { n: 14, title: "داستان تیاری میں باغ کی", sub: "حصۂ نظم", pages: "102" },
      { n: 15, title: "نثار میں تیری گلیوں کے", sub: "حصۂ نظم", pages: "106" },
      { n: 16, title: "نئی نسل کا نوحہ", sub: "حصۂ نظم", pages: "111" },
      { n: 17, title: "میں روزے سے ہوں", sub: "حصۂ نظم", pages: "115" },
      { n: 18, title: "غزل: خواجہ میر درد", sub: "حصۂ غزل", pages: "120" },
      { n: 19, title: "غزل: مرزا اسد اللہ خاں غالب", sub: "حصۂ غزل", pages: "124" },
      { n: 20, title: "غزل: علامہ محمد اقبال", sub: "حصۂ غزل", pages: "128" },
      { n: 21, title: "غزل: ادا جعفری", sub: "حصۂ غزل", pages: "133" },
      { n: 22, title: "غزل: محسن احسان", sub: "حصۂ غزل", pages: "137" },
    ],
  },
  {
    id: "pakstudies",
    name: "Pakistan Studies",
    short: "PAK",
    rtl: true,
    unitLabel: "باب",
    color: "var(--c-pak)",
    phase: 6,
    book: "مطالعۂ پاکستان 12، پیکٹا (قومی نصاب 2023)",
    chapters: [
      { n: 1, title: "اسلام اور پاکستان", sub: "Islam and Pakistan", pages: "1–11" },
      { n: 2, title: "پاکستان میں آئینی اور سیاسی ترقی", sub: "Constitutional and Political Development", pages: "12–33" },
      { n: 3, title: "آئینی اور انتظامی نظام", sub: "Constitutional and Administrative System", pages: "34–48" },
      { n: 4, title: "پاکستان اور بین الاقوامی امور", sub: "Pakistan and International Affairs", pages: "49–61" },
      { n: 5, title: "پاکستان میں تعلیم، کھیل اور سیاحت", sub: "Education, Sports and Tourism", pages: "62–76" },
      { n: 6, title: "پاکستان کے وسائل اور معاشی ترقی", sub: "Resources and Economic Development", pages: "77–95" },
    ],
  },
];

export const SUBJECT_IDS = SUBJECTS.map((s) => s.id);

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export function getChapter(subjectId: string, n: number): Chapter | undefined {
  return getSubject(subjectId)?.chapters.find((c) => c.n === n);
}

export function chapterKey(subjectId: string, n: number) {
  return `${subjectId}:${n}`;
}

/** The parts every chapter is worked through, in study order. */
export const CHECKS = [
  { id: "read", label: "Read the notes", hint: "Key ideas, once through" },
  { id: "formulas", label: "Formulas / key points learnt", hint: "Can write them from memory" },
  { id: "derivations", label: "Derivations / long answers practised", hint: "Written on rough paper" },
  { id: "mcqs", label: "MCQs done", hint: "Book MCQs + practice quiz" },
  { id: "short", label: "Short questions done", hint: "Answered without looking" },
  { id: "numericals", label: "Exercise / numericals solved", hint: "Solved before checking" },
  { id: "revised", label: "Revised", hint: "Second pass before the test" },
] as const;

export type CheckId = (typeof CHECKS)[number]["id"];

/** The study plan: one phase per book. */
export const PHASES = [
  { n: 1, subject: "physics" as SubjectId, title: "Physics notes", detail: "All 9 chapters written with solved exercises. Next: diagrams, book worked examples, margin questions." },
  { n: 2, subject: "maths" as SubjectId, title: "Mathematics notes", detail: "11 units: concepts, formulas, every exercise solved step by step, MCQs." },
  { n: 3, subject: "cs" as SubjectId, title: "Computer Science notes", detail: "9 chapters: notes, Python code examples, MCQs, short/long questions." },
  { n: 4, subject: "english" as SubjectId, title: "English notes", detail: "13 units: summaries, comprehension Q&A, MCQs, grammar and writing tasks." },
  { n: 5, subject: "urdu" as SubjectId, title: "Urdu notes", detail: "22 lessons: خلاصہ، مرکزی خیال، تشریح، مشق کے سوالات۔" },
  { n: 6, subject: "pakstudies" as SubjectId, title: "Pakistan Studies notes", detail: "6 chapters: notes, MCQs, short and long questions in Urdu." },
];
