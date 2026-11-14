export type CoreState = "idle" | "active" | "done";

/**
 * The glowing core: AIDaddy's face.
 *
 * idle: dim, turning slowly (it is listening, not talking). active: bright and fast (researching).
 * done: green (every quote found). Each ring is its own layer, so the browser turns it without repainting.
 * A ring turns in two parts: the outer part never stops, the inner part runs only while active, so the
 * change of speed has no jump.
 */
const RINGS = [
  { r: 188, width: 1.5, dash: "1.5 9.31", opacity: 0.55, arc: "" },
  { r: 164, width: 7, dash: "262 70 142 70 62 70 250 104.4", opacity: 0.9, arc: "" },
  { r: 138, width: 1, dash: "", opacity: 0.35, arc: "64 803.1" },
  { r: 114, width: 9, dash: "3 6.95", opacity: 0.28, arc: "" },
  { r: 90, width: 2, dash: "120 68.5", opacity: 0.8, arc: "" },
];

export function Core({ state = "idle", className = "" }: { state?: CoreState; className?: string }) {
  return (
    <div className={`hud-core ${className}`} data-state={state} aria-hidden="true">
      <div className="hud-core-glow" />
      {RINGS.map((ring, index) => (
        <div key={ring.r} className={`hud-ring hud-ring--${index}`}>
          <svg viewBox="0 0 400 400" className="hud-boost">
            <circle
              cx="200"
              cy="200"
              r={ring.r}
              fill="none"
              stroke="currentColor"
              strokeWidth={ring.width}
              strokeDasharray={ring.dash || undefined}
              opacity={ring.opacity}
            />
            {ring.arc ? (
              <circle cx="200" cy="200" r={ring.r} fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray={ring.arc} strokeLinecap="round" />
            ) : null}
          </svg>
        </div>
      ))}
      <div className="hud-ring hud-ring--family">
        <svg viewBox="0 0 400 400" className="hud-boost">
          <circle cx="200" cy="200" r="176" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="46 1059.8" strokeLinecap="round" />
        </svg>
      </div>
      <svg viewBox="0 0 400 400" className="hud-core-marks">
        <path d="M200 0v10M200 390v10M0 200h10M390 200h10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="hud-core-heart" />
    </div>
  );
}
