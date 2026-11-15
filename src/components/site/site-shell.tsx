import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "@/components/site/site.css";

/**
 * The frame every page of the site shares: the warm ground, the header and the footer.
 *
 * The colours come from site.css. The shared components are drawn in their light variants.
 * `bare` leaves the header and footer out. The demo replays use it when they run on the screen at the table
 * (?loop=1) or are being recorded (?bare=1), where only the replay should be in the picture.
 */
export function SiteShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  return (
    <div className="site">
      {bare ? null : <SiteHeader />}
      {children}
      {bare ? null : <SiteFooter />}
    </div>
  );
}
