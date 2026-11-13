import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The colour that owns a section. "ground" is the page's own light grey. */
export type Field = "ground" | "white" | "blue" | "black" | "yellow";

/** One titled block of the landing page. The id doubles as the anchor, for example /#scorecard. */
export function Section({
  id,
  title,
  hint,
  field = "ground",
  children,
  className,
}: {
  id: string;
  title: string;
  hint?: ReactNode;
  field?: Field;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("l-section", field !== "ground" && `l-field--${field}`, className)}
    >
      <div className="l-wrap">
        <div className="l-section-head">
          <h2 id={`${id}-title`}>{title}</h2>
          {hint && <p className="l-hint">{hint}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
