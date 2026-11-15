import Link from "next/link";
import { ArrowUpRight, Globe, MessageCircle, Mic } from "lucide-react";
import { CONNECTIONS, type Connection } from "@/components/hud/setup-data";
import { SiteLink } from "@/components/site/site-link";

const ICONS = { telegram: MessageCircle, phone: Mic, browser: Globe };
const DETAILS = {
  telegram: "The link opens Telegram, where you choose a group and add AIDaddy. This page cannot check group membership or change it. Remove the bot from the group in Telegram to disconnect.",
  phone: "The listening page explains what leaves this device. You start the microphone there, after giving your browser permission. It stops when the page closes or leaves the screen.",
  browser: "The Chrome extension exists in the project repository, but is not published in the Chrome Web Store. No browser page is read by visiting this setup page.",
};

function Channel({ connection }: { connection: Connection }) {
  const Icon = ICONS[connection.id];
  return (
    <li className="hud-setup-card">
      <div className="hud-setup-card-heading">
        <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
        <div>
          <h2 className="hud-setup-title">{connection.title}</h2>
          <span className={`hud-setup-badge ${connection.status === "live" ? "is-live" : "is-concept"}`}>
            {connection.status === "live" ? "Available now" : connection.status === "built" ? "Built · not published yet" : "Concept"}
          </span>
        </div>
      </div>
      <div className="hud-setup-body">
        <p className="hud-setup-desc">{connection.description}</p>
        <div className="hud-setup-links">
          {connection.action?.internal ? (
            <SiteLink href={connection.action.href} className="hud-btn hud-btn--primary">{connection.action.label}</SiteLink>
          ) : connection.action ? (
            <a href={connection.action.href} target="_blank" rel="noopener noreferrer" className="hud-btn hud-btn--primary">
              {connection.action.label}<ArrowUpRight size={16} aria-hidden="true" />
              <span className="hud-sr"> (opens Telegram in a new tab)</span>
            </a>
          ) : null}
          <Link href={connection.replay.href} className="hud-setup-replay">
            Watch the replay<span className="hud-sr"> of {connection.replay.of}</span>
          </Link>
        </div>
        <details className="hud-setup-help">
          <summary>What to expect</summary>
          <p>{DETAILS[connection.id]}</p>
        </details>
      </div>
    </li>
  );
}

/** Real entry points: availability is not represented as a device or Telegram connection state. */
export function SetupPanel() {
  return <ul className="hud-setup-grid">{CONNECTIONS.map((connection) => <Channel key={connection.id} connection={connection} />)}</ul>;
}
