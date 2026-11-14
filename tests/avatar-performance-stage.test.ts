import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { PerformanceManifest, PerformanceSpeechEvent } from "../src/lib/avatar/performance";

// A deterministic effect host for the actual controller, not a React DOM renderer.
// Browser checks separately cover decoded-frame presentation and autoplay policy.
// Keeping media events under our control reproduces races that normal local files
// rarely expose: an outgoing error during preload and a stalled resume.
const runtime = vi.hoisted(() => ({ host: null as unknown as EffectHost }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (value: unknown) => runtime.host.ref(value),
  useState: (value: unknown) => runtime.host.state(value),
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => runtime.host.effect(effect, deps),
  useCallback: (callback: unknown, deps: unknown[]) => runtime.host.memo(callback, deps),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

import { PerformanceStage } from "../src/components/avatar/performance-stage";
import { usePerformanceSpeech } from "../src/components/avatar/use-performance-speech";

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
  memo(value: unknown, deps: unknown[]) {
    const slot = this.slot();
    if (!slot.deps || deps.some((item, index) => !Object.is(item, slot.deps![index]))) {
      slot.deps = deps; slot.value = value;
    }
    return slot.value;
  }
  effect(effect: () => void | (() => void), deps: unknown[]) {
    const slot = this.slot();
    if (!slot.deps || deps.some((item, index) => !Object.is(item, slot.deps![index]))) {
      slot.deps = deps;
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
  unmount() { this.slots.forEach((slot) => slot.cleanup?.()); }
}

class Media extends EventTarget {
  currentTime = 0;
  readyState = 0;
  ended = false;
  paused = true;
  muted = true;
  src = "";
  private frames = new Map<number, () => void>();
  private frameId = 0;
  private waiting: { resolve: () => void; reject: (error: Error) => void }[] = [];
  private classes = new Set<string>();
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
  };
  pause() { this.paused = true; }
  play() {
    this.paused = false;
    if (this.readyState >= 3) return Promise.resolve();
    return new Promise<void>((resolve, reject) => this.waiting.push({ resolve, reject }));
  }
  load() {
    this.waiting.splice(0).forEach(({ reject }) => reject(new DOMException("Source changed", "AbortError")));
    this.readyState = 0; this.ended = false; this.currentTime = 0;
  }
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
  requestVideoFrameCallback(callback: () => void) { this.frames.set(++this.frameId, callback); return this.frameId; }
  cancelVideoFrameCallback(id: number) { this.frames.delete(id); }
  ready() {
    this.readyState = 4;
    this.dispatchEvent(new Event("canplay"));
    this.waiting.splice(0).forEach(({ resolve }) => resolve());
    for (const [id, callback] of this.frames) { this.frames.delete(id); callback(); }
    this.dispatchEvent(new Event("playing"));
  }
  stall() { this.readyState = 2; this.dispatchEvent(new Event("waiting")); }
  finish() { this.ended = true; this.paused = true; this.dispatchEvent(new Event("ended")); }
}

const cleanups: (() => void)[] = [];
const emptyManifest: PerformanceManifest = { id: "test", label: "Test", poster: "/poster.jpg", width: 100, height: 100, takes: [] };
type StageProps = Parameters<typeof PerformanceStage>[0];
function stage(overrides: Partial<StageProps> = {}) {
  const host = new EffectHost();
  const videos = [new Media(), new Media()];
  const events: PerformanceSpeechEvent[] = [];
  let props: StageProps = {
    manifest: emptyManifest, intent: "presence", speech: null, paused: false, muted: false,
    onSpeechEvent: (event) => events.push(event), ...overrides,
  };
  const attach = (tree: ReactNode) => {
    let videoIndex = 0;
    const walk = (node: ReactNode) => {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (!node || typeof node !== "object" || !("type" in node) || !("props" in node)) return;
      const element = node as { type: unknown; props: { ref?: { current: unknown }; children?: ReactNode } };
      if (element.type === "video" && element.props.ref) element.props.ref.current = videos[videoIndex++];
      walk(element.props.children);
    };
    walk(tree);
  };
  const render = (changes: Partial<StageProps> = {}) => {
    props = { ...props, ...changes };
    let count = 0;
    do {
      host.render(() => PerformanceStage(props), attach);
      if (++count > 20) throw new Error("Controller did not settle");
    } while (host.dirty);
  };
  render();
  cleanups.push(() => host.unmount());
  return { videos, events, render };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  vi.stubGlobal("HTMLMediaElement", { HAVE_FUTURE_DATA: 3 });
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe("performance media controller races", () => {
  it("settles incoming speech even if the outgoing ambient shot fails during preload", async () => {
    const player = stage({ manifest: { ...emptyManifest, takes: [{ id: "quiet", src: "/quiet.mp4", kind: "presence", sourceId: "take", sourceInMs: 0, sourceOutMs: 5000 }] } });
    player.videos[0].ready();
    await Promise.resolve();
    player.render({ speech: { id: "answer", src: "/answer.mp4" } });
    player.videos[0].dispatchEvent(new Event("error"));
    player.videos[1].ready();
    await Promise.resolve();
    player.videos[1].finish();
    expect(player.events).toContainEqual({ id: "answer", type: "ended" });
    expect(player.videos[0].muted).toBe(true);
  });

  it("restores the stall timeout when a paused active speech resumes without data", async () => {
    const player = stage({ speech: { id: "answer", src: "/answer.mp4" } });
    player.videos[0].ready();
    await Promise.resolve();
    player.videos[0].stall();
    player.render({ paused: true });
    await vi.advanceTimersByTimeAsync(16_000);
    expect(player.events.some((event) => event.type === "error")).toBe(false);
    player.render({ paused: false });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(player.events).toContainEqual(expect.objectContaining({ id: "answer", type: "error" }));
  });

  it("stops and mutes an interrupted performance, and ignores its late end event", async () => {
    const player = stage({ speech: { id: "first", src: "/first.mp4" } });
    player.videos[0].ready();
    await Promise.resolve();
    player.render({ speech: { id: "second", src: "/second.mp4" } });
    expect(player.videos[0].paused).toBe(true);
    expect(player.videos[0].muted).toBe(true);
    player.videos[0].finish();
    player.videos[1].ready();
    await Promise.resolve();
    player.videos[1].finish();
    expect(player.events).toContainEqual({ id: "second", type: "ended" });
    expect(player.events).not.toContainEqual({ id: "first", type: "ended" });
    player.render({ speech: null });
    expect(player.videos.every((video) => !video.classList.contains("avatar-visible"))).toBe(true);
  });

  it("does not revive a stopped request when its first frame arrives late", async () => {
    const player = stage({ speech: { id: "cancelled", src: "/slow.mp4" } });
    player.render({ speech: null });
    player.videos[0].ready();
    await Promise.resolve();
    expect(player.videos[0].paused).toBe(true);
    expect(player.videos[0].muted).toBe(true);
    expect(player.events).not.toContainEqual({ id: "cancelled", type: "playing" });
  });
});

describe("performance promise ownership", () => {
  it("settles stopped/replaced requests and ignores stale events for a new request", async () => {
    const host = new EffectHost();
    let speech = host.render(usePerformanceSpeech);
    cleanups.push(() => host.unmount());
    const onSpeech = vi.fn();
    const firstSignal = new AbortController();
    const first = speech.play("/first.mp4", { signal: firstSignal.signal, onSpeech }).catch((error: Error) => error);
    speech = host.render(usePerformanceSpeech);
    const firstId = speech.request!.id;
    firstSignal.abort();
    expect(await first).toMatchObject({ name: "AbortError" });
    speech = host.render(usePerformanceSpeech);
    expect(speech.request).toBeNull();

    const second = speech.play("/second.mp4", { signal: new AbortController().signal, onSpeech }).catch((error: Error) => error);
    speech = host.render(usePerformanceSpeech);
    const secondId = speech.request!.id;
    const third = speech.play("/third.mp4", { signal: new AbortController().signal, onSpeech });
    expect(await second).toMatchObject({ name: "AbortError" });
    speech = host.render(usePerformanceSpeech);
    const thirdId = speech.request!.id;
    speech.onEvent({ id: firstId, type: "ended" });
    speech.onEvent({ id: secondId, type: "error", message: "late failure" });
    speech = host.render(usePerformanceSpeech);
    expect(speech.request?.id).toBe(thirdId);
    speech.onEvent({ id: thirdId, type: "ended" });
    await expect(third).resolves.toBeUndefined();
    speech = host.render(usePerformanceSpeech);
    expect(speech.request).toBeNull();

    const unmounted = speech.play("/last.mp4", { signal: new AbortController().signal, onSpeech }).catch((error: Error) => error);
    host.unmount();
    await expect(unmounted).resolves.toMatchObject({ name: "AbortError" });
  });
});
