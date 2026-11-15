import Link from "next/link";
import { Arrow } from "@/components/landing/glyphs";
import { TryLink } from "@/components/landing/try-link";
import { InkReveal } from "@/components/landing/reading-motion";
import { ReadingPlate } from "@/components/landing/reading-plates";

export function SiteFooter({ repoUrl }: { repoUrl: string | null }) {
  return (
    <footer className="l-footer">
      <div className="l-wrap">
        <p className="l-footer-title">A next step you can <span className="l-footer-mark">check.<InkReveal className="l-footer-ink"><ReadingPlate name="next-underline" className="reading-ink-inner" /></InkReveal></span></p>
        <TryLink className="l-action l-action--primary">Try it in the browser <Arrow /></TryLink>
        <div className="l-footer-row">
          <p>Built at Junction 2026 for the Exa challenge.</p>
          {/* This page is an edition of the front page; without this link it had no way back to the rest of the site. */}
          <Link href="/" className="l-link">Front page, demos and the chat with AIDaddy <Arrow /></Link>
          {repoUrl && <a href={repoUrl} target="_blank" rel="noreferrer" className="l-link">Source code <Arrow dir="up-right" /><span className="sr-only"> (opens in a new tab)</span></a>}
        </div>
        <small>AIDaddy is an independent hackathon project. It is not affiliated with Kela, Vero or Telegram.</small>
      </div>
    </footer>
  );
}
