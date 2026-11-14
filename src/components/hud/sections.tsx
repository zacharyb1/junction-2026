import Link from "next/link";
import type { ReactNode } from "react";
import { Core } from "@/components/hud/core";
import type { PlanRow } from "@/components/hud/data";
import { HearPlan } from "@/components/hud/hear-plan";
import type { Scorecard } from "@/components/site/scorecard-data";
import { SiteLink } from "@/components/site/site-link";

const oneDecimal = (ms: number) => (ms / 1000).toFixed(1);

export function Hero({ botUrl, sites, card }: { botUrl: string | null; sites: number; card: Scorecard | null }) {
  const boot = ["AIDaddy online", "Watching: family group chat", `Official sites on file for Finland: ${sites}`, "Mode: silent until a life event"];
  return (
    <div className="hud-hero">
      <div className="hud-wrap">
        <div className="hud-hero-grid">
          <div className="hud-hero-core">
            <Core state="idle" />
            <ul className="hud-orbit" aria-hidden="true">
              <li>Exa search</li>
              <li>Local gate</li>
              <li>Quote check</li>
            </ul>
          </div>

          <div className="hud-hero-copy">
            <ul className="hud-boot" aria-hidden="true">
              {boot.map((line, index) => (
                <li key={line} style={{ animationDelay: `${0.25 + index * 0.45}s` }}>
                  {line}
                </li>
              ))}
            </ul>
            <h1>
              Silent until
              <br />
              <em>it matters.</em>
            </h1>
            <p className="hud-lede">
              AIDaddy is a butler for your family&apos;s group chat. It lets the small talk pass. When life happens, it
              researches the live web with Exa and comes back with a plan in which every line points at a sentence on an
              official page.
            </p>
            <div className="hud-actions">
              <a href="#research" className="hud-btn hud-btn--primary">
                Watch it work
              </a>
              <SiteLink href="/try" className="hud-btn">
                Try it live
              </SiteLink>
              {botUrl ? (
                <a href={botUrl} className="hud-btn" target="_blank" rel="noopener noreferrer">
                  Add to Telegram
                </a>
              ) : null}
            </div>
            {card ? (
              <dl className="hud-strip">
                <div>
                  <dt>live test scenarios passed</dt>
                  <dd>
                    {card.totals.passed}/{card.totals.scenarios}
                  </dd>
                </div>
                <div>
                  <dt>quotes found on their pages</dt>
                  <dd>
                    {card.totals.verifiedQuotes}/{card.totals.totalQuotes}
                  </dd>
                </div>
                {card.totals.medianMs ? (
                  <div>
                    <dt>median time to a plan</dt>
                    <dd>{oneDecimal(card.totals.medianMs)} s</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One numbered part of a page. On the front page its title is an h2 under the hero's h1.
 * A page that consists of a single section passes `pageTitle`, so the same title is that page's h1.
 */
export function Section({
  id,
  index,
  label,
  title,
  lede,
  pageTitle = false,
  children,
}: {
  id: string;
  index: string;
  label: string;
  title: string;
  lede?: ReactNode;
  pageTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="hud-section" aria-labelledby={`${id}-title`}>
      <div className="hud-wrap">
        <header className="hud-section-head hud-reveal">
          <p className="hud-label">
            {index} <span aria-hidden="true">{"//"}</span> {label}
          </p>
          {pageTitle ? (
            <h1 id={`${id}-title`} className="hud-title">
              {title}
            </h1>
          ) : (
            <h2 id={`${id}-title`}>{title}</h2>
          )}
          {lede ? <p className="hud-lede">{lede}</p> : null}
        </header>
        {children}
      </div>
    </section>
  );
}

type Gate = { gate: string; messages: number; triggers: number; smallTalk: number; missedTriggers: number; falseWakes: number };

/** What the local gate did with the team's labelled messages. Figures from eval/results/gate-gemma3-1b.json. */
export function GateFigures({ gate }: { gate: Gate }) {
  return (
    <div className="hud-gate hud-reveal">
      <dl className="hud-figures">
        <div>
          <dd>
            {gate.missedTriggers}/{gate.triggers}
          </dd>
          <dt>life events missed</dt>
        </div>
        <div>
          <dd>
            {gate.falseWakes}/{gate.smallTalk}
          </dd>
          <dt>small-talk messages that woke it by mistake</dt>
        </div>
      </dl>
      <p className="hud-note">
        Measured on the team&apos;s own {gate.messages} labelled chat messages, English and Finnish, with a small Gemma model (
        {gate.gate}). That test ran on a laptop; on the server the same model does the job. It is a development set, not a
        blind test. Photos, and messages in the three minutes after a wake, go on to the conversation model.
      </p>
    </div>
  );
}

const RULES = [
  {
    title: "No source, no line",
    text: "A deadline or an amount stays in the plan only if the same sentence stands on the page it cites. Our server opens that page again to check. What fails is taken out and listed as unconfirmed.",
  },
  {
    title: "Two answers? You see both",
    text: "When two official pages give different figures, the case file shows both with their sources. It does not pick one for you in silence.",
  },
  {
    title: "AIDaddy never acts for you",
    text: "It researches and prepares. It never sends, files, books or pays. It may write a draft ahead of time, but nothing is sent and no reminder is set until the family says yes.",
  },
];

export function PlanPanel({ title, caseHref, rows }: { title: string; caseHref: string; rows: PlanRow[] }) {
  return (
    <div className="hud-plan">
      <div className="hud-panel hud-answer hud-reveal">
        <p className="hud-panel-title">
          <span>AIDaddy · in the chat</span>
          <span>the same recorded run</span>
        </p>
        <h3>{title}</h3>
        <ol>
          {rows.map((row) => (
            <li key={row.text}>
              <span>{row.text}</span>
              <span className="hud-sources">
                {row.sources.map((source) => (
                  <a
                    key={source.n}
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Source ${source.n}: ${source.host}, opened at the quoted sentence`}
                  >
                    {source.n}
                  </a>
                ))}
              </span>
            </li>
          ))}
        </ol>
        <p className="hud-answer-foot">
          Tap a number: the official page opens at the quoted sentence.{" "}
          <Link href={caseHref}>Open the full case file for this run →</Link>
        </p>
        <HearPlan src="/hud/plan.mp3" seconds={40} />
      </div>
      <ul className="hud-rules">
        {RULES.map((rule) => (
          <li key={rule.title} className="hud-reveal">
            <h3>{rule.title}</h3>
            <p>{rule.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Place = {
  status: "Live" | "Concept" | "Replay";
  name: string;
  text: string;
  /** `of` finishes a label for screen readers where several rows carry the same words. */
  links: { href: string; label: string; of?: string }[];
};

/**
 * Where AIDaddy meets a household, each with what it is today. "Live" works now, "Concept" is an idea shown as a
 * scripted replay or a mockup, "Replay" is a recording or a fixed script. The words match /setup and the demo pages.
 */
const PLACES: Place[] = [
  {
    status: "Live",
    name: "In the group chat",
    text: "AIDaddy is one more member of your family's Telegram group. You can also talk to it here on the web.",
    links: [
      { href: "/demo/chat", label: "Watch the replay", of: "the group chat" },
      { href: "/chat", label: "Talk to AIDaddy" },
    ],
  },
  {
    status: "Concept",
    name: "In the browser",
    text: "When someone is stuck on an official form, AIDaddy points at the rule that applies.",
    links: [{ href: "/demo/browser", label: "Watch the replay", of: "the browser" }],
  },
  {
    status: "Concept",
    name: "At the kitchen table",
    text: "The phone lies on the table. Say \"AIDaddy\", and it looks things up while you keep talking. It cannot listen yet.",
    links: [{ href: "/demo/talk", label: "Watch the replay", of: "the kitchen table" }],
  },
  {
    status: "Concept",
    name: "In the calendar",
    text: "A birthday is coming up, and AIDaddy comes back with three options. The birthday planner is a skill of the Telegram bot.",
    links: [{ href: "/demo/calendar", label: "Watch the replay", of: "the calendar" }],
  },
  {
    status: "Replay",
    name: "One step ahead",
    text: "AIDaddy notices a situation and suggests a next step. A scripted demo with one live check on official sources.",
    links: [{ href: "/autopilot", label: "Play the demo" }],
  },
  {
    status: "Concept",
    name: "What it may follow",
    text: "You choose what AIDaddy may read or hear. A mockup of the setup screen: of its three channels, only Telegram works today.",
    links: [{ href: "/setup", label: "Open the setup" }],
  },
];

const STATUS_TONE = { Live: "hud-label--green", Concept: "hud-label--amber", Replay: "" };

export function Places() {
  return (
    <ul className="hud-places">
      {PLACES.map((place) => (
        <li key={place.name} className="hud-reveal">
          <p className={`hud-label ${STATUS_TONE[place.status]}`}>{place.status}</p>
          <div className="hud-place-text">
            <h3>{place.name}</h3>
            <p>{place.text}</p>
          </div>
          <div className="hud-place-links">
            {place.links.map((link) => (
              <SiteLink key={link.href} href={link.href}>
                {link.label}
                {link.of ? <span className="hud-sr"> of {link.of}</span> : null}
                <span aria-hidden="true">→</span>
              </SiteLink>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A ring that fills to `part / whole`, with the two numbers in the middle. */
function Gauge({ part, whole, label, note }: { part: number; whole: number; label: string; note: string }) {
  const round = 2 * Math.PI * 52;
  const filled = whole > 0 ? (part / whole) * round : 0;
  return (
    <li className="hud-panel hud-gauge hud-reveal">
      <div className="hud-gauge-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.18" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${round}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <p>
          {part}
          <span>/{whole}</span>
        </p>
      </div>
      <h3>{label}</h3>
      <p>{note}</p>
    </li>
  );
}

export function Readouts({ card }: { card: Scorecard }) {
  const countries = new Set(card.rows.map((row) => row.country).filter(Boolean)).size;
  const ran = card.ranAt
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Helsinki" }).format(new Date(card.ranAt))
    : "";
  return (
    <>
      <ul className="hud-gauges">
        <Gauge
          part={card.totals.passed}
          whole={card.totals.scenarios}
          label="scenarios passed"
          note={`Life events in ${countries} countries, researched on the live web.`}
        />
        <Gauge
          part={card.totals.verifiedQuotes}
          whole={card.totals.totalQuotes}
          label="quotes found"
          note={
            card.totals.verifiedQuotes === card.totals.totalQuotes
              ? "Every quote in those plans stood on the page it cites."
              : "Quotes in those plans that stood on the page they cite."
          }
        />
        {card.refusals ? (
          <Gauge
            part={card.refusals.passed}
            whole={card.refusals.total}
            label="non-events refused"
            note="Messages with nothing to research got no made-up plan."
          />
        ) : null}
        {card.totals.medianMs ? (
          <li className="hud-panel hud-gauge hud-reveal">
            <div className="hud-gauge-ring hud-gauge-ring--plain">
              <p>
                {oneDecimal(card.totals.medianMs)}
                <span> s</span>
              </p>
            </div>
            <h3>median time</h3>
            <p>From the message to a checked plan.</p>
          </li>
        ) : null}
      </ul>
      <p className="hud-note hud-reveal">
        Latest run of our own test set{ran ? `, ${ran}` : ""}. The web is live, so runs differ: recent runs passed 17 to 19 of{" "}
        {card.totals.scenarios}. <Link href="/reading#scorecard">See every scenario and its case file →</Link>
      </p>
    </>
  );
}

const FLOW = [
  { name: "Family group chat", tech: "Telegram", text: "AIDaddy is one more member. Nobody has to open another app." },
  { name: "Gate", tech: "Gemma, on our own server", text: "Decides whether a message is a life event. Small talk stops here." },
  { name: "Conversation", tech: "Hermes Agent + Nemotron", text: "Reads the letter photo, asks what is missing and drafts the notice. Sends nothing, and reminds only with a yes." },
  { name: "Research engine", tech: "Exa search", text: "Four searches per case, official sites of the right country first." },
  { name: "Verifier", tech: "Own live request + Exa Contents", text: "Opens every cited page again. A quote that is not there is removed." },
  { name: "Case file", tech: "A link for the whole family", text: "Plan, quotes, gaps and open questions. Sources are re-checked every night." },
];

export function Schematic() {
  return (
    <ol className="hud-flow">
      {FLOW.map((node) => (
        <li key={node.name} className="hud-reveal">
          <h3>{node.name}</h3>
          <p className="hud-flow-tech">{node.tech}</p>
          <p>{node.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function Start({ botUrl, caseHref }: { botUrl: string | null; caseHref: string }) {
  return (
    <section id="start" className="hud-section hud-start" aria-labelledby="start-title">
      <div className="hud-wrap">
        <div className="hud-panel hud-start-panel hud-reveal">
          <Core state="idle" className="hud-core--small" />
          <div>
            <h2 id="start-title">Ask about your own life.</h2>
            <p className="hud-lede">
              Type what happened, in your own words. The same engine runs in the browser, on the live web, in a few seconds.
            </p>
            <div className="hud-actions">
              <SiteLink href="/try" className="hud-btn hud-btn--primary">
                Try it live
              </SiteLink>
              {botUrl ? (
                <a href={botUrl} className="hud-btn" target="_blank" rel="noopener noreferrer">
                  Add to Telegram
                </a>
              ) : null}
              <Link href={caseHref} className="hud-btn">
                Open a real case file
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
