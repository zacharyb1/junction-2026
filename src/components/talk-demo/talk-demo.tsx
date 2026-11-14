"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Issue #35: a scripted replay of a face-to-face conversation while UKK, on the phone on the table,
 * works in the background. Concept: UKK cannot listen on the phone yet, and in the concept he hears
 * nothing before his name. The research is a real run: kkv.fi, 3 of 3 quotes checked, 7.4 seconds,
 * https://86.38.238.136.sslip.io/c/awE0ewNWNgPE_nmE (the drafted complaint is on that case).
 */
export const CASE_URL = "https://86.38.238.136.sslip.io/c/awE0ewNWNgPE_nmE";
export const DURATION = 38000;

type Line = { at: number; who: "Aino" | "Mikko" | "UKK"; text: string };

const LINES: Line[] = [
  { at: 800, who: "Aino", text: "The landlord emailed. Rent goes up 8 % from January." },
  { at: 3000, who: "Mikko", text: "Eight percent? Is that even allowed?" },
  { at: 5200, who: "Aino", text: "UKK, check that while we talk." },
  { at: 6300, who: "UKK", text: "On it, in the background." },
  { at: 7800, who: "Mikko", text: "Anyway. Sauna tonight or tomorrow?" },
  { at: 10200, who: "Aino", text: "Tonight. I'm exhausted." },
  { at: 12600, who: "Mikko", text: "Deal. I'll heat it at seven." },
  { at: 20000, who: "Aino", text: "Oh, it already answered." },
  { at: 22000, who: "Mikko", text: "Read it out?" },
  { at: 23600, who: "Aino", text: "“The landlord does not have the right to increase the rent unilaterally during the tenancy.”" },
  { at: 27400, who: "Mikko", text: "So it depends on our lease. Let's look tonight." },
  { at: 29600, who: "Aino", text: "UKK, draft the complaint. I'll check it later." },
  { at: 30900, who: "UKK", text: "Drafted. It waits on the case page. I won't send it." },
];

const STEPS: [number, string][] = [
  [6800, "Searching Finnish official sites"],
  [8900, "Reading the consumer authority's pages"],
  [11000, "Checking 3 quotes on their pages: 3 of 3 found"],
];

export function TalkDemo({ loop = false }: { loop?: boolean }) {
  const [now, setNow] = useState(0);
  const start = useRef(0);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    start.current = performance.now();
    let frame = 0;
    const tick = () => {
      const t = performance.now() - start.current;
      if (t > DURATION && loop) start.current = performance.now();
      setNow(Math.min(t, DURATION));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loop]);

  const said = LINES.filter((l) => l.at <= now);
  const working = now >= 6300 && now < 13800;
  const steps = STEPS.filter(([at]) => now >= at);
  const answered = now >= 14200;
  const drafted = now >= 30900;
  const awake = said.at(-1)?.who === "UKK" || working;

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [said.length]);

  return (
    <div className="tdemo">
      <div className="tdemo-status">
        <span className={`tdemo-ear${awake ? " is-awake" : ""}`} aria-hidden />
        {awake ? "UKK is working" : "Listening for “UKK” · nothing is heard before his name"}
      </div>

      <ol ref={list} className="tdemo-lines" aria-live="polite">
        {said.map((l) => (
          <li key={l.at} className={`tdemo-line tdemo-line--${l.who.toLowerCase()}`}>
            <span className="tdemo-who">{l.who === "UKK" ? "UKK" : `${l.who} · spoken`}</span>
            <span>{l.text}</span>
          </li>
        ))}
      </ol>

      {working && (
        <div className="tdemo-task" aria-label="UKK working in the background">
          <p className="tdemo-task-title">In the background: rent increase</p>
          {steps.map(([at, text]) => (
            <p key={at} className="tdemo-step">
              ✓ {text}
            </p>
          ))}
        </div>
      )}

      {answered && (
        <div className={`tdemo-card${drafted ? " is-small" : ""}`}>
          <div className="tdemo-card-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ukk-avatar.jpg" alt="" />
            <div>
              <p className="tdemo-card-name">UKK</p>
              <p className="tdemo-card-sub">Rent increase: what the rules say</p>
            </div>
          </div>
          <ol className="tdemo-card-lines">
            <li>Allowed only if your tenancy agreement says so [1]</li>
            <li>You can ask how the new rent was calculated, free of charge [2]</li>
            <li>Complain to the landlord in writing first [3]</li>
          </ol>
          <p className="tdemo-card-meta">kkv.fi · 3 of 3 quotes checked · 7.4 s</p>
          <div className="tdemo-card-buttons">
            <span className={drafted ? "is-done" : ""}>{drafted ? "Complaint drafted ✓" : "Draft the complaint"}</span>
            <span>Open the case</span>
          </div>
        </div>
      )}
    </div>
  );
}
