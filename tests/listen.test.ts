import { describe, expect, it } from "vitest";
import patterns from "@/data/wake-patterns.json";
import { hear, sameMatter, situation, spell } from "@/lib/listen";
import { wakePatterns } from "../scripts/make-listen-data.mjs";

describe("what the listening page lets pass", () => {
  // The promise on the page: small talk stays on the device.
  it.each([
    "what should we eat tonight",
    "see you at seven",
    "did you feed the cat already",
    "the game was great yesterday",
    "can you pick up milk on the way home",
    "mennäänkö kävelylle illalla",
  ])("lets small talk pass: %s", (sentence) => {
    expect(hear(sentence)).toEqual({ wake: false, why: "small talk" });
  });

  it("lets a word or two pass, and a thank you to its name", () => {
    expect(hear("okay then").wake).toBe(false);
    expect(hear("Thanks, AI Daddy")).toEqual({ wake: false, why: "too short" });
  });
});

describe("what the listening page notices", () => {
  it.each([
    "The landlord sent a letter, they want to raise the rent",
    "I got a parking ticket today",
    "my flight to Berlin was cancelled this morning",
    "I think I am pregnant",
    "they laid off half the team, I lost my job",
    "Migristä tuli päätös tänään",
    "can we bring snus back from Sweden",
  ])("notices life admin: %s", (sentence) => {
    expect(hear(sentence)).toEqual({ wake: true, why: "life admin" });
  });

  it("notices its name with a matter behind it, as speech to text writes the name", () => {
    expect(hear("AI Daddy, what do we owe the housing company")).toEqual({ wake: true, why: "said its name" });
  });

  // Nobody asks a question here. This is the case the page exists for.
  it.each(["I'll just bring ten cartons of cigarettes from Tallinn", "we can just sublet the flat while we are away", "I'm not going to declare that income"])(
    "notices a plan that has rules: %s",
    (sentence) => {
      expect(hear(sentence)).toEqual({ wake: true, why: "a plan with rules" });
    },
  );

  it("uses the Telegram gate's wake patterns, unchanged", async () => {
    expect(patterns).toEqual(await wakePatterns());
    expect(patterns.length).toBeGreaterThan(5);
  });
});

describe("the research question", () => {
  it("is the room's own words, in the order they were said", () => {
    expect(situation(["The landlord sent a letter", "they want to raise the rent by 80 euros from January"])).toBe(
      "The landlord sent a letter. they want to raise the rent by 80 euros from January.",
    );
  });

  it("asks whether a plan is allowed when nobody asked", () => {
    expect(situation(["I'll just bring ten cartons of cigarettes from Tallinn"])).toBe(
      "I'll just bring ten cartons of cigarettes from Tallinn. Is it allowed, and what are the rules?",
    );
    // The question is already in the words: nothing is added.
    expect(situation(["can we just sublet the flat while we are away?"])).toBe("can we just sublet the flat while we are away?");
  });

  it("spells the name the way the product does", () => {
    expect(spell("hey AI Daddy, a letter came")).toBe("hey AIDaddy, a letter came");
    expect(situation(["ai daddy what about the tax card"])).toBe("AIDaddy what about the tax card.");
  });

  it("stays within what the Engine takes, keeping the newest words", () => {
    const long = situation([...Array.from({ length: 60 }, (_, n) => `sentence number ${n} about nothing in particular`), "the rent increase letter came today"]);
    expect(long.length).toBeLessThanOrEqual(1400);
    expect(long.endsWith("the rent increase letter came today.")).toBe(true);
  });
});

describe("the same matter twice", () => {
  it("is recognised, so one matter costs one research run", () => {
    expect(sameMatter("The landlord sent a letter. They want to raise the rent.", "that letter from the landlord about raising the rent again")).toBe(true);
  });

  it("is not confused with another matter", () => {
    expect(sameMatter("The landlord sent a letter. They want to raise the rent.", "I got a parking ticket in Tampere today")).toBe(false);
    expect(sameMatter("", "I got a parking ticket in Tampere today")).toBe(false);
  });
});
