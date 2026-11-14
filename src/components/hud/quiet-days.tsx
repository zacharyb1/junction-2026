"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Core } from "@/components/hud/core";
import { useFirstView, useReducedMotion } from "@/components/hud/hooks";

/** Time between two chat messages, and the longer breath before the one that matters. */
const BEAT_MS = 850;
const PAUSE_MS = 1500;

/**
 * A family chat on an ordinary day. Small talk goes by and AIDaddy leaves it alone, then one message wakes it.
 *
 * The small-talk lines are messages the local gate really ignored in the team's labelled test
 * (eval/results/gate-gemma3-1b.json). The last line is the message of the recorded research run.
 * Without JavaScript, or with reduced motion, the whole chat is shown at once.
 */
export function QuietDays({ ignored, trigger }: { ignored: string[]; trigger: string }) {
  const total = ignored.length + 1;
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // How many messages are on screen. It starts complete so the server's page needs no script to be read.
  const [shown, setShown] = useState(total);
  const [playing, setPlaying] = useState(false);

  const start = useCallback(() => {
    setShown(0);
    setPlaying(true);
  }, []);
  useFirstView(ref, start, !reduced);

  useEffect(() => {
    if (!playing) return;
    if (shown >= total) return;
    const timer = window.setTimeout(() => setShown((count) => count + 1), shown === total - 1 ? PAUSE_MS : BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [playing, shown, total]);

  const awake = shown >= total;

  return (
    <div ref={ref} className="hud-quiet">
      <div className="hud-panel hud-chat" aria-label="A family group chat">
        <p className="hud-panel-title">
          <span>Family group chat</span>
          <span>AIDaddy is a member</span>
        </p>
        <ol>
          {ignored.map((text, index) => (
            <li key={text} className="hud-msg" data-shown={index < shown}>
              <p>{text}</p>
              <span className="hud-tag">Small talk. Left alone.</span>
            </li>
          ))}
          <li className="hud-msg hud-msg--trigger" data-shown={awake}>
            <p>{trigger}</p>
            <span className="hud-tag">Life event. AIDaddy wakes up.</span>
          </li>
        </ol>
      </div>
      <div className="hud-quiet-side">
        <Core state={awake ? "active" : "idle"} className="hud-core--small" />
        <p className="hud-quiet-state" data-awake={awake}>
          {awake ? "Awake: researching" : "Listening: silent"}
        </p>
      </div>
    </div>
  );
}
