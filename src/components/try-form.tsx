"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { EarlierCases } from "@/components/earlier-cases";
import { Core } from "@/components/site/core";
import { EXAMPLES } from "@/lib/examples";
import { advance, Elapsed, NO_PROGRESS, type Progress, Timeline } from "@/components/try-progress";
import { TryResult } from "@/components/try-result";
import { Button } from "@/components/ui/button";
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

// 44 px tall, so a thumb hits it, and 16 px text on a phone, so iOS does not zoom into the field.
const tall = "h-11 px-3";
const field = `${tall} w-full rounded-lg border border-input bg-input/30 text-base outline-none transition-colors focus-visible:border-ring md:text-sm`;

export function TryForm({ code: initialCode, needsCode }: { code: string; needsCode: boolean }) {
  const [situation, setSituation] = useState("");
  const [country, setCountry] = useState("FI");
  const [otherCountry, setOtherCountry] = useState("");
  const [region, setRegion] = useState("");
  const [language, setLanguage] = useState("en");
  const [document, setDocument] = useState("");
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  // What was sent, shown in the run panel: not what is being typed now.
  const [asked, setAsked] = useState("");
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
    setAsked(situation.trim());
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
    <>
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
            className="min-h-28"
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
                className="site-btn site-btn--compact"
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
                className={tall}
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
            <Input id="region" className={tall} placeholder="Espoo" value={region} onChange={(e) => setRegion(e.target.value)} />
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
          <summary className="cursor-pointer px-3 py-3 font-medium">Got a letter? Paste its text</summary>
          <div className="px-3 pb-3">
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

        {/* The field is left out where the deployment opened the demo to everyone (DEMO_OPEN=1). */}
        {needsCode && (!initialCode || rejected) && (
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-sm font-medium">
              Access code
            </label>
            <Input id="code" required className={tall} value={code} onChange={(e) => setCode(e.target.value)} placeholder="From the QR code at our table" />
          </div>
        )}

        {/* Still focusable while it is busy: a disabled button drops the keyboard focus to the top of the page. */}
        <Button type="submit" size="lg" className="site-btn--cta w-full sm:w-fit sm:self-start" disabled={busy} focusableWhenDisabled>
          {!busy && <Search />}
          {busy ? "Researching live" : "Research it"}
        </Button>
      </form>

      {/* The run panel is on the page before a run, at every width. Not sticky: it can be taller than the window. */}
      <div className="site-rail">
        <section className="site-panel" aria-labelledby="run-title">
          <div className="site-panel-title">
            <h2 id="run-title">What is happening</h2>
            <span className={busy ? "text-primary" : result ? "text-(--hud-green)" : error ? "text-(--hud-amber)" : undefined}>
              {busy ? "Researching" : result ? "Case file ready" : error ? "Stopped" : "Standing by"}
            </span>
          </div>
          <div className="site-panel-body grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4">
              <Core state={busy ? "active" : result ? "done" : "idle"} className="hud-core--tiny" />
              <div className="min-w-0 flex-1">
                {asked ? (
                  <>
                    <p className="site-eyebrow site-eyebrow--amber">Your question</p>
                    <p className="line-clamp-3">{asked}</p>
                  </>
                ) : (
                  <p className="site-note">Each search, each page and each check, as it happens.</p>
                )}
              </div>
              {progress.stages.length > 0 && <Elapsed busy={busy} final={result?.ms} />}
            </div>
            {/*
              The live region is on the page before anything happens: a screen reader announces what is added to a
              region it already knows, not a region that arrives with its text. While it is empty it takes no room.
            */}
            <div aria-live="polite" className="grid grid-cols-1 gap-3 text-sm empty:-mt-4">
              {progress.stages.length > 0 && <Timeline progress={progress} busy={busy} finished={Boolean(result)} />}
              {error && <p className="site-row site-row--amber site-status">{error}</p>}
              {error && liveDown && <EarlierCases situation={situation} failed />}
            </div>
            {result && (
              // Two by two: four cells at the shared minimum width would leave one alone on a second row.
              <dl className="site-readouts grid-cols-2!">
                <div>
                  <dt>Exa searches</dt>
                  <dd>{result.exa.searches}</dd>
                </div>
                <div>
                  <dt>Pages read</dt>
                  <dd>{progress.pages.length}</dd>
                </div>
                <div>
                  <dt>Quotes found</dt>
                  <dd className={result.evidenceVerified === result.evidenceTotal ? "text-(--hud-green)" : "text-(--hud-amber)"}>
                    {result.evidenceVerified}/{result.evidenceTotal}
                  </dd>
                </div>
                <div>
                  <dt>Exa cost</dt>
                  <dd>${result.exa.costDollars.toFixed(3)}</dd>
                </div>
              </dl>
            )}
          </div>
        </section>
      </div>

      {result && <TryResult result={result} ref={resultRef} />}
    </>
  );
}
