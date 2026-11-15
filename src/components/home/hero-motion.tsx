"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** The ink connects a life event, its next step, and the sentence behind it. */
export function HeroMotion({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLElement>(null);
  const replay = useRef(() => {});
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const frame = hero.current;
    if (!frame || !("IntersectionObserver" in window) || !("animate" in Element.prototype)
      || !("fonts" in document) || !("decode" in HTMLImageElement.prototype)
      || !window.CSS?.supports("clip-path", "inset(0)")) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let ready = false;
    let visible = false;
    let attempted = preference.matches;
    let firstVisibleAt: number | null = null;
    let animations: Animation[] = [];
    const marks = [...frame.querySelectorAll<HTMLElement>("[data-home-ink]")];
    const cancel = () => {
      animations.forEach(animation => animation.cancel());
      animations = [];
    };
    const play = () => {
      cancel();
      if (!ready || !visible || preference.matches || document.visibilityState !== "visible") return;
      // Only decorative pigment is revealed. The words and all controls are always present.
      animations = marks.map((mark, index) => mark.animate(
        [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0)" }],
        { duration: 700, delay: index * 360, fill: "backwards", easing: "cubic-bezier(.16,1,.3,1)" },
      ));
      const current = animations;
      void Promise.all(current.map(animation => animation.finished)).then(() => {
        current.forEach(animation => animation.cancel());
      }).catch(() => {});
    };
    const maybePlay = () => {
      if (!ready || !visible || attempted || firstVisibleAt === null) return;
      attempted = true;
      if (performance.now() - firstVisibleAt < 1500) play();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && firstVisibleAt === null) firstVisibleAt = performance.now();
      if (!visible) cancel();
      maybePlay();
    });
    const onPreference = () => {
      if (preference.matches) { attempted = true; cancel(); }
      setAvailable(ready && !preference.matches);
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") { attempted = true; cancel(); }
    };
    replay.current = () => { attempted = true; play(); };
    observer.observe(frame);
    preference.addEventListener("change", onPreference);
    document.addEventListener("visibilitychange", onVisibility);
    const images = marks.flatMap(mark => [...mark.querySelectorAll("img")]);
    void Promise.all([document.fonts.ready, ...images.map(image => image.decode())]).then(() => {
      if (disposed || images.some(image => !image.naturalWidth)) return;
      ready = true;
      setAvailable(!preference.matches);
      maybePlay();
    }).catch(() => {});
    return () => {
      disposed = true;
      cancel();
      observer.disconnect();
      replay.current = () => {};
      preference.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <section ref={hero} className="wh-hero wh-wrap" aria-labelledby="wh-title">
    {children}
    {available && <button type="button" className="wh-replay" onClick={() => replay.current()}>
      <RotateCcw size={15} aria-hidden="true" /> Replay the ink
    </button>}
  </section>;
}
