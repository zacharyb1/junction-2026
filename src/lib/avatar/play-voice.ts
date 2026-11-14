/** Play one local recording or generated reply; cancellation owns all audio cleanup. */
export function playAvatarAudio(source: string, options: {
  signal: AbortSignal;
  onSpeech: (playing: boolean) => void;
}): Promise<void> {
  const { signal, onSpeech } = options;
  if (signal.aborted) return Promise.reject(new DOMException("Playback cancelled", "AbortError"));
  return new Promise((resolve, reject) => {
    const player = new Audio(source);
    let settled = false;
    let speaking = false;
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
    signal.addEventListener("abort", cancel, { once: true });
    player.onplaying = () => update(true);
    player.onwaiting = player.onpause = () => update(false);
    player.onended = () => finish();
    player.onerror = () => finish(new Error("The audio could not be loaded. You can still read the plan."));
    void player.play().catch(() => finish(new Error("Voice could not start. Press the voice button to try again.")));
  });
}
