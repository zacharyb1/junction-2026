"use client";

/**
 * A search box for gifts on the chat page, so a visitor can try the gift search (issue 30) with their own words and
 * see real products whose prices were found on the shop's own page.
 */

import { CircleAlert, ExternalLink, Gift, Loader2, TriangleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";
import { hostOf } from "@/components/try-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GiftResult } from "@/lib/engine/gifts";

const EXAMPLES = ["climbing chalk bag under 40 euros", "board game for a family of four", "gift for a dad who loves coffee"];

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function GiftSearch({ code }: { code: string }) {
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GiftResult | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (busy || prompt.trim().length < 3) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ prompt: prompt.trim(), ...(Number(budget) > 0 ? { budget: Number(budget) } : {}) }),
      });
      const body = (await res.json().catch(() => null)) as (GiftResult & { error?: string }) | null;
      if (!res.ok || !body) throw new Error(res.status === 401 ? "That access code is not valid." : (body?.error ?? `Search failed (${res.status})`));
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="gift-search" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="gift-search" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Gift className="size-5" /> Find a gift
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Describe what you are looking for. AIDaddy searches shops with Exa and keeps only products whose price is on
          the shop&apos;s own page.
        </p>
      </div>

      <form onSubmit={search} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="gift-prompt" className="sr-only">
            What are you looking for?
          </label>
          <Input
            id="gift-prompt"
            className="flex-1"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={300}
            placeholder="climbing chalk bag under 40 euros"
          />
          <label htmlFor="gift-budget" className="sr-only">
            Highest price in euros
          </label>
          <Input
            id="gift-budget"
            className="sm:w-32"
            inputMode="numeric"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Max €"
          />
          <Button type="submit" disabled={busy || prompt.trim().length < 3} focusableWhenDisabled>
            {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Gift />}
            {busy ? "Searching shops" : "Search"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-3">
        {error && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
        {result && (
          <p className="text-xs text-muted-foreground">
            {result.ideas.length} products with checked prices · {result.attempts} {result.attempts === 1 ? "search" : "searches"}
            {result.dropped ? ` · ${result.dropped} left out because their page did not show the price` : ""} ·{" "}
            {(result.ms / 1000).toFixed(1)} s
          </p>
        )}
        {result && !result.ideas.length && (
          <p className="text-sm text-muted-foreground">No product had its price on its own page. Try other words.</p>
        )}
        {result?.ideas.map((idea) => (
          <article key={idea.url} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold leading-snug">{idea.name}</h3>
              <span className="shrink-0 font-semibold">{idea.price}</span>
            </div>
            <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
              “{idea.priceQuote}”
            </blockquote>
            {idea.delivery && (
              <p className={`flex items-start gap-1.5 text-sm ${idea.late ? "font-medium text-destructive" : ""}`}>
                {idea.late && <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
                {idea.delivery}
                {idea.arrivesBy ? ` (arrives by ${day(idea.arrivesBy)})` : ""}
              </p>
            )}
            <a
              href={idea.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 self-start py-1 text-sm font-medium text-primary hover:underline"
            >
              {hostOf(idea.url)} <ExternalLink className="size-3.5" />
              <span className="sr-only"> (opens the shop in a new tab)</span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
