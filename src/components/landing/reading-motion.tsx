"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = "cubic-bezier(.16,1,.3,1)";
const READY_BUDGET = 1500;
const TRACES = [
  { selector: ".r-headline-highlight", delay: 0, duration: 500 },
  { selector: ".r-sample-circle", delay: 350, duration: 500 },
  { selector: ".r-plan-highlight", delay: 750, duration: 400 },
  { selector: ".r-proof-bracket", delay: 1000, duration: 500, vertical: true },
  { selector: ".r-source-highlight", delay: 1350, duration: 450 },
] as const;

function supportsInkMotion() {
  return "IntersectionObserver" in window && "animate" in Element.prototype
    && "matchMedia" in window && "fonts" in document
    && window.CSS?.supports("clip-path", "inset(0)");
}

async function inkReady(elements: HTMLElement[]) {
  const images = elements.flatMap(element => [...element.querySelectorAll("img")]);
  if (!images.length || images.some(image => typeof image.decode !== "function")) throw new Error("Ink unavailable");
  await Promise.all([document.fonts.ready, ...images.map(image => image.decode())]);
  if (images.some(image => !image.naturalWidth)) throw new Error("Ink unavailable");
}

/** Decorative ink is progressive: all text and marks are complete without JavaScript. */
export function ReadingMotion({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<() => void>(() => {});
  const [canReplay, setCanReplay] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !supportsInkMotion()) return;
    const quote = frame.querySelector<HTMLElement>(".r-source");
    const marks = TRACES.map(trace => frame.querySelector<HTMLElement>(trace.selector));
    if (!quote || marks.some(mark => !mark)) return;
    const plates = marks as HTMLElement[];
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let ready = false;
    let frameVisible = false;
    let quoteVisible = false;
    let firstVisibleAt: number | null = null;
    let autoPlayed = preference.matches;
    let run = 0;
    let animations: Animation[] = [];

    // Canceling removes every effect and immediately restores the static artwork.
    const cancel = () => {
      run++;
      animations.forEach(animation => animation.cancel());
      animations = [];
    };
    const play = () => {
      if (disposed || !ready || !frameVisible || preference.matches || document.visibilityState !== "visible") return;
      cancel();
      const currentRun = run;
      try {
        plates.forEach((plate, index) => {
          const trace = TRACES[index];
          const from = "vertical" in trace ? "inset(0 0 100% 0)" : "inset(0 100% 0 0)";
          animations.push(plate.animate([{ clipPath: from }, { clipPath: "inset(0)" }], {
            delay: trace.delay, duration: trace.duration, fill: "backwards", easing: EASE,
          }));
        });
        void Promise.all(animations.map(animation => animation.finished)).then(() => {
          if (!disposed && run === currentRun) cancel();
        }).catch(() => {});
      } catch {
        cancel();
      }
    };
    const maybePlay = () => {
      if (!ready || !frameVisible || !quoteVisible || autoPlayed || firstVisibleAt === null) return;
      autoPlayed = true;
      // A slow first load stays static; the explicit replay remains available later.
      if (performance.now() - firstVisibleAt <= READY_BUDGET) play();
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === frame) frameVisible = entry.isIntersecting;
        if (entry.target === quote) {
          quoteVisible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
          if (quoteVisible && firstVisibleAt === null) firstVisibleAt = performance.now();
        }
      }
      if (!frameVisible) cancel();
      maybePlay();
    }, { threshold: [0, 0.45] });
    const onPreferenceChange = () => {
      if (preference.matches) {
        autoPlayed = true;
        cancel();
      }
      setCanReplay(ready && !preference.matches);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        if (firstVisibleAt !== null) autoPlayed = true;
        cancel();
      }
    };

    replayRef.current = () => {
      autoPlayed = true;
      play();
    };
    observer.observe(frame);
    observer.observe(quote);
    preference.addEventListener("change", onPreferenceChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void inkReady(plates).then(() => {
      if (disposed) return;
      ready = true;
      setCanReplay(!preference.matches);
      maybePlay();
    }).catch(() => {});

    return () => {
      disposed = true;
      cancel();
      replayRef.current = () => {};
      observer.disconnect();
      preference.removeEventListener("change", onPreferenceChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div ref={frameRef} className="reading-frame">
      <p className="r-wordmark">AIDaddy</p>
      {canReplay && <button type="button" className="r-replay" onClick={() => replayRef.current()}>
        <RotateCcw aria-hidden="true" />Replay annotations
      </button>}
      {children}
    </div>
  );
}

/** A single decorative chapter mark draws when it reaches the reading area. */
export function InkReveal({ children, className }: { children: ReactNode; className: string }) {
  const markRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    if (!mark || !supportsInkMotion()) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let attempted = preference.matches;
    let visible = false;
    let animation: Animation | undefined;
    const cancel = () => animation?.cancel();
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.45);
      if (!visible) cancel();
      if (!visible || attempted) return;
      attempted = true;
      const visibleAt = performance.now();
      // Below-the-fold artwork is lazy-loaded; decode only after entering its viewport.
      void inkReady([mark]).then(() => {
        if (disposed || !visible || preference.matches || document.visibilityState !== "visible"
          || performance.now() - visibleAt > READY_BUDGET) return;
        try {
          animation = mark.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0)" }], {
            duration: 650, easing: EASE,
          });
          void animation.finished.then(cancel, () => {});
        } catch {
          cancel();
        }
      }).catch(() => {});
    }, { threshold: [0, 0.45], rootMargin: "0px 0px -64px 0px" });
    const onPreferenceChange = () => {
      if (preference.matches) {
        attempted = true;
        cancel();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") cancel();
    };
    observer.observe(mark);
    preference.addEventListener("change", onPreferenceChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      disposed = true;
      cancel();
      observer.disconnect();
      preference.removeEventListener("change", onPreferenceChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return <span ref={markRef} aria-hidden="true" className={`reading-ink-reveal ${className}`}>{children}</span>;
}
