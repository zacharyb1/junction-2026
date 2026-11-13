import { Arrow } from "@/components/landing/glyphs";
import { TryLink } from "@/components/landing/try-link";

/** The last sign on the page repeats the main way in. The source link shows only when a repository URL is configured. */
export function SiteFooter({ repoUrl }: { repoUrl: string | null }) {
  return (
    <footer>
      <TryLink className="l-close l-field--yellow">
        <span className="l-close-label">Try it in the browser</span>
        <span className="l-way-arrow">
          <Arrow />
        </span>
      </TryLink>

      <div className="l-footer l-field--black">
        <div className="l-wrap">
          <div className="l-footer-row">
            <p>Built at Junction 2026 for the Exa challenge.</p>
            {repoUrl && (
              <a href={repoUrl} target="_blank" rel="noreferrer" className="l-link">
                Source code
                <Arrow dir="up-right" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
          <small>Kaveri is an independent hackathon project. It is not affiliated with Kela, Vero or Telegram.</small>
        </div>
      </div>
    </footer>
  );
}
