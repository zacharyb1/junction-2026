"use client";

import { ArrowUp, ArrowUpRight, ChevronDown, Headphones, Pause, Play, Plus, SlidersHorizontal, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { activityNote } from "@/lib/avatar/events";
import { ACTIVITIES, type Activity, type Manifest } from "@/lib/avatar/types";
import { AvatarStage } from "./avatar-stage";
import { AvatarSettings, ROLE_LABELS } from "./avatar-settings";
import { ReplyContent } from "./reply-content";
import { useAvatarConversation } from "./use-avatar-conversation";
import { useAvatarPreferences } from "./use-avatar-preferences";
import "./avatar.css";

const PROMPTS = {
  everyday: ["Help me settle into life in Finland", "I have a letter I don’t understand"],
  paperwork: ["Explain a letter from my landlord", "What do I need to register in Finland?"],
  shopping: ["Help me choose a thoughtful gift", "What should I consider before buying a bike?"],
};

export function AvatarDemo({ profiles, code: initialCode, liveConfigured, voiceConfigured, needsCode }: {
  profiles: Manifest[]; code: string; liveConfigured: boolean; voiceConfigured: boolean; needsCode: boolean;
}) {
  const { preferences, save } = useAvatarPreferences(profiles);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState<Activity | null>(null);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState(initialCode);
  const chat = useAvatarConversation({ code, liveConfigured, voiceConfigured, settings: { name: preferences.name, role: preferences.role, tone: preferences.tone } });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const followReply = useRef(true);
  const note = activityNote(chat.agent);
  const profile = profiles.find((item) => item.profile === preferences.profile) ?? profiles[0];
  const isPreview = manual !== null && !chat.busy;
  const activity = isPreview ? manual : note.activity;
  const lastText = chat.turns.at(-1)?.text;
  const lastReply = chat.turns.findLast((turn) => turn.role === "assistant");

  useEffect(() => {
    if (followReply.current && thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [lastText, chat.turns.length, settingsOpen, chat.error]);
  useEffect(() => {
    if (!settingsOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSettingsOpen(false); settingsButton.current?.focus(); }
    };
    window.addEventListener("keydown", escape);
    document.querySelector<HTMLButtonElement>(".studio-settings .studio-icon-button")?.focus();
    return () => window.removeEventListener("keydown", escape);
  }, [settingsOpen]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (chat.busy || !draft.trim() || !liveConfigured || (needsCode && !code.trim())) return;
    setManual(null);
    followReply.current = true;
    void chat.runLive(draft);
    setDraft("");
  }
  function example() {
    setSettingsOpen(false); setManual(null); followReply.current = true;
    void chat.runExample();
  }
  function closeSettings() { setSettingsOpen(false); settingsButton.current?.focus(); }
  const stateLabel = isPreview ? `Movement preview · ${manual}` : chat.agent.error ? "Here when you’re ready" : chat.agent.pending || chat.agent.speaking ? note.text : "Here when you’re ready";

  return <main className="avatar-studio">
    <p className="studio-sr-only" role="status" aria-live="polite" aria-atomic="true">{lastReply?.status === "complete" ? "Your assistant’s reply is ready in the conversation." : ""}</p>
    <header className="studio-topbar">
      <Link className="studio-brand" href="/" aria-label="AIDaddy home">AIDaddy<span className="studio-brand-dot" aria-hidden="true" /></Link>
      <a className="studio-prototype-link" href="#about-companion">Companion prototype</a>
      <button ref={settingsButton} className="studio-personalize" aria-expanded={settingsOpen} aria-controls="studio-side-panel" onClick={() => setSettingsOpen(!settingsOpen)}><SlidersHorizontal size={17} /><span>Personalize</span></button>
    </header>
    <div className="studio-workspace">
      <section className="studio-presence" aria-labelledby="companion-heading">
        <div className="studio-person-heading"><div><h1 id="companion-heading">{preferences.name}<span> / your AI companion</span></h1><p>{ROLE_LABELS[preferences.role]}</p></div><span className="studio-availability"><span aria-hidden="true" />{chat.busy ? "With you" : "Ready when you are"}</span></div>
        <div className="studio-scene">
          <AvatarStage key={profile.profile} manifest={profile} activity={activity} paused={paused} />
          <div className="studio-scene-note" role="status"><span className={chat.busy ? "studio-state-dot is-active" : "studio-state-dot"} aria-hidden="true" />{stateLabel}</div>
          <button className="studio-motion-button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume movement" : "Pause movement"} aria-pressed={paused}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
        </div>
        <div className="studio-presence-controls">
          <button className="studio-sound" aria-pressed={chat.voiceEnabled} onClick={() => chat.setVoiceEnabled(!chat.voiceEnabled)}>{chat.voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>Voice {chat.voiceEnabled ? "on" : "off"}</span></button>
          <button className="studio-example" disabled={chat.busy} onClick={example}><Play size={15} fill="currentColor" />Try a recorded conversation <span>~50 sec</span></button>
        </div>
        <p className="studio-presence-footnote">{profile.medium === "stock" ? "Filmed stand-in for a personalized avatar." : profile.medium === "illustrated" ? "Illustrated companion with pre-rendered movements." : profile.placeholder ? "Playback test profile." : "Generated companion."} <a href="#about-companion">About this prototype <ArrowUpRight size={12} /></a></p>
      </section>
      <aside id="studio-side-panel" className="studio-side-panel" aria-label={settingsOpen ? "Companion settings" : "Conversation"}>
        {settingsOpen ? <AvatarSettings profiles={profiles} initial={preferences} onSave={(value) => { save(value); closeSettings(); }} onClose={closeSettings} /> : <section className={`studio-conversation${chat.turns.length ? "" : " is-empty"}`} aria-labelledby="conversation-heading">
          <header className="studio-panel-header"><h2 id="conversation-heading">Conversation</h2><button className="studio-icon-button" aria-label="Start a new conversation" title="Start a new conversation" disabled={chat.busy} onClick={async () => { if (await chat.clear()) { setDraft((current) => current === draft ? "" : current); textarea.current?.focus(); } }}><Plus size={20} /></button></header>
          <div className="studio-thread" ref={thread} tabIndex={0} aria-label="Conversation messages" onScroll={(event) => { const el = event.currentTarget; followReply.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90; }}>
            {!chat.turns.length ? <div className="studio-welcome"><p className="studio-welcome-title"><span className="studio-welcome-full">A little help. <br />A familiar face.</span><span className="studio-welcome-short">What’s on your mind?</span></p><p>Tell me what’s on your mind.<br />We’ll work through it together.</p><div className="studio-prompts">{PROMPTS[preferences.role].map((prompt) => <button key={prompt} onClick={() => { setDraft(prompt); textarea.current?.focus(); }}>{prompt}<ArrowUpRight size={16} /></button>)}</div></div> : <div className="studio-messages">{chat.turns.map((turn) => <article key={turn.id} className={`studio-message studio-message-${turn.role}`} aria-label={turn.role === "user" ? "Your message" : `${preferences.name}’s reply`}>
              <div className="studio-message-byline"><span>{turn.role === "user" ? "You" : preferences.name}</span>{turn.source === "recorded" && turn.role === "user" && <span className="studio-recorded-label">Recorded example</span>}</div>
              {turn.text ? <ReplyContent text={turn.text} sources={turn.sources} /> : turn.status === "streaming" ? <div className="studio-waiting"><span aria-hidden="true" /><p>{note.text}</p></div> : <p className="studio-help">{turn.status === "cancelled" ? "Stopped before a reply arrived." : "No reply arrived. Please try again."}</p>}
              {turn.status === "cancelled" && turn.text && <p className="studio-help">Reply stopped</p>}
              {turn.status === "error" && turn.text && <p className="studio-help">Reply incomplete — the connection was interrupted.</p>}
              {turn.sources && turn.text && <details className="studio-sources"><summary>{turn.sources.length} saved citations <ChevronDown size={14} /></summary><ul>{turn.sources.map((source) => <li key={source.n}><a href={source.url} target="_blank" rel="noreferrer">[{source.n}] {source.label}<ArrowUpRight size={13} /></a><blockquote>{source.quote}</blockquote></li>)}</ul></details>}
              {turn.role === "assistant" && turn.text && turn.status === "complete" && <button className="studio-read-aloud" disabled={chat.busy} onClick={() => void chat.speak(turn.id)}><Headphones size={14} />{turn.source === "recorded" ? "Hear recorded plan" : "Read aloud"}</button>}
            </article>)}</div>}
          </div>
          <div className="studio-compose-area">
            {chat.error && <p role="alert" className="studio-error">{chat.error}</p>}
            {chat.voiceNote && <p className="studio-voice-note" role="status">{chat.voiceNote}</p>}
            {chat.mode === "recorded" && <p className="studio-voice-note">This saved example isn’t part of your live chat’s memory.</p>}
            {!liveConfigured && <p className="studio-help">Live chat isn’t connected here. Try the recorded conversation.</p>}
            <form onSubmit={submit}>
              {needsCode && <label className="studio-access-label" htmlFor="avatar-code">Demo access code<input id="avatar-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" /></label>}
              <div className="studio-composer"><label className="studio-sr-only" htmlFor="avatar-question">Message {preferences.name}</label><textarea ref={textarea} id="avatar-question" rows={2} maxLength={1200} value={draft} placeholder={`Message ${preferences.name}…`} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
                {chat.busy ? <button type="button" className="studio-send" aria-label="Stop reply and voice" onClick={chat.stop}><Square size={15} fill="currentColor" /></button> : <button type="submit" className="studio-send" aria-label="Send message" disabled={!draft.trim() || !liveConfigured || (needsCode && !code.trim())}><ArrowUp size={21} /></button>}
              </div>
            </form>
            <div className="studio-compose-hint"><span>AI companion · check important details</span>{draft.length > 1000 && <span>{draft.length}/1200</span>}</div>
          </div>
        </section>}
      </aside>
    </div>
    <footer className="studio-footer" id="about-companion"><details><summary>About this prototype <ChevronDown size={14} /></summary><div className="studio-about-content"><p>This separate concept explores an assistant you can see at work. Its movements follow real tool events; the recorded conversation replays an earlier run with its saved voice and sources.</p><p>The natural look uses edited footage by <a href="https://www.pexels.com/video/man-using-a-laptop-looking-at-the-camera-8643569/" target="_blank" rel="noreferrer">Edmond Dantès on Pexels</a>, under the <a href="https://www.pexels.com/license/" target="_blank" rel="noreferrer">Pexels license</a>. The person is a visual stand-in, with no association or endorsement. Ari and Noor are original illustrations.</p><p>Custom video generation and lip-sync are not included. Names, focus and tone affect new live requests. Preferences stay in this browser; live messages go to the team’s chat service. Reloading hides the visible thread but keeps its server session until you start a new conversation.</p><details className="studio-diagnostics"><summary>Movement and event preview</summary><p>Preview a movement without a model or microphone. Clips finish at a shared pose before switching.</p><div className="studio-debug-controls">{ACTIVITIES.map((item) => <button key={item} disabled={chat.busy} aria-pressed={manual === item} onClick={() => setManual(item)}>{item}</button>)}<button disabled={chat.busy} aria-pressed={manual === null} onClick={() => setManual(null)}>Follow assistant</button></div><ol>{chat.log.length ? chat.log.map((line, i) => <li key={i}>{line}</li>) : <li>No events yet.</li>}</ol></details></div></details><span>A presence, at your pace.</span></footer>
  </main>;
}
