"use client";

import { useEffect, useRef, useState } from "react";
import { type Beat, DURATION, PEOPLE, SCRIPT } from "@/components/chat-demo/script";

/** A scripted replay of UKK in a family group chat (issue #33). Original styling, no app branding. */
export function ChatDemo({ loop = false }: { loop?: boolean }) {
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

  const shown = SCRIPT.filter((b) => b.at <= now);
  const typing = SCRIPT.find(
    (b): b is Extract<Beat, { kind: "message" }> => b.kind === "message" && !!b.typing && now >= b.at - b.typing && now < b.at,
  );
  const count = shown.length + (typing ? 1 : 0);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [count]);

  return (
    <div className="chatdemo">
      <header className="chatdemo-head">
        <span className="chatdemo-back" aria-hidden>
          ‹
        </span>
        <span className="chatdemo-group" aria-hidden>
          LF
        </span>
        <div>
          <p className="chatdemo-title">Lehtonen family</p>
          <p className="chatdemo-sub">{typing ? "UKK is typing…" : "Aino, Mikko, UKK"}</p>
        </div>
      </header>

      <ol ref={list} className="chatdemo-list" aria-live="polite">
        {shown.map((beat, i) =>
          beat.kind === "note" ? (
            <li key={i} className="chatdemo-note">
              {beat.text}
            </li>
          ) : (
            <Message key={i} beat={beat} />
          ),
        )}
        {typing && (
          <li className="chatdemo-row">
            <Avatar who="ukk" />
            <div className="chatdemo-bubble chatdemo-typing" aria-label="UKK is typing">
              <span />
              <span />
              <span />
            </div>
          </li>
        )}
      </ol>

      <footer className="chatdemo-input" aria-hidden>
        <span>Message</span>
      </footer>
    </div>
  );
}

function Avatar({ who }: { who: "aino" | "mikko" | "ukk" }) {
  if (who === "ukk") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="chatdemo-avatar" src="/ukk-avatar.jpg" alt="" />;
  }
  return (
    <span className="chatdemo-avatar" style={{ background: PEOPLE[who].color }}>
      {PEOPLE[who].initials}
    </span>
  );
}

function Message({ beat }: { beat: Extract<Beat, { kind: "message" }> }) {
  const mine = beat.from === "aino";
  return (
    <li className={mine ? "chatdemo-row chatdemo-row--mine" : "chatdemo-row"}>
      {!mine && <Avatar who={beat.from} />}
      <div className={mine ? "chatdemo-bubble chatdemo-bubble--mine" : "chatdemo-bubble"}>
        {!mine && (
          <p className="chatdemo-name" style={{ color: PEOPLE[beat.from].color }}>
            {PEOPLE[beat.from].name}
            {beat.from === "ukk" && <span className="chatdemo-bot">bot</span>}
          </p>
        )}
        <p className="chatdemo-text">{beat.text}</p>
        {beat.preview && (
          <a className="chatdemo-preview" href={beat.preview.href} target="_blank" rel="noreferrer">
            <span className="chatdemo-preview-site">{beat.preview.site}</span>
            <span className="chatdemo-preview-title">{beat.preview.title}</span>
            <span className="chatdemo-preview-desc">{beat.preview.description}</span>
          </a>
        )}
        {beat.buttons && (
          <div className="chatdemo-buttons">
            {beat.buttons.map((b) => (
              <span key={b} className="chatdemo-button">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
