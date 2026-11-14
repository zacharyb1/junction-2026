"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { activityNote, cancelAgentState, initialAgentState, readAvatarStream, reduceAgentEvent, replayRun } from "@/lib/avatar/events";
import { RECORDED_EXAMPLE } from "@/lib/avatar/recorded-example";
import { playAvatarAudio } from "@/lib/avatar/play-voice";
import { ACTIVITIES, type Activity, type AgentEvent, type Manifest } from "@/lib/avatar/types";
import { AvatarStage } from "./avatar-stage";
import "./avatar.css";

export function AvatarDemo({ profiles, code: initialCode, liveConfigured, needsCode }: {
  profiles: Manifest[]; code: string; liveConfigured: boolean; needsCode: boolean;
}) {
  const [profile, setProfile] = useState(0);
  const [agent, setAgent] = useState(initialAgentState);
  const [manual, setManual] = useState<Activity | null>(null);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("Choose a character and watch the recorded example, or ask a live question.");
  const [draft, setDraft] = useState(RECORDED_EXAMPLE.run.message);
  const [code, setCode] = useState(initialCode);
  const [log, setLog] = useState<string[]>([]);
  const [voiceNote, setVoiceNote] = useState("");
  const [recordedReply, setRecordedReply] = useState(false);
  const [includeVoice, setIncludeVoice] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const emit = (event: AgentEvent) => {
    setAgent((state) => reduceAgentEvent(state, event));
    if (event.type !== "text") setLog((lines) => [...lines.slice(-39), event.type + ("tool" in event ? ` · ${event.tool}` : "")]);
  };
  function stop() {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setManual(null);
    setAgent(cancelAgentState);
  }
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);

  async function run(recorded: boolean, event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    stop();
    const task = new AbortController();
    controller.current = task;
    setBusy(true);
    setLog([]);
    setVoiceNote("");
    setRecordedReply(recorded);
    if (recorded) setDraft(RECORDED_EXAMPLE.run.message);
    setMode(recorded ? RECORDED_EXAMPLE.run.source : "Live response from the team's assistant");
    if (!recorded) emit({ type: "request-sent" });
    try {
      if (recorded) {
        await replayRun(RECORDED_EXAMPLE.run, emit, { signal: task.signal });
        if (includeVoice && !task.signal.aborted) {
          try { await playVoice(true, task); }
          catch (error) { if (!task.signal.aborted) setVoiceNote(error instanceof Error ? error.message : "Press Hear recorded plan to play the voice."); }
        }
      }
      else {
        const response = await fetch("/api/avatar/chat", {
          method: "POST", headers: { "content-type": "application/json", "x-demo-code": code },
          body: JSON.stringify({ message: draft.trim() }), signal: task.signal,
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => ({}));
          throw new Error(typeof body.error === "string" ? body.error : "The assistant is unavailable. Try the recorded example.");
        }
        const count = await readAvatarStream(response.body, emit, { signal: task.signal });
        if (!count) throw new Error("The assistant returned an empty reply. Please try again.");
      }
    } catch (error) {
      if (!task.signal.aborted) emit({ type: "error", message: error instanceof Error ? error.message : "The connection was interrupted." });
    } finally {
      if (controller.current === task) { controller.current = null; setBusy(false); }
    }
  }

  async function playVoice(recorded: boolean, task: AbortController) {
    let source = RECORDED_EXAMPLE.audio;
    let objectUrl: string | null = null;
    setVoiceNote("Preparing voice…");
    try {
      if (!recorded) {
        const response = await fetch("/api/ukk/speak", {
          method: "POST", headers: { "content-type": "application/json", "x-demo-code": code },
          body: JSON.stringify({ text: agent.text.slice(0, 5000) }), signal: task.signal,
        });
        if (!response.ok) throw new Error(response.status === 503 ? "Live voice is not configured here. The recorded example includes voice." : "Voice is unavailable. You can still read the reply.");
        const blob = await response.blob();
        if (task.signal.aborted) return;
        source = objectUrl = URL.createObjectURL(blob);
      }
      setVoiceNote(recorded ? "Recorded ElevenLabs voice for this plan · no lip-sync" : "ElevenLabs voice · no lip-sync");
      await playAvatarAudio(source, { signal: task.signal, onSpeech: (playing) => emit({ type: playing ? "speech-start" : "speech-end" }) });
    } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
  }

  async function speak() {
    stop();
    const task = new AbortController();
    controller.current = task;
    setBusy(true);
    try { await playVoice(recordedReply, task); }
    catch (error) { if (!task.signal.aborted) setVoiceNote(error instanceof Error ? error.message : "Voice could not play."); }
    finally { if (controller.current === task) { controller.current = null; setBusy(false); } }
  }

  const note = activityNote(agent);
  const currentProfile = profiles[profile];
  return (
    <>
      <div className="avatar-layout">
        <section aria-label="Avatar preview">
          {profiles.length > 1 && <label>Choose a character<select value={profile} disabled={busy} onChange={(event) => setProfile(Number(event.target.value))}>{profiles.map((item, i) => <option key={item.profile} value={i}>{item.label}</option>)}</select></label>}
          <AvatarStage key={currentProfile.profile} manifest={currentProfile} activity={manual ?? note.activity} paused={paused} />
          <p className="avatar-note" role="status">{manual ? `Motion preview: ${manual}` : note.text}</p>
          <p className="avatar-caption">{currentProfile.medium === "illustrated" ? "Illustrated prototype · pre-rendered movements" : currentProfile.placeholder ? "Playback test clips" : currentProfile.label}</p>
          <div className="avatar-controls">
            <button disabled={busy} onClick={() => void run(true)}>Watch recorded example</button>
            <button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Resume motion" : "Pause motion"}</button>
            {busy && <button onClick={stop}>Stop</button>}
          </div>
          <label className="avatar-checkbox"><input type="checkbox" checked={includeVoice} disabled={busy} onChange={(event) => setIncludeVoice(event.target.checked)} /> Include the recorded voice</label>
          <p className="avatar-caption">{mode}</p>
        </section>
        <section aria-label="Conversation">
          <form onSubmit={(event) => void run(false, event)}>
            <label htmlFor="avatar-question">Ask your assistant</label>
            <textarea id="avatar-question" maxLength={1500} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} />
            {needsCode && <><label htmlFor="avatar-code">Demo access code</label><input id="avatar-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" /></>}
            <div className="avatar-controls"><button type="submit" disabled={busy || !liveConfigured || !draft.trim() || (needsCode && !code)}>Send live question</button></div>
            {!liveConfigured && <p className="avatar-caption">Live chat is not connected on this machine. The recorded example works offline.</p>}
          </form>
          {agent.error && <p role="alert" className="avatar-error">{agent.error}</p>}
          <div className="avatar-reply" aria-label="Assistant reply" aria-busy={agent.pending}>
            {agent.text ? agent.text.split(/(https?:\/\/[^\s<>]+[^\s<>.,;!?)])/g).map((part, index) => index % 2 ? <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a> : part) : <p className="avatar-caption">The reply will appear here as it arrives.</p>}
          </div>
          {recordedReply && agent.text && <div className="avatar-sources"><p className="avatar-caption">Sources saved with this example</p><ul>{RECORDED_EXAMPLE.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></div>}
          {agent.text && <div className="avatar-controls"><button disabled={busy} onClick={() => void speak()}>{recordedReply ? "Hear recorded plan" : "Read aloud"}</button></div>}
          {voiceNote && <p role="status" className="avatar-caption">{voiceNote}</p>}
        </section>
      </div>
      <details><summary>Try the movements</summary>
        <p className="avatar-caption">Manual preview, with no microphone or API calls. A movement finishes before the next begins.</p>
        <div className="avatar-controls">{ACTIVITIES.map((activity) => <button key={activity} disabled={busy} aria-pressed={manual === activity} onClick={() => setManual(activity)}>{activity}</button>)}<button disabled={busy} onClick={() => setManual(null)}>Follow agent</button></div>
      </details>
      <details><summary>Events for this demonstration</summary><ol className="avatar-event-list">{log.length ? log.map((line, i) => <li key={i}>{line}</li>) : <li>No events yet.</li>}</ol></details>
    </>
  );
}
