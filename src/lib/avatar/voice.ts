/** Device voice fallback. Remote browser voices are deliberately never selected. */
export async function speakOnDevice(text: string, options: {
  signal: AbortSignal;
  tone: "calm" | "direct" | "warm";
  onSpeech: (playing: boolean) => void;
}): Promise<void> {
  const { signal, tone, onSpeech } = options;
  const cancelled = () => new DOMException("Speech cancelled", "AbortError");
  if (signal.aborted) throw cancelled();
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    throw new Error("Voice is not available on this device. Your reply is ready to read.");
  }
  const synthesis = window.speechSynthesis;
  const localVoices = () => synthesis.getVoices().filter((voice) => voice.localService);
  let voices = localVoices();
  if (!voices.length) {
    await new Promise<void>((resolve, reject) => {
      let finished = false;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        synthesis.removeEventListener("voiceschanged", changed);
        signal.removeEventListener("abort", abort);
        if (error) reject(error); else resolve();
      };
      const changed = () => { if (localVoices().length) finish(); };
      const abort = () => finish(cancelled());
      const timer = setTimeout(() => finish(), 1200);
      synthesis.addEventListener("voiceschanged", changed);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    voices = localVoices();
  }
  if (signal.aborted) throw cancelled();
  const voice = voices.find((item) => item.lang.toLowerCase().startsWith("en")) ?? voices.find((item) => item.default) ?? voices[0];
  if (!voice) throw new Error("No device voice is installed. You can read the reply or listen to the example.");
  const words = text.replace(/https?:\/\/\S+/g, "").replace(/[*_`#>|]+/g, "").replace(/\[\d+\]/g, "").trim();
  if (!words) throw new Error("There are no words to read aloud in this reply.");

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(words);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = tone === "calm" ? 0.94 : tone === "direct" ? 1.04 : 1;
    let finished = false;
    let speaking = false;
    const startup = setTimeout(() => {
      finish(new Error("Device voice did not start. Your reply is ready to read."));
      synthesis.cancel();
    }, 8000);
    const update = (value: boolean) => {
      if (speaking !== value) { speaking = value; onSpeech(value); }
    };
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(startup);
      signal.removeEventListener("abort", abort);
      utterance.onstart = utterance.onresume = utterance.onpause = utterance.onend = utterance.onerror = null;
      update(false);
      if (error) reject(error); else resolve();
    };
    const abort = () => { finish(cancelled()); synthesis.cancel(); };
    signal.addEventListener("abort", abort, { once: true });
    utterance.onstart = utterance.onresume = () => {
      if (finished || signal.aborted) return;
      clearTimeout(startup); update(true);
    };
    utterance.onpause = () => { if (!finished) update(false); };
    utterance.onend = () => finish();
    utterance.onerror = () => finish(new Error("Device voice could not play. Your reply is ready to read."));
    if (signal.aborted) { abort(); return; }
    try { synthesis.speak(utterance); }
    catch { finish(new Error("Device voice could not play. Your reply is ready to read.")); }
  });
}
