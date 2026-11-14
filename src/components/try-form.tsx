"use client";

import { CircleAlert, Loader2, Search } from "lucide-react";
import { useRef, useState } from "react";
import { EarlierCases } from "@/components/earlier-cases";
import { EXAMPLES } from "@/lib/examples";
import { advance, Elapsed, NO_PROGRESS, type Progress, Timeline } from "@/components/try-progress";
import { TryResult } from "@/components/try-result";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EngineEvent, ResearchResult } from "@/lib/engine/research";

const COUNTRIES = [
  ["FI", "Finland"],
  ["SE", "Sweden"],
  ["EE", "Estonia"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["ES", "Spain"],
  ["NL", "Netherlands"],
  ["IT", "Italy"],
  ["IE", "Ireland"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["CA", "Canada"],
] as const;

const LANGUAGES = [
  ["en", "English"],
  ["fi", "Suomi"],
  ["sv", "Svenska"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["fr", "Français"],
] as const;

const field = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TryForm({ code: initialCode }: { code: string }) {
  const [situation, setSituation] = useState("");
  const [country, setCountry] = useState("FI");
  const [otherCountry, setOtherCountry] = useState("");
  const [region, setRegion] = useState("");
  const [language, setLanguage] = useState("en");
  const [document, setDocument] = useState("");
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>(NO_PROGRESS);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A code from the link that the server refused: show the field so it can be corrected.
  const [rejected, setRejected] = useState(false);
  // Live research failed for a reason the visitor cannot fix: offer the cases researched earlier.
  const [liveDown, setLiveDown] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProgress(NO_PROGRESS);
    setResult(null);
    setError(null);
    setLiveDown(false);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream", "x-demo-code": code.trim() },
        body: JSON.stringify({
          situation,
          country: country === "other" ? otherCountry : country,
          region: region || undefined,
          language,
          document: document || undefined,
        }),
      });
      if (res.status === 401) setRejected(true);
      // A server fault or a busy demo. A wrong code or a refused request is the visitor's to fix.
      if (res.status >= 500 || res.status === 429 || (res.ok && !res.body)) setLiveDown(true);
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          res.status === 401
            ? "That access code is not valid. Enter the code from the QR code at our table, or ask us for it."
            : (body?.error ?? `Request failed (${res.status})`),
        );
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let split: number;
        while ((split = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const name = block.match(/^event: (.+)$/m)?.[1];
          const data = block.match(/^data: (.+)$/m)?.[1];
          if (!name || !data) continue;
          const payload = JSON.parse(data);
          if (name === "done") {
            finished = true;
            setResult(payload as ResearchResult);
            const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" }), 50);
          } else if (name === "error") {
            finished = true;
            const message = (payload as { error: string }).error;
            setError(message);
            // The engine's refusals, in English or Finnish, are answers, not outages.
            if (!/^(I could not find anything to research|Unknown country|This country is not supported|En löytänyt viestistä|Maata |Tämä maa ei ole mukana)/.test(message)) setLiveDown(true);
          } else {
            // Every other event is one of the engine's, named after its type.
            setProgress((p) => advance(p, payload as EngineEvent));
          }
        }
      }
      if (!finished) {
        setError("The connection closed before the research finished. Please try again.");
        setLiveDown(true);
      }
      // A wrong code was corrected by hand: the field has done its job.
      else setRejected(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      // The request never reached the server.
      if (e instanceof TypeError) setLiveDown(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 wrap-anywhere">
      <form onSubmit={run} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="situation" className="text-sm font-medium">
            What happened?
          </label>
          <Textarea
            id="situation"
            required
            minLength={10}
            maxLength={1500}
            rows={4}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Write it the way you would text your partner."
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setSituation(ex.text)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {ex.label}
              </button>
            ))}
          </div>
          <EarlierCases situation={situation} failed={false} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="country" className="text-sm font-medium">
              Country
            </label>
            <select id="country" className={field} value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="other">Another country</option>
            </select>
            {country === "other" && (
              <Input
                required
                aria-label="Country name"
                placeholder="Country name"
                value={otherCountry}
                onChange={(e) => setOtherCountry(e.target.value)}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="region" className="text-sm font-medium">
              City or region
            </label>
            <Input id="region" placeholder="Espoo" value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="language" className="text-sm font-medium">
              Answer in
            </label>
            <select id="language" className={field} value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map(([value, label]) => (
                // Each language is written in itself, so a screen reader should pronounce it that way.
                <option key={value} value={value} lang={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <details className="rounded-lg border text-sm">
          {/* The padding is on the summary, so the whole row opens it, not only the line of text. */}
          <summary className="cursor-pointer px-3 py-2 font-medium">Got a letter? Paste its text</summary>
          <div className="px-3 pt-1 pb-2">
            <Textarea
              aria-label="Text of the letter"
              rows={5}
              maxLength={6000}
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="Paste the text of the letter, in its original language."
            />
          </div>
        </details>

        {(!initialCode || rejected) && (
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-sm font-medium">
              Access code
            </label>
            <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="From the QR code at our table" />
          </div>
        )}

        {/* Still focusable while it is busy: a disabled button drops the keyboard focus to the top of the page. */}
        <Button type="submit" size="lg" disabled={busy} focusableWhenDisabled>
          {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Search />}
          {busy ? "Researching live" : "Research it"}
        </Button>
      </form>

      {/*
        The live region is on the page before anything happens: a screen reader announces what is added to a region
        it already knows, not a region that arrives with its text. While it is empty it takes no room.
      */}
      <div aria-live="polite" className="empty:-mt-6">
        {(progress.stages.length > 0 || error) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base" role="heading" aria-level={2}>
                What is happening
              </CardTitle>
              <CardDescription>Each search, each page and each check, as it happens.</CardDescription>
              {progress.stages.length > 0 && (
                <CardAction>
                  <Elapsed busy={busy} final={result?.ms} />
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Timeline progress={progress} busy={busy} finished={Boolean(result)} />
              {error && (
                <p className="flex items-start gap-2 text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}
              {error && liveDown && <EarlierCases situation={situation} failed />}
            </CardContent>
          </Card>
        )}
      </div>

      {result && <TryResult result={result} ref={resultRef} />}
    </div>
  );
}
