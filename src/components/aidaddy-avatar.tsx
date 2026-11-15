import type { CSSProperties } from "react";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";
const LABEL: Record<AvatarState, string> = {
  idle: "AIDaddy", listening: "AIDaddy is listening", thinking: "AIDaddy is thinking", speaking: "AIDaddy is speaking",
};

/** A warm typographic mark. Voice activity reflects actual playback, never an idle loop. */
export function AIDaddyAvatar({ state, level = 0, size = 112 }: { state: AvatarState; level?: number; size?: number }) {
  return (
    <div role="img" aria-label={LABEL[state]} className="aidaddy-avatar" data-state={state}
      style={{ width: size, height: size, fontSize: size / 3.2, "--voice-level": Math.min(1, Math.max(0, level)) } as CSSProperties}>
      <span aria-hidden>Ai</span>
      {state !== "idle" && <span className="avatar-voice" aria-hidden><i /><i /><i /></span>}
    </div>
  );
}
