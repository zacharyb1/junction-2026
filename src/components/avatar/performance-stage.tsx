"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  PerformanceHistory,
  type PerformanceIntent,
  type PerformanceManifest,
  type PerformanceRequest,
  type PerformanceSpeechEvent,
  type PerformanceTake,
} from "@/lib/avatar/performance";

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (listener: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
type Playback = { kind: "ambient"; take: PerformanceTake } |
  { kind: "speech"; request: PerformanceRequest; token: number };
type Props = {
  manifest: PerformanceManifest;
  intent: PerformanceIntent;
  speech: PerformanceRequest | null;
  paused: boolean;
  muted: boolean;
  onSpeechEvent: (event: PerformanceSpeechEvent) => void;
};

/** Forward-only performances. Exhaustion holds the last frame instead of looping. */
export function PerformanceStage({ manifest, intent, speech, paused, muted, onSpeechEvent }: Props) {
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);
  const history = useRef(new PerformanceHistory());
  const wanted = useRef({ intent, speech, paused, muted, reduced: true });
  const callback = useRef(onSpeechEvent);
  const control = useRef<{ sync: () => void } | null>(null);
  const [snapshot, setSnapshot] = useState({ take: "poster", exhausted: false });
  const [caption, setCaption] = useState("");
  const [failure, setFailure] = useState("");
  const reduced = useSyncExternalStore(subscribeMotion,
    () => window.matchMedia(motionQuery).matches, () => true);

  useEffect(() => { callback.current = onSpeechEvent; }, [onSpeechEvent]);
  useEffect(() => {
    wanted.current = { intent, speech, paused, muted, reduced };
    control.current?.sync();
  }, [intent, speech, paused, muted, reduced]);

  useEffect(() => {
    const videos = [first.current!, second.current!];
    const memory = history.current;
    let disposed = false;
    let serial = 0;
    let active = -1;
    let playing: Playback | null = null;
    let visibleKind: PerformanceTake["kind"] | "speech" | null = null;
    let pending: { video: HTMLVideoElement; playback: Playback; serial: number; decoded: boolean } | null = null;
    let requestId: string | null = null;
    let startedRequest: string | null = null;
    let lastSpeechEvent = "";
    let afterSpeech = false;
    let settleIntoPresence = false;
    let idleIntent = wanted.current.intent;
    let frameId: number | undefined;
    let frameVideo: HTMLVideoElement | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let removePendingListeners: (() => void) | null = null;

    const clearWatchdog = () => { clearTimeout(watchdog); watchdog = undefined; };
    const suspended = (playback: Playback) => wanted.current.paused || document.hidden ||
      (playback.kind === "ambient" && wanted.current.reduced);
    const currentSpeech = (playback: Playback) => playback.kind === "speech" && memory.current(playback.token);
    const emit = (playback: Playback, type: PerformanceSpeechEvent["type"], message?: string) => {
      if (disposed || !currentSpeech(playback) || playback.kind !== "speech") return;
      const key = `${playback.request.id}:${type}`;
      if (key === lastSpeechEvent) return;
      lastSpeechEvent = key;
      callback.current({ id: playback.request.id, type, ...(message ? { message } : {}) });
    };
    const clearPending = () => {
      serial++;
      clearWatchdog();
      if (frameId !== undefined) frameVideo?.cancelVideoFrameCallback(frameId);
      frameId = undefined;
      removePendingListeners?.();
      removePendingListeners = null;
      if (pending) { pending.video.pause(); pending.video.muted = true; }
      pending = null;
    };
    const updateCaption = () => {
      if (playing?.kind !== "speech" || active < 0) { setCaption(""); return; }
      const time = videos[active].currentTime * 1000;
      setCaption(playing.request.captions?.find((cue) => cue.fromMs <= time && time < cue.toMs)?.text ?? "");
    };
    const fail = (playback: Playback) => {
      if (disposed) return;
      const message = "This performance could not play. The conversation still works.";
      emit(playback, "error", message);
      setFailure(message);
      if (playback.kind === "ambient") memory.consume(playback.take);
      // The incoming video owns its own readiness timer and speech promise.
      // A late error from the outgoing shot must not silently discard it.
      if (pending && pending.playback !== playback) {
        if (playing === playback) {
          if (active >= 0) videos[active].pause();
          playing = null;
        }
        return;
      }
      clearPending();
      if (active >= 0) videos[active].pause();
      playing = null;
      setCaption("");
      afterSpeech = playback.kind === "speech";
      nextAmbient();
    };
    const play = (video: HTMLVideoElement, playback: Playback, token: number) => {
      if (disposed || suspended(playback)) return;
      if (watchdog === undefined && (pending?.video === video ||
          (!pending && playing === playback && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA))) {
        watchdog = setTimeout(() => {
          if (pending?.serial === token || (!pending && playing === playback && token === serial)) fail(playback);
        }, 15_000);
      }
      video.muted = playback.kind !== "speech" || wanted.current.muted;
      void video.play().then(() => {
        if (disposed || token !== serial || suspended(playback)) { video.pause(); return; }
        // Hidden video may not receive compositor callbacks. Reduced motion uses
        // the poster, so successful audio playback is sufficient in that mode.
        if (pending?.video === video && (pending.decoded ||
            (playback.kind === "speech" && wanted.current.reduced))) reveal();
      }).catch((error: unknown) => {
        if (disposed || token !== serial || suspended(playback)) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        fail(playback);
      });
    };
    const reveal = () => {
      if (!pending || disposed || pending.serial !== serial || suspended(pending.playback)) return;
      const { video, playback } = pending;
      if (playback.kind === "ambient" && !memory.consume(playback.take)) return;
      if (playback.kind === "speech" && !currentSpeech(playback)) return;
      clearWatchdog();
      removePendingListeners?.();
      removePendingListeners = null;
      if (active >= 0) { videos[active].pause(); videos[active].classList.remove("avatar-visible"); }
      video.classList.add("avatar-visible");
      active = videos.indexOf(video);
      playing = playback;
      visibleKind = playback.kind === "speech" ? "speech" : playback.take.kind;
      pending = null;
      setSnapshot({ take: playback.kind === "speech" ? playback.request.id : playback.take.id, exhausted: false });
      setFailure("");
      if (playback.kind === "speech") { startedRequest = playback.request.id; emit(playback, "playing"); }
      updateCaption();
    };
    const begin = (playback: Playback) => {
      clearPending();
      const video = videos[active === 0 ? 1 : 0];
      const token = serial;
      pending = { video, playback, serial: token, decoded: false };
      video.pause();
      video.muted = playback.kind !== "speech" || wanted.current.muted;
      video.src = playback.kind === "speech" ? playback.request.src : playback.take.src;
      const ready = () => {
        if (!pending || token !== serial || disposed) return;
        if (!("requestVideoFrameCallback" in video)) pending.decoded = true;
        else if (frameId === undefined) {
          frameVideo = video;
          frameId = video.requestVideoFrameCallback(() => {
            frameId = undefined;
            if (!pending || token !== serial || disposed) return;
            pending.decoded = true;
            reveal();
          });
        }
        play(video, playback, token);
      };
      const error = () => { if (pending?.serial === token) fail(playback); };
      video.addEventListener("canplay", ready);
      video.addEventListener("error", error);
      removePendingListeners = () => {
        video.removeEventListener("canplay", ready);
        video.removeEventListener("error", error);
      };
      video.load();
      emit(playback, "paused");
      if (!suspended(playback)) watchdog = setTimeout(() => {
        if (pending?.serial === token) fail(playback);
      }, 15_000);
    };
    const nextAmbient = () => {
      if (disposed || pending || wanted.current.reduced) return;
      const take = memory.choose(manifest, afterSpeech || settleIntoPresence ? "presence" : wanted.current.intent, afterSpeech);
      settleIntoPresence = afterSpeech;
      afterSpeech = false;
      idleIntent = wanted.current.intent;
      if (!take) {
        if (active >= 0) videos[active].pause();
        playing = null;
        // Never leave a stopped sentence frozen with an open mouth, or a work
        // shot facing away after the user has asked for attention. The finite
        // prototype returns to its neutral portrait when no unused take fits.
        const neutral = visibleKind === "speech" || (visibleKind === "work" && wanted.current.intent !== "work");
        if (neutral) {
          videos.forEach((video) => video.classList.remove("avatar-visible"));
          visibleKind = null;
        }
        setSnapshot((previous) => ({ take: neutral ? "poster" : previous.take, exhausted: true }));
        return;
      }
      begin({ kind: "ambient", take });
    };
    const ended = (index: number) => {
      if (disposed || index !== active || !videos[index].ended || !playing) return;
      if (!pending) clearWatchdog();
      if (playing.kind === "speech") { emit(playing, "ended"); afterSpeech = true; }
      playing = null;
      setCaption("");
      nextAmbient();
    };
    const sync = () => {
      if (disposed) return;
      const requested = wanted.current.speech;
      if ((requested?.id ?? null) !== requestId) {
        if (playing?.kind === "speech") emit(playing, "paused");
        memory.cancel();
        // Clearing an already-ended request must not cancel its quiet handover.
        if (requested || pending?.playback.kind === "speech") clearPending();
        if (playing?.kind === "speech") {
          videos[active].pause();
          videos[active].muted = true;
          playing = null;
          afterSpeech = true;
        }
        setCaption("");
        requestId = requested?.id ?? null;
        if (requested) {
          const token = memory.request(requested.id);
          if (token !== null) {
            afterSpeech = false;
            settleIntoPresence = false;
            begin({ kind: "speech", request: requested, token });
          }
        }
      }
      if (pending?.playback.kind === "ambient" && idleIntent !== wanted.current.intent) {
        // An unshown preload is not a performance. Release it when the user's
        // intent changes so a stale work/attention take cannot win the race.
        clearPending();
        afterSpeech = false;
        settleIntoPresence = false;
      }
      if (!pending && playing?.kind !== "speech" &&
          (!playing || idleIntent !== wanted.current.intent)) nextAmbient();
      for (const [index, video] of videos.entries()) {
        const playback = pending?.video === video ? pending.playback : index === active ? playing : null;
        if (!playback) continue;
        video.muted = playback.kind !== "speech" || wanted.current.muted;
        if (suspended(playback)) {
          video.pause();
          emit(playback, "paused");
          if (!pending || pending.video === video || wanted.current.paused || document.hidden) clearWatchdog();
        } else if (!video.ended) {
          play(video, playback, serial);
        }
      }
    };
    const listeners = videos.map((video, index) => {
      const onEnded = () => ended(index);
      const onWaiting = () => {
        if (index !== active || !playing) return;
        emit(playing, "paused");
        if (!pending && watchdog === undefined && !suspended(playing)) {
          const playback = playing;
          watchdog = setTimeout(() => { if (playing === playback && !pending) fail(playback); }, 15_000);
        }
      };
      const onPlaying = () => {
        if (index !== active || !playing || suspended(playing)) return;
        if (!pending) clearWatchdog();
        emit(playing, "playing");
      };
      const onTime = () => { if (index === active) updateCaption(); };
      const onError = () => { if (index === active && playing) fail(playing); };
      video.addEventListener("ended", onEnded);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("stalled", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("timeupdate", onTime);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("stalled", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("timeupdate", onTime);
        video.removeEventListener("error", onError);
      };
    });
    control.current = { sync };
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      disposed = true;
      memory.cancel();
      if (requestId && requestId !== startedRequest) memory.releaseUnplayed(requestId);
      clearPending();
      control.current = null;
      document.removeEventListener("visibilitychange", sync);
      listeners.forEach((remove) => remove());
      videos.forEach((video) => {
        video.pause();
        video.muted = true;
        video.classList.remove("avatar-visible");
        video.removeAttribute("src");
        video.load();
      });
    };
  }, [manifest]);

  return (
    <div>
      <div className="avatar-stage" data-clip={reduced ? "poster" : snapshot.take}
        data-intent={intent} data-paused={paused} data-exhausted={snapshot.exhausted}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={manifest.poster} alt={manifest.label} width={manifest.width} height={manifest.height} />
        <video ref={first} playsInline preload="auto" aria-hidden="true" style={{ visibility: reduced ? "hidden" : undefined }} />
        <video ref={second} playsInline preload="auto" aria-hidden="true" style={{ visibility: reduced ? "hidden" : undefined }} />
        {caption && <p>{caption}</p>}
      </div>
      {reduced && <p className="avatar-caption">Motion is off because of your device preference. Voice is still available.</p>}
      {failure && <p role="alert" className="avatar-caption">{failure}</p>}
    </div>
  );
}
