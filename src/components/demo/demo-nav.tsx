import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { REPLAY_ORDER, REPLAYS, type SceneSlug } from "@/components/demo/scenes";

/** The way from one replay to the next, and back to the programme. */
export function DemoNav({ current }: { current: SceneSlug }) {
  return (
    <nav className="demo-nav" aria-label="Demo replays">
      <div className="site-wrap demo-nav-row">
        <Link href="/demo" className="demo-nav-back">
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="demo-nav-back-text">All demos</span>
        </Link>
        <ul>
          {REPLAY_ORDER.map((slug) => {
            const { href, nav, navShort } = REPLAYS[slug];
            // Under 560px the short name shows; the full name stays the link's name for screen readers.
            const short = navShort && navShort !== nav ? navShort : undefined;
            return (
              <li key={slug}>
                <Link href={href} aria-current={slug === current ? "page" : undefined} aria-label={short ? nav : undefined}>
                  {short ? (
                    <>
                      <span className="demo-nav-full">{nav}</span>
                      <span className="demo-nav-short" aria-hidden="true">
                        {short}
                      </span>
                    </>
                  ) : (
                    nav
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
