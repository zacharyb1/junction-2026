/** Live control of one playing recording: pause with the picture, and mute without stopping. */
export interface AvatarAudioControl {
  pause(): void;
  resume(): void;
  setMuted(muted: boolean): void;
}

/** Play one local recording or generated reply; cancellation owns all audio cleanup. */
export function playAvatarAudio(source: string, options: {
  signal: AbortSignal;
  onSpeech: (playing: boolean) => void;
  /** Called once, when audio first plays, with the decoded duration (NaN when the file does not say). */
  onStart?: (durationMs: number) => void;
  /** Called synchronously with the controls of this playback. */
  onControl?: (control: AvatarAudioControl) => void;
  muted?: boolean;
  /** Do not start until resume() is called. */
  paused?: boolean;
}): Promise<void> {
  const { signal, onSpeech, onStart, onControl } = options;
  if (signal.aborted) return Promise.reject(new DOMException("Playback cancelled", "AbortError"));
  return new Promise((resolve, reject) => {
    const player = new Audio(source);
    player.muted = options.muted ?? false;
    let settled = false;
    let speaking = false;
    let started = false;
    const update = (value: boolean) => {
      if (speaking !== value) { speaking = value; onSpeech(value); }
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", cancel);
      player.onplaying = player.onwaiting = player.onpause = player.onended = player.onerror = null;
      player.pause();
      update(false);
      if (error) reject(error); else resolve();
    };
    const cancel = () => finish(new DOMException("Playback cancelled", "AbortError"));
    const start = () => {
      if (settled) return;
      void player.play().catch((error: unknown) => {
        // A pause during the start is not a failure; resume() starts it again.
        if (error instanceof DOMException && error.name === "AbortError") return;
        finish(new Error("Voice could not start. Press the voice button to try again."));
      });
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
    onControl?.({
      pause: () => { if (!settled) player.pause(); },
      resume: () => { if (!settled && player.paused) start(); },
      setMuted: (muted) => { player.muted = muted; },
    });
    if (!options.paused) start();
  });
}
