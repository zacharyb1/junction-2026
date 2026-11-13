import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One titled block of the landing page. The id doubles as the anchor, for example /#scorecard. */
export function Section({
  id,
  title,
  hint,
  children,
  className,
}: {
  id: string;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("flex scroll-mt-8 flex-col gap-6", className)}>
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {hint && <p className="text-pretty text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
