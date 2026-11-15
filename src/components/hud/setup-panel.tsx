import Link from "next/link";
import { ArrowUpRight, Globe, MessageCircle, Mic } from "lucide-react";
import { CONNECTIONS, type Connection } from "@/components/hud/setup-data";
import { SiteLink } from "@/components/site/site-link";

const ICONS = { telegram: MessageCircle, voice: Mic, browser: Globe };

function Action({ action }: { action: Connection["action"] }) {
  if (action.kind === "page") return <SiteLink href={action.href} className="hud-btn hud-btn--primary">{action.label}</SiteLink>;
  if (action.kind === "download") return <a href={action.href} download className="hud-btn hud-btn--primary">{action.label}<span className="hud-sr"> (a zip file)</span></a>;
  return <a href={action.href} target="_blank" rel="noopener noreferrer" className="hud-btn hud-btn--primary">{action.label}<ArrowUpRight size={16} aria-hidden="true" /><span className="hud-sr"> (opens Telegram in a new tab)</span></a>;
}

function Channel({ connection }: { connection: Connection }) {
  const Icon = ICONS[connection.id];
  return (
    <li id={connection.id} className="hud-setup-card">
      <div className="hud-setup-card-heading">
        <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
        <div>
          <h2 className="hud-setup-title">{connection.title}</h2>
          <span className={`hud-setup-badge ${connection.status === "live" ? "is-live" : "is-concept"}`}>
            {connection.status === "live" ? "Live in Telegram" : "First version"}
          </span>
        </div>
      </div>
      <div className="hud-setup-body">
        <p className="hud-setup-desc">{connection.description}</p>
        <div className="hud-setup-links">
          <Action action={connection.action} />
          <Link href={connection.replay.href} className="hud-setup-replay">
            Watch the replay<span className="hud-sr"> of {connection.replay.of}</span>
          </Link>
        </div>
        {connection.steps ? (
          <details className="hud-setup-help" open>
            <summary>Install the extension</summary>
            <ol className="hud-setup-steps">{connection.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </details>
        ) : null}
        <p className="hud-setup-limits">{connection.limits}</p>
        <details className="hud-setup-help">
          <summary>What stays in your hands</summary>
          <p>{connection.control}</p>
        </details>
      </div>
    </li>
  );
}

/** Real entry points: availability is not represented as a device or Telegram connection state. */
export function SetupPanel() {
  return <ul className="hud-setup-grid">{CONNECTIONS.map((connection) => <Channel key={connection.id} connection={connection} />)}</ul>;
}
