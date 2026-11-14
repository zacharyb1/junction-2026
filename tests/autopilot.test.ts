import { describe, expect, it } from "vitest";
import { checkedQuotes, progressLine, QUESTION, readResearchStream, RECORDED, refusal, summary } from "@/components/autopilot/check";
import recording from "@/data/autopilot-check.json";
import { ResearchInput } from "@/lib/engine/research";

const stream = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

const event = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

describe("the autopilot lawyer's check", () => {
  it("asks the Engine a question it accepts", () => {
    expect(ResearchInput.safeParse(QUESTION).success).toBe(true);
  });

  // The page's whole claim is that a shown quote was found on its page.
  it("shows only quotes the Engine found on their pages", () => {
    const quotes = checkedQuotes([
      { n: 1, url: "https://www.kkv.fi/en/a", quote: "The period of notice is one month.", verification: "verified" },
      { n: 2, url: "https://www.kkv.fi/en/b", quote: "A sentence that is not on the page.", verification: "not_found" },
      { n: 3, url: "https://example.org/c", quote: "A page that could not be opened.", verification: "unreachable" },
    ]);
    expect(quotes.map((q) => q.n)).toEqual([1]);
    expect(quotes[0].host).toBe("kkv.fi");
    expect(quotes[0].href).toContain("https://www.kkv.fi/en/a#:~:text=");
  });

  it("falls back to a recording that is a real run of the same question", () => {
    expect(recording.request).toEqual(QUESTION);
    expect(RECORDED.quotes.length).toBeGreaterThan(0);
    expect(RECORDED.quotes.length).toBe(recording.evidence.filter((item) => item.verification === "verified").length);
    expect(recording.exa.searches).toBeGreaterThan(0);
    expect(RECORDED.summary).toBe(summary(recording));
  });

  it("says what a run did in the Engine's own counts", () => {
    expect(summary({ evidenceVerified: 3, evidenceTotal: 4, exa: { searches: 4, contents: 3, costDollars: 0.028 }, ms: 5373 })).toBe(
      "4 Exa searches, 3 of 4 quotes found on the cited pages, 5.4 s",
    );
  });

  it("reports each stage and each opened page while the check runs", () => {
    expect(progressLine({ type: "stage", name: "search", detail: "Exa search on official sites: actions and deadlines", ms: 10 })).toBe(
      "Exa search on official sites: actions and deadlines",
    );
    expect(progressLine({ type: "page", url: "https://www.kkv.fi/en/a", title: "Lease", official: true, via: "live", ms: 20 })).toBe("Opened kkv.fi");
    expect(progressLine({ type: "page", url: "https://www.kkv.fi/en/a", title: "Lease", official: true, via: "none", ms: 20 })).toBe(
      "Could not open kkv.fi",
    );
    expect(progressLine({ type: "source", url: "https://www.kkv.fi/en/a", title: "Lease", official: true })).toBeNull();
  });
});

describe("reading the Engine's event stream", () => {
  const result = { id: "abc", evidenceVerified: 1, evidenceTotal: 1 };

  it("hands over progress events and resolves with the result", async () => {
    const seen: string[] = [];
    const stage = { type: "stage", name: "search", detail: "Searching", ms: 1 };
    const body = event("stage", stage) + event("done", result);
    // Split in the middle of a block, as a network does.
    const got = await readResearchStream(stream(body.slice(0, 25), body.slice(25)), (e) => seen.push(e.type));
    expect(seen).toEqual(["stage"]);
    expect(got).toEqual(result);
  });

  it("rejects with the Engine's message on an error event", async () => {
    await expect(readResearchStream(stream(event("error", { error: "EXA_API_KEY is not configured on the server." })), () => {})).rejects.toThrow(
      "EXA_API_KEY is not configured on the server.",
    );
  });

  // A stream that stops early must not look like a check that passed.
  it("rejects when the stream closes before the result", async () => {
    await expect(readResearchStream(stream(event("stage", { type: "stage", name: "search", detail: "Searching", ms: 1 })), () => {})).rejects.toThrow(
      /closed before the check finished/,
    );
  });

  it("explains a refusal in words the visitor can act on", () => {
    expect(refusal(401)).toBe("That access code is not valid.");
    expect(refusal(429, "The demo is busy. Please try again in a minute.")).toBe("The demo is busy.");
    expect(refusal(500, "EXA_API_KEY is not configured on the server.")).toBe("EXA_API_KEY is not configured on the server.");
    expect(refusal(502)).toBe("The Engine answered 502.");
  });
});
