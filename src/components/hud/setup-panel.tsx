"use client";

import Link from "next/link";
import { useState } from "react";
import { CONNECTIONS, type Connection } from "@/components/hud/setup-data";

function Channel({ connection }: { connection: Connection }) {
  const [on, setOn] = useState(connection.status === "live");
  const live = connection.status === "live";
  const titleId = `setup-${connection.id}`;

  return (
    <li className={`hud-panel hud-setup-card${on ? " is-on" : ""}`}>
      <div className="hud-panel-title">
        <span>{connection.label}</span>
        <span className={live ? "hud-setup-badge is-live" : "hud-setup-badge is-concept"}>
          {live ? "Live" : "Concept"}
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
            onClick={() => setOn((v) => !v)}
          >
            <span className="hud-setup-knob" aria-hidden />
          </button>
        </div>
        <p className="hud-setup-desc">{connection.description}</p>
        <p className="hud-setup-state" aria-live="polite">
          <span className="hud-setup-dot" aria-hidden /> {on ? connection.whenOn : connection.whenOff}
        </p>
        <div className="hud-setup-links">
          {connection.action && (
            <a href={connection.action.href} target="_blank" rel="noreferrer" className="hud-btn hud-btn--primary">
              {connection.action.label}
              <span className="hud-sr"> (opens Telegram)</span>
            </a>
          )}
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

/** The /setup mockup: three switches for what AIDaddy may follow. State lives only in this page. */
export function SetupPanel() {
  return (
    <ul className="hud-setup-grid">
      {CONNECTIONS.map((connection) => (
        <Channel key={connection.id} connection={connection} />
      ))}
    </ul>
  );
}
