// Small stroke icons, 24×24 grid, drawn to read at 20px.
type P = { className?: string };
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconToday = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M9 14.5l2 2 4-4" />
  </svg>
);
export const IconBooks = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M9 4h4v16H9z" />
    <path d="M14.5 5.2l3.4-.9 3 11.6-3.4.9z" />
  </svg>
);
export const IconQuiz = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.3" />
    <path d="M12 16.8v.2" />
  </svg>
);
export const IconTimer = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9.5V13l2.3 1.6M10 3h4M12 3v2.5" />
  </svg>
);
export const IconPlan = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6l1 1 1.8-2M4 12l1 1 1.8-2" />
    <circle cx="5" cy="18" r="1.2" />
  </svg>
);
export const IconTests = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20V10M10 20V5M16 20v-7M21 20H3" />
  </svg>
);
export const IconSettings = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconTrash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
  </svg>
);
export const IconPlay = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
);
export const IconPause = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8.5 5v14M15.5 5v14" />
  </svg>
);
export const IconStop = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);
export const IconBack = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </svg>
);
export const IconExam = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 3.5h8.5L19 8v12.5H6z" />
    <path d="M14 3.5V8.5h5" />
    <path d="M9 12.5h7M9 16h4.5" />
  </svg>
);
export const IconCamera = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2.2h5.6L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.3" />
  </svg>
);
