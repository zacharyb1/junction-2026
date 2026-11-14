"use client";

import { ArrowRight, BadgeCheck, ChevronRight, CircleAlert, ExternalLink } from "lucide-react";
import { type Ref, useState } from "react";
import { linkButtonClasses } from "@/components/landing/link-button";
import { hostOf } from "@/components/try-progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResearchResult } from "@/lib/engine/research";

type Cited = ResearchResult["evidence"][number];

/** "Apply for the grant: 170 € [1][3]" becomes the words and the citation numbers behind them. */
function splitLine(line: string): { text: string; refs: number[] } {
  const tail = line.match(/(\s*\[\d+\])+$/)?.[0] ?? "";
  return {
    text: line.slice(0, line.length - tail.length),
    refs: [...tail.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])),
  };
}

/**
 * The page address with the quoted sentence as a text fragment, so the browser scrolls to it and marks it.
 * Same rule as the case page: not for PDFs or addresses that already carry a fragment.
 */
function highlightUrl(url: string, quote: string): string {
  const words = quote.replace(/\s+/g, " ").trim().split(" ");
  if (url.includes("#") || /\.pdf($|\?)/i.test(url) || words.length < 3) return url;
  const part = (list: string[]) => encodeURIComponent(list.join(" ")).replace(/-/g, "%2D");
  return `${url}#:~:text=${words.length > 10 ? `${part(words.slice(0, 5))},${part(words.slice(-5))}` : part(words)}`;
}

const FOUND = {
  live: "found on the live page",
  oxylabs: "found on the live page, read through Oxylabs",
  exa: "found in Exa's copy of the page",
} as const;

function Sentence({ e }: { e: Cited }) {
  const verified = e.verification === "verified";
  return (
    <li className="flex flex-col gap-1.5">
      <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic">“{e.quote}”</blockquote>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-3.5 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{e.n}</span>
        <Badge variant={e.sourceType === "official" ? "secondary" : "outline"}>
          {e.sourceType === "official" ? "Official source" : "Secondary source"}
        </Badge>
        <a
          href={verified ? highlightUrl(e.url, e.quote) : e.url}
          target="_blank"
          rel="noreferrer"
          title={e.title}
          className="inline-flex items-center gap-1 py-1 font-medium text-foreground hover:underline"
        >
          {hostOf(e.url)} <ExternalLink className="size-3 shrink-0" />
          {/* Several lines can cite the same site, so a screen reader also hears which page this is. */}
          <span className="sr-only">
            : {e.title} (opens in a new tab)
          </span>
        </a>
        {verified ? (
          <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
            <BadgeCheck className="size-3.5 shrink-0" /> {FOUND[e.checkedVia ?? "live"]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300">
            <CircleAlert className="size-3.5 shrink-0" />{" "}
            {e.verification === "unreachable" ? "page could not be opened" : "not found on the page"}
          </span>
        )}
      </div>
    </li>
  );
}

function PlanLine({ line, evidence, open }: { line: string; evidence: Cited[]; open: boolean }) {
  const { text, refs } = splitLine(line);
  const cited = refs.flatMap((n) => evidence.find((e) => e.n === n) ?? []);
  const hosts = [...new Set(cited.map((e) => hostOf(e.url)))];
  const kinds = [...new Set(cited.map((e) => e.sourceType))];
  return (
    <li>
      <p className="font-medium leading-snug">
        {text}
        <span className="ml-1 inline-flex gap-1 align-baseline">
          {refs.map((n) => (
            <span key={n} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-normal text-muted-foreground">
              {n}
            </span>
          ))}
        </span>
      </p>
      {cited.length > 0 && (
        <details open={open} className="group mt-1.5">
          <summary className="flex cursor-pointer list-none items-start gap-1 py-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="mt-0.5 size-3.5 shrink-0 transition-transform group-open:rotate-90" />
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {cited.length} {cited.length === 1 ? "quote" : "quotes"} from {hosts.join(", ")}
              {kinds.map((kind) => (
                <Badge key={kind} variant={kind === "official" ? "secondary" : "outline"}>
                  {kind === "official" ? "Official" : "Secondary"}
                </Badge>
              ))}
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-3">
            {cited.map((e) => (
              <Sentence key={e.n} e={e} />
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/** The plan, with the quoted sentence under every line it rests on. */
export function TryResult({ result, ref }: { result: ResearchResult; ref?: Ref<HTMLDivElement> }) {
  // Quotes start open where there is room for them. On a phone the plan stays short and each line opens on a tap.
  const [open] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches);
  return (
    <Card ref={ref} className="scroll-mt-4 border-primary/40">
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {result.title}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <BadgeCheck /> {result.evidenceVerified} of {result.evidenceTotal} quotes found on their pages
          </Badge>
          <span>
            {(result.ms / 1000).toFixed(1)} s · {result.exa.searches} Exa searches · {result.readers.live} pages read live,{" "}
            {result.exa.contents} through Exa
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="flex list-decimal flex-col gap-4 pl-5">
          {result.plan.map((line) => (
            <PlanLine key={line} line={line} evidence={result.evidence} open={open} />
          ))}
        </ol>
        {result.unverified.length > 0 && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">Left out because I could not confirm it</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {result.unverified.slice(0, 4).map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        )}
        <a href={result.url} className={linkButtonClasses({ size: "cta" })}>
          Open the case file with every quote <ArrowRight />
        </a>
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-center py-1 text-xs text-muted-foreground hover:underline"
        >
          Open in a new tab <ExternalLink className="size-3" />
          <span className="sr-only">: the case file</span>
        </a>
      </CardContent>
    </Card>
  );
}
