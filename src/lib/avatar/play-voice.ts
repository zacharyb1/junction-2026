/** Live control of one playing recording: pause with the picture, and mute without stopping. */
export interface AvatarAudioControl {
  pause(): void;
  resume(): void;
  setMuted(muted: boolean): void;
}

/**
 * What a picture needs to follow one recording: where the audio is, whether it is advancing, and a
 * way to make the voice wait for a picture that is not ready or has frozen. A hold never overrides a
 * pause by the visitor, and it lapses by itself after HOLD_LIMIT_MS, so a broken picture cannot
 * silence the voice.
 */
export interface AvatarSpeechClock {
  /** Audio position in milliseconds. */
  timeMs(): number;
  /** True while the audio is actually playing (not paused, held, buffering or finished). */
  running(): boolean;
  /** True once the recording has ended or was cancelled. */
  finished(): boolean;
  hold(held: boolean): void;
  /** Called after every change of running or finished. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/** The longest a picture may keep the voice waiting before it plays anyway. */
export const HOLD_LIMIT_MS = 4000;

/** Play one local recording or generated reply; cancellation owns all audio cleanup. */
export function playAvatarAudio(source: string, options: {
  signal: AbortSignal;
  onSpeech: (playing: boolean) => void;
  /** Called once, when audio first plays, with the decoded duration (NaN when the file does not say). */
  onStart?: (durationMs: number) => void;
  /** Called synchronously with the controls of this playback. */
  onControl?: (control: AvatarAudioControl, clock: AvatarSpeechClock) => void;
  muted?: boolean;
  /** Do not start until resume() is called. */
  paused?: boolean;
  /** Do not start until the picture releases clock.hold (or HOLD_LIMIT_MS passes). */
  held?: boolean;
}): Promise<void> {
  const { signal, onSpeech, onStart, onControl } = options;
  if (signal.aborted) return Promise.reject(new DOMException("Playback cancelled", "AbortError"));
  return new Promise((resolve, reject) => {
    const player = new Audio(source);
    player.muted = options.muted ?? false;
    player.preload = "auto";
    let settled = false;
    let speaking = false;
    let started = false;
    let userPaused = options.paused ?? false;
    let held = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const update = (value: boolean) => {
      if (speaking !== value) { speaking = value; onSpeech(value); }
      notify();
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(holdTimer);
      signal.removeEventListener("abort", cancel);
      player.onplaying = player.onwaiting = player.onpause = player.onended = player.onerror = null;
      player.pause();
      update(false);
      listeners.clear();
      if (error) reject(error); else resolve();
    };
    const cancel = () => finish(new DOMException("Playback cancelled", "AbortError"));
    const start = () => {
      if (settled || userPaused || held || !player.paused) return;
      void player.play().catch((error: unknown) => {
        // A pause during the start is not a failure; resume() starts it again.
        if (error instanceof DOMException && error.name === "AbortError") return;
        finish(new Error("Voice could not start. Press the voice button to try again."));
      });
    };
    const apply = () => { if (userPaused || held) player.pause(); else start(); };
    const setHeld = (value: boolean) => {
      if (settled || held === value) return;
      held = value;
      clearTimeout(holdTimer);
      holdTimer = held ? setTimeout(() => { holdTimer = undefined; setHeld(false); }, HOLD_LIMIT_MS) : undefined;
      apply();
    };
    signal.addEventListener("abort", cancel, { once: true });
    player.onplaying = () => {
      if (!started) {
        started = true;
        onStart?.(Number.isFinite(player.duration) && player.duration > 0 ? player.duration * 1000 : NaN);
      }
      update(true);
    };
    player.onwaiting = player.onpause = () => update(false);
    player.onended = () => finish();
    player.onerror = () => finish(new Error("The audio could not be loaded. You can still read the reply."));
    const clock: AvatarSpeechClock = {
      timeMs: () => (Number.isFinite(player.currentTime) ? player.currentTime : 0) * 1000,
      running: () => !settled && speaking && !player.paused,
      finished: () => settled,
      hold: setHeld,
      subscribe: (listener) => {
        if (settled) return () => {};
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
    };
    onControl?.({
      pause: () => { userPaused = true; apply(); },
      resume: () => { userPaused = false; apply(); },
      setMuted: (muted) => { player.muted = muted; },
    }, clock);
    if (options.held) setHeld(true);
    else start();
  });
}
