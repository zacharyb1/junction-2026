"use client";

import { ArrowUp, ArrowUpRight, ChevronDown, Headphones, Pause, Play, Plus, SlidersHorizontal, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { activityNote } from "@/lib/avatar/events";
import { ACTIVITIES, type Activity, type Manifest } from "@/lib/avatar/types";
import { PREPARED_FOLLOW_UPS, PREPARED_SCENES, type PreparedMedia, type PreparedSceneId } from "@/lib/avatar/prepared-scenes";
import type { PerformanceIntent } from "@/lib/avatar/performance";
import { AvatarStage } from "./avatar-stage";
import { PerformanceStage } from "./performance-stage";
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

export function AvatarDemo({ profiles, preparedMedia = {}, code: initialCode, liveConfigured, voiceConfigured, needsCode }: {
  profiles: Manifest[]; preparedMedia?: PreparedMedia; code: string; liveConfigured: boolean; voiceConfigured: boolean; needsCode: boolean;
}) {
  const { preferences, save } = useAvatarPreferences(profiles);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState<Activity | null>(null);
  const [draft, setDraft] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [code, setCode] = useState(initialCode);
  const profile = profiles.find((item) => item.profile === preferences.profile) ?? profiles[0];
  const chat = useAvatarConversation({ code, liveConfigured, voiceConfigured, preparedMedia: profile.performance ? preparedMedia : {}, settings: { name: preferences.name, role: preferences.role, tone: preferences.tone } });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const followReply = useRef(true);
  const scrollPosition = useRef<{ node: HTMLDivElement | null; top: number }>({ node: null, top: 0 });
  const previousProfile = useRef(profile.profile);
  const note = activityNote(chat.agent);
  const isPreview = !profile.performance && manual !== null && !chat.busy;
  const activity = isPreview ? manual : note.activity;
  const lastText = chat.turns.at(-1)?.text;
  const lastReply = chat.turns.findLast((turn) => turn.role === "assistant");
  const hasPreparedConversation = chat.turns.some((turn) => turn.role === "assistant" && turn.scene === "pregnancy" && turn.status === "complete");
  const officeCredit = profiles.find((item) => item.performance)?.attribution;
  const experimentalSpeech = Object.values(preparedMedia).some((media) => media?.quality === "experimental");
  const performanceIntent: PerformanceIntent = Object.keys(chat.agent.tools).length ? "work" :
    composerFocused || draft.trim() || chat.busy ? "attention" : "presence";
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
  const stateLabel = paused && chat.performance ? "Performance paused" : chat.performance ? "Prepared performance" :
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
          {profile.performance ? <PerformanceStage key={profile.profile} manifest={profile.performance} intent={performanceIntent}
            speech={chat.performance} paused={paused} muted={!chat.voiceEnabled} onSpeechEvent={chat.onPerformanceEvent} /> :
            <AvatarStage key={profile.profile} manifest={profile} activity={activity} paused={paused} />}
          <div className="studio-scene-note" role="status"><span className={chat.busy ? "studio-state-dot is-active" : "studio-state-dot"} aria-hidden="true" />{stateLabel}</div>
          <button className="studio-motion-button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume performance" : "Pause performance"} aria-pressed={paused}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
        </div>
        <div className="studio-presence-controls">
          <button className="studio-sound" aria-pressed={chat.voiceEnabled} onClick={() => chat.setVoiceEnabled(!chat.voiceEnabled)}>{chat.voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>Voice {chat.voiceEnabled ? "on" : "off"}</span></button>
          <button className="studio-example" onClick={() => example()}><Play size={15} fill="currentColor" />Try a prepared conversation <span>{profile.performance && preparedMedia.pregnancy ? `~${Math.ceil((preparedMedia.pregnancy.durationMs + 9_000) / 1000)} sec` : "~25 sec"}</span></button>
        </div>
        <p className="studio-presence-footnote">{profile.performance ? "Stock footage of an actor with a dubbed synthetic voice. Lips are not synchronised. The person is not part of the team." : profile.medium === "illustrated" ? "Illustrated companion with pre-rendered movements." : profile.placeholder ? "Playback test profile." : "Generated companion."} <a href="#about-companion">About this prototype <ArrowUpRight size={12} /></a></p>
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
              {turn.role === "assistant" && turn.scene && preparedMedia[turn.scene] && <details className="studio-transcript"><summary>Prepared speech transcript <ChevronDown size={14} /></summary><p>{preparedMedia[turn.scene]!.transcript}</p>{preparedMedia[turn.scene]!.quality === "experimental" && <p className="studio-help">Experimental lip-sync; mouth and face motion may look unnatural.</p>}{preparedMedia[turn.scene]!.method === "dubbed" && <p className="studio-help">The voice is dubbed. The filmed mouth movements are not synchronized.</p>}</details>}
              {turn.role === "assistant" && turn.text && turn.status === "complete" && <button className="studio-read-aloud" onClick={() => void chat.speak(turn.id)}><Headphones size={14} />{turn.scene && profile.performance && preparedMedia[turn.scene] ? "Replay prepared performance" : turn.source === "recorded" ? "Hear saved answer" : "Read aloud"}</button>}
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
              <div className="studio-composer"><label className="studio-sr-only" htmlFor="avatar-question">Message {preferences.name}</label><textarea ref={textarea} id="avatar-question" rows={2} maxLength={1200} value={draft} placeholder={`Message ${preferences.name}…`} onFocus={() => setComposerFocused(true)} onBlur={() => setComposerFocused(false)} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
                {chat.busy && !draft.trim() ? <button type="button" className="studio-send" aria-label="Stop reply and voice" onClick={chat.stop}><Square size={15} fill="currentColor" /></button> : <button type="submit" className="studio-send" aria-label={chat.busy ? "Interrupt and send message" : "Send message"} disabled={!draft.trim() || !liveConfigured || (needsCode && !code.trim())}><ArrowUp size={21} /></button>}
              </div>
            </form>
            <div className="studio-compose-hint"><span>AI companion · check important details</span>{draft.length > 1000 && <span>{draft.length}/1200</span>}</div>
          </div>
        </section>}
      </aside>
    </div>
    <footer className="studio-footer" id="about-companion"><details><summary>About this prototype <ChevronDown size={14} /></summary><div className="studio-about-content">
      <p>The office companion uses solo filmed takes that play forwards once. When those takes run out, the picture holds. It responds to typing and tool activity, but this finite performance is not an endlessly generated person.</p>
      <p>Prepared scenes use saved research from 14 November 2026 and selected recorded answers. Their follow-ups open the saved source passages. They are labelled separately from live chat; an arbitrary live question never selects a prepared answer.</p>
      {Object.keys(preparedMedia).length ? <p>{experimentalSpeech ? "The prepared talking videos use experimental lip-sync. Mouth and face motion may still look unnatural." : "Prepared answers use complete filmed speaking takes with a dubbed voice. The original expressions and gestures are preserved; mouth movements do not match the words exactly."} Live answers use the available voice without matching mouth movements. A transcript and citations remain in the conversation.</p> : <p>Prepared talking videos are not available in this build. Answers use the available voice without matching mouth movements. The saved text and citations remain usable.</p>}
      {officeCredit && <p>The office look uses footage by <a href={officeCredit.sourceUrl} target="_blank" rel="noreferrer">{officeCredit.creator}</a>, under the <a href={officeCredit.licenseUrl} target="_blank" rel="noreferrer">{officeCredit.license}</a>. The person is a visual stand-in, with no association or endorsement. Ari and Noor are original illustrations.</p>}
      <p>Names, focus and tone affect new live requests. The character and room are not generated from your chosen role. Preferences stay in this browser; live messages go to the team’s chat service. Reloading hides the visible thread but keeps its server session until you start a new conversation.</p>
      <details className="studio-diagnostics"><summary>Movement and event preview</summary><p>{profile.performance ? "Office takes are finite and never reverse or repeat. A prepared answer has its own soundtrack. This page does not use a microphone." : "Preview a movement without a model or microphone. Illustrated clips finish at a shared pose before switching."}</p>{!profile.performance && <div className="studio-debug-controls">{ACTIVITIES.map((item) => <button key={item} disabled={chat.busy} aria-pressed={manual === item} onClick={() => setManual(item)}>{item}</button>)}<button disabled={chat.busy} aria-pressed={manual === null} onClick={() => setManual(null)}>Follow assistant</button></div>}<ol>{chat.log.length ? chat.log.map((line, i) => <li key={i}>{line}</li>) : <li>No events yet.</li>}</ol></details>
    </div></details><span>A presence, at your pace.</span></footer>
  </main>;
}
