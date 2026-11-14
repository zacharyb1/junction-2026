import { Arrow } from "@/components/landing/glyphs";
import { TryLink } from "@/components/landing/try-link";

export function SiteFooter({ repoUrl }: { repoUrl: string | null }) {
  return (
    <footer className="l-footer">
      <div className="l-wrap">
        <p className="l-footer-title">A next step you can check.</p>
        <TryLink className="l-action l-action--primary">Try it in the browser <Arrow /></TryLink>
        <div className="l-footer-row">
          <p>Built at Junction 2026 for the Exa challenge.</p>
          {repoUrl && <a href={repoUrl} target="_blank" rel="noreferrer" className="l-link">Source code <Arrow dir="up-right" /><span className="sr-only"> (opens in a new tab)</span></a>}
        </div>
        <small>Kaveri is Finnish for “buddy”. Kaveri is an independent hackathon project. It is not affiliated with Kela, Vero or Telegram.</small>
      </div>
    </footer>
  );
}
