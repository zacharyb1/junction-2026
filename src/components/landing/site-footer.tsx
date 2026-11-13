import { ArrowRight, CodeXml } from "lucide-react";
import { TryLink } from "@/components/landing/try-link";

const LINK = "inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline";

/** The source link shows only when a repository URL is configured. */
export function SiteFooter({ repoUrl }: { repoUrl: string | null }) {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Built at Junction 2026 for the Exa challenge.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <TryLink className={LINK}>
              Try it in the browser <ArrowRight className="size-4" />
            </TryLink>
            {repoUrl && (
              <a href={repoUrl} target="_blank" rel="noreferrer" className={LINK}>
                <CodeXml className="size-4" /> Source code
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
        <p className="text-xs">
          Kaveri is an independent hackathon project. It is not affiliated with Kela, Vero or Telegram.
        </p>
      </div>
    </footer>
  );
}
