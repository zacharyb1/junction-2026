"use client";

/**
 * "Your household": twelve family apps around AIDaddy's sound-wave mark, little dots of data flowing in, and what AIDaddy
 * learns about each person. The apps and facts are examples: this demo does not connect real accounts.
 */

import { useEffect, useState } from "react";
import { householdFrame, MAP_CENTRE } from "@/lib/home-demo";
import { AppLogo, BackButton, H1, useNav } from "./ui";
import { useFound } from "./home-app";

const TICK_MS = 700;

// Dots stop short of the centre so they never cross the sound wave.
function end(x: number, y: number) {
  const dx = x - MAP_CENTRE[0];
  const dy = y - MAP_CENTRE[1];
  const d = Math.hypot(dx, dy);
  return { ex: Math.round(MAP_CENTRE[0] + (dx / d) * 34), ey: Math.round(MAP_CENTRE[1] + (dy / d) * 34) };
}

const WAVES: [number, string][] = [
  [16, "-.5s"],
  [32, "-.2s"],
  [46, "-.7s"],
  [34, "-.35s"],
  [22, "-.6s"],
  [13, "-.1s"],
];

export function HouseholdScreen() {
  const nav = useNav();
  const found = useFound();
  const [t, setT] = useState(0);

  // One fact every 0.7 s; the finished map then stays put.
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x > 13 ? x : x + 1)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const f = householdFrame(t);

  return (
    <>
      <header className="flex flex-none flex-col gap-1.5 px-6 pb-2 pt-[calc(var(--aidaddy-top)+4px)]">
        <BackButton label="Back" />
        <H1>Your household</H1>
        <span className="flex h-[18px] items-center gap-1.5 text-sm text-[#7a6e66]" aria-live="polite">
          {f.current && <AppLogo app={f.current} size={16} />}
          {f.status}
        </span>
      </header>

      <div className="aidaddy-scroll flex min-h-0 flex-1 flex-col">
        <section aria-label="Apps feeding AIDaddy" className="relative mx-auto mt-1 h-[330px] w-[342px] flex-none">
          <svg aria-hidden="true" width="342" height="330" viewBox="0 0 342 330" className="absolute inset-0 overflow-visible">
            {f.nodes
              .filter((n) => n.seen || n.now)
              .flatMap((n) =>
                [0, 1].map((i) => {
                  const { ex, ey } = end(n.x, n.y);
                  const begin = `${-2 * i - (n.x % 7) * 0.3}s`;
                  return (
                    <circle key={`${n.app}-${i}`} r={2.5} fill="rgba(224,130,90,.55)" opacity={0}>
                      <animateMotion dur="4s" begin={begin} repeatCount="indefinite" path={`M${n.x},${n.y} L${ex},${ey}`} />
                      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.45;1" dur="4s" begin={begin} repeatCount="indefinite" />
                    </circle>
                  );
                }),
              )}
          </svg>
          <div
            className={`aidaddy-orb absolute ${f.done ? "still" : ""}`}
            role="img"
            aria-label={`AIDaddy, ${t === 0 ? "connecting" : `${f.learned} learned`}`}
            style={{ left: 121, top: 125, width: 100, height: 80 }}
          >
            <div className="absolute inset-0 flex items-center justify-center gap-[5px]">
              {WAVES.map(([h, delay], i) => (
                <span key={i} className="aidaddy-wave" style={{ height: h, animationDelay: delay }} />
              ))}
            </div>
          </div>
          {f.nodes.map((n) => {
            const size = n.now ? 40 : 30;
            const lit = n.seen || n.now;
            return (
              <AppLogo
                key={n.app}
                app={n.app}
                size={size}
                label={n.app}
                className="aidaddy-logo absolute"
                style={{ left: n.x, top: n.y, transform: "translate(-50%,-50%)", opacity: lit ? 1 : 0.35, filter: lit ? "none" : "grayscale(1)" }}
              />
            );
          })}
        </section>

        <div className="flex flex-col px-6 pt-1">
          {f.people.map((p) => (
            <div key={p.name} className="box-border flex min-h-14 flex-none items-center gap-3 border-b border-[#ece6dc] py-2" style={{ opacity: p.facts ? 1 : 0.45 }}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">
                  {p.name} <span className="font-normal text-[#8f8379]">{p.age}</span>
                </span>
                <span className="truncate text-[13px] leading-[1.35] text-[#7a6e66]">{p.facts || "Learning…"}</span>
              </span>
              <span className="flex flex-none gap-1">
                {p.apps.map((a) => (
                  <AppLogo key={a} app={a} size={16} label={`From ${a}`} className="aidaddy-rise" />
                ))}
              </span>
            </div>
          ))}
          <p className="m-0 py-2 text-[11px] text-[#8f8379]">Demo: example apps and facts. AIDaddy only reads, and nothing is sent without your yes.</p>
        </div>
      </div>

      <footer className="flex-none px-6 pb-[calc(var(--aidaddy-bottom)+10px)] pt-3">
        <button
          type="button"
          disabled={!f.done}
          onClick={() => nav.tab("hidden")}
          className="h-[52px] w-full rounded-2xl text-base font-semibold transition-colors"
          style={{ background: f.done ? "#c4572f" : "#e9e3d9", color: f.done ? "#fff" : "#8f8379" }}
        >
          {f.done ? `See ${found} hidden finds` : "Building your household…"}
        </button>
      </footer>
    </>
  );
}
