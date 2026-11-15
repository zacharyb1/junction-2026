import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AvatarSpeechClock } from "../src/lib/avatar/play-voice";
import type { PresenceManifest, PresenceSegment } from "../src/lib/avatar/presence";

// A deterministic effect host for the real controller, not a React DOM renderer. Media elements and
// the voice are fakes driven by the fake clock, so loading, playback, ends, stalls and errors happen
// when the test says. Browser checks separately cover decoded-frame presentation and the crossfade.
const runtime = vi.hoisted(() => ({ host: null as unknown as EffectHost }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (value: unknown) => runtime.host.ref(value),
  useState: (value: unknown) => runtime.host.state(value),
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => runtime.host.effect(effect, deps),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

import { INTERRUPT_FADE_MS, PresenceStage, SETTLE_WINDOW_MS, STALL_MS, SYNC_TOLERANCE_MS } from "../src/components/avatar/presence-stage";

type Slot = { value?: unknown; deps?: unknown[]; cleanup?: () => void; run?: () => void | (() => void) };
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
      slot.run = effect;
      this.effects.push(() => { slot.cleanup?.(); slot.cleanup = effect() ?? undefined; });
    }
  }
  render<T>(component: () => T, attach?: (tree: T) => void): T {
    runtime.host = this; this.cursor = 0; this.dirty = false;
    const result = component();
    attach?.(result);
    while (this.effects.length) this.effects.shift()!();
    return result;
  }
  /** What React Strict Mode does on mount: every effect is cleaned up and run again. */
  strictReplay() {
    this.slots.forEach((slot) => { slot.cleanup?.(); slot.cleanup = undefined; });
    this.slots.forEach((slot) => { if (slot.run) slot.cleanup = slot.run() ?? undefined; });
  }
  unmount() { this.slots.forEach((slot) => { slot.cleanup?.(); slot.cleanup = undefined; }); }
}

const library = new Map<string, { durationMs: number; fail?: boolean; hang?: boolean }>();
const started: { src: string; at: number; rate: number; video: Media }[] = [];

class Media extends EventTarget {
  src = "";
  muted = false;
  defaultMuted = false;
  readyState = 0;
  paused = true;
  ended = false;
  seeking = false;
  duration = Number.NaN;
  private rate = 1;
  rates: number[] = [];
  /** A change of rate keeps the position and re-times the end, as a browser does. */
  get playbackRate() { return this.rate; }
  set playbackRate(value: number) {
    if (!this.paused && !this.stalled) { this.base = this.currentTime; this.since = Date.now(); }
    this.rate = value;
    this.rates.push(value);
    if (!this.paused && !this.stalled && this.endTimer !== undefined) this.scheduleEnd();
  }
  defaultPlaybackRate = 1;
  style: Record<string, string> = {};
  seeks: number[] = [];
  private base = 0;
  private since = 0;
  private stalled = false;
  private endTimer: ReturnType<typeof setTimeout> | undefined;
  private loadTimer: ReturnType<typeof setTimeout> | undefined;
  private waiting: { resolve: () => void; reject: (error: Error) => void }[] = [];
  private frames = new Map<number, () => void>();
  private frameId = 0;
  private classes = new Set<string>();
  classList = {
    add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    contains: (name: string) => this.classes.has(name),
  };
  get currentTime() {
    if (this.paused || this.stalled) return this.base;
    return Math.min(this.duration, this.base + (Date.now() - this.since) / 1000 * this.playbackRate);
  }
  set currentTime(value: number) {
    this.seeks.push(value);
    this.base = Math.min(value, Number.isFinite(this.duration) ? this.duration : value);
    this.since = Date.now();
    this.ended = false;
    if (!this.paused && !this.stalled) this.scheduleEnd();
  }
  load() {
    clearTimeout(this.loadTimer); clearTimeout(this.endTimer); this.endTimer = undefined;
    this.waiting.splice(0).forEach(({ reject }) => reject(new DOMException("Source changed", "AbortError")));
    Object.assign(this, { readyState: 0, ended: false, base: 0, paused: true, stalled: false, duration: Number.NaN, playbackRate: this.defaultPlaybackRate });
    const clip = library.get(this.src);
    if (!this.src) return;
    this.loadTimer = setTimeout(() => {
      if (!clip || clip.fail) {
        this.waiting.splice(0).forEach(({ reject }) => reject(new DOMException("Unsupported", "NotSupportedError")));
        this.dispatchEvent(new Event("error"));
        return;
      }
      if (clip.hang) return;
      this.duration = clip.durationMs / 1000;
      this.readyState = 4;
      this.dispatchEvent(new Event("loadeddata"));
      this.dispatchEvent(new Event("canplay"));
      this.waiting.splice(0).forEach(({ resolve }) => { this.begin(); resolve(); });
    }, 20);
  }
  play() {
    if (this.readyState >= 3) { this.begin(); return Promise.resolve(); }
    return new Promise<void>((resolve, reject) => this.waiting.push({ resolve, reject }));
  }
  pause() {
    if (!this.paused) this.base = this.currentTime;
    this.paused = true;
    clearTimeout(this.endTimer); this.endTimer = undefined;
    this.waiting.splice(0).forEach(({ reject }) => reject(new DOMException("Paused", "AbortError")));
  }
  private scheduleEnd() {
    clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => {
      this.base = this.duration; this.paused = true; this.ended = true; this.endTimer = undefined;
      this.dispatchEvent(new Event("ended"));
    }, (this.duration - this.base) * 1000 / this.playbackRate);
  }
  private begin() {
    if (!this.paused || this.ended) return;
    if (this.base === 0) started.push({ src: this.src, at: Date.now(), rate: this.playbackRate, video: this });
    this.paused = false;
    this.since = Date.now();
    if (!this.stalled) this.scheduleEnd();
    setTimeout(() => {
      for (const [id, callback] of this.frames) { this.frames.delete(id); callback(); }
      this.dispatchEvent(new Event("playing"));
    }, 0);
  }
  /** The network stops delivering: the clock freezes and the element reports waiting. */
  stall() {
    this.base = this.currentTime; this.stalled = true;
    clearTimeout(this.endTimer); this.endTimer = undefined;
    this.dispatchEvent(new Event("waiting"));
  }
  /** Data arrives again after a stall. */
  unstall() {
    this.stalled = false; this.since = Date.now();
    if (!this.paused) { this.scheduleEnd(); this.dispatchEvent(new Event("playing")); }
  }
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
  requestVideoFrameCallback(callback: () => void) { this.frames.set(++this.frameId, callback); return this.frameId; }
  cancelVideoFrameCallback(id: number) { this.frames.delete(id); }
  get shown() { return this.classes.has("is-shown"); }
}

/** The voice as the stage sees it: starts some milliseconds after it may, can be held, paused, stalled. */
class Voice implements AvatarSpeechClock {
  holds: boolean[] = [];
  startedAt: number | null = null;
  private held: boolean;
  private paused = false;
  private stalled = false;
  private done = false;
  private on = false;
  private base = 0;
  private since = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();
  constructor(public durationMs: number, { held = false, latencyMs = 30 } = {}) {
    this.held = held;
    this.latencyMs = latencyMs;
    this.apply();
  }
  private latencyMs: number;
  timeMs() { return this.on ? Math.min(this.durationMs, this.base + Date.now() - this.since) : this.base; }
  running() { return this.on && !this.done; }
  finished() { return this.done; }
  isHeld() { return this.held; }
  hold(held: boolean) { this.holds.push(held); this.held = held; this.apply(); }
  pause() { this.paused = true; this.apply(); }
  resume() { this.paused = false; this.apply(); }
  stall() { this.stalled = true; this.apply(); }
  unstall() { this.stalled = false; this.apply(); }
  /** The voice jumps ahead of the picture (for example after a hiccup in the audio clock). */
  skip(ms: number) { this.base = this.timeMs() + ms; this.since = Date.now(); this.schedule(); }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach((listener) => listener()); }
  private schedule() {
    clearTimeout(this.timer);
    if (this.on) this.timer = setTimeout(() => { this.base = this.durationMs; this.on = false; this.done = true; this.notify(); }, this.durationMs - this.base);
  }
  private apply() {
    const want = !this.held && !this.paused && !this.stalled && !this.done;
    clearTimeout(this.timer);
    if (want && !this.on) {
      this.timer = setTimeout(() => {
        this.on = true; this.since = Date.now(); this.startedAt ??= Date.now();
        this.schedule();
        this.notify();
      }, this.latencyMs);
    } else if (!want && this.on) {
      this.base = this.timeMs(); this.on = false;
      this.notify();
    } else this.schedule();
  }
}

const segment = (id: string, kind: PresenceSegment["kind"], durationMs: number): PresenceSegment =>
  ({ id, kind, durationMs, src: `/avatar/desk/${id}.mp4`, sourceId: "pexels-5941016" });
const manifest: PresenceManifest = {
  id: "desk", label: "Desk", poster: "/avatar/desk/poster.jpg", width: 1280, height: 720, fps: 25, restFrame: 406, crossfadeMs: 100,
  segments: [
    // Shorter idles than the published 24 s ones, so a test sees many joins.
    segment("idle-a", "listen", 6000), segment("idle-b", "listen", 6400), segment("idle-c", "listen", 5600),
    segment("talk-4s", "talk", 4160), segment("talk-6s", "talk", 5720), segment("talk-8s", "talk", 8160),
    segment("talk-10s", "talk", 9880), segment("talk-12s", "talk", 12280),
  ],
  speech: {
    clinic: {
      src: "/avatar/desk/speech/clinic.mp3", durationMs: 7340, transcript: "Start with the maternity clinic.", provider: "elevenlabs", voice: "Chris",
      video: "/avatar/desk/answers/clinic.mp4", videoDurationMs: 7720, lipSync: "musetalk",
    },
  },
  attribution: { creator: "A creator", sourceUrl: "https://www.pexels.com/video/5941016/", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", note: "Stock footage." },
};
const ANSWER = "/avatar/desk/answers/clinic.mp4";
const byId = new Map(manifest.segments.map((item) => [item.src, item]));
const kindOf = (src: string) => src === ANSWER ? "answer" : byId.get(src)!.kind;
const idOf = (src: string) => src === ANSWER ? "answer-clinic" : byId.get(src)!.id;

type StageProps = Parameters<typeof PresenceStage>[0];
const cleanups: (() => void)[] = [];
function stage(overrides: Partial<StageProps> = {}) {
  const host = new EffectHost();
  const videos = [new Media(), new Media()];
  let props: StageProps = { manifest, talking: null, paused: false, ...overrides };
  let tree: ReactNode = null;
  const attach = (node: ReactNode) => {
    tree = node;
    let videoIndex = 0;
    const walk = (item: ReactNode) => {
      if (Array.isArray(item)) { item.forEach(walk); return; }
      if (!item || typeof item !== "object" || !("type" in item) || !("props" in item)) return;
      const element = item as { type: unknown; props: { ref?: { current: unknown }; children?: ReactNode } };
      if (element.type === "video" && element.props.ref) element.props.ref.current = videos[videoIndex++];
      walk(element.props.children);
    };
    walk(node);
  };
  const render = (changes: Partial<StageProps> = {}) => {
    props = { ...props, ...changes };
    let count = 0;
    do {
      host.render(() => PresenceStage(props), attach);
      if (++count > 20) throw new Error("Controller did not settle");
    } while (host.dirty);
  };
  /** Let time pass, re-rendering whenever the controller published new state. */
  const advance = async (ms: number) => {
    for (let left = ms; left > 0; left -= 20) {
      await vi.advanceTimersByTimeAsync(Math.min(20, left));
      if (host.dirty) render();
    }
  };
  const stageProps = () => (tree as { props: { children: { props: Record<string, unknown> }[] } }).props.children[0].props;
  render();
  let mounted = true;
  const unmount = () => { if (mounted) { mounted = false; host.unmount(); } };
  cleanups.push(unmount);
  const visible = () => videos.find((video) => video.shown && !video.classList.contains("is-entering")) ?? videos.find((video) => video.shown);
  return { host, videos, render, advance, unmount, visible, state: () => stageProps()["data-state"], segment: () => stageProps()["data-segment"] };
}
/** Start a prepared clinic answer the way the conversation hook does: the voice waits for the picture. */
async function prepared(player: ReturnType<typeof stage>, options: { held?: boolean } = {}) {
  const voice = new Voice(7340, { held: options.held ?? true });
  player.render({ talking: { id: "voice-1", durationMs: 7340, scene: "clinic", clock: voice } });
  return voice;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  library.clear();
  for (const item of manifest.segments) library.set(item.src, { durationMs: item.durationMs });
  library.set(ANSWER, { durationMs: 7720 });
  started.length = 0;
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe("desk presence player: idle", () => {
  it("plays the idles in varied order, each to its end, and is never blank once it has started", async () => {
    const player = stage();
    await player.advance(300);
    expect(player.state()).toBe("listen");
    for (let t = 0; t < 60_000; t += 100) {
      await player.advance(100);
      expect(player.videos.some((video) => video.shown)).toBe(true);
    }
    const ids = started.map((entry) => idOf(entry.src));
    expect(ids.length).toBeGreaterThan(8);
    expect(started.every((entry) => kindOf(entry.src) === "listen")).toBe(true);
    ids.forEach((id, index) => { if (index) expect(id).not.toBe(ids[index - 1]); });
    expect(new Set(ids).size).toBe(3);
    // Each idle plays to its end: the next starts only a crossfade (and a small lead) before it ends.
    for (let index = 1; index < started.length; index++) {
      const previous = byId.get(started[index - 1].src)!;
      const gap = started[index].at - started[index - 1].at;
      expect(gap).toBeGreaterThan(previous.durationMs - manifest.crossfadeMs - 200);
      expect(gap).toBeLessThan(previous.durationMs);
      expect(started[index].video.style.transitionDuration).toBe(`${manifest.crossfadeMs}ms`);
    }
  });
});

describe("desk presence player: prepared answer", () => {
  it("plays the answer's own video once at rate 1, started when its voice starts, then returns to idle", async () => {
    const player = stage();
    await player.advance(1_000);
    const before = started.length;
    const voice = await prepared(player);
    await player.advance(200);
    const answer = started.slice(before).find((entry) => entry.src === ANSWER)!;
    expect(answer).toBeDefined();
    // The stage held the voice until its picture was ready, then let it go; the picture started with it.
    expect(voice.holds.at(-1)).toBe(false);
    expect(voice.startedAt).not.toBeNull();
    expect(answer.at).toBeGreaterThanOrEqual(voice.startedAt!);
    expect(answer.at - voice.startedAt!).toBeLessThanOrEqual(20);
    expect(answer.rate).toBe(1);
    expect(answer.video.style.transitionDuration).toBe(`${manifest.crossfadeMs}ms`);
    expect(player.state()).toBe("talk");
    expect(player.segment()).toBe("answer-clinic");
    // Picture and voice stay together.
    for (let t = 0; t < 6_000; t += 500) {
      await player.advance(500);
      expect(Math.abs(answer.video.currentTime * 1000 - voice.timeMs())).toBeLessThanOrEqual(SYNC_TOLERANCE_MS);
    }
    // The voice ends; the hook clears talking. The video plays its own settle to the end, then idles.
    while (!voice.finished()) await player.advance(20);
    player.render({ talking: null });
    await player.advance(1_000);
    const after = started.slice(started.indexOf(answer) + 1);
    expect(after.length).toBeGreaterThan(0);
    expect(kindOf(after[0].src)).toBe("listen");
    expect(after[0].at - answer.at).toBeGreaterThan(7720 - manifest.crossfadeMs - 200);
    expect(after[0].video.style.transitionDuration).toBe(`${manifest.crossfadeMs}ms`);
    expect(started.some((entry) => kindOf(entry.src) === "talk")).toBe(false);
    expect(started.filter((entry) => entry.src === ANSWER)).toHaveLength(1);
    expect(player.state()).toBe("listen");
  });

  it("makes the voice wait for a frozen picture, follows a stalled voice and corrects drift", async () => {
    const player = stage();
    await player.advance(1_000);
    const voice = await prepared(player);
    await player.advance(1_500);
    const video = started.find((entry) => entry.src === ANSWER)!.video;
    // The picture freezes: within a moment the voice is held, and stays held while the picture is stuck.
    video.stall();
    await player.advance(300);
    expect(voice.isHeld()).toBe(true);
    const heldAt = voice.timeMs();
    await player.advance(800);
    expect(voice.timeMs()).toBe(heldAt);
    expect(heldAt - video.currentTime * 1000).toBeLessThanOrEqual(400);
    video.unstall();
    await player.advance(300);
    expect(voice.isHeld()).toBe(false);
    await player.advance(300);
    expect(Math.abs(video.currentTime * 1000 - voice.timeMs())).toBeLessThanOrEqual(SYNC_TOLERANCE_MS);
    // The voice buffers: the picture pauses with it, and resumes with it.
    voice.stall();
    await player.advance(200);
    expect(video.paused).toBe(true);
    voice.unstall();
    await player.advance(200);
    expect(video.paused).toBe(false);
    expect(Math.abs(video.currentTime * 1000 - voice.timeMs())).toBeLessThanOrEqual(SYNC_TOLERANCE_MS);
    // The voice runs far ahead: the picture is moved to it.
    voice.skip(400);
    await player.advance(300);
    expect(video.seeks.length).toBeGreaterThan(0);
    expect(Math.abs(video.currentTime * 1000 - voice.timeMs())).toBeLessThanOrEqual(SYNC_TOLERANCE_MS);
  });

  it("closes a small drift by playing the picture a little faster, without a seek, and does not hold the voice for its own seek", async () => {
    const player = stage();
    await player.advance(1_000);
    const voice = await prepared(player);
    await player.advance(1_000);
    const video = started.find((entry) => entry.src === ANSWER)!.video;
    const seeks = video.seeks.length;
    voice.skip(150);
    await player.advance(200);
    expect(video.playbackRate).toBeGreaterThan(1);
    expect(video.playbackRate).toBeLessThanOrEqual(1.1);
    await player.advance(2_000);
    expect(video.seeks.length).toBe(seeks);
    expect(Math.abs(video.currentTime * 1000 - voice.timeMs())).toBeLessThanOrEqual(SYNC_TOLERANCE_MS / 2);
    expect(video.playbackRate).toBe(1);
    // A larger jump is a seek; while that seek decodes the picture stands still, and the voice goes on.
    voice.skip(500);
    await player.advance(120);
    expect(video.seeks.length).toBe(seeks + 1);
    video.seeking = true;
    video.stall();
    await player.advance(400);
    expect(voice.isHeld()).toBe(false);
    video.seeking = false;
    video.unstall();
    await player.advance(2_000);
    expect(Math.abs(video.currentTime * 1000 - voice.timeMs())).toBeLessThanOrEqual(SYNC_TOLERANCE_MS);
    expect(voice.isHeld()).toBe(false);
  });

  it("pauses picture and voice together and resumes them in step", async () => {
    const player = stage();
    await player.advance(1_000);
    const voice = await prepared(player);
    await player.advance(2_000);
    const video = started.find((entry) => entry.src === ANSWER)!.video;
    // The demo pauses both: the stage through `paused`, the voice through the hook.
    voice.pause();
    player.render({ paused: true });
    expect(player.videos.every((item) => item.paused)).toBe(true);
    const at = video.currentTime;
    await player.advance(5_000);
    expect(video.currentTime).toBe(at);
    expect(started.filter((entry) => entry.src === ANSWER)).toHaveLength(1);
    player.render({ paused: false });
    voice.resume();
    await player.advance(300);
    expect(video.paused).toBe(false);
    expect(Math.abs(video.currentTime * 1000 - voice.timeMs())).toBeLessThanOrEqual(SYNC_TOLERANCE_MS);
  });

  it("dissolves into idle and lets the voice go when the answer is stopped mid-gesture", async () => {
    const player = stage();
    await player.advance(1_000);
    const voice = await prepared(player);
    await player.advance(2_000);
    const count = started.length;
    player.render({ talking: null });
    await player.advance(200);
    const next = started[count];
    expect(kindOf(next.src)).toBe("listen");
    expect(next.video.style.transitionDuration).toBe(`${INTERRUPT_FADE_MS}ms`);
    expect(voice.isHeld()).toBe(false);
    await player.advance(INTERRUPT_FADE_MS);
    expect(player.state()).toBe("listen");
    expect(player.videos.filter((video) => video.shown)).toHaveLength(1);
  });

  it("covers the voice with generic talk when the answer video cannot play, and never keeps the voice waiting", async () => {
    library.set(ANSWER, { durationMs: 7720, fail: true });
    const player = stage();
    await player.advance(1_000);
    const voice = await prepared(player);
    await player.advance(300);
    expect(voice.isHeld()).toBe(false);
    expect(voice.running()).toBe(true);
    const talks = started.filter((entry) => kindOf(entry.src) === "talk");
    expect(talks.length).toBeGreaterThan(0);
    expect(player.state()).toBe("talk");
    talks.forEach((entry) => { expect(entry.rate).toBeGreaterThanOrEqual(0.92); expect(entry.rate).toBeLessThanOrEqual(1.08); });
  });

  it("gives up on an answer video that stalls for good, and talks on with the voice", async () => {
    const player = stage();
    await player.advance(1_000);
    const voice = await prepared(player);
    await player.advance(1_000);
    started.find((entry) => entry.src === ANSWER)!.video.stall();
    await player.advance(STALL_MS + 600);
    expect(voice.isHeld()).toBe(false);
    expect(voice.running()).toBe(true);
    expect(started.some((entry) => kindOf(entry.src) === "talk")).toBe(true);
    expect(player.segment()).not.toBe("answer-clinic");
  });
});

describe("desk presence player: live answer", () => {
  it("covers the voice with generic talk takes inside the rate bounds, then returns to idle", async () => {
    const player = stage();
    await player.advance(1_000);
    const before = started.length;
    const voice = new Voice(15_000);
    player.render({ talking: { id: "voice-1", durationMs: 15_000, clock: voice } });
    await player.advance(200);
    const first = started[before];
    expect(kindOf(first.src)).toBe("talk");
    expect(first.at - Date.now()).toBeGreaterThan(-200);
    while (!voice.finished()) await player.advance(20);
    player.render({ talking: null });
    await player.advance(3_000);
    const talks = started.slice(before).filter((entry) => kindOf(entry.src) === "talk");
    talks.forEach((entry) => { expect(entry.rate).toBeGreaterThanOrEqual(0.92); expect(entry.rate).toBeLessThanOrEqual(1.08); });
    talks.forEach((entry, index) => { if (index) expect(idOf(entry.src)).not.toBe(idOf(talks[index - 1].src)); });
    const back = started.slice(before).find((entry) => kindOf(entry.src) === "listen")!;
    expect(back).toBeDefined();
    // The talk lasts as long as the voice (planned to within 150 ms; the last take ends at rest).
    expect(back.at - first.at).toBeGreaterThan(15_000 - 400);
    expect(back.at - first.at).toBeLessThan(15_000 + 300);
    expect(back.video.style.transitionDuration).toBe(`${manifest.crossfadeMs}ms`);
    expect(player.state()).toBe("listen");
  });

  it("lets a take finish its settle when the voice ends within 1.5 s of its end", async () => {
    const player = stage();
    await player.advance(1_000);
    const before = started.length;
    // 8 s of voice is one 8 s take; the voice stops 1 s early.
    player.render({ talking: { id: "voice-1", durationMs: 8_000 } });
    await player.advance(200);
    const take = started[before];
    expect(idOf(take.src)).toBe("talk-8s");
    const length = 8160 / take.rate;
    await player.advance(length - 200 - 1_000);
    player.render({ talking: null });
    await player.advance(1_500);
    const back = started[before + 1];
    expect(kindOf(back.src)).toBe("listen");
    expect(back.video.style.transitionDuration).toBe(`${manifest.crossfadeMs}ms`);
    expect(back.at - take.at).toBeGreaterThan(length - SETTLE_WINDOW_MS);
  });

  it("replaces a talk cut off mid-gesture by a new voice with a dissolve", async () => {
    const player = stage();
    await player.advance(500);
    player.render({ talking: { id: "voice-1", durationMs: 20_000 } });
    await player.advance(2_000);
    const count = started.length;
    player.render({ talking: { id: "voice-2", durationMs: 4_000 } });
    await player.advance(200);
    expect(kindOf(started[count].src)).toBe("talk");
    expect(started[count].video.style.transitionDuration).toBe(`${INTERRUPT_FADE_MS}ms`);
    await player.advance(4_600);
    expect(started.slice(count).some((entry) => kindOf(entry.src) === "listen")).toBe(true);
  });

  it("lets a running crossfade finish before it starts talking", async () => {
    const player = stage();
    await player.advance(1_000);
    const count = started.length;
    while (started.length === count) await player.advance(20);
    await player.advance(40);
    const entering = started[count].video;
    expect(entering.classList.contains("is-entering")).toBe(true);
    player.render({ talking: { id: "voice-1", durationMs: 8_000 } });
    await player.advance(20);
    // Not cut short: cutting the fade would show the incoming video jump to full opacity.
    expect(entering.classList.contains("is-entering")).toBe(true);
    expect(started.slice(count + 1)).toHaveLength(0);
    await player.advance(300);
    expect(kindOf(started[count + 1].src)).toBe("talk");
  });
});

describe("desk presence player: pause, failure and lifetime", () => {
  it("pauses both videos and resumes the chain cleanly", async () => {
    const player = stage();
    await player.advance(1_000);
    player.render({ paused: true });
    expect(player.videos.every((video) => video.paused)).toBe(true);
    const count = started.length;
    await player.advance(10_000);
    expect(started.length).toBe(count);
    expect(player.videos.some((video) => video.shown)).toBe(true);
    player.render({ paused: false });
    await player.advance(100);
    expect(player.videos.some((video) => video.shown && !video.paused)).toBe(true);
    await player.advance(8_000);
    expect(started.length).toBeGreaterThan(count);
  });

  it("pauses while the document is hidden", async () => {
    const player = stage();
    await player.advance(1_000);
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(player.videos.every((video) => video.paused)).toBe(true);
    Object.assign(document, { hidden: false });
    document.dispatchEvent(new Event("visibilitychange"));
    await player.advance(100);
    expect(player.videos.some((video) => !video.paused)).toBe(true);
  });

  it("skips an idle that fails to load, or stalls, and never shows it", async () => {
    library.set("/avatar/desk/idle-b.mp4", { durationMs: 6400, fail: true });
    library.set("/avatar/desk/idle-c.mp4", { durationMs: 5600, hang: true });
    const player = stage();
    // Until a first video plays, the poster underneath stands in; after that a frame is always shown.
    await player.advance(STALL_MS + 1_000);
    for (let t = 0; t < 20_000; t += 100) {
      await player.advance(100);
      expect(player.videos.some((video) => video.shown)).toBe(true);
    }
    expect(started.length).toBeGreaterThan(2);
    expect(started.every((entry) => idOf(entry.src) === "idle-a")).toBe(true);
  });

  it("moves on when the visible idle stalls", async () => {
    const player = stage();
    await player.advance(300);
    const visible = player.videos.find((video) => video.shown)!;
    const stuck = idOf(visible.src);
    visible.stall();
    await player.advance(STALL_MS + 500);
    expect(player.segment()).not.toBe(stuck);
    expect(player.videos.some((video) => video.shown && !video.paused)).toBe(true);
  });

  it("falls back to the poster only when nothing can play, and then never keeps a voice waiting", async () => {
    for (const src of library.keys()) library.set(src, { durationMs: 5000, fail: true });
    const player = stage();
    await player.advance(2_000);
    expect(player.state()).toBe("poster");
    expect(player.videos.every((video) => !video.shown && video.paused)).toBe(true);
    const voice = await prepared(player);
    await player.advance(100);
    expect(voice.isHeld()).toBe(false);
    expect(voice.running()).toBe(true);
  });

  it("shows the still poster without motion when reduced motion is preferred, and lets the voice play", async () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    const player = stage();
    await player.advance(1_000);
    const voice = await prepared(player);
    await player.advance(4_000);
    expect(started).toHaveLength(0);
    expect(player.state()).toBe("still");
    expect(voice.running()).toBe(true);
  });

  it("survives a Strict Mode effect replay with a single chain", async () => {
    const player = stage();
    player.host.strictReplay();
    await player.advance(20_000);
    const ids = started.map((entry) => idOf(entry.src));
    ids.forEach((id, index) => { if (index) expect(id).not.toBe(ids[index - 1]); });
    for (let index = 1; index < started.length; index++) expect(started[index].at - started[index - 1].at).toBeGreaterThan(1_000);
    expect(player.videos.filter((video) => video.shown && !video.paused)).toHaveLength(1);
  });

  it("stops, releases both videos and the voice, and schedules nothing after unmount", async () => {
    const player = stage();
    await player.advance(1_000);
    const voice = new Voice(7340, { held: true });
    // The voice is announced while the stage is busy fading, then the stage goes away.
    player.render({ talking: { id: "voice-1", durationMs: 7340, scene: "clinic", clock: voice } });
    player.unmount();
    expect(player.videos.every((video) => video.paused && video.src === "")).toBe(true);
    expect(voice.isHeld()).toBe(false);
    const count = started.length;
    await player.advance(10_000);
    expect(started.length).toBe(count);
  });
});
