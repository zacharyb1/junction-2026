import { describe, expect, it } from "vitest";
import { decide, DESKS, hasDeadline, importance, isAddressed, situation, spoken, withoutName } from "@/lib/listen";

describe("what the listening post makes of a sentence", () => {
  it("leaves small talk alone", () => {
    for (const text of ["what's for dinner", "did you buy milk", "who picks up the kids today", "lol that video was great", "see you at seven", "mennäänkö kävelylle"]) {
      expect(decide(text), text).toBeNull();
    }
  });

  it("hears a life event without being asked", () => {
    expect(decide("I'm pregnant, took two tests this morning")).toMatchObject({ kind: "family", desk: "life", urgent: false, addressed: false });
    expect(decide("the landlord wants to raise the rent by twelve percent")).toMatchObject({ kind: "rent", desk: "legal" });
    expect(decide("I got a letter from the tax office about back taxes")).toMatchObject({ kind: "tax", desk: "finance" });
    expect(decide("we are moving to Tampere in March")).toMatchObject({ kind: "moving", desk: "life" });
    expect(decide("do we still get housing allowance from Kela")).toMatchObject({ kind: "benefit", desk: "finance" });
  });

  it("marks what cannot wait as urgent", () => {
    expect(decide("our flight to Lisbon was cancelled an hour ago")).toMatchObject({ kind: "travel", desk: "travel", urgent: true });
    expect(decide("they cancelled the train again")).toMatchObject({ kind: "travel", urgent: true });
    expect(decide("I got laid off today")).toMatchObject({ kind: "job-loss", urgent: true });
    expect(decide("we got an eviction notice")).toMatchObject({ kind: "eviction", desk: "legal", urgent: true });
    expect(decide("I got a parking ticket outside the school")).toMatchObject({ kind: "fine", urgent: true });
    expect(decide("the baby has a fever again")).toMatchObject({ kind: "sick-child", urgent: true });
  });

  it("hears Finnish", () => {
    expect(decide("olen raskaana")).toMatchObject({ kind: "family" });
    expect(decide("vuokranantaja lähetti kirjeen vuokrankorotuksesta")).toMatchObject({ kind: "rent", desk: "legal" });
    expect(decide("lento Helsinkiin on peruttu")).toMatchObject({ kind: "travel", urgent: true });
    expect(decide("sain pysäköintivirhemaksun")).toMatchObject({ kind: "fine", urgent: true });
    expect(decide("verokortti pitää tilata")).toMatchObject({ kind: "tax", desk: "finance" });
    expect(decide("Migristä tuli päätös oleskeluluvasta")).toMatchObject({ kind: "permit" });
  });

  it("notices a plan that has rules, and leaves an ordinary plan alone", () => {
    for (const text of ["I'll just bring ten cartons of cigarettes from Tallinn", "we can just sublet the flat while we are away", "I'm not going to declare that income"]) {
      expect(decide(text), text).toMatchObject({ kind: "plan", desk: "rules", urgent: false });
    }
    for (const text of ["I'll bring milk on the way home", "we'll park behind the school", "let's cancel dinner", "I'll work late tonight"]) {
      expect(decide(text), text).toBeNull();
    }
  });

  it("does not match a word that only contains a trigger", () => {
    expect(decide("the visage of that actor")).toBeNull();
    expect(decide("skeleton costumes for everyone")).toBeNull(); // "kela" inside a word
    expect(decide("she is training for a marathon")).toBeNull();
  });

  it("knows its name, as written and as speech recognition hears it", () => {
    for (const text of ["AIDaddy, what do I do about my passport", "hey AI Daddy can you check this", "ok A.I. daddy look this up", "eye daddy what is a tax card", "I daddy can you check the bus times"]) {
      expect(isAddressed(text), text).toBe(true);
    }
    for (const text of ["I'm a daddy now", "Daddy, what's for dinner", "hey daddy can I have ice cream", "my dad is here"]) {
      expect(isAddressed(text), text).toBe(false);
    }
  });

  it("researches a question addressed to it, and ignores its bare name", () => {
    expect(decide("AIDaddy, how do I register my address in Espoo")).toMatchObject({ kind: "asked", addressed: true });
    expect(decide("AI daddy, our flight was cancelled")).toMatchObject({ kind: "travel", addressed: true });
    expect(decide("AIDaddy")).toBeNull();
    expect(decide("hey AI daddy thanks")).toBeNull();
    expect(withoutName("Hey AI Daddy, how do I get a tax card")).toBe("how do I get a tax card");
  });
});

describe("what is sent to research", () => {
  const lines = [
    { text: "did you buy milk", at: 0 },
    { text: "the dishwasher is done", at: 100_000 },
    { text: "by the way the landlord called", at: 130_000 },
    { text: "AI daddy, he wants to raise the rent by twelve percent", at: 135_000 },
    { text: "from the first of January", at: 138_000 },
    { text: "anyway what's for dinner", at: 139_000 },
    { text: "pasta", at: 200_000 },
  ];

  it("sends the sentence, its close neighbours and the desk's question, and nothing else", () => {
    const text = situation(lines, 3, "legal");
    expect(text).toContain("by the way the landlord called.");
    expect(text).toContain("he wants to raise the rent by twelve percent.");
    expect(text).toContain("from the first of January.");
    expect(text.endsWith(DESKS.legal.question)).toBe(true);
    expect(text).not.toContain("milk"); // said long before
    expect(text).not.toContain("pasta"); // more than two sentences later
    expect(text).not.toMatch(/ai daddy/i);
    expect(text.length).toBeLessThanOrEqual(1500);
  });

  it("asks whether a plan is allowed only when nobody in the room did", () => {
    expect(situation([{ text: "I'll just bring ten cartons of cigarettes from Tallinn", at: 0 }], 0, "rules")).toBe(
      "I'll just bring ten cartons of cigarettes from Tallinn. Is it allowed, and what are the rules?",
    );
    expect(situation([{ text: "can we just sublet the flat while we are away?", at: 0 }], 0, "rules")).toBe("can we just sublet the flat while we are away?");
  });

  it("leaves out a sentence that was said too long before", () => {
    const text = situation(lines, 2, "legal");
    expect(text).toContain("dishwasher"); // 30 seconds before: still part of the same talk
    expect(text).not.toContain("milk"); // more than two minutes before
  });
});

describe("call or ping", () => {
  const found = { evidenceVerified: 3 };

  it("finds a deadline in a plan line, not in its title", () => {
    expect(hasDeadline("Apply for the maternity grant: no later than two months before the due date [5][7]")).toBe(true);
    expect(hasDeadline("Ilmoita muutosta: viimeistään viikon kuluessa [2]")).toBe(true);
    expect(hasDeadline("Book the first maternity clinic appointment [1]")).toBe(false);
    expect(hasDeadline("Monthly allowance: EUR 210 [3]")).toBe(false);
    expect(hasDeadline("Check the month of your tax card [1]")).toBe(false);
  });

  it("calls for a deadline or an urgent matter, pings otherwise", () => {
    expect(importance({ urgent: false }, { plan: ["Object to the increase: within 14 days [1]"], ...found })).toBe("call");
    expect(importance({ urgent: true }, { plan: ["Ask the airline for a refund [1]"], ...found })).toBe("call");
    expect(importance({ urgent: false }, { plan: ["Book a clinic appointment [1]"], ...found })).toBe("ping");
  });

  it("never calls about a plan with nothing confirmed", () => {
    expect(importance({ urgent: true }, { plan: [], evidenceVerified: 0 })).toBe("ping");
    expect(importance({ urgent: true }, { plan: ["Something: within 3 days [1]"], evidenceVerified: 0 })).toBe("ping");
  });

  it("speaks the plan as stored, without source numbers", () => {
    const text = spoken({ title: "Rent increase", plan: ["Object in writing: within two (2) weeks [1][2]"], evidenceVerified: 2, evidenceTotal: 2 }, "en");
    expect(text).toBe("Rent increase. Object in writing: within two weeks. 2 of 2 quotes were found on their pages. The sources are on the screen.");
  });
});
