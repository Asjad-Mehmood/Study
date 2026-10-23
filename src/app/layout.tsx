import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Newsreader, Noto_Nastaliq_Urdu } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { StoreProvider } from "@/components/store";
import { AppShell } from "@/components/AppShell";

const ui = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
  adjustFontFallback: false,
});
const read = Newsreader({ subsets: ["latin"], variable: "--font-read", display: "swap" });
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Study Register", template: "%s · Study Register" },
  description: "ICS 2nd year study notes, plan and progress tracker for the PECTAA 2026-27 books.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#10151a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${read.variable} ${nastaliq.variable}`}>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
