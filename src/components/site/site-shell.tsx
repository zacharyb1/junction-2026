import type { ReactNode } from "react";
import { readingPaper } from "@/components/landing/reading-plates";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "@/components/site/site.css";

/**
 * The shared reading surface, navigation and footer.
 * `bare` leaves the header and footer out. The demo replays use it when they run on the screen at the table
 * (?loop=1) or are being recorded (?bare=1), where only the replay should be in the picture.
 */
export function SiteShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  return (
    <div className="site" style={{ backgroundImage: `url(${readingPaper.src})` }}>
      <noscript><style>{".site-nav[data-open=false]{display:flex}.site-menu-toggle{display:none}"}</style></noscript>
      <a className="site-skip" href="#main-content">Skip to content</a>
      {process.env.UI_PREVIEW === "1" && !bare ? <aside className="site-preview-note">Design preview. Explore the examples and demos. Live research, chat and voice aren’t connected here.</aside> : null}
      {bare ? null : <SiteHeader />}
      <div id="main-content" className="site-content" tabIndex={-1}>{children}</div>
      {bare ? null : <SiteFooter />}
    </div>
  );
}
