"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PerformanceRequest, PerformanceSpeechEvent } from "@/lib/avatar/performance";

/** Await video playback through the same cancellation boundary as chat and voice. */
export function usePerformanceSpeech() {
  const [request, setRequest] = useState<PerformanceRequest | null>(null);
  const sequence = useRef(0);
  const active = useRef<{
    id: string;
    onSpeech: (playing: boolean) => void;
    finish: (error?: Error) => void;
  } | null>(null);

  const onEvent = useCallback((event: PerformanceSpeechEvent) => {
    const current = active.current;
    if (!current || event.id !== current.id) return;
    if (event.type === "playing" || event.type === "paused") current.onSpeech(event.type === "playing");
    else current.finish(event.type === "error" ? new Error(event.message ?? "The performance could not play.") : undefined);
  }, []);

  useEffect(() => () => {
    active.current?.finish(new DOMException("Playback cancelled", "AbortError"));
  }, []);

  function play(src: string, { signal, onSpeech }: { signal: AbortSignal; onSpeech: (playing: boolean) => void }) {
    if (signal.aborted) return Promise.reject(new DOMException("Playback cancelled", "AbortError"));
    active.current?.finish(new DOMException("Playback replaced", "AbortError"));
    return new Promise<void>((resolve, reject) => {
      const id = `performance-${++sequence.current}`;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", cancel);
        if (active.current?.id === id) { active.current = null; setRequest(null); }
        onSpeech(false);
        if (error) reject(error); else resolve();
      };
      const cancel = () => finish(new DOMException("Playback cancelled", "AbortError"));
      active.current = { id, onSpeech, finish };
      signal.addEventListener("abort", cancel, { once: true });
      setRequest({ id, src });
    });
  }

  return { request, play, onEvent };
}
