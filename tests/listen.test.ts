import { describe, expect, it } from "vitest";
import { emergencyIn, emergencyNumber, emergencySpeech, emergencyWords } from "@/lib/emergency";
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
    expect(decide("AIDaddy, how do saunas work in Finland")).toMatchObject({ kind: "asked", addressed: true });
    expect(decide("AIDaddy, how do I register my address in Espoo")).toMatchObject({ kind: "register", addressed: true });
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

describe("an emergency", () => {
  it("hears a seizure, however it is said", () => {
    for (const said of [
      "Someone is shaking and not answering",
      "He's shaking and he won't respond",
      "I think she's having a seizure",
      "Dad is convulsing",
      "Hän kouristelee",
      "Hän tärisee eikä vastaa",
    ])
      expect(emergencyIn(said), said).toBe("seizure");
  });

  it("hears someone who does not wake up, choking and a cry for help", () => {
    expect(emergencyIn("She's not breathing")).toBe("unresponsive");
    expect(emergencyIn("Grandpa just collapsed")).toBe("unresponsive");
    expect(emergencyIn("He won't wake up")).toBe("unresponsive");
    expect(emergencyIn("Hän ei hengitä")).toBe("unresponsive");
    expect(emergencyIn("He's choking")).toBe("choking");
    expect(emergencyIn("Somebody call an ambulance")).toBe("help");
    expect(emergencyIn("Soittakaa ambulanssi")).toBe("help");
  });

  it("leaves ordinary talk alone", () => {
    for (const said of [
      "I'm shaking from the cold",
      "He's not answering his phone",
      "She is not responding to my emails",
      "The deal collapsed last week",
      "Shake the bottle before you open it",
      "What should we have for dinner?",
      "Our flight to Lisbon was cancelled",
    ])
      expect(emergencyIn(said), said).toBeNull();
  });

  it("names the number of the country", () => {
    expect(emergencyNumber("FI")).toBe("112");
    expect(emergencyNumber("US")).toBe("911");
    expect(emergencyNumber("GB")).toBe("999");
  });

  it("says the call first, and the number digit by digit", () => {
    for (const kind of ["seizure", "unresponsive", "help"] as const) {
      expect(emergencyWords(kind, "en", "112").lines[0]).toMatch(/call 112 now/);
      expect(emergencyWords(kind, "fi", "112").lines[0]).toMatch(/soita heti hätänumeroon 112/);
    }
    expect(emergencyWords("choking", "en", "911").lines.join(" ")).toMatch(/calls 911 now/);
    const speech = emergencySpeech("seizure", "en", "112");
    expect(speech).toMatch(/call one one two now/);
    expect(speech).not.toMatch(/\d|\{n\}/);
    expect(emergencySpeech("seizure", "fi", "112")).toMatch(/yksi yksi kaksi/);
  });
});

describe("everyday ways of saying a matter", () => {
  it.each([
    ["the dishwasher is broken again", "consumer"],
    ["the washing machine won't start", "consumer"],
    ["astianpesukone ei toimi", "consumer"],
    ["the rent is going up again next month", "rent"],
    ["we need to register our new address", "register"],
    ["where do I get a bank ID", "register"],
    ["I need to see a doctor about my back", "health"],
    ["grandpa passed away last night", "death"],
    ["we're getting divorced", "divorce"],
    ["I had a car accident this morning", "accident"],
    ["the insurance won't pay for it", "accident"],
    ["it's mum's birthday next week", "occasion"],
    ["our son starts school in August", "school"],
    ["we got a bill from the hospital", "letter"],
    ["I got a new job", "job"],
    ["we have to do our taxes", "tax"],
  ])("%s -> %s", (text, kind) => {
    expect(decide(text)?.kind).toBe(kind);
  });

  it.each(["the dishwasher is done", "I'm going to the shop", "the kids are asleep", "what's for dinner", "I'm broke until Friday"])(
    "small talk stays small talk: %s",
    (text) => {
      expect(decide(text)).toBeNull();
    },
  );
});
