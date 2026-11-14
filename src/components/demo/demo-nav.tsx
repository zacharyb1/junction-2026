import Link from "next/link";
import { REPLAY_ORDER, REPLAYS, type SceneSlug } from "@/components/demo/scenes";

/** The way from one replay to the next, and back to the programme. */
export function DemoNav({ current }: { current: SceneSlug }) {
  return (
    <nav className="demo-nav" aria-label="Demo replays">
      <div className="site-wrap demo-nav-row">
        <Link href="/demo" className="demo-nav-back">
          <span aria-hidden="true">←</span>
          <span className="demo-nav-back-text">All demos</span>
        </Link>
        <ul>
          {REPLAY_ORDER.map((slug) => (
            <li key={slug}>
              <Link href={REPLAYS[slug].href} aria-current={slug === current ? "page" : undefined}>
                {REPLAYS[slug].nav}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
