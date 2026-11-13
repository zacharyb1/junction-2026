"use client";

import { ArrowRight, BadgeCheck, CircleAlert, ExternalLink, Loader2, Search } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { linkButtonClasses } from "@/components/landing/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Stage = { name: string; detail: string; ms: number };
type Source = { url: string; title: string; official: boolean };
type Result = {
  url: string;
  title: string;
  plan: string[];
  evidenceTotal: number;
  evidenceVerified: number;
  unverified: string[];
  openQuestions: string[];
  ms: number;
  exa: { searches: number; contents: number; costDollars: number };
};

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
  const [stages, setStages] = useState<Stage[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A code from the link that the server refused: show the field so it can be corrected.
  const [rejected, setRejected] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStages([]);
    setSources([]);
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
          if (name === "stage") setStages((s) => [...s, payload as Stage]);
          else if (name === "source") setSources((s) => [...s, payload as Source]);
          else if (name === "done") {
            finished = true;
            setResult(payload as Result);
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          } else if (name === "error") {
            finished = true;
            setError((payload as { error: string }).error);
          }
        }
      }
      if (!finished) setError("The connection closed before the research finished. Please try again.");
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

      {(stages.length > 0 || error) && (
        <Card aria-live="polite">
          <CardHeader>
            <CardTitle className="text-base">What is happening</CardTitle>
            <CardDescription>Each stage of the research, as it runs.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ol className="flex flex-col gap-1.5">
              {stages.map((s, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {(s.ms / 1000).toFixed(1)}s
                  </span>
                  <span>{s.detail}</span>
                </li>
              ))}
            </ol>
            {sources.length > 0 && (
              <ul className="flex flex-col gap-1 border-t pt-3">
                {sources.map((s) => (
                  <li key={s.url} className="flex items-center gap-2">
                    <Badge variant={s.official ? "secondary" : "outline"}>{s.official ? "Official" : "Secondary"}</Badge>
                    <a href={s.url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <p className="flex items-start gap-2 text-destructive">
                <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card ref={resultRef} className="scroll-mt-4 border-primary/40">
          <CardHeader>
            <CardTitle>{result.title}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                <BadgeCheck /> {result.evidenceVerified} of {result.evidenceTotal} quotes found on their pages
              </Badge>
              <span>
                {(result.ms / 1000).toFixed(1)} s · {result.exa.searches} Exa searches · {result.exa.contents} pages read through Exa
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {result.plan.map((line) => (
                <li key={line}>{line}</li>
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
              className="inline-flex items-center gap-1 self-center text-xs text-muted-foreground hover:underline"
            >
              Open in a new tab <ExternalLink className="size-3" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
