import Link from "next/link";
import { CONNECTIONS, type Connection } from "@/components/hud/setup-data";
import { SiteLink } from "@/components/site/site-link";

function Action({ action }: { action: Connection["action"] }) {
  if (action.kind === "page") {
    return (
      <SiteLink href={action.href} className="hud-btn hud-btn--primary">
        {action.label}
      </SiteLink>
    );
  }
  if (action.kind === "download") {
    return (
      <a href={action.href} download className="hud-btn hud-btn--primary">
        {action.label}
        <span className="hud-sr"> (a zip file)</span>
      </a>
    );
  }
  return (
    <a href={action.href} target="_blank" rel="noreferrer" className="hud-btn hud-btn--primary">
      {action.label}
      <span className="hud-sr"> (opens Telegram)</span>
    </a>
  );
}

function Card({ connection }: { connection: Connection }) {
  const live = connection.status === "live";
  return (
    <li id={connection.id} className="hud-panel hud-setup-card is-on">
      <div className="hud-panel-title">
        <span>{connection.label}</span>
        <span className={live ? "hud-setup-badge is-live" : "hud-setup-badge is-new"}>{live ? "Live" : "First version"}</span>
      </div>
      <div className="hud-setup-body">
        <h2 className="hud-setup-title">{connection.title}</h2>
        <p className="hud-setup-desc">{connection.description}</p>
        <div className="hud-setup-links">
          <Action action={connection.action} />
          <Link href={connection.replay.href} className="hud-setup-replay">
            Watch the replay
            <span className="hud-sr"> of {connection.replay.of}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        {connection.steps ? (
          <ol className="hud-setup-steps">
            {connection.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
        <dl className="hud-setup-facts">
          <div>
            <dt>In your hands</dt>
            <dd>{connection.control}</dd>
          </div>
          <div>
            <dt>Where it works</dt>
            <dd>{connection.limits}</dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

/** The three connections of /setup. Each button does what it says: nothing on this page is a switch that only pretends. */
export function SetupPanel() {
  return (
    <ul className="hud-setup-grid">
      {CONNECTIONS.map((connection) => (
        <Card key={connection.id} connection={connection} />
      ))}
    </ul>
  );
}
