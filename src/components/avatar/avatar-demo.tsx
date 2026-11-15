"use client";

import { ArrowUp, ArrowUpRight, ChevronDown, Headphones, Pause, Play, Plus, SlidersHorizontal, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { activityNote } from "@/lib/avatar/events";
import { ACTIVITIES, type Activity, type Manifest } from "@/lib/avatar/types";
import { PREPARED_FOLLOW_UPS, PREPARED_SCENES, type PreparedSceneId } from "@/lib/avatar/prepared-scenes";
import { AvatarStage } from "./avatar-stage";
import { PresenceStage } from "./presence-stage";
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
  const profile = profiles.find((item) => item.profile === preferences.profile) ?? profiles[0];
  // The prepared answers are one ElevenLabs voice, whichever look is chosen.
  const desk = profiles.find((item) => item.presence)?.presence;
  const preparedSpeech = desk?.speech ?? {};
  const chat = useAvatarConversation({ code, liveConfigured, voiceConfigured, preparedSpeech, paused, settings: { name: preferences.name, role: preferences.role, tone: preferences.tone } });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const followReply = useRef(true);
  const scrollPosition = useRef<{ node: HTMLDivElement | null; top: number }>({ node: null, top: 0 });
  const previousProfile = useRef(profile.profile);
  const note = activityNote(chat.agent);
  const isPreview = !profile.presence && manual !== null && !chat.busy;
  const activity = isPreview ? manual : note.activity;
  const lastText = chat.turns.at(-1)?.text;
  const lastReply = chat.turns.findLast((turn) => turn.role === "assistant");
  const hasPreparedConversation = chat.turns.some((turn) => turn.role === "assistant" && turn.scene === "pregnancy" && turn.status === "complete");
  const deskCredit = desk?.attribution;
  const stop = chat.stop;

  useEffect(() => {
    if (previousProfile.current !== profile.profile) {
      previousProfile.current = profile.profile;
      stop();
    }
  }, [profile.profile, stop]);

  useEffect(() => {
    if (followReply.current && thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [lastText, chat.turns.length, settingsOpen, chat.error, chat.voiceNote, hasPreparedConversation]);
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
    if (!draft.trim() || !liveConfigured || (needsCode && !code.trim())) return;
    chat.stop();
    setManual(null);
    followReply.current = true;
    void chat.runLive(draft);
    setDraft("");
  }
  function example(scene: PreparedSceneId = "pregnancy") {
    chat.stop();
    setSettingsOpen(false); setManual(null); followReply.current = true;
    void chat.runExample(scene);
  }
  function closeSettings() { setSettingsOpen(false); settingsButton.current?.focus(); }
  function trackScroll(el: HTMLDivElement) {
    const previous = scrollPosition.current;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 90) followReply.current = true;
    else if (previous.node === el && el.scrollTop < previous.top - 2) followReply.current = false;
    // New content or a taller composer can increase the distance to the bottom.
    // Only an upward scroll means the reader deliberately left the newest reply.
    scrollPosition.current = { node: el, top: el.scrollTop };
  }
  const stateLabel = paused && chat.talking ? "Voice and picture paused" :
    isPreview ? `Movement preview · ${manual}` : chat.agent.error ? "Here when you’re ready" :
    chat.agent.pending || chat.agent.speaking ? `${chat.mode === "recorded" ? "Recorded · " : ""}${note.text}` : "Here when you’re ready";

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
          {profile.presence ? <PresenceStage key={profile.profile} manifest={profile.presence} talking={chat.talking} paused={paused} /> :
            <AvatarStage key={profile.profile} manifest={profile} activity={activity} paused={paused} />}
          <div className="studio-scene-note" role="status"><span className={chat.busy ? "studio-state-dot is-active" : "studio-state-dot"} aria-hidden="true" />{stateLabel}</div>
          <button className="studio-motion-button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume picture and voice" : "Pause picture and voice"} aria-pressed={paused}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
        </div>
        <div className="studio-presence-controls">
          <button className="studio-sound" aria-pressed={chat.voiceEnabled} onClick={() => chat.setVoiceEnabled(!chat.voiceEnabled)}>{chat.voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>Voice {chat.voiceEnabled ? "on" : "off"}</span></button>
          <button className="studio-example" onClick={() => example()}><Play size={15} fill="currentColor" />Try a prepared conversation <span>{preparedSpeech.pregnancy ? `~${Math.ceil((preparedSpeech.pregnancy.durationMs + 9_000) / 1000)} sec` : "~25 sec"}</span></button>
        </div>
        <p className="studio-presence-footnote">{profile.presence ? "Stock footage of an actor with an ElevenLabs voice. Lips are not synchronised. The person is not part of the team." : profile.medium === "illustrated" ? "Illustrated companion with pre-rendered movements." : profile.placeholder ? "Playback test profile." : "Generated companion."} <a href="#about-companion">About this prototype <ArrowUpRight size={12} /></a></p>
      </section>
      <aside id="studio-side-panel" className="studio-side-panel" aria-label={settingsOpen ? "Companion settings" : "Conversation"}>
        {settingsOpen ? <AvatarSettings profiles={profiles} initial={preferences} onSave={(value) => { if (value.profile !== profile.profile) chat.stop(); save(value); closeSettings(); }} onClose={closeSettings} /> : <section className={`studio-conversation${chat.turns.length ? "" : " is-empty"}`} aria-labelledby="conversation-heading">
          <header className="studio-panel-header"><h2 id="conversation-heading">Conversation</h2><button className="studio-icon-button" aria-label="Start a new conversation" title="Start a new conversation" onClick={async () => { if (await chat.clear()) { setDraft((current) => current === draft ? "" : current); textarea.current?.focus(); } }}><Plus size={20} /></button></header>
          <div className="studio-thread" ref={thread} tabIndex={0} aria-label="Conversation messages" onScroll={(event) => trackScroll(event.currentTarget)}>
            {!chat.turns.length ? <div className="studio-welcome"><p className="studio-welcome-title"><span className="studio-welcome-full">A little help. <br />A familiar face.</span><span className="studio-welcome-short">What’s on your mind?</span></p><p>Tell me what’s on your mind.<br />We’ll work through it together.</p><div className="studio-prompts">{PROMPTS[preferences.role].map((prompt) => <button key={prompt} onClick={() => { setDraft(prompt); textarea.current?.focus(); }}>{prompt}<ArrowUpRight size={16} /></button>)}</div></div> : <div className="studio-messages">{chat.turns.map((turn) => <article key={turn.id} className={`studio-message studio-message-${turn.role}`} aria-label={turn.role === "user" ? "Your message" : `${preferences.name}’s reply`}>
              <div className="studio-message-byline"><span>{turn.role === "user" ? "You" : preferences.name}</span>{turn.scene ? <span className="studio-recorded-label">Prepared scene</span> : turn.source === "recorded" && <span className="studio-recorded-label">Recorded example</span>}</div>
              {turn.text ? <ReplyContent text={turn.text} sources={turn.sources} /> : turn.status === "streaming" ? <div className="studio-waiting"><span aria-hidden="true" /><p>{note.text}</p></div> : <p className="studio-help">{turn.status === "cancelled" ? "Stopped before a reply arrived." : "No reply arrived. Please try again."}</p>}
              {turn.status === "cancelled" && turn.text && <p className="studio-help">Reply stopped</p>}
              {turn.status === "error" && turn.text && <p className="studio-help">Reply incomplete — the connection was interrupted.</p>}
              {turn.sources && turn.text && <details className="studio-sources" open={turn.scene === "clinic" || turn.scene === "employer"}><summary>{turn.sources.length} saved {turn.sources.length === 1 ? "citation" : "citations"} <ChevronDown size={14} /></summary><ul>{turn.sources.map((source) => <li key={source.n}><a href={source.url} target="_blank" rel="noreferrer">[{source.n}] {source.label}<ArrowUpRight size={13} /></a><blockquote>{source.quote}</blockquote></li>)}</ul></details>}
              {turn.role === "assistant" && turn.scene && preparedSpeech[turn.scene] && <details className="studio-transcript"><summary>Prepared speech transcript <ChevronDown size={14} /></summary><p>{preparedSpeech[turn.scene]!.transcript}</p><p className="studio-help">Synthetic ElevenLabs voice. The filmed mouth movements are not synchronised with the words.</p></details>}
              {turn.role === "assistant" && turn.text && turn.status === "complete" && <button className="studio-read-aloud" onClick={() => void chat.speak(turn.id)}><Headphones size={14} />{turn.scene && preparedSpeech[turn.scene] ? "Replay prepared answer" : turn.source === "recorded" ? "Hear saved answer" : "Read aloud"}</button>}
            </article>)}</div>}
          </div>
          <div className="studio-compose-area">
            {hasPreparedConversation && <div className="studio-follow-ups" aria-label="Prepared follow-up scenes"><p>Continue this prepared conversation</p>{PREPARED_FOLLOW_UPS.map((scene) => <button key={scene} onClick={() => example(scene)}>{PREPARED_SCENES[scene].label}<ArrowUpRight size={15} /></button>)}</div>}
            {chat.error && <p role="alert" className="studio-error">{chat.error}</p>}
            {chat.voiceNote && <p className="studio-voice-note" role="status">{chat.voiceNote}</p>}
            {chat.mode === "recorded" && <p className="studio-voice-note">This saved example isn’t part of your live chat’s memory.</p>}
            {!liveConfigured && <p className="studio-help">Live chat isn’t connected here. Try the recorded conversation.</p>}
            <form onSubmit={submit}>
              {needsCode && <label className="studio-access-label" htmlFor="avatar-code">Demo access code<input id="avatar-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" /></label>}
              <div className="studio-composer"><label className="studio-sr-only" htmlFor="avatar-question">Message {preferences.name}</label><textarea ref={textarea} id="avatar-question" rows={2} maxLength={1200} value={draft} placeholder={`Message ${preferences.name}…`} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
                {chat.busy && !draft.trim() ? <button type="button" className="studio-send" aria-label="Stop reply and voice" onClick={chat.stop}><Square size={15} fill="currentColor" /></button> : <button type="submit" className="studio-send" aria-label={chat.busy ? "Interrupt and send message" : "Send message"} disabled={!draft.trim() || !liveConfigured || (needsCode && !code.trim())}><ArrowUp size={21} /></button>}
              </div>
            </form>
            <div className="studio-compose-hint"><span>AI companion · check important details</span>{draft.length > 1000 && <span>{draft.length}/1200</span>}</div>
          </div>
        </section>}
      </aside>
    </div>
    <footer className="studio-footer" id="about-companion"><details><summary>About this prototype <ChevronDown size={14} /></summary><div className="studio-about-content">
      {desk && <p>The desk companion is one locked-off stock clip, cut into short segments that each begin and end in one of three resting poses. The player usually picks a next segment that starts in the pose the last one ended in, so the join is not visible; a change between poses shows as a short dissolve. Listening segments chain in varied order while it waits; speaking segments with hand gestures play while a voice is heard, timed to finish with it. It is a small filmed repertoire, not a generated person. There is no footage of desk work, so during a search the avatar keeps listening while the note under the picture says what is happening.</p>}
      <p>Prepared scenes use saved research from 14 November 2026 and selected recorded answers. Their follow-ups open the saved source passages. They are labelled separately from live chat; an arbitrary live question never selects a prepared answer.</p>
      <p>{Object.keys(preparedSpeech).length ? "Prepared answers are saved recordings of a synthetic ElevenLabs voice. " : "Prepared voice recordings are not available in this build; their text and citations remain usable. "}{voiceConfigured ? "Live replies are read aloud by the same ElevenLabs voice." : "This server has no ElevenLabs voice, so live replies are text only."} Lips are not synchronised with the words. A transcript and citations remain in the conversation.</p>
      {deskCredit && <p>The desk look uses footage by <a href={deskCredit.sourceUrl} target="_blank" rel="noreferrer">{deskCredit.creator}</a>, under the <a href={deskCredit.licenseUrl} target="_blank" rel="noreferrer">{deskCredit.license}</a>. {deskCredit.note} Ari and Noor are original illustrations.</p>}
      <p>Names, focus and tone affect new live requests. The character and room are not generated from your chosen role. Preferences stay in this browser; live messages go to the team’s chat service. Reloading hides the visible thread but keeps its server session until you start a new conversation.</p>
      <details className="studio-diagnostics"><summary>Movement and event preview</summary><p>{profile.presence ? "Desk segments start and end in one of three resting poses and chain in varied order. Speaking segments play only while a voice is heard. This page does not use a microphone." : "Preview a movement without a model or microphone. Illustrated clips finish at a shared pose before switching."}</p>{!profile.presence && <div className="studio-debug-controls">{ACTIVITIES.map((item) => <button key={item} disabled={chat.busy} aria-pressed={manual === item} onClick={() => setManual(item)}>{item}</button>)}<button disabled={chat.busy} aria-pressed={manual === null} onClick={() => setManual(null)}>Follow assistant</button></div>}<ol>{chat.log.length ? chat.log.map((line, i) => <li key={i}>{line}</li>) : <li>No events yet.</li>}</ol></details>
    </div></details><span>A presence, at your pace.</span></footer>
  </main>;
}
