import { describe, expect, it } from "vitest";
import { detectEmergency, emergencyReply, emergencyText, guessLanguage } from "@/lib/emergency";

describe("detectEmergency", () => {
  it.each([
    ["Dad is having a seizure", "seizure"],
    ["she's seizing on the floor", "seizure"],
    ["isä saa kouristuskohtauksen", "seizure"],
    ["he is not breathing", "breathing"],
    ["grandma just collapsed in the kitchen", "breathing"],
    ["hän on tajuton", "breathing"],
    ["the baby is choking", "choking"],
    ["lapsi tukehtuu", "choking"],
    ["mum has chest pain", "heart"],
    ["isällä on rintakipua", "heart"],
    ["I think he's having a stroke, his face is drooping", "stroke"],
    ["it won't stop bleeding", "bleeding"],
    ["she's having an allergic reaction, her throat is swelling", "allergy"],
    ["the kid swallowed some pills", "poison"],
    ["lapsi nieli pariston", "poison"],
    ["the kitchen is on fire", "fire"],
    ["keittiö palaa", "fire"],
    ["call an ambulance", "general"],
    ["soittakaa ambulanssi", "general"],
  ])("%s -> %s", (text, kind) => {
    expect(detectEmergency(text)?.kind).toBe(kind);
  });

  it.each([
    "the landlord wants to raise the rent",
    "the deal collapsed last week",
    "we need an emergency fund",
    "I love chocolate",
    "the kid has a fever",
    "palaan kotiin kuudelta",
    "",
  ])("leaves alone: %s", (text) => {
    expect(detectEmergency(text)).toBeNull();
  });
});

describe("emergencyReply", () => {
  it("always starts with calling 112 and says AIDaddy cannot call", () => {
    for (const language of ["en", "fi"] as const) {
      const reply = emergencyReply("seizure", language);
      expect(reply.headline).toContain("112");
      expect(reply.steps.length).toBeGreaterThan(0);
    }
    expect(emergencyText("fire")).toMatch(/^Call 112 now\. I cannot call for you\.\n/);
  });

  it("answers in Finnish when the sentence is Finnish", () => {
    expect(guessLanguage("hän ei hengitä")).toBe("fi");
    expect(guessLanguage("he is not breathing")).toBe("en");
  });
});
