import { describe, expect, it } from "vitest";
import { ANSWER_AT, CALL, CHAT, CONFIRM_AT, DURATION, END_AT, NUMBER, PROPOSAL, PROPOSAL_AT, RESULT_AT, RING_AT } from "@/components/call-demo/script";
import { REPLAYS } from "@/components/demo/scenes";

describe("the scene where AIDaddy calls someone's boss", () => {
  // A copied voice that passes as the person deceives whoever answers. The scene must never show that.
  it("opens the call by saying that an assistant is speaking with a copy of the voice", () => {
    const first = CALL[0];
    expect(first.who).toBe("AIDaddy");
    expect(first.text).toMatch(/This is AIDaddy, \w+'s assistant/);
    expect(first.text).toMatch(/a copy of his voice at his request/);
    // The words it shows beforehand carry the same sentence, so the yes covers it.
    expect(PROPOSAL.say).toMatch(/assistant, speaking with a copy of his voice at his request/);
  });

  it("asks for the number and never brings one itself", () => {
    const asks = CHAT.find((line) => line.who === "AIDaddy");
    expect(asks?.text).toMatch(/What is your boss's number\?/);
    const answer = CHAT.find((line) => line.at > (asks?.at ?? 0) && line.who === "Mikko");
    expect(answer?.text).toContain(NUMBER);
  });

  it("shows no real phone number", () => {
    expect(NUMBER).toMatch(/•/);
    for (const text of [...CHAT.map((line) => line.text), ...CALL.map((line) => line.text), PROPOSAL.number]) {
      expect(text).not.toMatch(/\d{2}[ -]?\d{3}[ -]?\d{4}/);
    }
  });

  it("rings only after the words were shown and confirmed", () => {
    expect(PROPOSAL_AT).toBeGreaterThan(CHAT.at(-1)!.at);
    expect(CONFIRM_AT).toBeGreaterThan(PROPOSAL_AT);
    expect(RING_AT).toBeGreaterThan(CONFIRM_AT);
    expect(ANSWER_AT).toBeGreaterThan(RING_AT);
    expect(CALL.every((line) => line.at > ANSWER_AT && line.at < END_AT)).toBe(true);
    expect(RESULT_AT).toBeGreaterThan(END_AT);
    expect(DURATION).toBeGreaterThan(RESULT_AT);
  });

  it("is labelled a concept, with the length of its script", () => {
    expect(REPLAYS.call.tone).toBe("concept");
    expect(REPLAYS.call.real).toMatch(/cannot copy a voice or ring a phone number yet/);
    expect(REPLAYS.call.seconds).toBe(DURATION / 1000);
  });
});
