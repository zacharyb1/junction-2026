import { describe, expect, it } from "vitest";
import type { Community } from "@/lib/engine/communities";
import type { Helper } from "@/lib/engine/helpers";
import { communityRow, DEMO_FIRMS, FACTS, firmsFromHelpers, householdFrame, isDemoJob, isJob, taskFrame } from "@/lib/home-demo";

describe("Get it done timeline", () => {
  it("searches, then calls, then picks the cheapest quote that fits the week", () => {
    expect(taskFrame(0, DEMO_FIRMS)).toMatchObject({ stage: 0, busy: true, headline: "Searching plumbers near Kallio…", rows: [] });
    const searching = taskFrame(6, DEMO_FIRMS);
    expect(searching.stage).toBe(0);
    expect(searching.rows).toHaveLength(6);
    expect(searching.rows.at(-1)?.state).toBe("closed");

    const calling = taskFrame(9, DEMO_FIRMS);
    expect(calling.stage).toBe(1);
    expect(calling.best).toBeNull();
    expect(calling.rows.map((r) => r.state)).toContain("talking");

    const picked = taskFrame(17, DEMO_FIRMS);
    expect(picked).toMatchObject({ stage: 2, busy: false, headline: "5 quotes in · best one picked" });
    expect(picked.best?.name).toBe("Wirmax");
    // The best one is shown on its own card, the rest cheapest first, the closed one last.
    expect(picked.rows.map((r) => r.firm.name)).toEqual(["Tinko Finland", "KH-Suomi Putki", "Vintek", "Putkimies Helsinki", "Putkityö Nieminen"]);
  });

  it("never picks a quote whose time falls in a shift, however cheap", () => {
    const cheapButBusy = DEMO_FIRMS.map((f) => (f.name === "Vintek" ? { ...f, price: 10 } : f));
    expect(taskFrame(17, cheapButBusy).best?.name).toBe("Wirmax");
  });

  it("reaches each company by its first channel", () => {
    const rows = taskFrame(7, DEMO_FIRMS).rows;
    expect(rows.find((r) => r.firm.name === "Wirmax")).toMatchObject({ state: "reaching", line: "Messaged on WhatsApp…", via: "WhatsApp" });
    expect(rows.find((r) => r.firm.name === "Tinko Finland")?.line).toBe("Calling 010 ••• 20 00…");
  });
});

describe("live companies", () => {
  const helper = (name: string, phone: string, price = ""): Helper => ({ name, service: "Plumbing", phone, price, priceQuote: price, url: `https://${name}.fi`, site: `${name}.fi` });

  it("gives the same simulated quote on every replay and starts from the listed price", () => {
    const a = firmsFromHelpers([helper("putki", "040 123 4567", "€70")]);
    expect(firmsFromHelpers([helper("putki", "040 123 4567", "€70")])).toEqual(a);
    expect(a[0].price).toBeLessThanOrEqual(70);
    expect(a[0].listed).toBe("€70");
  });

  it("does not call a company whose page gives no phone number", () => {
    const [f] = firmsFromHelpers([helper("nophone", "")]);
    expect(f.open).toBe(false);
    expect(f.price).toBeNull();
    expect(taskFrame(17, [f]).best).toBeNull();
  });
});

describe("jobs", () => {
  it("tells household jobs from questions for the chat", () => {
    expect(isJob("Kitchen tap is leaking")).toBe(true);
    expect(isJob("Washer broke")).toBe(true);
    expect(isJob("Gift for Eino")).toBe(false);
    expect(isDemoJob("kitchen tap is leaking")).toBe(true);
    expect(isDemoJob("Babysitter Friday")).toBe(false);
  });
});

describe("household map", () => {
  it("learns one fact per tick and is done after the last", () => {
    expect(householdFrame(0)).toMatchObject({ done: false, current: null, learned: 0, status: "Reading your apps…" });
    expect(householdFrame(3)).toMatchObject({ current: "Wilma", status: "Reading Wilma…" });
    const done = householdFrame(FACTS.length + 1);
    expect(done.done).toBe(true);
    expect(done.people.find((p) => p.name === "Eino")?.facts).toBe("Daycare Vilja · Turns 5 on 12 Dec · Wants a bike");
  });
});

describe("community rows", () => {
  it("sorts live results into the screen's filters", () => {
    const c = (kind: Community["kind"]): Community => ({ title: "t", kind, quote: "q", why: "", url: "https://x.fi", site: "x.fi" });
    expect(communityRow(c("Podcast")).kind).toBe("Podcasts");
    expect(communityRow(c("Video")).kind).toBe("Podcasts");
    expect(communityRow(c("Reddit")).kind).toBe("Groups");
    expect(communityRow(c("Facebook group")).kind).toBe("Groups");
    expect(communityRow(c("Forum")).kind).toBe("Forums");
  });
});
