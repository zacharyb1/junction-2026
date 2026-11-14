/**
 * UKK as an original illustration: a calm older man with heavy square glasses, drawn for this project.
 * It is a cartoon, not a likeness of a real person. The mouth opens with the loudness of his voice,
 * and the ring shows what he is doing: listening (red), thinking (amber) or speaking (cyan).
 */
export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

const RING: Record<AvatarState, string> = {
  idle: "#94a3b8",
  listening: "#ef4444",
  thinking: "#f59e0b",
  speaking: "#22d3ee",
};

const LABEL: Record<AvatarState, string> = {
  idle: "UKK",
  listening: "UKK is listening",
  thinking: "UKK is thinking",
  speaking: "UKK is speaking",
};

export function UkkAvatar({ state, level = 0, size = 112 }: { state: AvatarState; level?: number; size?: number }) {
  const open = state === "speaking" ? Math.min(1, Math.max(0, level)) : 0;
  const glow = state === "idle" ? 0 : 0.35 + open * 0.5;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={LABEL[state]} className="shrink-0">
      <circle cx="60" cy="60" r="57" fill="none" stroke={RING[state]} strokeWidth="3" opacity={0.35 + glow} />
      <circle cx="60" cy="60" r="52" fill="#1e293b" />
      {/* ears */}
      <ellipse cx="27" cy="63" rx="6" ry="10" fill="#e8b996" />
      <ellipse cx="93" cy="63" rx="6" ry="10" fill="#e8b996" />
      {/* head, bald on top */}
      <path d="M30 62 C30 30 90 30 90 62 C90 86 77 99 60 99 C43 99 30 86 30 62 Z" fill="#f0c4a2" />
      <path d="M34 50 C40 34 80 34 86 50" fill="none" stroke="#f7d6bd" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      {/* brows */}
      <path d="M38 52 L52 51" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M68 51 L82 52" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
      {/* heavy square glasses */}
      <rect x="35" y="55" width="21" height="16" rx="3" fill="#cfe9f5" fillOpacity="0.35" stroke="#111827" strokeWidth="3.5" />
      <rect x="64" y="55" width="21" height="16" rx="3" fill="#cfe9f5" fillOpacity="0.35" stroke="#111827" strokeWidth="3.5" />
      <path d="M56 61 L64 61" stroke="#111827" strokeWidth="3" />
      {/* eyes */}
      <circle cx="45.5" cy="63" r="2.2" fill="#1f2937" />
      <circle cx="74.5" cy="63" r="2.2" fill="#1f2937" />
      {/* nose */}
      <path d="M60 66 C57 74 57 77 61 78" fill="none" stroke="#c9906d" strokeWidth="2" strokeLinecap="round" />
      {/* mouth: a line at rest, opening with the voice */}
      <ellipse cx="60" cy="86" rx={8 + open * 2} ry={0.8 + open * 6} fill="#7f1d1d" />
    </svg>
  );
}
