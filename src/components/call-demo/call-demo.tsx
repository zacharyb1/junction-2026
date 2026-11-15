"use client";

import { useEffect, useRef } from "react";
import { ANSWER_AT, BOSS, CALL, CHAT, CONFIRM_AT, DURATION, END_AT, PROPOSAL, PROPOSAL_AT, RESULT, RESULT_AT, RING_AT } from "@/components/call-demo/script";
import { ORB_MARK } from "@/components/demo/orb-mark";
import { scrollToEnd, useReplayClock } from "@/components/demo/replay";

/**
 * /demo/call: a scripted replay of AIDaddy calling someone's boss in a copy of their voice.
 * Concept: the words, the people and the call are a fixed script (src/components/call-demo/script.ts).
 */
export function CallDemo({ loop = false }: { loop?: boolean }) {
  const now = useReplayClock(DURATION, loop);
  const scroll = useRef<HTMLDivElement>(null);

  const chat = CHAT.filter((line) => line.at <= now);
  const proposed = now >= PROPOSAL_AT;
  const confirmed = now >= CONFIRM_AT;
  const ringing = now >= RING_AT && now < ANSWER_AT;
  const talking = now >= ANSWER_AT && now < END_AT;
  const ended = now >= END_AT;
  const said = CALL.filter((line) => line.at <= now);
  const reported = now >= RESULT_AT;

  // Each new line, card and state takes room at the end, so the end is brought back into view.
  useEffect(() => {
    scrollToEnd(scroll.current);
  }, [chat.length, proposed, confirmed, ringing, said.length, ended, reported]);

  const status = ringing ? `Calling ${BOSS}` : talking ? "On the call, in your voice" : ended ? "Call ended" : "AIDaddy";

  return (
    <div className="calldemo">
      <div className="calldemo-status">
        <span className={`calldemo-light${ringing || talking ? " is-live" : ""}`} aria-hidden />
        {status}
      </div>

      {/* No aria-live: a screen reader would read the whole script aloud, unasked. The column takes focus so the keyboard can scroll it. */}
      <div ref={scroll} className="calldemo-scroll" tabIndex={0} role="group" aria-label="The chat with AIDaddy and the call">
        {chat.map((line) => (
          <p key={line.at} className={`calldemo-line calldemo-line--${line.who.toLowerCase()}`}>
            <span className="calldemo-who">{line.who}</span>
            <span>{line.text}</span>
          </p>
        ))}

        {proposed && (
          <div className={`calldemo-card${confirmed ? " is-settled" : ""}`}>
            <p className="calldemo-card-title">Before I call</p>
            <dl className="calldemo-facts">
              <div>
                <dt>To</dt>
                <dd>
                  {PROPOSAL.to} · {PROPOSAL.number}
                </dd>
              </div>
              <div>
                <dt>Voice</dt>
                <dd>{PROPOSAL.voice}</dd>
              </div>
              <div>
                <dt>I will say</dt>
                <dd>“{PROPOSAL.say}”</dd>
              </div>
              <div>
                <dt>I will ask</dt>
                <dd>{PROPOSAL.ask}</dd>
              </div>
            </dl>
            <div className="calldemo-buttons">
              <span className={confirmed ? "is-pressed" : "is-primary"}>{confirmed ? "You said: call ✓" : "Call with these words"}</span>
              {confirmed ? null : <span>Not now</span>}
            </div>
          </div>
        )}

        {now >= RING_AT && (
          <div className="calldemo-call">
            <div className="calldemo-call-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ORB_MARK} alt="" className={ringing ? "is-ringing" : talking ? "is-talking" : ""} />
              <div>
                <p className="calldemo-call-name">{BOSS}</p>
                <p className="calldemo-call-state">{ringing ? "Ringing" : talking ? "Connected" : "Call ended"}</p>
              </div>
            </div>
            {said.map((line) => (
              <p key={line.at} className={`calldemo-said calldemo-said--${line.who.toLowerCase()}`}>
                <span className="calldemo-who">{line.who === "AIDaddy" ? "AIDaddy · in your voice" : line.who}</span>
                <span>{line.text}</span>
              </p>
            ))}
          </div>
        )}

        {reported && (
          <div className="calldemo-card calldemo-card--done">
            <p className="calldemo-card-title">Done. What was said</p>
            <ul className="calldemo-result">
              {RESULT.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
