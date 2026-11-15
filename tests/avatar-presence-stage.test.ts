import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { PresenceManifest, PresenceSegment } from "../src/lib/avatar/presence";

// A deterministic effect host for the real controller, not a React DOM renderer. Media elements are
// fakes driven by the fake clock, so loading, playback, ends, stalls and errors happen when the test
// says. Browser checks separately cover decoded-frame presentation and the visual crossfade.
const runtime = vi.hoisted(() => ({ host: null as unknown as EffectHost }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (value: unknown) => runtime.host.ref(value),
  useState: (value: unknown) => runtime.host.state(value),
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => runtime.host.effect(effect, deps),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

import { EARLY_FADE_MS, PresenceStage, STALL_MS } from "../src/components/avatar/presence-stage";

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
  duration = Number.NaN;
  playbackRate = 1;
  defaultPlaybackRate = 1;
  style: Record<string, string> = {};
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
  private begin() {
    if (!this.paused || this.ended) return;
    if (this.base === 0) started.push({ src: this.src, at: Date.now(), rate: this.playbackRate, video: this });
    this.paused = false;
    this.since = Date.now();
    this.endTimer = setTimeout(() => {
      this.base = this.duration; this.paused = true; this.ended = true; this.endTimer = undefined;
      this.dispatchEvent(new Event("ended"));
    }, (this.duration - this.base) * 1000 / this.playbackRate);
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
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
  requestVideoFrameCallback(callback: () => void) { this.frames.set(++this.frameId, callback); return this.frameId; }
  cancelVideoFrameCallback(id: number) { this.frames.delete(id); }
  get shown() { return this.classes.has("is-shown"); }
}

const segment = (id: string, kind: PresenceSegment["kind"], durationMs: number): PresenceSegment =>
  ({ id, kind, durationMs, src: `/avatar/desk/${id}.mp4`, sourceId: "pexels-5941016", sourceInMs: 0, sourceOutMs: durationMs, speed: 1 });
const manifest: PresenceManifest = {
  id: "desk", label: "Desk", poster: "/avatar/desk/poster.jpg", width: 1280, height: 720, fps: 25, crossfadeMs: 240,
  segments: [
    segment("listen-a", "listen", 2480), segment("listen-b", "listen", 3120), segment("listen-c", "listen", 1800),
    segment("talk-a", "talk", 3280), segment("talk-b", "talk", 7400),
  ],
  speech: {},
  attribution: { creator: "A creator", sourceUrl: "https://www.pexels.com/video/5941016/", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", note: "Stock footage." },
};
const kindOf = (src: string) => manifest.segments.find((item) => item.src === src)!.kind;
const idOf = (src: string) => manifest.segments.find((item) => item.src === src)!.id;

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
  return { host, videos, render, advance, unmount, state: () => stageProps()["data-state"], segment: () => stageProps()["data-segment"] };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  library.clear();
  for (const item of manifest.segments) library.set(item.src, { durationMs: item.durationMs });
  started.length = 0;
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe("desk presence player", () => {
  it("chains listen segments without immediate repeats and is never blank once it has started", async () => {
    const player = stage();
    await player.advance(300);
    expect(player.state()).toBe("listen");
    for (let t = 0; t < 30_000; t += 100) {
      await player.advance(100);
      expect(player.videos.some((video) => video.shown)).toBe(true);
    }
    const ids = started.map((entry) => idOf(entry.src));
    expect(ids.length).toBeGreaterThan(10);
    expect(started.every((entry) => kindOf(entry.src) === "listen")).toBe(true);
    ids.forEach((id, index) => { if (index) expect(id).not.toBe(ids[index - 1]); });
    expect(new Set(ids).size).toBe(3);
    // Each join starts the next segment about a crossfade before the current one ends.
    for (let index = 1; index < started.length; index++) {
      const previous = manifest.segments.find((item) => item.src === started[index - 1].src)!;
      const gap = started[index].at - started[index - 1].at;
      expect(gap).toBeGreaterThan(previous.durationMs - 240 - 200);
      expect(gap).toBeLessThan(previous.durationMs);
    }
  });

  it("talks for the length of the voice at a planned rate, then returns to listening", async () => {
    const player = stage();
    await player.advance(1000);
    const before = started.length;
    player.render({ talking: { id: "voice-1", durationMs: 10_000 } });
    await player.advance(200);
    const first = started[before];
    expect(kindOf(first.src)).toBe("talk");
    expect(first.at - Date.now()).toBeGreaterThan(-200);
    await player.advance(9_900);
    const talks = started.slice(before).filter((entry) => kindOf(entry.src) === "talk");
    talks.forEach((entry) => { expect(entry.rate).toBeGreaterThanOrEqual(0.9); expect(entry.rate).toBeLessThanOrEqual(1.1); });
    const back = started.slice(before).find((entry) => kindOf(entry.src) === "listen")!;
    expect(back).toBeDefined();
    // The last talk segment ends with the voice: the listen fade starts a crossfade before 10 s.
    expect(back.at - first.at).toBeGreaterThan(10_000 - 240 - 400);
    expect(back.at - first.at).toBeLessThan(10_000 + 200);
    player.render({ talking: null });
    await player.advance(5_000);
    expect(started.slice(started.indexOf(back)).every((entry) => kindOf(entry.src) === "listen")).toBe(true);
    expect(player.state()).toBe("listen");
  });

  it("cuts a talk short with a longer fade when the voice is stopped", async () => {
    const player = stage();
    await player.advance(500);
    player.render({ talking: { id: "voice-1", durationMs: 20_000 } });
    await player.advance(1_500);
    expect(player.state()).toBe("talk");
    const count = started.length;
    player.render({ talking: null });
    await player.advance(200);
    const next = started[count];
    expect(kindOf(next.src)).toBe("listen");
    expect(next.video.style.transitionDuration).toBe(`${EARLY_FADE_MS}ms`);
    await player.advance(EARLY_FADE_MS);
    expect(player.state()).toBe("listen");
    expect(player.videos.filter((video) => video.shown)).toHaveLength(1);
  });

  it("replans from now when a new voice starts while one is talking", async () => {
    const player = stage();
    await player.advance(500);
    player.render({ talking: { id: "voice-1", durationMs: 20_000 } });
    await player.advance(2_000);
    const count = started.length;
    player.render({ talking: { id: "voice-2", durationMs: 4_000 } });
    await player.advance(200);
    expect(kindOf(started[count].src)).toBe("talk");
    expect(started[count].video.style.transitionDuration).toBe(`${EARLY_FADE_MS}ms`);
    await player.advance(4_200);
    expect(started.slice(count).some((entry) => kindOf(entry.src) === "listen")).toBe(true);
  });

  it("lets a running crossfade finish before it starts talking", async () => {
    const player = stage();
    await player.advance(1_000);
    const count = started.length;
    while (started.length === count) await player.advance(20);
    await player.advance(60);
    const entering = started[count].video;
    expect(entering.classList.contains("is-entering")).toBe(true);
    player.render({ talking: { id: "voice-1", durationMs: 8_000 } });
    await player.advance(40);
    // Not cut short: cutting the fade would show the incoming segment jump to full opacity.
    expect(entering.classList.contains("is-entering")).toBe(true);
    expect(started.slice(count + 1)).toHaveLength(0);
    await player.advance(400);
    expect(kindOf(started[count + 1].src)).toBe("talk");
  });

  it("returns from talk to a listen segment on the hub the talk ended on", async () => {
    const hubs: Record<string, [number, number]> = { "listen-a": [1, 1], "listen-b": [2, 2], "listen-c": [1, 1], "talk-a": [1, 2], "talk-b": [2, 1] };
    const hubbed = { ...manifest, segments: manifest.segments.map((item) => ({ ...item, startHub: hubs[item.id][0], endHub: hubs[item.id][1] })) };
    // A random source of 0 makes idle leave its hub whenever it can.
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const player = stage({ manifest: hubbed });
      await player.advance(1_000);
      const before = started.length;
      player.render({ talking: { id: "voice-1", durationMs: 7_000 } });
      await player.advance(9_000);
      const after = started.slice(before);
      const back = after.findIndex((entry) => kindOf(entry.src) === "listen");
      expect(back).toBeGreaterThan(0);
      const bySrc = (src: string) => hubbed.segments.find((item) => item.src === src)!;
      expect(bySrc(after[back].src).startHub).toBe(bySrc(after[back - 1].src).endHub);
    } finally { random.mockRestore(); }
  });

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

  it("skips a segment that fails to load, or stalls, and never shows it", async () => {
    library.set("/avatar/desk/listen-b.mp4", { durationMs: 3120, fail: true });
    library.set("/avatar/desk/listen-c.mp4", { durationMs: 1800, hang: true });
    const player = stage();
    // Until a first segment plays, the poster underneath stands in; after that a frame is always shown.
    await player.advance(STALL_MS + 1_000);
    for (let t = 0; t < 20_000; t += 100) {
      await player.advance(100);
      expect(player.videos.some((video) => video.shown)).toBe(true);
    }
    expect(started.length).toBeGreaterThan(3);
    expect(started.every((entry) => idOf(entry.src) === "listen-a")).toBe(true);
  });

  it("moves on when the visible segment stalls", async () => {
    const player = stage();
    await player.advance(300);
    const visible = player.videos.find((video) => video.shown)!;
    const stuck = idOf(visible.src);
    visible.stall();
    await player.advance(STALL_MS + 500);
    expect(player.segment()).not.toBe(stuck);
    expect(player.videos.some((video) => video.shown && !video.paused)).toBe(true);
  });

  it("falls back to the poster only when nothing can play", async () => {
    for (const item of manifest.segments) library.set(item.src, { durationMs: item.durationMs, fail: true });
    const player = stage();
    await player.advance(2_000);
    expect(player.state()).toBe("poster");
    expect(player.videos.every((video) => !video.shown && video.paused)).toBe(true);
  });

  it("shows the still poster without motion when reduced motion is preferred", async () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    const player = stage();
    await player.advance(5_000);
    expect(started).toHaveLength(0);
    expect(player.state()).toBe("still");
  });

  it("survives a Strict Mode effect replay with a single chain", async () => {
    const player = stage();
    player.host.strictReplay();
    await player.advance(12_000);
    const ids = started.map((entry) => idOf(entry.src));
    ids.forEach((id, index) => { if (index) expect(id).not.toBe(ids[index - 1]); });
    for (let index = 1; index < started.length; index++) expect(started[index].at - started[index - 1].at).toBeGreaterThan(1_000);
    expect(player.videos.filter((video) => video.shown && !video.paused)).toHaveLength(1);
  });

  it("stops, releases both videos and schedules nothing after unmount", async () => {
    const player = stage();
    await player.advance(1_000);
    player.unmount();
    expect(player.videos.every((video) => video.paused && video.src === "")).toBe(true);
    const count = started.length;
    await player.advance(10_000);
    expect(started.length).toBe(count);
  });
});
