"use client";

import { useReplayClock } from "@/components/demo/replay";

/**
 * Issue #34: a scripted replay of AIDaddy noticing that someone is stuck on a tax return, fixing the
 * mistake, and calling them. The form is illustrative (made-up address, no authority's branding).
 * The rules AIDaddy cites come from a real run on vero.fi pages:
 * https://86.38.238.136.sslip.io/c/VmOaZsrU6ej6MtdN (6 of 6 quotes checked). The call is a concept.
 */
export const CASE_URL = "https://86.38.238.136.sslip.io/c/VmOaZsrU6ej6MtdN";
export const DURATION = 36000;

const typed = (text: string, from: number, to: number, now: number) =>
  now < from ? "" : text.slice(0, Math.ceil(((Math.min(now, to) - from) / (to - from)) * text.length));

const CAPTIONS: [number, string][] = [
  [24200, "Hi Aino, it's AIDaddy. You were stuck on commuting expenses."],
  [27000, "The rule says the cheapest fare counts, even if you drove [1]."],
  [29800, "The first 800 euros are your own share [3]. I switched it to public transport."],
  [32600, "Check it, and press submit when you're ready. I won't send anything."],
];

export function BrowserDemo({ loop = false }: { loop?: boolean }) {
  const now = useReplayClock(DURATION, loop);

  const fixed = now >= 16000;
  const transport = now < 1200 ? "Choose…" : fixed ? "Public transport (cheapest fare)" : "Own car";
  const distance = typed("23 km", 2000, 3000, now);
  // Typing the amount, deleting it, trying again, then stalling: the stuck moment.
  const amount =
    now < 3400 ? "" : now < 4600 ? typed("4 600 €", 3400, 4600, now) : now < 5600 ? "4 6" : now < 6400 ? typed("4 600 € + parking?", 5600, 6400, now) : now < 7200 ? "4 600 € + par" : now < 15500 ? "4 600 € + par" : "4 600 €";
  const stuck = now >= 8000 && now < 16000;
  const panel = now >= 9200;
  const line = (at: number) => now >= at;
  const ringing = now >= 21200 && now < 23400;
  const call = now >= 21200 && now < 34800;
  const captions = CAPTIONS.filter(([at]) => now >= at);

  return (
    <div className="bdemo">
      <div className="bdemo-chrome">
        <span className="bdemo-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="bdemo-tab">Tax return 2026 · illustrative</span>
        <span className="bdemo-url">tax.example/return/deductions</span>
      </div>

      <div className="bdemo-body">
        <form className="bdemo-form" aria-label="Illustrative tax return form">
          <p className="bdemo-step">Step 4 of 6 · Deductions</p>
          <h2 className="bdemo-h">Travel between home and work</h2>
          <label className={`bdemo-field${fixed ? " is-fixed" : ""}`}>
            <span>Means of transport</span>
            <output>{transport}</output>
            {fixed && <em>Changed by AIDaddy</em>}
          </label>
          <label className="bdemo-field">
            <span>Distance one way</span>
            <output>{distance}</output>
          </label>
          <label className={`bdemo-field${stuck ? " is-stuck" : ""}`}>
            <span>Costs for the year</span>
            <output>
              {amount}
              {now >= 3400 && now < 16000 && <b className="bdemo-caret" aria-hidden />}
            </output>
          </label>
          {stuck && <p className="bdemo-stuck">On this field for 4 minutes · typed, deleted, typed again</p>}
          <div className="bdemo-actions">
            <span className="bdemo-back">Back</span>
            <span className={`bdemo-submit${now >= 18200 ? " is-waiting" : ""}`}>Submit return</span>
          </div>
          {now >= 18200 && <p className="bdemo-wait">Submitting waits for your click. AIDaddy never submits.</p>}
        </form>

        <aside className={`bdemo-panel${panel ? " is-open" : ""}`} aria-hidden={!panel}>
          <div className="bdemo-panel-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aidaddy-avatar.svg" alt="" />
            <div>
              <p className="bdemo-panel-name">AIDaddy</p>
              <p className="bdemo-panel-sub">reading along in your browser</p>
            </div>
          </div>
          {line(9800) && <p className="bdemo-msg">You have been on this field for a while. Two things the official pages say:</p>}
          {line(11400) && (
            <p className="bdemo-rule">
              The lowest commuter fare counts, even if you drove to work <sup>[1]</sup>
            </p>
          )}
          {line(12800) && (
            <p className="bdemo-rule">
              The first €800 is your own share, then up to €7,000 can be deducted <sup>[3][4]</sup>
            </p>
          )}
          {line(14000) && (
            <span className={`bdemo-fix${now >= 15200 ? " is-pressed" : ""}`}>{now >= 16000 ? "Fixed: public transport" : "Fix it for me"}</span>
          )}
          {line(16800) && <p className="bdemo-msg">I changed one field. Nothing is submitted. vero.fi, 6 of 6 quotes checked.</p>}
        </aside>
      </div>

      {call && (
        // The dock is what lets the call follow the screen on a phone, where the window is taller than the screen.
        <div className="bdemo-call-dock">
          <div className="bdemo-call" role="group" aria-label="AIDaddy is calling: a concept">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aidaddy-avatar.svg" alt="" className={ringing ? "is-ringing" : ""} />
            <p className="bdemo-call-name">AIDaddy</p>
            <p className="bdemo-call-state">{ringing ? "calling…" : "00:" + String(Math.floor((now - 23400) / 1000)).padStart(2, "0")}</p>
            <div className="bdemo-captions">
              {captions.map(([at, text]) => (
                <p key={at}>{text}</p>
              ))}
            </div>
            <div className="bdemo-call-buttons" aria-hidden>
              <span className="is-decline">✕</span>
              <span className={`is-accept${ringing ? " is-pulse" : ""}`}>✆</span>
            </div>
            <p className="bdemo-concept">Concept: AIDaddy cannot place calls yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}
