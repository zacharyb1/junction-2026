import { describe, expect, it } from "vitest";
import type { Community } from "@/lib/engine/communities";
import { communityRow, FACTS, householdFrame, isJob, isLeakingTap } from "@/lib/home-demo";

describe("jobs", () => {
  it("tells household jobs from questions for the chat", () => {
    expect(isJob("Kitchen tap is leaking")).toBe(true);
    expect(isJob("Washer broke")).toBe(true);
    expect(isJob("Gift for Eino")).toBe(false);
    expect(isLeakingTap("kitchen tap is leaking")).toBe(true);
    expect(isLeakingTap("Babysitter Friday")).toBe(false);
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
