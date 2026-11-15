export type CoreState = "idle" | "active" | "done";

/** A quiet letterpress mark. State lives in the adjacent accessible status, never in animation alone. */
export function Core({ state = "idle", className = "" }: { state?: CoreState; className?: string }) {
  return (
    <div className={`hud-core ${className}`} data-state={state} aria-hidden="true">
      <span className="hud-core-letter">a.</span>
      <span className="hud-core-activity"><i /><i /><i /></span>
    </div>
  );
}
