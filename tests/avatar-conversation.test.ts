import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PresenceSpeechSet } from "../src/lib/avatar/presence";

// The conversation hook on a minimal effect host, with a fake Audio element: what the visitor hears,
// and when the picture is told to talk, comes only from real audio playback events.
const runtime = vi.hoisted(() => ({ host: null as unknown as EffectHost }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (value: unknown) => runtime.host.ref(value),
  useState: (value: unknown) => runtime.host.state(value),
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => runtime.host.effect(effect, deps),
}));

import { useAvatarConversation, VOICE_UNAVAILABLE } from "../src/components/avatar/use-avatar-conversation";

type Slot = { value?: unknown; deps?: unknown[]; cleanup?: () => void };
class EffectHost {
  private slots: Slot[] = [];
  private cursor = 0;
  private effects: (() => void)[] = [];
  dirty = false;
  private slot() { return this.slots[this.cursor++] ?? (this.slots[this.cursor - 1] = {}); }
  ref(value: unknown) {
    const slot = this.slot();
    return slot.value ?? (slot.value = { current: value });
  }
  state(initial: unknown) {
    const slot = this.slot();
    if (!("value" in slot)) slot.value = typeof initial === "function" ? initial() : initial;
    return [slot.value, (value: unknown) => {
      const next = typeof value === "function" ? value(slot.value) : value;
      if (!Object.is(next, slot.value)) { slot.value = next; this.dirty = true; }
    }];
  }
  effect(effect: () => void | (() => void), deps: unknown[]) {
    const slot = this.slot();
    if (!slot.deps || deps.some((item, index) => !Object.is(item, slot.deps![index]))) {
      slot.deps = deps;
      this.effects.push(() => { slot.cleanup?.(); slot.cleanup = effect() ?? undefined; });
    }
  }
  render<T>(component: () => T): T {
    runtime.host = this; this.cursor = 0; this.dirty = false;
    const result = component();
    while (this.effects.length) this.effects.shift()!();
    return result;
  }
  unmount() { this.slots.forEach((slot) => slot.cleanup?.()); }
}

class FakeAudio {
  static all: FakeAudio[] = [];
  muted = false;
  paused = true;
  duration = Number.NaN;
  onplaying: (() => void) | null = null;
  onwaiting: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public src: string) { FakeAudio.all.push(this); }
  play() {
    this.paused = false;
    queueMicrotask(() => { this.duration = 6.4; this.onplaying?.(); });
    return Promise.resolve();
  }
  pause() { if (!this.paused) { this.paused = true; this.onpause?.(); } }
  end() { this.paused = true; this.onended?.(); }
}

const speech: PresenceSpeechSet = {
  clinic: { src: "/avatar/desk/speech/clinic.mp3", durationMs: 10_913, transcript: "Start with the maternity clinic.", provider: "elevenlabs", voice: "Bill" },
};
type Options = Parameters<typeof useAvatarConversation>[0];
const cleanups: (() => void)[] = [];
function conversation(overrides: Partial<Options> = {}) {
  const host = new EffectHost();
  let options: Options = {
    code: "", liveConfigured: true, voiceConfigured: false, preparedSpeech: speech, paused: false,
    settings: { name: "Alex", role: "everyday", tone: "calm" }, ...overrides,
  };
  const useHook = () => useAvatarConversation(options);
  let api = host.render(useHook);
  const render = (changes: Partial<Options> = {}) => {
    options = { ...options, ...changes };
    let count = 0;
    do { api = host.render(useHook); if (++count > 20) throw new Error("Hook did not settle"); } while (host.dirty);
    return api;
  };
  const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); return render(); };
  cleanups.push(() => host.unmount());
  return { render, settle, get api() { return api; } };
}

function stream(text: string) {
  const body = `event: message\ndata: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(body)); controller.close(); } }), {
    headers: { "content-type": "text/event-stream" },
  });
}

beforeEach(() => {
  FakeAudio.all = [];
  vi.stubGlobal("Audio", FakeAudio);
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

describe("avatar conversation voice", () => {
  it("plays the prepared ElevenLabs answer and talks for its manifest duration once audio starts", async () => {
    const chat = conversation();
    const done = chat.api.runExample("clinic");
    await chat.settle();
    const audio = FakeAudio.all.at(-1)!;
    expect(audio.src).toBe("/avatar/desk/speech/clinic.mp3");
    expect(chat.api.voiceNote).toBe("Prepared answer · ElevenLabs voice");
    expect(chat.api.voiceNote).not.toMatch(/Gemini/);
    expect(chat.api.talking).toMatchObject({ durationMs: 10_913 });
    audio.end();
    await done;
    expect(chat.render().talking).toBeNull();
  });

  it("pauses and resumes the voice with the picture, and mutes without stopping the talk", async () => {
    const chat = conversation();
    const done = chat.api.runExample("clinic");
    await chat.settle();
    const audio = FakeAudio.all.at(-1)!;
    const talking = chat.api.talking;
    chat.render({ paused: true });
    expect(audio.paused).toBe(true);
    expect(chat.render().talking).toBe(talking);
    chat.render({ paused: false });
    expect(audio.paused).toBe(false);
    chat.api.setVoiceEnabled(false);
    expect(audio.muted).toBe(true);
    expect(audio.paused).toBe(false);
    expect(chat.render().talking).toBe(talking);
    chat.api.setVoiceEnabled(true);
    expect(audio.muted).toBe(false);
    audio.end();
    await done;
  });

  it("clears the talk and silences the voice on Stop", async () => {
    const chat = conversation();
    const done = chat.api.runExample("clinic");
    await chat.settle();
    const audio = FakeAudio.all.at(-1)!;
    chat.api.stop();
    await done;
    expect(audio.paused).toBe(true);
    expect(chat.render().talking).toBeNull();
  });

  it("keeps a live reply readable without a device voice when ElevenLabs is not configured", async () => {
    const fetch = vi.fn(async () => stream("Hello there."));
    vi.stubGlobal("fetch", fetch);
    const speechSynthesis = { speak: vi.fn() };
    vi.stubGlobal("window", { speechSynthesis });
    const chat = conversation({ voiceConfigured: false });
    await chat.api.runLive("Hi");
    const api = chat.render();
    expect(api.turns.at(-1)).toMatchObject({ role: "assistant", text: "Hello there.", status: "complete" });
    expect(api.voiceNote).toBe(VOICE_UNAVAILABLE);
    expect(FakeAudio.all).toHaveLength(0);
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(api.talking).toBeNull();
  });

  it("reads a live reply with the ElevenLabs route and talks for the decoded duration", async () => {
    const fetch = vi.fn(async (url: string) => url === "/api/aidaddy/speak"
      ? new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" }))
      : stream("Hello there."));
    vi.stubGlobal("fetch", fetch);
    const chat = conversation({ voiceConfigured: true });
    const done = chat.api.runLive("Hi");
    for (let i = 0; i < 20 && !FakeAudio.all.length; i++) { await new Promise((resolve) => setTimeout(resolve, 0)); }
    await chat.settle();
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/api/avatar/chat", "/api/aidaddy/speak"]);
    expect(chat.api.voiceNote).toBe("ElevenLabs voice");
    expect(chat.api.talking).toMatchObject({ durationMs: 6_400 });
    FakeAudio.all.at(-1)!.end();
    await done;
    expect(chat.render().talking).toBeNull();
  });
});
