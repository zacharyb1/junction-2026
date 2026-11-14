"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A brief ink trace enhances the evidence; the server-rendered page is complete without it. */
export function ReadingMotion({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !("IntersectionObserver" in window) || !("animate" in Element.prototype)
      || !("matchMedia" in window) || !("fonts" in document)
      || !window.CSS?.supports("clip-path", "inset(0)")) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;

    const quote = frame.querySelector<HTMLElement>(".r-source");
    const marks = [".r-plan-highlight", ".r-proof-bracket", ".r-source-highlight"]
      .map(selector => frame.querySelector<HTMLElement>(selector));
    if (!quote || marks.some(mark => !mark)) return;
    const plates = marks as HTMLElement[];
    const images = plates.map(plate => plate.querySelector("img"));
    if (images.some(img => !img || typeof img.decode !== "function")) return;

    let stopped = false;
    let attempted = false;
    let visible = false;
    let waitTimer: number | undefined;
    const animations: Animation[] = [];

    // Removing animation effects restores the already-visible underlying marks.
    const stop = () => {
      stopped = true;
      observer.disconnect();
      window.clearTimeout(waitTimer);
      preference.removeEventListener("change", onPreferenceChange);
      animations.forEach(animation => animation.cancel());
    };
    const onPreferenceChange = () => {
      if (preference.matches) stop();
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.45);
      if (!visible || attempted || stopped) return;
      attempted = true;

      // A slow asset/font keeps the static view instead of starting a late surprise.
      waitTimer = window.setTimeout(stop, 200);
      Promise.all([document.fonts.ready, ...images.map(img => img!.decode())])
        .then(() => {
          if (stopped) return;
          if (!visible || preference.matches || document.visibilityState !== "visible"
            || images.some(img => !img!.naturalWidth)) {
            stop();
            return;
          }
          window.clearTimeout(waitTimer);
          observer.disconnect();

          const traces = [
            { from: "inset(0 100% 0 0)", delay: 0, duration: 280 },
            { from: "inset(0 0 100% 0)", delay: 160, duration: 360 },
            { from: "inset(0 100% 0 0)", delay: 420, duration: 300 },
          ];
          plates.forEach((plate, index) => {
            const { from, delay, duration } = traces[index];
            animations.push(plate.animate(
              [{ clipPath: from }, { clipPath: "inset(0)" }],
              { delay, duration, fill: "backwards", easing: "cubic-bezier(.16,1,.3,1)" },
            ));
          });
          return Promise.all(animations.map(animation => animation.finished)).then(stop);
        })
        .catch(stop);
    }, { threshold: [0, 0.45] });

    preference.addEventListener("change", onPreferenceChange);
    observer.observe(quote);
    return stop;
  }, []);

  return <div ref={frameRef} className="reading-frame">{children}</div>;
}
