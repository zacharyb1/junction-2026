"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { answerSegment, nextListen, planTalk, SPEECH_SCENES, type PresenceManifest, type PresenceSegment, type PresenceTalking } from "@/lib/avatar/presence";
import type { AvatarSpeechClock } from "@/lib/avatar/play-voice";

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (listener: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};

/** A talk cut off mid-gesture (Stop, a new message) dissolves into rest for this long. */
export const INTERRUPT_FADE_MS = 340;
/** When the voice stops this close to the end of a talk video, its own settle returns to rest. */
export const SETTLE_WINDOW_MS = 1500;
/** A prepared answer's picture is kept this close to its voice. */
export const SYNC_TOLERANCE_MS = 80;
/** The incoming video starts this long before its fade is due, so a decoded frame is ready on time. */
const LEAD_MS = 60;
/** A segment that cannot load, or keeps waiting for data, this long is skipped. */
export const STALL_MS = 3000;
/** Without a frame callback, a playing video with current data is revealed after this grace. */
const REVEAL_GRACE_MS = 250;
/** A plan that ends this much before the audio is extended with more talk. */
const EXTEND_MS = 1000;
/** How often a prepared answer's picture is compared with its voice. */
const SYNC_TICK_MS = 100;
/** A picture that has not advanced for this long while the voice runs makes the voice wait. */
const FREEZE_MS = 160;
/** After moving the picture to the voice, wait this long before moving it again. */
const SEEK_COOLDOWN_MS = 400;
/**
 * Drift up to this is closed by playing the picture slightly faster or slower (at most NUDGE away from
 * its rate); only a larger jump is a seek, because a seek freezes the picture while it decodes.
 */
export const SEEK_DRIFT_MS = 300;
const NUDGE = 0.1;

export type { PresenceTalking };
type Props = { manifest: PresenceManifest; talking: PresenceTalking; paused: boolean };
type Snapshot = { segment: string | null; kind: PresenceSegment["kind"] | null; failed: boolean };
type Entry = { segment: PresenceSegment; rate: number; synced: boolean };
type Incoming = Entry & { index: number; fadeMs: number; token: number; ready: boolean; due: boolean; started: boolean };

/**
 * The filmed desk presence. Two stacked, muted videos: the visible one plays while the next loads in
 * the hidden element, starts crossfadeMs before the visible one ends and fades in on top. Every video
 * starts and ends on the same rest frame, so a join is a short crossfade between two near-identical
 * frames. Idle videos chain for as long as nobody speaks. While `talking` names a prepared answer with
 * a performance video, that video plays once, started with the voice and kept within
 * SYNC_TOLERANCE_MS of it; any other voice is covered by a plan of generic talk videos. A talk cut off
 * mid-gesture dissolves into idle over INTERRUPT_FADE_MS.
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
    const answers = new Map(SPEECH_SCENES.flatMap((scene) => {
      const segment = answerSegment(manifest, scene);
      return segment ? [[scene, segment] as const] : [];
    }));
    const crossfade = manifest.crossfadeMs;
    const failed = new Set<string>();
    let disposed = false;
    let token = 0;
    let shown: (Entry & { index: number }) | null = null;
    let incoming: Incoming | null = null;
    let fading: { from: number | null; to: number; timer: ReturnType<typeof setTimeout> } | null = null;
    let mode: "listen" | "talk" | "answer" = "listen";
    let talkId: string | null = null;
    let talk: NonNullable<PresenceTalking> | null = null;
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
    // The voice of the current talk, and whether this stage is keeping it waiting.
    let clock: AvatarSpeechClock | null = null;
    let unsubscribe: (() => void) | null = null;
    let voiceHeld = false;
    let ticker: ReturnType<typeof setInterval> | undefined;
    let follow = { lastMs: -1, frozenMs: 0, stallHeld: false, lastSeek: -Infinity };

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
    /** Audio still to come after the visible video ends, or the planned shortfall without a clock. */
    const audioAfterShown = () => {
      if (!talk) return 0;
      if (!clock) return shortBy;
      return clock.finished() ? 0 : talk.durationMs - clock.timeMs() - timeLeft();
    };

    // ----- the voice of a prepared answer
    const holdVoice = (held: boolean) => {
      if (!clock || voiceHeld === held) return;
      voiceHeld = held;
      clock.hold(held);
    };
    const stopTicker = () => {
      clearInterval(ticker);
      ticker = undefined;
      if (follow.stallHeld) holdVoice(false);
      follow = { lastMs: -1, frozenMs: 0, stallHeld: false, lastSeek: -Infinity };
    };
    const seekTo = (video: HTMLVideoElement, ms: number) => {
      follow.lastSeek = Date.now();
      video.currentTime = Math.max(0, ms) / 1000;
    };
    const setRate = (video: HTMLVideoElement, rate: number) => { if (Math.abs(video.playbackRate - rate) > 0.004) video.playbackRate = rate; };
    /** Our own seek is still decoding: the picture stands still, but it is not stuck. */
    const ownSeek = (video: HTMLVideoElement) => video.seeking && Date.now() - follow.lastSeek < STALL_MS;
    /** Keep the visible answer with its voice: follow its pauses, wait for a frozen picture, correct drift. */
    const followVoice = () => {
      if (!shown?.synced || !clock || suspended()) return;
      const video = videos[shown.index];
      if (clock.finished()) { release(); return; }
      const audioMs = clock.timeMs();
      const videoMs = video.currentTime * 1000;
      const advancing = videoMs > follow.lastMs + 1;
      follow.lastMs = videoMs;
      if (follow.stallHeld) {
        // The voice waits until the picture moves again and has caught up.
        if (video.paused && !video.ended) void video.play().catch(() => { /* Reported by its error event. */ });
        if (videoMs > audioMs + SYNC_TOLERANCE_MS && Date.now() - follow.lastSeek > SEEK_COOLDOWN_MS) seekTo(video, audioMs);
        else if (advancing && videoMs >= audioMs - SYNC_TOLERANCE_MS / 2) { follow.stallHeld = false; follow.frozenMs = 0; holdVoice(false); }
        else follow.frozenMs += SYNC_TICK_MS;
        if (follow.frozenMs >= STALL_MS) failShown();
        return;
      }
      if (!clock.running()) {
        // Paused, buffering or not yet started: the picture waits with the voice.
        if (!video.paused) video.pause();
        follow.frozenMs = 0;
        return;
      }
      if (video.paused && !video.ended) { void video.play().catch(() => { /* Reported by its error event. */ }); return; }
      if (video.ended) return;
      if (!advancing) {
        // Holding the voice for our own short seek would put an audible gap in the sentence.
        if (ownSeek(video)) return;
        // A picture that does not move cannot be corrected by moving it; past a moment the voice waits.
        follow.frozenMs += SYNC_TICK_MS;
        if (follow.frozenMs >= FREEZE_MS) { setRate(video, shown.rate); follow.stallHeld = true; holdVoice(true); }
        return;
      }
      follow.frozenMs = 0;
      const drift = audioMs - videoMs;
      if (Math.abs(drift) > SEEK_DRIFT_MS) {
        if (Date.now() - follow.lastSeek > SEEK_COOLDOWN_MS) { setRate(video, shown.rate); seekTo(video, audioMs); }
        return;
      }
      // Within SYNC_TOLERANCE_MS / 4 the picture plays at its own rate; otherwise it closes the drift in about a second.
      setRate(video, Math.abs(drift) <= SYNC_TOLERANCE_MS / 4 ? shown.rate : shown.rate * (1 + Math.max(-NUDGE, Math.min(NUDGE, drift / 1000))));
    };
    const startTicker = () => {
      if (ticker !== undefined || !shown?.synced || !clock) return;
      ticker = setInterval(followVoice, SYNC_TICK_MS);
    };
    /** Let go of the voice: the visible answer plays on by itself to its end. */
    const release = () => {
      stopTicker();
      holdVoice(false);
      if (incoming) incoming.synced = false;
      if (!shown?.synced) return;
      shown.synced = false;
      const video = videos[shown.index];
      setRate(video, shown.rate);
      if (video.paused && !video.ended && !suspended()) void video.play().catch(() => { /* Reported by its error event. */ });
    };
    const attach = (next: AvatarSpeechClock | null) => {
      if (next === clock) return;
      release();
      unsubscribe?.();
      unsubscribe = null;
      clock = next;
      voiceHeld = false;
      if (clock) unsubscribe = clock.subscribe(() => {
        if (disposed) return;
        if (incoming?.synced && incoming.due && !incoming.started) tryStart();
        else if (shown?.synced) followVoice();
      });
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
      stopTicker();
      clearTimeout(handoffTimer);
      clearTimeout(shownStall);
      videos.forEach((video) => { video.pause(); video.classList.remove("is-shown", "is-entering"); });
      shown = null;
    };
    const giveUp = () => {
      hideAll();
      attach(null);
      gaveUp = true;
      publish();
    };

    /** Plan generic talk for `durationMs` of audio from now. Joins overlap by a crossfade, so plan without them. */
    const plan = (durationMs: number) => {
      const talks = usable("talk").map((segment) => ({ ...segment, durationMs: Math.max(1, segment.durationMs - crossfade) }));
      const target = Math.max(1, durationMs - crossfade);
      const next = planTalk(talks, target, lastTalk);
      if (!next.ids.length) return false;
      const lengths = new Map(talks.map((segment) => [segment.id, segment.durationMs]));
      queue = next.ids;
      queueRate = next.rate;
      shortBy = target - next.ids.reduce((sum, id) => sum + lengths.get(id)!, 0) / next.rate;
      mode = "talk";
      return true;
    };
    /** The next segment to play, advancing the talk plan. */
    const chooseNext = (): Entry | null => {
      if (mode === "talk") {
        while (queue.length) {
          const segment = byId.get(queue.shift()!);
          if (segment && !failed.has(segment.id)) return { segment, rate: queueRate, synced: false };
        }
        const left = audioAfterShown();
        if (wanted.current.talking && left >= EXTEND_MS && plan(left)) return chooseNext();
      }
      mode = "listen";
      const segment = nextListen(usable("listen"), lastListen);
      return segment ? { segment, rate: 1, synced: false } : null;
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
    const prepare = (entry: Entry, { immediate, fadeMs }: { immediate: boolean; fadeMs: number }) => {
      finishFade();
      cancelIncoming();
      const index = shown ? 1 - shown.index : 0;
      const video = videos[index];
      incoming = { ...entry, index, fadeMs, token, ready: false, due: immediate, started: false };
      video.pause();
      video.classList.remove("is-shown", "is-entering");
      video.muted = true;
      video.src = entry.segment.src;
      video.load();
      video.defaultPlaybackRate = entry.rate;
      video.playbackRate = entry.rate;
      if (video.readyState >= 3) incoming.ready = true;
      watchIncoming();
      if (immediate) tryStart(); else scheduleHandoff();
    };
    const prepareNext = (options: { immediate: boolean; fadeMs: number }) => {
      const next = chooseNext();
      if (next) prepare(next, options);
      else if (!usable("listen").length) giveUp();
    };
    const tryStart = () => {
      if (disposed || !incoming || !incoming.ready || !incoming.due || incoming.started || suspended()) return;
      const entry = incoming;
      const video = videos[entry.index];
      if (entry.synced && clock && !clock.finished()) {
        // The picture is ready: let the voice go, and start with it once it actually plays.
        clearTimeout(incomingStall);
        incomingStall = undefined;
        holdVoice(false);
        if (!clock.running()) return;
        const at = clock.timeMs();
        if (at > SYNC_TOLERANCE_MS / 2) { video.currentTime = at / 1000; follow.lastSeek = Date.now(); }
      }
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
      stopTicker();
      video.style.transitionDuration = `${entry.fadeMs}ms`;
      video.classList.add("is-entering", "is-shown");
      shown = { index: entry.index, segment: entry.segment, rate: entry.rate, synced: entry.synced };
      if (entry.segment.kind === "listen") lastListen = entry.segment.id;
      else if (!entry.synced) lastTalk = entry.segment.id;
      if (shown.synced) startTicker();
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
    /** The answer video cannot play: cover the rest of its voice with generic talk instead. */
    const fallBackFromAnswer = () => {
      release();
      const left = !talk ? 0 : clock ? (clock.finished() ? 0 : talk.durationMs - clock.timeMs()) : talk.durationMs;
      if (wanted.current.talking && left >= EXTEND_MS) plan(left); else mode = "listen";
    };
    const failIncoming = () => {
      if (!incoming) return;
      const { segment, due, fadeMs, synced } = incoming;
      failed.add(segment.id);
      cancelIncoming();
      if (synced || mode === "answer") fallBackFromAnswer();
      if (usable("listen").length + usable("talk").length === 0) { giveUp(); return; }
      prepareNext({ immediate: due || !shown, fadeMs });
    };
    const failShown = () => {
      if (!shown) return;
      const wasAnswer = shown.synced || mode === "answer";
      failed.add(shown.segment.id);
      clearTimeout(shownStall);
      stopTicker();
      if (wasAnswer) fallBackFromAnswer();
      if (usable("listen").length + usable("talk").length === 0) { giveUp(); return; }
      if (incoming && !wasAnswer) { incoming.due = true; tryStart(); }
      else prepareNext({ immediate: true, fadeMs: wasAnswer ? INTERRUPT_FADE_MS : crossfade });
    };
    const advance = () => {
      if (!shown || suspended()) return;
      if (incoming) { incoming.due = true; tryStart(); }
      else if (!fading) prepareNext({ immediate: true, fadeMs: crossfade });
    };

    /** A fade into new material: short between rest frames, longer out of a gesture. */
    const fadeFromShown = () => shown?.segment.kind === "talk" && timeLeft() > crossfade * 2 ? INTERRUPT_FADE_MS : crossfade;
    const startTalk = (requested: NonNullable<PresenceTalking>) => {
      const fadeMs = fadeFromShown();
      talk = requested;
      attach(requested.clock ?? null);
      queue = [];
      const answer = requested.scene ? answers.get(requested.scene) : undefined;
      if (answer && !failed.has(answer.id)) {
        mode = "answer";
        shortBy = 0;
        // Keep a voice that has not started waiting until its picture is ready (tryStart lets it go).
        const synced = Boolean(clock && !clock.finished());
        if (synced && !clock!.running()) holdVoice(true);
        prepare({ segment: answer, rate: 1, synced }, { immediate: true, fadeMs });
        return;
      }
      const elapsed = clock && !clock.finished() ? clock.timeMs() : 0;
      if (!plan(requested.durationMs - elapsed)) { mode = "listen"; return; }
      const next = chooseNext();
      if (next) prepare(next, { immediate: true, fadeMs });
    };
    const endTalk = () => {
      mode = "listen";
      queue = [];
      shortBy = 0;
      talk = null;
      attach(null);
      if (shown?.segment.kind === "talk" && timeLeft() > SETTLE_WINDOW_MS) {
        // Cut off mid-gesture: dissolve into idle.
        const segment = nextListen(usable("listen"), lastListen);
        if (segment) prepare({ segment, rate: 1, synced: false }, { immediate: true, fadeMs: INTERRUPT_FADE_MS });
      } else if (incoming?.segment.kind === "talk") {
        // The talk that was to follow (or to start) is not needed; within its settle, the visible one ends by itself.
        const segment = nextListen(usable("listen"), lastListen);
        if (segment) prepare({ segment, rate: 1, synced: false }, { immediate: !shown, fadeMs: crossfade });
        else cancelIncoming();
      }
    };

    const sync = () => {
      if (disposed) return;
      if (wanted.current.reduced) {
        // The poster stands in and the voice plays on its own. Talk is replanned if motion comes back mid-answer.
        if (!wasReduced) { hideAll(); attach(null); mode = "listen"; queue = []; talkId = null; talk = null; publish(); }
        wanted.current.talking?.clock?.hold(false);
        wasReduced = true;
        return;
      }
      wasReduced = false;
      if (gaveUp) { wanted.current.talking?.clock?.hold(false); return; }
      const requested = wanted.current.talking;
      // A change of talking waits for a running fade (at most INTERRUPT_FADE_MS): cutting it short would show a jump.
      if ((requested?.id ?? null) !== talkId && !fading) {
        talkId = requested?.id ?? null;
        if (requested) startTalk(requested); else endTalk();
      }
      if (suspended()) {
        finishFade();
        stopTicker();
        clearTimeout(handoffTimer);
        clearTimeout(shownStall);
        clearTimeout(incomingStall);
        handoffTimer = shownStall = incomingStall = undefined;
        videos.forEach((video) => video.pause());
        if (incoming?.started) { cancelFrame(); incoming.started = false; }
        return;
      }
      if (shown?.synced) { startTicker(); followVoice(); }
      else if (shown) {
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
      const onEnded = () => {
        if (shown?.index !== index) return;
        // A prepared answer has had its say once its video ends, even if the voice runs a moment longer.
        if (shown.synced || mode === "answer") { release(); mode = "listen"; }
        advance();
      };
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
      attach(null);
      // Never leave a voice waiting for a picture that is gone.
      wanted.current.talking?.clock?.hold(false);
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
