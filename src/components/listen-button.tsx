"use client";

import { LoaderCircle, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Plays the spoken version of a case. The audio is requested on the first tap only,
 * because rendering speech costs credits and most readers never listen.
 */
export function ListenButton({
  src,
  label,
  loadingLabel,
  errorLabel,
  note,
}: {
  src: string;
  label: string;
  loadingLabel: string;
  errorLabel: string;
  /** How the voice reads this case, when it is not the plain reading: "Read slowly and calmly." */
  note?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // The player takes the place of the button. If the button had the keyboard focus, the focus is now nowhere,
  // so the player takes it and the reader carries on from the same spot.
  useEffect(() => {
    if (state === "ready" && document.activeElement === document.body) audio.current?.focus();
  }, [state]);

  const start = () => {
    const player = audio.current;
    if (!player) return;
    setState("loading");
    player.src = src;
    // Playback starts inside the tap, which is the only moment a phone allows it.
    player.play().catch((error: unknown) => {
      // If the browser still refuses, the player is shown and the reader presses play there.
      if (error instanceof DOMException && error.name === "NotAllowedError") setState("ready");
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {state !== "ready" && (
        // Still focusable while the audio loads, so the keyboard focus does not fall back to the top of the page.
        <Button variant="outline" size="lg" className="h-11 px-3 sm:h-9" onClick={start} disabled={state === "loading"} focusableWhenDisabled>
          {state === "loading" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Volume2 />}
          {state === "loading" ? loadingLabel : label}
        </Button>
      )}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {state === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {errorLabel}
        </p>
      )}
      <audio
        ref={audio}
        controls
        preload="none"
        aria-label={label}
        hidden={state !== "ready"}
        className="w-full max-w-md"
        onCanPlay={() => setState("ready")}
        onError={() => setState("error")}
      />
    </div>
  );
}
