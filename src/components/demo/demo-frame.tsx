import type { ReactNode } from "react";
import { DemoNav } from "@/components/demo/demo-nav";
import { PauseButton, ReplayButton, ReplayProvider, ReplayStage } from "@/components/demo/replay";
import { REPLAY_ORDER, REPLAYS, SCENE_COUNT, type SceneSlug } from "@/components/demo/scenes";
import { SiteShell } from "@/components/site/site-shell";
import "@/components/demo/demo.css";

/** What a replay page reads from its address. */
export type DemoParams = { loop?: string | string[]; bare?: string | string[] };

/** ?loop=1 repeats the replay for the screen at the team's table; ?bare=1 is for recording. Both leave the site out of the picture. */
export function demoMode(params: DemoParams): { loop: boolean; bare: boolean } {
  const loop = params.loop === "1";
  return { loop, bare: loop || params.bare === "1" };
}

/**
 * The frame the four replays share: the site's header and footer, the links between the replays, the scene's
 * name, what kind of thing it is, a Replay button, the stage and the caption.
 *
 * `shape` is the thing on the stage: a phone stands beside its heading on a wide screen, a wide window sits under it.
 * `bare` keeps only the stage and the caption. The heading stays for screen readers, so the page still has a name.
 */
export function DemoFrame({
  scene,
  shape,
  bare,
  caption,
  children,
}: {
  scene: SceneSlug;
  shape: "phone" | "wide";
  bare: boolean;
  caption: ReactNode;
  children: ReactNode;
}) {
  const { title, story, tag, tone, seconds } = REPLAYS[scene];
  if (bare) {
    return (
      <SiteShell bare>
        <main className={`demo-page demo-page--bare demo-page--${shape}`}>
          <h1 className="sr-only">{title}</h1>
          <div className="demo-stage">{children}</div>
          <p className="demo-caption">{caption}</p>
        </main>
      </SiteShell>
    );
  }
  return (
    <SiteShell>
      <DemoNav current={scene} />
      <main className={`demo-page demo-page--framed demo-page--${shape}`}>
        <ReplayProvider>
          <div className="site-wrap demo-body">
            <header className="demo-head">
              <h1>{title}</h1>
              <p className="demo-story">{story}</p>
              <p className="demo-provenance">Scene {REPLAY_ORDER.indexOf(scene) + 1} of {SCENE_COUNT} · scripted replay · {seconds} s</p>
              <div className="demo-controls">
                <span className={`demo-tag demo-tag--${tone}`}>{tag}</span>
                <ReplayButton />
                <PauseButton />
              </div>
            </header>
            <div className="demo-stage">
              <ReplayStage>{children}</ReplayStage>
            </div>
            <p className="demo-caption">{caption}</p>
          </div>
        </ReplayProvider>
      </main>
    </SiteShell>
  );
}
