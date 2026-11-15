"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { nextListen, planTalk, type PresenceManifest, type PresenceSegment } from "@/lib/avatar/presence";

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (listener: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};

/** A talk cut short may leave the hands raised, so its way back to a listen segment fades for longer. */
export const EARLY_FADE_MS = 380;
/** The incoming video starts this long before its fade is due, so a decoded frame is ready on time. */
const LEAD_MS = 60;
/** A segment that cannot load, or keeps waiting for data, this long is skipped. */
export const STALL_MS = 3000;
/** Without a frame callback, a playing video with current data is revealed after this grace. */
const REVEAL_GRACE_MS = 250;
/** When talking stops this close to the end of a talk segment, its own ending returns to the hub. */
const NATURAL_END_MS = 600;
/** A plan that ends this much before the audio is extended with more talk. */
const EXTEND_MS = 1000;

export type PresenceTalking = { id: string; durationMs: number } | null;
type Props = { manifest: PresenceManifest; talking: PresenceTalking; paused: boolean };
type Snapshot = { segment: string | null; kind: PresenceSegment["kind"] | null; failed: boolean };
type Incoming = {
  index: number; segment: PresenceSegment; rate: number; fadeMs: number; token: number;
  ready: boolean; due: boolean; started: boolean;
};

/**
 * The filmed desk presence. Two stacked, muted videos: the visible segment plays while the next one
 * loads in the hidden element; the next starts crossfadeMs before the visible one ends and fades in on
 * top. Listen segments chain for as long as nobody speaks; while `talking` is set, a plan of talk
 * segments sized to the audio plays, then the chain returns to listening.
 */
export function PresenceStage({ manifest, talking, paused }: Props) {
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => true);
  const wanted = useRef({ talking, paused, reduced });
  const control = useRef<{ sync: () => void } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({ segment: null, kind: null, failed: false });

  useEffect(() => {
    wanted.current = { talking, paused, reduced };
    control.current?.sync();
  }, [talking, paused, reduced]);

  useEffect(() => {
    const videos = [first.current!, second.current!];
    const segments = manifest.segments;
    const byId = new Map(segments.map((segment) => [segment.id, segment]));
    const crossfade = manifest.crossfadeMs;
    const failed = new Set<string>();
    let disposed = false;
    let token = 0;
    let shown: { index: number; segment: PresenceSegment; rate: number } | null = null;
    let incoming: Incoming | null = null;
    let fading: { from: number | null; to: number; timer: ReturnType<typeof setTimeout> } | null = null;
    let mode: "listen" | "talk" = "listen";
    let talkId: string | null = null;
    let queue: string[] = [];
    let queueRate = 1;
    let shortBy = 0;
    let lastListen: string | null = null;
    let lastTalk: string | null = null;
    let wasReduced = false;
    let gaveUp = false;
    let handoffTimer: ReturnType<typeof setTimeout> | undefined;
    let incomingStall: ReturnType<typeof setTimeout> | undefined;
    let shownStall: ReturnType<typeof setTimeout> | undefined;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    let frame: { video: HTMLVideoElement; id: number } | null = null;

    /** The hub the visible segment ends on, when the manifest names hubs. */
    const restingHub = () => shown?.segment.endHub ?? null;
    /**
     * A listen segment to follow the visible one, starting on the hub that one ends on where it can.
     * After talk it always settles on that hub; idle sometimes moves to another (see nextListen).
     */
    const listenAfterShown = () => {
      const hub = restingHub();
      const listens = usable("listen");
      const home = shown?.segment.kind === "talk" && hub !== null ? listens.filter((segment) => segment.startHub === hub) : [];
      return nextListen(home.length ? home : listens, lastListen, Math.random, hub);
    };
    const suspended = () => wanted.current.paused || wanted.current.reduced || document.hidden;
    const usable = (kind: PresenceSegment["kind"]) => segments.filter((segment) => segment.kind === kind && !failed.has(segment.id));
    const publish = () => {
      if (disposed) return;
      setSnapshot({ segment: shown?.segment.id ?? null, kind: shown?.segment.kind ?? null, failed: gaveUp });
    };
    const timeLeft = () => {
      if (!shown) return 0;
      const video = videos[shown.index];
      const total = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : shown.segment.durationMs / 1000;
      return Math.max(0, (total - video.currentTime) * 1000 / (video.playbackRate || shown.rate || 1));
    };
    const cancelFrame = () => {
      if (frame) frame.video.cancelVideoFrameCallback?.(frame.id);
      frame = null;
      clearTimeout(revealTimer);
      revealTimer = undefined;
    };
    const cancelIncoming = () => {
      token++;
      cancelFrame();
      clearTimeout(incomingStall);
      incomingStall = undefined;
      if (incoming) {
        const video = videos[incoming.index];
        video.pause();
        video.classList.remove("is-entering", "is-shown");
      }
      incoming = null;
    };
    const finishFade = () => {
      if (!fading) return;
      clearTimeout(fading.timer);
      const { from, to } = fading;
      fading = null;
      videos[to].classList.remove("is-entering");
      if (from !== null && from !== to) {
        videos[from].pause();
        videos[from].classList.remove("is-shown", "is-entering");
      }
    };
    const hideAll = () => {
      finishFade();
      cancelIncoming();
      clearTimeout(handoffTimer);
      clearTimeout(shownStall);
      videos.forEach((video) => { video.pause(); video.classList.remove("is-shown", "is-entering"); });
      shown = null;
    };
    const giveUp = () => {
      hideAll();
      gaveUp = true;
      publish();
    };

    /** The next segment the chain would play, advancing the talk plan. */
    const chooseNext = (): { segment: PresenceSegment; rate: number } | null => {
      if (mode === "talk") {
        while (queue.length) {
          const segment = byId.get(queue.shift()!);
          if (segment && !failed.has(segment.id)) return { segment, rate: queueRate };
        }
        if (wanted.current.talking && shortBy >= EXTEND_MS && plan(shortBy)) return chooseNext();
        mode = "listen";
      }
      const segment = listenAfterShown();
      return segment ? { segment, rate: 1 } : null;
    };
    /** Plan talk for `durationMs` of audio from now. Joins overlap by a crossfade, so plan without them. */
    const plan = (durationMs: number) => {
      const talks = usable("talk").map((segment) => ({ ...segment, durationMs: Math.max(1, segment.durationMs - crossfade) }));
      const target = Math.max(1, durationMs - crossfade);
      const next = planTalk(talks, target, lastTalk, Math.random, restingHub());
      if (!next.ids.length) return false;
      const lengths = new Map(talks.map((segment) => [segment.id, segment.durationMs]));
      queue = next.ids;
      queueRate = next.rate;
      shortBy = target - next.ids.reduce((sum, id) => sum + lengths.get(id)!, 0) / next.rate;
      mode = "talk";
      return true;
    };

    const scheduleHandoff = () => {
      clearTimeout(handoffTimer);
      handoffTimer = undefined;
      if (disposed || !shown || !incoming || incoming.due || fading || suspended()) return;
      const wait = timeLeft() - incoming.fadeMs - LEAD_MS;
      handoffTimer = setTimeout(() => {
        handoffTimer = undefined;
        if (!incoming || incoming.due) return;
        if (timeLeft() - incoming.fadeMs - LEAD_MS > 40) { scheduleHandoff(); return; }
        incoming.due = true;
        tryStart();
      }, Math.max(0, wait));
    };
    const watchIncoming = () => {
      clearTimeout(incomingStall);
      incomingStall = undefined;
      if (!incoming || incoming.ready || suspended()) return;
      const current = incoming.token;
      incomingStall = setTimeout(() => { if (incoming?.token === current && !incoming.ready) failIncoming(); }, STALL_MS);
    };
    const prepare = (segment: PresenceSegment, rate: number, { immediate, fadeMs }: { immediate: boolean; fadeMs: number }) => {
      finishFade();
      cancelIncoming();
      const index = shown ? 1 - shown.index : 0;
      const video = videos[index];
      incoming = { index, segment, rate, fadeMs, token, ready: false, due: immediate, started: false };
      video.pause();
      video.classList.remove("is-shown", "is-entering");
      video.muted = true;
      video.src = segment.src;
      video.load();
      video.defaultPlaybackRate = rate;
      video.playbackRate = rate;
      if (video.readyState >= 3) incoming.ready = true;
      watchIncoming();
      if (immediate) tryStart(); else scheduleHandoff();
    };
    const prepareNext = (options: { immediate: boolean; fadeMs: number }) => {
      const next = chooseNext();
      if (next) prepare(next.segment, next.rate, options);
      else if (!usable("listen").length) giveUp();
    };
    const tryStart = () => {
      if (disposed || !incoming || !incoming.ready || !incoming.due || incoming.started || suspended()) return;
      const entry = incoming;
      const video = videos[entry.index];
      entry.started = true;
      video.playbackRate = entry.rate;
      // Loaded but never presenting a frame is a stall too.
      clearTimeout(incomingStall);
      incomingStall = setTimeout(() => { if (incoming === entry) failIncoming(); }, STALL_MS);
      if ("requestVideoFrameCallback" in video) {
        frame = { video, id: video.requestVideoFrameCallback(() => { frame = null; if (incoming === entry) reveal(); }) };
      }
      void video.play().then(() => {
        if (incoming !== entry || disposed) return;
        clearTimeout(revealTimer);
        // A frame callback may not arrive for a transparent element; current data is enough then.
        revealTimer = setTimeout(() => {
          if (incoming === entry && video.readyState >= 2) reveal();
        }, frame ? REVEAL_GRACE_MS : 0);
      }).catch((error: unknown) => {
        if (incoming !== entry || disposed) return;
        if (error instanceof DOMException && error.name === "AbortError") { entry.started = false; return; }
        failIncoming();
      });
    };
    const reveal = () => {
      if (!incoming || disposed) return;
      const entry = incoming;
      cancelFrame();
      clearTimeout(incomingStall);
      clearTimeout(handoffTimer);
      clearTimeout(shownStall);
      incoming = null;
      const video = videos[entry.index];
      const previous = shown;
      video.style.transitionDuration = `${entry.fadeMs}ms`;
      video.classList.add("is-entering", "is-shown");
      shown = { index: entry.index, segment: entry.segment, rate: entry.rate };
      if (entry.segment.kind === "listen") lastListen = entry.segment.id; else lastTalk = entry.segment.id;
      publish();
      fading = {
        from: previous ? previous.index : null, to: entry.index,
        // sync() also applies a change of talking that waited for this fade.
        timer: setTimeout(() => {
          finishFade();
          sync();
        }, entry.fadeMs),
      };
    };
    const failIncoming = () => {
      if (!incoming) return;
      const { segment, due, fadeMs } = incoming;
      failed.add(segment.id);
      cancelIncoming();
      if (failed.size >= segments.length) { giveUp(); return; }
      prepareNext({ immediate: due || !shown, fadeMs });
    };
    const failShown = () => {
      if (!shown) return;
      failed.add(shown.segment.id);
      clearTimeout(shownStall);
      if (failed.size >= segments.length) { giveUp(); return; }
      if (incoming) { incoming.due = true; tryStart(); }
      else prepareNext({ immediate: true, fadeMs: crossfade });
    };
    const advance = () => {
      if (!shown || suspended()) return;
      if (incoming) { incoming.due = true; tryStart(); }
      else if (!fading) prepareNext({ immediate: true, fadeMs: crossfade });
    };

    const startTalk = (durationMs: number) => {
      const fromTalk = shown?.segment.kind === "talk";
      if (!plan(durationMs)) return;
      const next = chooseNext();
      if (next) prepare(next.segment, next.rate, { immediate: true, fadeMs: fromTalk ? EARLY_FADE_MS : crossfade });
    };
    const endTalk = () => {
      mode = "listen";
      queue = [];
      shortBy = 0;
      if (shown?.segment.kind === "talk" && timeLeft() > NATURAL_END_MS) {
        // Cut mid-gesture: no hub is near, so any listen segment will do.
        const segment = nextListen(usable("listen"), lastListen);
        if (segment) prepare(segment, 1, { immediate: true, fadeMs: EARLY_FADE_MS });
      } else if (incoming?.segment.kind === "talk") {
        const segment = listenAfterShown();
        if (segment) prepare(segment, 1, { immediate: !shown, fadeMs: crossfade });
        else cancelIncoming();
      }
    };

    const sync = () => {
      if (disposed) return;
      if (wanted.current.reduced) {
        // The poster stands in. Talk is replanned from scratch if motion comes back mid-answer.
        if (!wasReduced) { hideAll(); mode = "listen"; queue = []; talkId = null; publish(); }
        wasReduced = true;
        return;
      }
      wasReduced = false;
      if (gaveUp) return;
      const requested = wanted.current.talking;
      // A change of talking waits for a running fade (at most a crossfade): cutting it short would show a jump.
      if ((requested?.id ?? null) !== talkId && !fading) {
        talkId = requested?.id ?? null;
        if (requested) startTalk(requested.durationMs); else endTalk();
      }
      if (suspended()) {
        finishFade();
        clearTimeout(handoffTimer);
        clearTimeout(shownStall);
        clearTimeout(incomingStall);
        handoffTimer = shownStall = incomingStall = undefined;
        videos.forEach((video) => video.pause());
        if (incoming?.started) { cancelFrame(); incoming.started = false; }
        return;
      }
      if (shown) {
        const video = videos[shown.index];
        if (!video.ended && video.paused) void video.play().catch(() => { /* A failing segment reports through its error event. */ });
      }
      if (incoming) { watchIncoming(); if (incoming.due) tryStart(); else scheduleHandoff(); }
      else if (!shown) prepareNext({ immediate: true, fadeMs: crossfade });
      else if (!fading) {
        if (videos[shown.index].ended) advance();
        else prepareNext({ immediate: false, fadeMs: crossfade });
      }
    };

    const listeners = videos.map((video, index) => {
      const onReady = () => {
        if (incoming?.index !== index || incoming.ready) return;
        incoming.ready = true;
        clearTimeout(incomingStall);
        tryStart();
      };
      const onError = () => {
        if (incoming?.index === index) failIncoming();
        else if (shown?.index === index) failShown();
      };
      const onEnded = () => { if (shown?.index === index) advance(); };
      const onWaiting = () => {
        if (shown?.index !== index || suspended() || shownStall !== undefined) return;
        shownStall = setTimeout(() => { shownStall = undefined; if (shown?.index === index && !suspended()) failShown(); }, STALL_MS);
      };
      const onPlaying = () => {
        if (shown?.index !== index) return;
        clearTimeout(shownStall);
        shownStall = undefined;
        scheduleHandoff();
      };
      const events: [string, () => void][] = [
        ["canplay", onReady], ["loadeddata", onReady], ["error", onError], ["ended", onEnded],
        ["waiting", onWaiting], ["stalled", onWaiting], ["playing", onPlaying],
      ];
      events.forEach(([name, handler]) => video.addEventListener(name, handler));
      return () => events.forEach(([name, handler]) => video.removeEventListener(name, handler));
    });

    videos.forEach((video) => { video.muted = true; video.defaultMuted = true; });
    control.current = { sync };
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      disposed = true;
      control.current = null;
      document.removeEventListener("visibilitychange", sync);
      listeners.forEach((remove) => remove());
      hideAll();
      clearTimeout(handoffTimer);
      clearTimeout(shownStall);
      videos.forEach((video) => { video.removeAttribute("src"); video.load(); });
    };
  }, [manifest]);

  const state = reduced ? "still" : snapshot.failed ? "poster" : snapshot.kind ?? "starting";
  return (
    <div>
      <div className="avatar-stage presence-stage" data-state={state} data-segment={reduced ? "" : snapshot.segment ?? ""} data-paused={paused}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={manifest.poster} alt={manifest.label} width={manifest.width} height={manifest.height} />
        <video ref={first} muted playsInline preload="auto" aria-hidden="true" />
        <video ref={second} muted playsInline preload="auto" aria-hidden="true" />
      </div>
      {reduced && <p className="avatar-caption">Motion is off because of your device preference. Voice is still available.</p>}
      {snapshot.failed && !reduced && <p role="status" className="avatar-caption">The filmed picture could not play. The conversation still works.</p>}
    </div>
  );
}
