import { ArrowRight, ConciergeBell, FileCheck } from "lucide-react";
import { LinkButton, linkButtonClasses } from "@/components/landing/link-button";
import { TryLink } from "@/components/landing/try-link";

/** Name, promise and the two ways in. The sample case button hides when no sample case is configured. */
export function Hero({ sampleCaseHref }: { sampleCaseHref: string | null }) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ConciergeBell className="size-4" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Kaveri</span>
        <span className="text-sm text-muted-foreground">Finnish for “buddy”</span>
      </p>

      <h1 id="hero-title" className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
        The butler that lives in your family group chat.
      </h1>

      <p className="max-w-xl text-lg text-pretty text-muted-foreground">
        It reads along and <strong className="font-medium text-foreground">says nothing</strong>, until someone
        mentions a life event. Then it researches the live web with Exa and posts a short plan: what to do, by
        when, and what you are entitled to. Every line carries{" "}
        <strong className="font-medium text-foreground">a source you can check</strong>.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <TryLink className={linkButtonClasses({ size: "cta" })}>
          Try it in the browser <ArrowRight />
        </TryLink>
        {sampleCaseHref && (
          <LinkButton href={sampleCaseHref} variant="outline" size="cta">
            <FileCheck /> See a sample case file
          </LinkButton>
        )}
      </div>

      <p className="max-w-xl text-sm text-pretty text-muted-foreground">
        Built first for international families in Finland, who deal with Kela, Vero and landlords in a language
        they do not read. Twelve countries have a checked list of official sites. Elsewhere it searches the open web
        and labels every source.
      </p>
    </section>
  );
}
