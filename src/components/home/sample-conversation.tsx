"use client";

import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, MessageCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { ReadingPlate } from "@/components/landing/reading-plates";
import sample from "@/data/sample-case.json";

const subscribeToHydration = () => () => {};

/** An explorable, explicitly labelled sample. These are recorded quotes, not a live check. */
export function SampleConversation() {
  const [index, setIndex] = useState(3);
  const interactive = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  return <div className="wh-conversation">
    <div className="wh-chat-heading">
      <MessageCircle aria-hidden="true" size={21} /><span>The family chat</span>
      <span className="wh-example">An example<span className="wh-example-circle" data-home-ink><ReadingPlate name="sample-circle" /></span></span>
    </div>
    <div className="wh-message wh-family-message"><span className="wh-speaker">Anna</span><p>We’re having a baby! What do we need to sort out before the little one arrives?</p></div>
    <div className="wh-reply">
      <span className="wh-speaker">AIDaddy</span>
      <p>Here’s one thing to put on your list.</p>
      <div className="wh-answer-stack" aria-live="polite" aria-atomic="true">
        {sample.steps.map((step, stepIndex) => {
          const source = sample.evidence.find(item => item.n === step.evidence[0])!;
          const active = stepIndex === index;
          return <div className="wh-answer" key={step.title} data-active={active} aria-hidden={!active} inert={!active}>
            <h2>{step.title}</h2>
            <p className="wh-due"><CalendarDays size={16} aria-hidden="true" />{step.due ?? "Before applying"}</p>
            <div className="wh-source">
              <span className="wh-source-heading">{source.publisher} · Source {source.n}</span>
              <blockquote>“{source.quote}”</blockquote>
              <a href={source.url} target="_blank" rel="noreferrer">Read the official page <ExternalLink size={13} aria-hidden="true" /><span className="wh-sr"> (opens in a new tab)</span></a>
            </div>
          </div>;
        })}
      </div>
      <div className="wh-sample-controls" role="group" aria-label="Explore the sample plan">
        {interactive ? <>
        <button type="button" onClick={() => setIndex((index + sample.steps.length - 1) % sample.steps.length)} aria-label="Previous sample step"><ArrowLeft size={18} aria-hidden="true" /></button>
        <span>Step {index + 1} of {sample.steps.length} <span>from the sample plan</span></span>
        <button type="button" onClick={() => setIndex((index + 1) % sample.steps.length)} aria-label="Next sample step"><ArrowRight size={18} aria-hidden="true" /></button>
        </> : <a className="wh-text-link" href="#wh-plan">Read all five sample steps <ArrowRight size={16} aria-hidden="true" /></a>}
      </div>
    </div>
    <p className="wh-margin-note">The next step. And the reason why.<span data-home-ink className="wh-reason-ink"><ReadingPlate name="next-underline" /></span></p>
  </div>;
}
