"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONNECTIONS, type Connection } from "@/components/hud/setup-data";

function Channel({ connection }: { connection: Connection }) {
  const router = useRouter();
  const live = connection.status === "live";
  // A channel that starts on its own page is off until someone switches it on here.
  const [on, setOn] = useState(live && !connection.opens);
  const badge = live ? "Live" : connection.status === "built" ? "Built, not published" : "Concept";
  const titleId = `setup-${connection.id}`;

  return (
    <li className={`hud-panel hud-setup-card${on ? " is-on" : ""}`}>
      <div className="hud-panel-title">
        <span>{connection.label}</span>
        <span className={live ? "hud-setup-badge is-live" : "hud-setup-badge is-concept"}>
          {badge}
        </span>
      </div>
      <div className="hud-setup-body">
        <div className="hud-setup-head">
          <h2 id={titleId} className="hud-setup-title">
            {connection.title}
          </h2>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby={titleId}
            className="hud-setup-switch"
            onClick={() => {
              if (!on && connection.opens) router.push(connection.opens);
              setOn((v) => !v);
            }}
          >
            <span className="hud-setup-knob" aria-hidden />
          </button>
        </div>
        <p className="hud-setup-desc">{connection.description}</p>
        <p className="hud-setup-state" aria-live="polite">
          <span className="hud-setup-dot" aria-hidden /> {on ? connection.whenOn : connection.whenOff}
        </p>
        <div className="hud-setup-links">
          {connection.action?.internal ? (
            <Link href={connection.action.href} className="hud-btn hud-btn--primary">
              {connection.action.label}
            </Link>
          ) : connection.action ? (
            <a href={connection.action.href} target="_blank" rel="noreferrer" className="hud-btn hud-btn--primary">
              {connection.action.label}
              <span className="hud-sr"> (opens Telegram)</span>
            </a>
          ) : null}
          <Link href={connection.replay.href} className="hud-setup-replay">
            Watch the replay
            <span className="hud-sr"> of {connection.replay.of}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </li>
  );
}

/** The /setup screen: three switches for what AIDaddy may follow. The listening switch opens /listen; the others keep their state only in this page. */
export function SetupPanel() {
  return (
    <ul className="hud-setup-grid">
      {CONNECTIONS.map((connection) => (
        <Channel key={connection.id} connection={connection} />
      ))}
    </ul>
  );
}
