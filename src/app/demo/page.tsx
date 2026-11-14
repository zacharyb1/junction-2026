import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AUTOPILOT, REPLAY_ORDER, REPLAYS, type Scene } from "@/components/demo/scenes";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import "@/components/demo/demo.css";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "Five short scenes of AIDaddy at work: four scripted replays and one demo with a live check. Each says what in it comes from a real research run.",
};

export const viewport: Viewport = { themeColor: "#05080d" };

const SCENES: Scene[] = [...REPLAY_ORDER.map((slug) => REPLAYS[slug]), AUTOPILOT];

/** The programme behind "Demos" in the header: every scene, the story it tells and what in it is real. */
export default function DemoHub() {
  return (
    <SiteShell>
      <main className="demo-hub">
        <div className="site-wrap">
          <p className="site-eyebrow">Demos</p>
          <h1>See AIDaddy at work</h1>
          <p className="demo-hub-lede">
            AIDaddy is a butler for your family&apos;s group chat. Here are five short scenes of it at work. Four are scripted
            replays, and each one says which parts come from a real research run. The fifth runs one check live.
          </p>

          <ol className="demo-programme">
            {SCENES.map((scene, i) => (
              <li key={scene.href} className="demo-scene-row">
                <span className="demo-scene-no" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="demo-scene-text">
                  <h2>
                    {/* The autopilot page asks for the access code, so its link carries the code a visitor already has. */}
                    {scene === AUTOPILOT ? <SiteLink href={scene.href}>{scene.place}</SiteLink> : <Link href={scene.href}>{scene.place}</Link>}
                  </h2>
                  <p className="demo-scene-story">{scene.story}</p>
                  <p className="demo-scene-real">{scene.real}</p>
                </div>
                <p className="demo-scene-meta">
                  <span className={`demo-tag demo-tag--${scene.tone}`}>{scene.tag}</span>
                  <span className="demo-scene-kind">{scene.seconds ? `Replay · ${scene.seconds} s` : "Fixed script"}</span>
                </p>
                <span className="demo-scene-go" aria-hidden="true">
                  →
                </span>
              </li>
            ))}
          </ol>

          <div className="demo-hub-next">
            <p>These are scenes. The research itself is open to try.</p>
            <div>
              <SiteLink href="/try" className="demo-btn demo-btn--primary">
                Try it live
              </SiteLink>
              <SiteLink href="/chat" className="demo-btn">
                Talk to AIDaddy
              </SiteLink>
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
