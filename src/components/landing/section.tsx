import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A chapter in the reading page; all chapters share the same paper ground. */
export function Section({ id, title, hint, children, className }: {
  id: string; title: string; hint?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("l-section", className)}>
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
