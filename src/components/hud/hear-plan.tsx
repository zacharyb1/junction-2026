"use client";

import { useRef, useState } from "react";
import { Core } from "@/components/hud/core";

/**
 * Plays the recorded run's plan, read aloud.
 *
 * The file is the audio the case file's own "Listen" route produced for that case (ElevenLabs reading the stored
 * plan, nothing added), saved once to public/hud/plan.mp3. It is loaded only when someone presses the button.
 * src/data/plan-audio.json names the case it was rendered from, and the front page offers the button only for
 * that case, so a new recording can never be narrated by the old one's audio.
 */
export function HearPlan({ src, seconds }: { src: string; seconds: number }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const player = audio.current;
    if (!player) return;
    if (playing) {
      player.pause();
      return;
    }
    player.currentTime = 0;
    player.play().catch(() => setPlaying(false));
  };

  return (
    <div className="hud-hear">
      <Core state={playing ? "active" : "idle"} className="hud-core--tiny" />
      <button type="button" className="hud-btn" onClick={toggle} aria-pressed={playing}>
        {playing ? "Stop" : "Hear the plan"}
      </button>
      <p>Read aloud by ElevenLabs from the case file, {seconds} seconds. It says only what the file shows.</p>
      <audio ref={audio} src={src} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </div>
  );
}
