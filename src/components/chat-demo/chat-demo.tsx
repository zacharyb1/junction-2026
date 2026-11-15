"use client";

import { useEffect, useRef } from "react";
import { type Beat, DURATION, PEOPLE, SCRIPT } from "@/components/chat-demo/script";
import { scrollToEnd, useReplayClock } from "@/components/demo/replay";
import { ORB_MARK } from "@/components/demo/orb-mark";

/** A scripted replay of AIDaddy in a family group chat (issue #33). Original styling, no app branding. */
export function ChatDemo({ loop = false }: { loop?: boolean }) {
  const now = useReplayClock(DURATION, loop);
  const list = useRef<HTMLOListElement>(null);

  const shown = SCRIPT.filter((b) => b.at <= now);
  const typing = SCRIPT.find(
    (b): b is Extract<Beat, { kind: "message" }> => b.kind === "message" && !!b.typing && now >= b.at - b.typing && now < b.at,
  );
  const isTyping = !!typing;

  // Both are watched: a long message that takes the place of the typing dots must be scrolled into view as well.
  useEffect(() => {
    scrollToEnd(list.current);
  }, [shown.length, isTyping]);

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
          <p className="chatdemo-sub">{typing ? "AIDaddy is typing…" : "Aino, Mikko, AIDaddy"}</p>
        </div>
      </header>

      {/* No aria-live: a screen reader would read the whole script aloud, unasked. The list takes focus so the keyboard can scroll it. */}
      <ol ref={list} className="chatdemo-list" tabIndex={0} aria-label="Messages in the family chat">
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
            <Avatar who="aidaddy" />
            <div className="chatdemo-bubble chatdemo-typing" aria-label="AIDaddy is typing">
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

function Avatar({ who }: { who: "aino" | "mikko" | "aidaddy" }) {
  if (who === "aidaddy") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="chatdemo-avatar" src={ORB_MARK} alt="" />;
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
            {beat.from === "aidaddy" && <span className="chatdemo-bot">bot</span>}
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
