import { useId } from "react";

/**
 * AIDaddy's face in the chat: the orb of the site (src/components/hud/core.tsx) as one drawing that can follow a
 * voice. The light inside grows with the loudness of the voice. The ring around it follows the site's state code:
 * faint at rest, honey while the microphone is live (the person's move), the accent while AIDaddy thinks and while
 * it speaks. `data-state` on the svg lets the stylesheet turn the colours inside while it thinks, and only then.
 */
export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

const RING: Record<AvatarState, string> = {
  idle: "#e5dccf",
  listening: "#c08a2e",
  thinking: "#b84f2a",
  speaking: "#b84f2a",
};

const LABEL: Record<AvatarState, string> = {
  idle: "AIDaddy",
  listening: "AIDaddy is listening",
  thinking: "AIDaddy is thinking",
  speaking: "AIDaddy is speaking",
};

export function AIDaddyAvatar({ state, level = 0, size = 112 }: { state: AvatarState; level?: number; size?: number }) {
  const open = state === "speaking" ? Math.min(1, Math.max(0, level)) : 0;
  // Each avatar names its own gradients, so two on one page never share one.
  const id = useId();
  const blob = (name: string, cx: number, cy: number, colour: string) => (
    <radialGradient id={`${id}${name}`} cx={cx} cy={cy} r="0.6">
      <stop offset="0" stopColor={colour} />
      <stop offset="1" stopColor={colour} stopOpacity="0" />
    </radialGradient>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={LABEL[state]} data-state={state} className="shrink-0">
      <defs>
        {blob("rose", 0.74, 0.22, "#f59aa8")}
        {blob("apricot", 0.24, 0.76, "#ffb38a")}
        {blob("butter", 0.7, 0.72, "#ffd76e")}
        <radialGradient id={`${id}shine`} cx="0.32" cy="0.26" r="0.42">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}voice`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}ball`}>
          <circle cx="60" cy="60" r="50" />
        </clipPath>
      </defs>
      {/* the ring that shows the state */}
      <circle cx="60" cy="60" r="57" fill="none" stroke={RING[state]} strokeWidth={state === "idle" ? 1.5 : 3} />
      {/* the ball: peach, with rose, apricot and butter inside. The three turn while AIDaddy thinks. */}
      <g clipPath={`url(#${id}ball)`}>
        <circle cx="60" cy="60" r="50" fill="#ffe3cf" />
        <g className="site-orb-boost">
          <circle cx="60" cy="60" r="62" fill={`url(#${id}rose)`} />
          <circle cx="60" cy="60" r="62" fill={`url(#${id}apricot)`} />
          <circle cx="60" cy="60" r="62" fill={`url(#${id}butter)`} />
        </g>
        {/* the voice: a light in the middle that grows with the loudness */}
        <circle cx="60" cy="60" r={14 + open * 30} fill={`url(#${id}voice)`} opacity={open * 0.9} />
        <circle cx="60" cy="60" r="50" fill={`url(#${id}shine)`} />
      </g>
      <circle cx="60" cy="60" r="50" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
    </svg>
  );
}
