import type { ReactNode } from "react";

/** The "//" between the two halves of a label. Read aloud it is noise, so screen readers skip it. */
export function Slash() {
  return <span aria-hidden="true">{" // "}</span>;
}

/**
 * The head every page below the front page opens with: a small label, the title, one paragraph.
 * `state` is a light and a word at the right end of the label row. `aside` stands at the right of the head from
 * 900px (a core that decorates) and is not shown on a phone. `compact` is the smaller title, for a page whose
 * stage needs the height.
 */
export function PageHead({
  label,
  labelTone,
  state,
  title,
  titleId,
  compact = false,
  lede,
  aside,
  children,
}: {
  label: ReactNode;
  labelTone?: "amber" | "green" | "dim";
  state?: { tone?: "cyan" | "amber" | "green"; text: ReactNode; working?: boolean };
  title: ReactNode;
  titleId?: string;
  compact?: boolean;
  lede?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  const stateClass = state
    ? ["site-state", state.tone ? `site-state--${state.tone}` : "", state.working ? "site-state--working" : ""]
        .filter(Boolean)
        .join(" ")
    : "";
  return (
    <header className={aside ? "site-head site-head--aside" : "site-head"}>
      <div className="site-head-main">
        <div className="site-head-rail">
          <p className={labelTone ? `site-eyebrow site-eyebrow--${labelTone}` : "site-eyebrow"}>{label}</p>
          {state ? <p className={stateClass}>{state.text}</p> : null}
        </div>
        <h1 id={titleId} className={compact ? "site-title site-title--compact" : "site-title"}>
          {title}
        </h1>
        {lede ? <p className="site-lede">{lede}</p> : null}
        {children}
      </div>
      {aside ? <div className="site-head-aside">{aside}</div> : null}
    </header>
  );
}
