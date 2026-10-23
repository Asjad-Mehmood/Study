"use client";

import katex from "katex";
import { memo } from "react";

/** Text with $…$ maths and line breaks, as the exam maker writes it. */
export const RichText = memo(function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.replace(/\*\*/g, "").split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g);
  return (
    <span className={className} dir="auto">
      {parts.map((p, i) => {
        if (i % 2 === 1) {
          const display = p.startsWith("$$");
          const tex = p.slice(display ? 2 : 1, display ? -2 : -1);
          let html: string;
          try {
            html = katex.renderToString(tex, { throwOnError: false, displayMode: false, strict: false });
          } catch {
            return <code key={i}>{tex}</code>;
          }
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return p.split("\n").map((line, j, all) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < all.length - 1 && <br />}
          </span>
        ));
      })}
    </span>
  );
});
