"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { activityNote, cancelAgentState, initialAgentState, readAvatarStream, reduceAgentEvent, replayRun } from "@/lib/avatar/events";
import { DEMO_RUN } from "@/lib/avatar/fixtures";
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
  const [mode, setMode] = useState("Choose a walkthrough or send a live question.");
  const [draft, setDraft] = useState("My landlord raised the rent in Helsinki. What should I check?");
  const [code, setCode] = useState(initialCode);
  const [log, setLog] = useState<string[]>([]);
  const [voiceNote, setVoiceNote] = useState("");
  const controller = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const emit = (event: AgentEvent) => {
    setAgent((state) => reduceAgentEvent(state, event));
    if (event.type !== "text") setLog((lines) => [...lines.slice(-39), event.type + ("tool" in event ? ` · ${event.tool}` : "")]);
  };
  function releaseAudio() {
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
      audio.current = null;
    }
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }
  function stop() {
    controller.current?.abort();
    controller.current = null;
    releaseAudio();
    setBusy(false);
    setManual(null);
    setAgent(cancelAgentState);
  }
  useEffect(() => () => { controller.current?.abort(); controller.current = null; releaseAudio(); }, []);

  async function run(recorded: boolean, event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    stop();
    const task = new AbortController();
    controller.current = task;
    setBusy(true);
    setLog([]);
    setVoiceNote("");
    setMode(recorded ? DEMO_RUN.source : "Live response from the team's assistant");
    emit({ type: "request-sent" });
    try {
      if (recorded) await replayRun(DEMO_RUN, emit, { signal: task.signal });
      else {
        const response = await fetch("/api/avatar/chat", {
          method: "POST", headers: { "content-type": "application/json", "x-demo-code": code },
          body: JSON.stringify({ message: draft.trim() }), signal: task.signal,
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => ({}));
          throw new Error(typeof body.error === "string" ? body.error : "The assistant is unavailable. Try the walkthrough.");
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

  async function speak() {
    stop();
    const task = new AbortController();
    controller.current = task;
    setBusy(true);
    setVoiceNote("Preparing voice…");
    try {
      const res = await fetch("/api/ukk/speak", {
        method: "POST", headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ text: agent.text.slice(0, 5000) }), signal: task.signal,
      });
      if (!res.ok) throw new Error(res.status === 503 ? "Voice is not configured here. You can preview the speaking motion below." : "Voice could not play. The reply is still available above.");
      const blob = await res.blob();
      if (task.signal.aborted) return;
      audioUrl.current = URL.createObjectURL(blob);
      const player = new Audio(audioUrl.current);
      audio.current = player;
      const finish = () => { if (!task.signal.aborted) { emit({ type: "speech-end" }); stop(); } };
      player.onended = finish;
      player.onerror = () => { setVoiceNote("Audio playback failed."); finish(); };
      await player.play();
      if (task.signal.aborted) { player.pause(); return; }
      emit({ type: "speech-start" });
      setVoiceNote("ElevenLabs voice · motion is not lip-synced");
    } catch (error) {
      if (!task.signal.aborted) { setVoiceNote(error instanceof Error ? error.message : "Voice could not play."); stop(); }
    }
  }

  const note = activityNote(agent);
  return (
    <>
      <div className="avatar-layout">
        <section aria-label="Avatar preview">
          {profiles.length > 1 && <label>Appearance<select value={profile} disabled={busy} onChange={(event) => setProfile(Number(event.target.value))}>{profiles.map((item, i) => <option key={item.profile} value={i}>{item.label}</option>)}</select></label>}
          <AvatarStage key={profiles[profile].profile} manifest={profiles[profile]} activity={manual ?? note.activity} paused={paused} />
          <p className="avatar-note" role="status">{manual ? `Motion preview: ${manual}` : note.text}</p>
          <p className="avatar-caption">{profiles[profile].placeholder ? "Test clips — no human avatar has been generated yet." : profiles[profile].label}</p>
          <div className="avatar-controls">
            <button disabled={busy} onClick={() => void run(true)}>Play walkthrough</button>
            <button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Resume motion" : "Pause motion"}</button>
            {busy && <button onClick={stop}>Stop</button>}
          </div>
          <p className="avatar-caption">{mode}</p>
        </section>
        <section aria-label="Conversation">
          <form onSubmit={(event) => void run(false, event)}>
            <label htmlFor="avatar-question">Ask your assistant</label>
            <textarea id="avatar-question" maxLength={1500} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} />
            {needsCode && <><label htmlFor="avatar-code">Demo access code</label><input id="avatar-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" /></>}
            <div className="avatar-controls"><button type="submit" disabled={busy || !liveConfigured || !draft.trim() || (needsCode && !code)}>Send live question</button></div>
            {!liveConfigured && <p className="avatar-caption">Live chat is not connected on this machine. The walkthrough works offline.</p>}
          </form>
          {agent.error && <p role="alert" className="avatar-error">{agent.error}</p>}
          <div className="avatar-reply" aria-label="Assistant reply" aria-busy={agent.pending}>
            {agent.text ? agent.text.split(/(https?:\/\/[^\s<>]+[^\s<>.,;!?)])/g).map((part, index) => index % 2 ? <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a> : part) : <p className="avatar-caption">The reply will appear here as it arrives.</p>}
          </div>
          {agent.text && <div className="avatar-controls"><button disabled={busy} onClick={() => void speak()}>Read aloud</button></div>}
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
