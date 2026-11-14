"use client";

import { LoaderCircle, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
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
}: {
  src: string;
  label: string;
  loadingLabel: string;
  errorLabel: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

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
        <Button variant="outline" size="lg" onClick={start} disabled={state === "loading"}>
          {state === "loading" ? <LoaderCircle className="animate-spin" /> : <Volume2 />}
          {state === "loading" ? loadingLabel : label}
        </Button>
      )}
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
