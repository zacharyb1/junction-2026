"use client";

import { useState } from "react";
import type { ReplayData } from "@/components/hud/data";

/**
 * A scripted demo of proactive help. Nothing here listens, reads a browser, or sends anything.
 * Every line below is fixed text written for the demo. The quotes come from one recorded research run.
 * The visitor decides whether suggestions appear at all, and every button only changes this page.
 */

type Step =
  | { kind: "chat"; who: string; text: string }
  | { kind: "orchestrator"; text: string }
  | { kind: "specialist"; name: string; text: string; quotes?: boolean }
  | { kind: "proposal"; text: string };

const SCRIPT: Step[] = [
  { kind: "chat", who: "Anna", text: "The bank sent another letter about the mortgage." },
  { kind: "chat", who: "Mikko", text: "We should look at Tampere in spring. Rent here is too high." },
  {
    kind: "orchestrator",
    text: "Two signals: a possible move, and a bank letter. The lawyer and finance specialists have something to add. The trip planner waits until a date exists.",
  },
  { kind: "specialist", name: "Lawyer", text: "Checked what the rules say about ending a rental. Quotes from a recorded run:", quotes: true },
  {
    kind: "specialist",
    name: "Finance",
    text: "Cannot compare the rents yet. The bank letter's amount is missing. Asks Anna for it.",
  },
  { kind: "proposal", text: "Set a reminder for the notice period, one month before the move date. Waiting for a date." },
];

export function AutopilotDemo({ quotes }: { quotes: ReplayData["quotes"] }) {
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(0);
  const [suggestions, setSuggestions] = useState(false);
  const [decisions, setDecisions] = useState<Record<number, "approved" | "declined">>({});

  const play = () => {
    setPlaying(true);
    setShown(0);
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setShown(count);
      if (count >= SCRIPT.length) window.clearInterval(timer);
    }, 900);
  };

  return (
    <div className="hud-panel hud-autopilot">
      <div className="hud-autopilot-consent">
        <p>
          <strong>Demo.</strong> A fixed script plays. Nothing listens to you, nothing reads your browser, and nothing is sent or
          paid.
        </p>
        <label>
          <input type="checkbox" checked={suggestions} onChange={(event) => setSuggestions(event.target.checked)} />
          Let AIDaddy suggest next steps
        </label>
      </div>

      <div className="hud-autopilot-actions">
        <button type="button" className="hud-btn hud-btn--primary" onClick={play} disabled={playing && shown < SCRIPT.length}>
          {playing ? "Play again" : "Play the demo"}
        </button>
      </div>

      <ol className="hud-autopilot-feed" aria-live="polite">
        {!playing ? <li className="hud-note">Press play to see the script. Suggestions appear only if the switch is on.</li> : null}
        {SCRIPT.slice(0, shown).map((step, index) => {
          if (step.kind === "proposal" && !suggestions) {
            return (
              <li key={index} className="hud-note">
                A suggestion was held back because suggestions are off.
              </li>
            );
          }
          return (
            <li key={index} className={`hud-autopilot-${step.kind}`}>
              {step.kind === "chat" ? (
                <>
                  <span className="hud-flow-tech">{step.who}, family chat</span>
                  <p>{step.text}</p>
                </>
              ) : null}
              {step.kind === "orchestrator" ? (
                <>
                  <span className="hud-flow-tech">Orchestrator</span>
                  <p>{step.text}</p>
                </>
              ) : null}
              {step.kind === "specialist" ? (
                <>
                  <span className="hud-flow-tech">Specialist · {step.name}</span>
                  <p>{step.text}</p>
                  {step.quotes ? (
                    <ul className="hud-autopilot-quotes">
                      {quotes.slice(0, 2).map((quote) => (
                        <li key={quote.n}>
                          “{quote.quote}” <a href={quote.href} target="_blank" rel="noopener noreferrer">{quote.host}</a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
              {step.kind === "proposal" ? (
                <>
                  <span className="hud-flow-tech">Suggestion, not sent</span>
                  <p>{step.text}</p>
                  {decisions[index] ? (
                    <p className="hud-note">You chose: {decisions[index]}. Demo only, nothing was set.</p>
                  ) : (
                    <div className="hud-actions">
                      <button type="button" className="hud-btn hud-btn--primary" onClick={() => setDecisions({ ...decisions, [index]: "approved" })}>
                        Approve
                      </button>
                      <button type="button" className="hud-btn" onClick={() => setDecisions({ ...decisions, [index]: "declined" })}>
                        Not now
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
