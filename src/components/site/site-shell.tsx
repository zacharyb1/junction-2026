import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "@/components/site/site.css";

/**
 * The frame every page of the site shares: the dark ground, the header and the footer.
 *
 * `dark` switches the shared components to their dark variants; the colours themselves come from site.css.
 * `bare` leaves the header and footer out. The demo replays use it when they run on the screen at the table
 * (?loop=1) or are being recorded (?bare=1), where only the replay should be in the picture.
 */
export function SiteShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  return (
    <div className="site dark">
      {bare ? null : <SiteHeader />}
      {children}
      {bare ? null : <SiteFooter />}
    </div>
  );
}
