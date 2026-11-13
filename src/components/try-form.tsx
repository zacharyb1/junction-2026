"use client";

import { CircleAlert, Loader2, Search } from "lucide-react";
import { useRef, useState } from "react";
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

const EXAMPLES = [
  { label: "Expecting a baby", text: "I just found out I am pregnant. We both work full time. What do we need to do and when?" },
  { label: "Rent increase", text: "Our landlord wants to raise the rent by 15 percent from next month. Is that allowed and what can we do?" },
  { label: "Flight cancelled", text: "Our flight tomorrow morning was just cancelled. We are a family of three. What are we entitled to?" },
  { label: "Lost my job", text: "I was laid off today after three years at the company. What do I have to do this week and what support can I get?" },
  { label: "Moving home", text: "We are moving to another city next month. Who do we have to notify and by when?" },
];

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
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProgress(NO_PROGRESS);
    setResult(null);
    setError(null);
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
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          } else if (name === "error") {
            finished = true;
            setError((payload as { error: string }).error);
          } else {
            // Every other event is one of the engine's, named after its type.
            setProgress((p) => advance(p, payload as EngineEvent));
          }
        }
      }
      if (!finished) setError("The connection closed before the research finished. Please try again.");
      // A wrong code was corrected by hand: the field has done its job.
      else setRejected(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
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
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <details className="rounded-lg border px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Got a letter? Paste its text</summary>
          <Textarea
            className="mt-3"
            aria-label="Text of the letter"
            rows={5}
            maxLength={6000}
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="Paste the text of the letter, in its original language."
          />
        </details>

        {(!initialCode || rejected) && (
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-sm font-medium">
              Access code
            </label>
            <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="From the QR code at our table" />
          </div>
        )}

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Search />}
          {busy ? "Researching live" : "Research it"}
        </Button>
      </form>

      {(progress.stages.length > 0 || error) && (
        <Card aria-live="polite">
          <CardHeader>
            <CardTitle className="text-base">What is happening</CardTitle>
            <CardDescription>Each search, each page and each check, as it happens.</CardDescription>
            {progress.stages.length > 0 && (
              <CardAction>
                <Elapsed busy={busy} />
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
          </CardContent>
        </Card>
      )}

      {result && <TryResult result={result} ref={resultRef} />}
    </div>
  );
}
