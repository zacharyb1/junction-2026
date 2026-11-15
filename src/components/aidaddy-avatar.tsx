import { useId } from "react";

/**
 * AIDaddy's face in the chat: the glowing core of the front page, with the rings of the still picture in
 * public/aidaddy-avatar.svg. The heart grows and glows with the loudness of the voice. The outer ring follows the
 * site's state code: dim at rest, amber while the microphone is live (the person's move), cyan while AIDaddy thinks
 * and while it speaks. `data-state` on the svg lets the stylesheet turn the two inner rings while it thinks, and only then.
 */
export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

const RING: Record<AvatarState, string> = {
  idle: "#9db0c9",
  listening: "#ffb547",
  thinking: "#4fd8ff",
  speaking: "#4fd8ff",
};

const LABEL: Record<AvatarState, string> = {
  idle: "AIDaddy",
  listening: "AIDaddy is listening",
  thinking: "AIDaddy is thinking",
  speaking: "AIDaddy is speaking",
};

const CYAN = "#4fd8ff";

export function AIDaddyAvatar({ state, level = 0, size = 112 }: { state: AvatarState; level?: number; size?: number }) {
  const open = state === "speaking" ? Math.min(1, Math.max(0, level)) : 0;
  const glow = state === "idle" ? 0 : 0.35 + open * 0.5;
  // Each avatar names its own gradients, so two on one page never share one.
  const id = useId();
  const ground = `${id}ground`;
  const heart = `${id}heart`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={LABEL[state]}
      data-state={state}
      className="shrink-0"
    >
      <defs>
        <radialGradient id={ground}>
          <stop offset="0" stopColor="#0b2233" />
          <stop offset="0.6" stopColor="#07111b" />
          <stop offset="1" stopColor="#05080d" />
        </radialGradient>
        <radialGradient id={heart}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#bff0ff" />
          <stop offset="0.6" stopColor={CYAN} stopOpacity="0.85" />
          <stop offset="1" stopColor={CYAN} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the ring that shows the state */}
      <circle cx="60" cy="60" r="57" fill="none" stroke={RING[state]} strokeWidth="3" opacity={0.35 + glow} />
      {/* the dark disc */}
      <circle cx="60" cy="60" r="52" fill={`url(#${ground})`} />
      {/* the glow behind the rings: it shows only with the voice */}
      <circle cx="60" cy="60" r={34 + open * 16} fill={`url(#${heart})`} opacity={open * 0.45} />
      {/* the rings of the core */}
      <g fill="none" stroke={CYAN}>
        <circle cx="60" cy="60" r="47.5" strokeWidth="0.8" strokeDasharray="0.8 2.93" opacity="0.55" />
        <g className="site-orb-boost">
          <circle
            cx="60"
            cy="60"
            r="42"
            strokeWidth="2.2"
            strokeDasharray="67.1 17.93 36.37 17.93 15.88 17.93 64.02 26.74"
            opacity="0.9"
            transform="rotate(-38 60 60)"
          />
        </g>
        <circle cx="60" cy="60" r="35" strokeWidth="0.6" opacity="0.35" />
        <circle
          cx="60"
          cy="60"
          r="35"
          strokeWidth="1.4"
          strokeDasharray="16.23 203.68"
          strokeLinecap="round"
          transform="rotate(120 60 60)"
        />
        <circle cx="60" cy="60" r="29" strokeWidth="2.6" strokeDasharray="1.1 2.696" opacity="0.28" />
        <g className="site-orb-boost site-orb-boost--back">
          <circle
            cx="60"
            cy="60"
            r="23"
            strokeWidth="1"
            strokeDasharray="30.67 17.5"
            opacity="0.8"
            transform="rotate(64 60 60)"
          />
        </g>
      </g>
      {/* the heart: bright at rest, larger with the voice */}
      <circle cx="60" cy="60" r={18 + open * 8} fill={`url(#${heart})`} />
    </svg>
  );
}
