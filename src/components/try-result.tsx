"use client";

import { ArrowRight, BadgeCheck, ChevronRight, CircleAlert, ExternalLink } from "lucide-react";
import { type Ref, useState } from "react";
import { linkButtonClasses } from "@/components/site/link-button";
import { hostOf } from "@/components/try-progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <blockquote className="border-l-2 border-primary/40 pl-3">“{e.quote}”</blockquote>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-3.5 text-xs text-muted-foreground">
        <span className={verified ? "site-chip" : "site-chip site-chip--open"}>{e.n}</span>
        <Badge variant={e.sourceType === "official" ? "secondary" : "outline"}>
          {e.sourceType === "official" ? "Official source" : "Secondary source"}
        </Badge>
        <a
          href={verified ? highlightUrl(e.url, e.quote) : e.url}
          target="_blank"
          rel="noreferrer"
          title={e.title}
          className="inline-flex min-h-11 items-center gap-1 font-medium text-foreground hover:underline"
        >
          {hostOf(e.url)} <ExternalLink className="size-3 shrink-0" />
          {/* Several lines can cite the same site, so a screen reader also hears which page this is. */}
          <span className="sr-only">
            : {e.title} (opens in a new tab)
          </span>
        </a>
        {verified ? (
          <span className="inline-flex items-center gap-1 text-(--hud-green)">
            <BadgeCheck className="size-3.5 shrink-0" /> {FOUND[e.checkedVia ?? "live"]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-(--hud-amber)">
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
      <div>
        <p className="font-medium leading-snug">
          {text}
          <span className="ml-1 inline-flex gap-1 align-baseline">
            {refs.map((n) => {
              const e = evidence.find((x) => x.n === n);
              // A number with no evidence entry has nothing to open.
              if (!e) {
                return (
                  <span key={n} className="site-chip site-chip--open">
                    {n}
                  </span>
                );
              }
              const found = e.verification === "verified";
              return (
                <a
                  key={n}
                  className={found ? "site-chip" : "site-chip site-chip--open"}
                  // A quote that was not found links to the page's plain address.
                  href={found ? highlightUrl(e.url, e.quote) : e.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={
                    found
                      ? `Source ${n}: opens ${hostOf(e.url)} at the quoted sentence in a new tab`
                      : `Source ${n}: opens ${hostOf(e.url)} in a new tab`
                  }
                >
                  {n}
                </a>
              );
            })}
          </span>
        </p>
        {cited.length > 0 && (
          <details open={open} className="group mt-1.5">
            <summary className="flex min-h-11 cursor-pointer list-none items-start gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
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
      </div>
    </li>
  );
}

/** The plan, with the quoted sentence under every line it rests on. */
export function TryResult({ result, ref }: { result: ResearchResult; ref?: Ref<HTMLDivElement> }) {
  // Quotes start open where there is room for them. On a phone the plan stays short and each line opens on a tap.
  const [open] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches);
  const all = result.evidenceVerified === result.evidenceTotal;
  return (
    <Card ref={ref} className="scroll-mt-4">
      {/* The facts of the run are in this bar and in the run panel. */}
      <p className="site-panel-title">
        <span>Plan</span>
        <span className={all ? "text-(--hud-green)" : "text-(--hud-amber)"}>
          {result.evidenceVerified}/{result.evidenceTotal} quotes found
        </span>
      </p>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {result.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="site-steps" role="list">
          {result.plan.map((line) => (
            <PlanLine key={line} line={line} evidence={result.evidence} open={open} />
          ))}
        </ol>
        {result.unverified.length > 0 && (
          <div className="site-row site-row--amber text-sm">
            <p className="font-medium">Left out because I could not confirm it</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {result.unverified.slice(0, 4).map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        )}
        <a href={result.url} className={linkButtonClasses({ size: "cta" }, "w-full sm:w-fit")}>
          Open the case file with every quote <ArrowRight />
        </a>
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1 self-center text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Open in a new tab <ExternalLink className="size-3" />
          <span className="sr-only">: the case file</span>
        </a>
      </CardContent>
    </Card>
  );
}
