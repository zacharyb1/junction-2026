import sample from "@/data/sample-case.json";

/**
 * What the landing page shows from the sample case, read from src/data/sample-case.json
 * so the page cannot drift from the case file it links to.
 */
export type PlanLine = {
  what: string;
  when: string;
  source: {
    n: number;
    quote: string;
    publisher: string;
    host: string;
    /** The source page, opened at the quoted sentence where the browser supports it. */
    href: string;
  };
};

/** The three steps of the sample case that the example chat shows, by their source number. */
const SHOWN_SOURCES = [1, 3, 5];

export const planTitle: string = sample.title;

export const planLines: PlanLine[] = SHOWN_SOURCES.flatMap((n) => {
  const step = sample.steps.find((s) => s.evidence[0] === n);
  const evidence = sample.evidence.find((e) => e.n === n);
  if (!step?.due || !evidence) return [];
  return [
    {
      what: step.title,
      when: step.due,
      source: {
        n,
        quote: evidence.quote,
        publisher: evidence.publisher,
        host: hostOf(evidence.url),
        href: highlightUrl(evidence.url, evidence.quote) ?? evidence.url,
      },
    },
  ];
});

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Link to the page with the quoted sentence highlighted, using a text fragment (`#:~:text=start,end`).
 * Same rule as `highlightUrl` on the case page, src/app/c/[id]/page.tsx. Keep the two alike.
 */
function highlightUrl(url: string, quote: string): string | null {
  if (url.includes("#") || /\.pdf($|\?)/i.test(url)) return null;
  const words = quote.replace(/\s+/g, " ").trim().split(" ");
  if (words.length < 3) return null;
  // A dash, comma or ampersand has a meaning inside a text fragment, so each is encoded.
  const part = (list: string[]) => encodeURIComponent(list.join(" ")).replace(/-/g, "%2D");
  const fragment = words.length > 10 ? `${part(words.slice(0, 5))},${part(words.slice(-5))}` : part(words);
  return `${url}#:~:text=${fragment}`;
}

/** The first item the sample case could not confirm, word for word. */
export const firstGap: string | null = sample.unverified[0] ?? null;

/** The title of the sample case's step that waits for the family's approval. */
export const approvalStep: string | null = sample.steps.find((s) => s.status === "needs_approval")?.title ?? null;
