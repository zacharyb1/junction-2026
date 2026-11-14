import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as listen } from "@/app/api/aidaddy/listen/route";
import { spellName } from "@/lib/speech";

describe("spellName", () => {
  it("writes the name as one word, however speech to text wrote it down", () => {
    const heard: [string, string][] = [
      ["Hello from AI Daddy.", "Hello from AIDaddy."],
      ["Ai daddy, we got a letter", "AIDaddy, we got a letter"],
      ["hey ai daddy", "hey AIDaddy"],
      ["AI-Daddy, are you there?", "AIDaddy, are you there?"],
      ["A.I. Daddy is consulting the official sources.", "AIDaddy is consulting the official sources."],
      ["Ask A.I Daddy", "Ask AIDaddy"],
      ["Ask A. I. Daddy", "Ask AIDaddy"],
      ["Is Aidaddy awake?", "Is AIDaddy awake?"],
      ["AI Daddy's plan", "AIDaddy's plan"],
      ["AI Daddy, ask AI Daddy again", "AIDaddy, ask AIDaddy again"],
    ];
    for (const [transcript, written] of heard) expect(spellName(transcript), transcript).toBe(written);
  });

  it("keeps a Finnish ending written straight after the name", () => {
    const heard: [string, string][] = [
      ["AI Daddyn suunnitelma", "AIDaddyn suunnitelma"],
      ["kerro AI Daddylle", "kerro AIDaddylle"],
      ["kysyin Ai daddyltä", "kysyin AIDaddyltä"],
      ["odotetaan AI Daddya", "odotetaan AIDaddya"],
      ["AI Daddykin tietää", "AIDaddykin tietää"],
      ["A.I. Daddyllekin", "AIDaddyllekin"],
    ];
    for (const [transcript, written] of heard) expect(spellName(transcript), transcript).toBe(written);
  });

  it("leaves the name alone where it is already spelled right", () => {
    for (const text of ["AIDaddy, we got a letter", "kerro AIDaddylle", "AIDaddy could not confirm this."]) {
      expect(spellName(text)).toBe(text);
    }
  });

  it("changes nothing but the name", () => {
    const unchanged = [
      "my daddy uses AI",
      "Daddy is home",
      "AI is everywhere",
      // Two sentences: the first ends with AI, the second begins with Daddy.
      "I asked the AI. Daddy is here.",
      // Words that end with the letters a and i.
      "Thai daddy",
      "said daddy",
      "Dubai daddy",
      // Other words that begin like the name.
      "AI daddies",
      "AI Daddykoodi",
      "",
    ];
    for (const text of unchanged) expect(spellName(text), text).toBe(text);
  });
});

describe("POST /api/aidaddy/listen", () => {
  const CODE = "demo-code";

  const voiceNote = (headers: Record<string, string> = {}) =>
    new Request("https://aidaddy.example/api/aidaddy/listen", {
      method: "POST",
      headers: { "content-type": "audio/webm", "x-demo-code": CODE, ...headers },
      body: new Blob([new Uint8Array([1, 2, 3, 4])]),
    });

  /** ElevenLabs Scribe, answering with this transcript. */
  const scribe = (text: string) => vi.fn().mockResolvedValue(Response.json({ text }));

  beforeEach(() => {
    vi.stubEnv("DEMO_ACCESS_CODE", CODE);
    vi.stubEnv("CASEFILE_SECRET", "bot-secret");
    vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns the transcript with the name spelled AIDaddy", async () => {
    vi.stubGlobal("fetch", scribe("Hello from AI Daddy. My daddy uses AI."));
    const res = await listen(voiceNote());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "Hello from AIDaddy. My daddy uses AI." });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns every other transcript as it was heard", async () => {
    vi.stubGlobal("fetch", scribe("We are expecting a baby in May."));
    const res = await listen(voiceNote());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "We are expecting a baby in May." });
  });

  it("still says so when no words were heard", async () => {
    vi.stubGlobal("fetch", scribe("  "));
    const res = await listen(voiceNote());
    expect(res.status).toBe(422);
  });

  it("refuses a visitor without the demo code, and never asks for a transcript", async () => {
    vi.stubGlobal("fetch", scribe("Hello from AI Daddy."));
    const res = await listen(voiceNote({ "x-demo-code": "" }));
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
