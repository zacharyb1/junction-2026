"use client";

import { useEffect, useRef, useState } from "react";
import { type CheckedQuote, checkedQuotes, progressLine, QUESTION, readResearchStream, RECORDED, refusal, summary } from "@/components/autopilot/check";
import type { ResearchResult } from "@/lib/engine/research";

/**
 * A demo of proactive help. The family chat, AIDaddy's routing step and the suggestion are fixed text written
 * for the demo: nothing listens, reads a browser, or sends anything on the family's behalf.
 *
 * One part is real. With an access code, the lawyer's step asks the Engine its question, and the Engine
 * searches official sites with Exa and keeps only the quotes it finds on the pages it opened.
 * Without a code, or when that check fails, the step shows a recorded run of the same question and says so.
 */

type Step =
  | { kind: "chat"; who: string; text: string }
  | { kind: "orchestrator"; text: string }
  | { kind: "specialist"; name: string; text: string; check?: boolean }
  | { kind: "proposal"; text: string };

const SCRIPT: Step[] = [
  { kind: "chat", who: "Anna", text: "The bank sent another letter about the mortgage." },
  { kind: "chat", who: "Mikko", text: "We should look at Tampere in spring. Rent here is too high." },
  {
    kind: "orchestrator",
    text: "Two signals: a possible move, and a bank letter. The lawyer and finance specialists have something to add. The trip planner waits until a date exists.",
  },
  { kind: "specialist", name: "Lawyer", text: "Looks up how a rental agreement is ended and what the notice period is.", check: true },
  {
    kind: "specialist",
    name: "Finance",
    text: "Cannot compare the rents yet. The bank letter's amount is missing. Asks Anna for it.",
  },
  // No figure here: the notice period is the lawyer's to state, with its source.
  { kind: "proposal", text: "Set a reminder for the notice deadline, counted back from the move date. Waiting for a date." },
];

const STEP_MS = 900;
const CHECK_TIMEOUT_MS = 120_000;

type Check =
  | { state: "idle" }
  | { state: "running"; line: string }
  | { state: "done"; result: ResearchResult }
  | { state: "failed"; reason: string };

function Quotes({ quotes }: { quotes: CheckedQuote[] }) {
  return (
    <ul className="hud-autopilot-quotes">
      {quotes.slice(0, 3).map((quote) => (
        <li key={quote.n}>
          “{quote.quote}”{" "}
          <a href={quote.href} target="_blank" rel="noopener noreferrer">
            {quote.host}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function AutopilotDemo({ code: linkCode, needsCode }: { code: string; needsCode: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(0);
  const [suggestions, setSuggestions] = useState(false);
  const [decisions, setDecisions] = useState<Record<number, "approved" | "declined">>({});
  const [code, setCode] = useState(linkCode);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const request = useRef<AbortController | null>(null);

  // Leaving the page stops a check that is still running.
  useEffect(() => () => request.current?.abort(), []);

  async function runCheck(withCode: string) {
    const controller = new AbortController();
    request.current = controller;
    setCheck({ state: "running", line: "Asking the Engine" });
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream", "x-demo-code": withCode.trim() },
        body: JSON.stringify(QUESTION),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(CHECK_TIMEOUT_MS)]),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(refusal(res.status, body?.error));
      }
      const result = await readResearchStream(res.body, (event) => {
        const line = progressLine(event);
        if (line) setCheck({ state: "running", line });
      });
      setCheck({ state: "done", result });
    } catch (error) {
      if (controller.signal.aborted) return;
      const reason =
        error instanceof DOMException && error.name === "TimeoutError"
          ? "The Engine took too long."
          : error instanceof TypeError
            ? "The Engine could not be reached."
            : error instanceof Error
              ? error.message
              : "The check failed.";
      setCheck({ state: "failed", reason });
    }
  }

  // The script moves one step at a time and waits at the lawyer's step while the live check runs.
  useEffect(() => {
    if (!playing || shown >= SCRIPT.length || check.state === "running") return;
    const timer = window.setTimeout(() => {
      const step = SCRIPT[shown];
      setShown(shown + 1);
      // A finished check is kept for the next play, so one visit pays for one research run.
      if (step.kind === "specialist" && step.check && (code.trim() || !needsCode) && check.state === "idle") void runCheck(code);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runCheck and code are read when the step appears, not watched
  }, [playing, shown, check.state]);

  const play = () => {
    setPlaying(true);
    setShown(0);
    setDecisions({});
    // A failed check is tried again on the next play.
    if (check.state === "failed") setCheck({ state: "idle" });
  };

  const lawyer = () => {
    if (check.state === "running") {
      return (
        <p className="hud-autopilot-status" role="status">
          <span className="hud-autopilot-pulse" aria-hidden="true" />
          Checking live: {check.line}
        </p>
      );
    }
    if (check.state === "done") {
      const quotes = checkedQuotes(check.result.evidence);
      return (
        <>
          <p className="hud-autopilot-status hud-autopilot-status--live">Checked live just now: {summary(check.result)}.</p>
          {quotes.length ? (
            <Quotes quotes={quotes} />
          ) : (
            <p className="hud-note">No quote could be found on its page in this run, so the lawyer states nothing.</p>
          )}
          <p className="hud-note">
            <a href={check.result.url} target="_blank" rel="noopener noreferrer">
              Open the case file
            </a>
            . Research with sources, not legal advice.
          </p>
        </>
      );
    }
    return (
      <>
        <p className="hud-autopilot-status">
          {check.state === "failed" ? `The live check did not run: ${check.reason} ` : needsCode ? "No live check without an access code. " : ""}
          Shown instead: a run of the same question recorded on {RECORDED.on} ({RECORDED.summary}).
        </p>
        <Quotes quotes={RECORDED.quotes} />
        <form
          className="hud-autopilot-code"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim() || !needsCode) void runCheck(code);
          }}
        >
          {/* The field is left out where the deployment opened the demo to everyone (DEMO_OPEN=1). */}
          {needsCode && (
            <>
              <label htmlFor="autopilot-code">Access code</label>
              <input
                id="autopilot-code"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="The same code as for /try"
              />
            </>
          )}
          <button type="submit" className="hud-btn" disabled={needsCode && !code.trim()}>
            Check live with Exa
          </button>
        </form>
      </>
    );
  };

  const running = playing && shown < SCRIPT.length;

  return (
    <div className="hud-panel hud-autopilot">
      <div className="hud-autopilot-consent">
        <p>
          <strong>Demo.</strong> The chat, AIDaddy&apos;s routing and the suggestion are a fixed script. Nothing listens to you,
          nothing reads your browser, and nothing is sent on your behalf or paid. One part is real: the lawyer&apos;s check sends
          its one fixed question to the research engine, which searches official sites with Exa and opens every page it quotes.
        </p>
        <label>
          <input type="checkbox" checked={suggestions} onChange={(event) => setSuggestions(event.target.checked)} />
          Let AIDaddy suggest next steps
        </label>
      </div>

      <div className="hud-autopilot-actions">
        <button type="button" className="hud-btn hud-btn--primary" onClick={play} disabled={running}>
          {running ? "Playing" : playing ? "Play again" : "Play the demo"}
        </button>
      </div>

      <ol className="hud-autopilot-feed" aria-live="polite">
        {!playing ? <li className="hud-note">Press play to see the script. Suggestions appear only if the box above is ticked.</li> : null}
        {SCRIPT.slice(0, shown).map((step, index) => {
          if (step.kind === "proposal" && !suggestions) {
            return (
              <li key={index} className="hud-note">
                A suggestion was held back because suggestions are off. Tick the box above and play again to see it.
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
                  <span className="hud-flow-tech">AIDaddy</span>
                  <p>{step.text}</p>
                </>
              ) : null}
              {step.kind === "specialist" ? (
                <>
                  <span className="hud-flow-tech">Specialist · {step.name}</span>
                  <p>{step.text}</p>
                  {step.check ? lawyer() : null}
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
