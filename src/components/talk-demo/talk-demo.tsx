"use client";

import { useEffect, useRef } from "react";
import { scrollToEnd, useReplayClock } from "@/components/demo/replay";
import { ORB_MARK } from "@/components/demo/orb-mark";

/**
 * Issue #35: a scripted replay of a face-to-face conversation while AIDaddy, on the phone on the table,
 * works in the background. The replay is a fixed script. Listening itself is real at /listen (a web page left
 * open on a device; see src/components/listen/). The research is a real run: kkv.fi, 3 of 3 quotes checked, 7.4 seconds,
 * https://86.38.238.136.sslip.io/c/awE0ewNWNgPE_nmE (the drafted complaint is on that case).
 */
export const CASE_URL = "https://86.38.238.136.sslip.io/c/awE0ewNWNgPE_nmE";
export const DURATION = 38000;

type Line = { at: number; who: "Aino" | "Mikko" | "AIDaddy"; text: string };

const LINES: Line[] = [
  { at: 800, who: "Aino", text: "The landlord emailed. Rent goes up 8 % from January." },
  { at: 3000, who: "Mikko", text: "Eight percent? Is that even allowed?" },
  { at: 5200, who: "Aino", text: "AIDaddy, check that while we talk." },
  { at: 6300, who: "AIDaddy", text: "On it, in the background." },
  { at: 7800, who: "Mikko", text: "Anyway. Sauna tonight or tomorrow?" },
  { at: 10200, who: "Aino", text: "Tonight. I'm exhausted." },
  { at: 12600, who: "Mikko", text: "Deal. I'll heat it at seven." },
  { at: 20000, who: "Aino", text: "Oh, it already answered." },
  { at: 22000, who: "Mikko", text: "Read it out?" },
  { at: 23600, who: "Aino", text: "“The landlord does not have the right to increase the rent unilaterally during the tenancy.”" },
  { at: 27400, who: "Mikko", text: "So it depends on our lease. Let's look tonight." },
  { at: 29600, who: "Aino", text: "AIDaddy, draft the complaint. I'll check it later." },
  { at: 30900, who: "AIDaddy", text: "Drafted. It waits on the case page. I won't send it." },
];

const STEPS: [number, string][] = [
  [6800, "Searching Finnish official sites"],
  [8900, "Reading the consumer authority's pages"],
  [11000, "Checking 3 quotes on their pages: 3 of 3 found"],
];

export function TalkDemo({ loop = false }: { loop?: boolean }) {
  const now = useReplayClock(DURATION, loop);
  const list = useRef<HTMLOListElement>(null);

  const said = LINES.filter((l) => l.at <= now);
  const working = now >= 6300 && now < 13800;
  const steps = STEPS.filter(([at]) => now >= at);
  const answered = now >= 14200;
  const drafted = now >= 30900;
  // AIDaddy is at work from its name until the answer lands, and again from the request for a draft until the draft is there.
  const awake = working || (now >= 29600 && now < 30900);

  // The task card and the answer card take room from the list when they appear, so the last line is brought back into view then too.
  useEffect(() => {
    scrollToEnd(list.current);
  }, [said.length, working, answered]);

  return (
    <div className="tdemo">
      <div className="tdemo-status">
        <span className={`tdemo-ear${awake ? " is-awake" : ""}`} aria-hidden />
        {awake ? "AIDaddy is working" : "Listening for “AIDaddy” · nothing is heard before its name"}
      </div>

      {/* No aria-live: a screen reader would read the whole script aloud, unasked. The list takes focus so the keyboard can scroll it. */}
      <ol ref={list} className="tdemo-lines" tabIndex={0} aria-label="What is said at the table">
        {said.map((l) => (
          <li key={l.at} className={`tdemo-line tdemo-line--${l.who.toLowerCase()}`}>
            <span className="tdemo-who">{l.who === "AIDaddy" ? "AIDaddy" : `${l.who} · spoken`}</span>
            <span>{l.text}</span>
          </li>
        ))}
      </ol>

      {working && (
        <div className="tdemo-task" aria-label="AIDaddy working in the background">
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
            <img src={ORB_MARK} alt="" />
            <div>
              <p className="tdemo-card-name">AIDaddy</p>
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
