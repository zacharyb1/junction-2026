export type CoreState = "idle" | "active" | "done";

/**
 * The orb: AIDaddy's face. A soft ball in peach, apricot, butter and rose, from the household app's design.
 *
 * idle: it breathes slowly (it is listening, not talking). active: the colours inside swirl fast and the glow
 * grows (researching). done: the same orb in garden colours (every quote found). The picture is drawn in CSS
 * and sized from the orb's own width, so one component serves the hero and a 56px seal.
 */
export function Core({ state = "idle", className = "" }: { state?: CoreState; className?: string }) {
  return (
    <div className={`hud-core ${className}`} data-state={state} aria-hidden="true">
      <div className="hud-core-glow" />
      <div className="hud-core-ball">
        <div className="hud-core-swirl" />
        <div className="hud-core-shine" />
      </div>
    </div>
  );
}
