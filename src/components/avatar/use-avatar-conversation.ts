"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { cancelAgentState, initialAgentState, readAvatarStream, reduceAgentEvent, replayRun } from "@/lib/avatar/events";
import { playAvatarAudio } from "@/lib/avatar/play-voice";
import { RECORDED_EXAMPLE } from "@/lib/avatar/recorded-example";
import { speakOnDevice } from "@/lib/avatar/voice";
import type { AgentEvent } from "@/lib/avatar/types";

export interface CompanionSettings {
  name: string;
  role: "everyday" | "paperwork" | "shopping";
  tone: "calm" | "direct" | "warm";
}

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  source: "live" | "recorded";
  sources?: { n: number; label: string; url: string; quote: string }[];
  status: "streaming" | "complete" | "cancelled" | "error";
}

export function useAvatarConversation({ code, liveConfigured, voiceConfigured, settings }: {
  code: string; liveConfigured: boolean; voiceConfigured: boolean; settings: CompanionSettings;
}) {
  const [agent, setAgent] = useState(initialAgentState);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [voiceEnabled, setVoice] = useState(true);
  const [voiceNote, setVoiceNote] = useState("");
  const [mode, setMode] = useState<"live" | "recorded" | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const active = useRef<AbortController | null>(null);
  const activeVoice = useRef<AbortController | null>(null);
  const voicePreference = useRef(true);
  const sequence = useRef(0);
  const current = (task: AbortController) => active.current === task && !task.signal.aborted;
  const patch = (id: string, change: Partial<ConversationTurn>) => setTurns((list) => list.map((turn) => turn.id === id ? { ...turn, ...change } : turn));

  function emit(event: AgentEvent, task: AbortController) {
    if (!current(task)) return;
    setAgent((state) => reduceAgentEvent(state, event));
    if (event.type !== "text") setLog((list) => [...list.slice(-39), event.type + ("tool" in event ? ` · ${event.tool}` : "")]);
  }
  function stop() {
    const task = active.current;
    active.current = null;
    task?.abort();
    activeVoice.current?.abort();
    activeVoice.current = null;
    setAgent(cancelAgentState);
    setTurns((list) => list.map((turn) => turn.status === "streaming" ? { ...turn, status: "cancelled" } : turn));
    setBusy(false);
    setVoiceNote("");
  }
  function setVoiceEnabled(next: SetStateAction<boolean>) {
    const value = typeof next === "function" ? next(voicePreference.current) : next;
    voicePreference.current = value;
    setVoice(value);
    if (!value) { activeVoice.current?.abort(); setVoiceNote(""); }
  }
  useEffect(() => () => {
    const task = active.current;
    active.current = null;
    task?.abort();
    activeVoice.current?.abort();
  }, []);

  async function playVoice(turn: ConversationTurn, task: AbortController) {
    if (!current(task) || turn.status !== "complete" || !turn.text.trim()) return;
    const voiceTask = new AbortController();
    activeVoice.current = voiceTask;
    const signal = AbortSignal.any([task.signal, voiceTask.signal]);
    const onSpeech = (playing: boolean) => {
      if (activeVoice.current !== voiceTask || (playing && signal.aborted)) return;
      emit({ type: playing ? "speech-start" : "speech-end" }, task);
    };
    let objectUrl: string | undefined;
    try {
      if (turn.source === "recorded") {
        setVoiceNote("Recorded voice for this example");
        await playAvatarAudio(RECORDED_EXAMPLE.audio, { signal, onSpeech });
      } else if (voiceConfigured) {
        setVoiceNote("Preparing voice…");
        const response = await fetch("/api/ukk/speak", {
          method: "POST", headers: { "content-type": "application/json", "x-demo-code": code },
          body: JSON.stringify({ text: turn.text.slice(0, 5000) }), signal,
        });
        if (!response.ok) throw new Error("Voice is unavailable right now. Your reply is ready to read.");
        const blob = await response.blob();
        if (signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setVoiceNote("ElevenLabs voice");
        await playAvatarAudio(objectUrl, { signal, onSpeech });
      } else {
        setVoiceNote("Device voice");
        await speakOnDevice(turn.text, { signal, tone: settings.tone, onSpeech });
      }
    } catch (error) {
      if (current(task) && !signal.aborted) setVoiceNote(error instanceof Error ? error.message : "Voice could not play. You can still read the reply.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (activeVoice.current === voiceTask) activeVoice.current = null;
    }
  }

  async function run(message: string, source: "live" | "recorded") {
    if (active.current) return;
    const value = message.trim();
    if (!value) return;
    if (source === "live" && (!liveConfigured || value.length > 1200)) {
      setAgent((state) => ({ ...state, error: !liveConfigured ? "Live chat is unavailable here. Try the recorded example." : "Keep your message under 1,200 characters." }));
      return;
    }
    const task = new AbortController();
    active.current = task;
    const userId = `turn-${++sequence.current}`;
    const id = `turn-${++sequence.current}`;
    const reply: ConversationTurn = { id, role: "assistant", text: "", source, status: "streaming", ...(source === "recorded" ? { sources: RECORDED_EXAMPLE.sources } : {}) };
    setTurns((list) => [...list, { id: userId, role: "user", text: value, source, status: "complete" }, reply]);
    setBusy(true);
    setMode(source);
    setVoiceNote("");
    setLog([]);
    let text = "";
    let reportedError = false;
    let replyComplete = false;
    const receive = (event: AgentEvent) => {
      if (!current(task) || reportedError) return;
      emit(event, task);
      if (event.type === "text") { text += event.delta; patch(id, { text }); }
      if (event.type === "reply-done") { replyComplete = true; patch(id, { status: "complete" }); }
      if (event.type === "error") { reportedError = true; patch(id, { status: "error" }); }
    };
    try {
      if (source === "recorded") await replayRun(RECORDED_EXAMPLE.run, receive, { signal: task.signal });
      else {
        receive({ type: "request-sent" });
        const response = await fetch("/api/avatar/chat", {
          method: "POST", headers: { "content-type": "application/json", "x-demo-code": code },
          body: JSON.stringify({ message: value, persona: settings }), signal: task.signal,
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => ({}));
          throw new Error(typeof body.error === "string" ? body.error : "The assistant could not answer. Please try again.");
        }
        if (!await readAvatarStream(response.body, receive, { signal: task.signal })) throw new Error("The assistant returned an empty reply. Please try again.");
      }
      if (!current(task) || reportedError) return;
      if (!replyComplete || !text.trim()) throw new Error("The assistant returned an incomplete reply. Please try again.");
      if (voicePreference.current) await playVoice({ ...reply, text, status: "complete" }, task);
    } catch (error) {
      if (current(task) && !reportedError) receive({ type: "error", message: error instanceof Error ? error.message : "The connection was interrupted." });
    } finally {
      if (active.current === task) { active.current = null; setBusy(false); }
    }
  }

  async function speak(id: string) {
    const turn = turns.find((item) => item.id === id && item.role === "assistant" && item.status === "complete" && item.text.trim());
    if (!turn) return;
    stop();
    const task = new AbortController();
    active.current = task;
    setBusy(true);
    await playVoice(turn, task);
    if (active.current === task) { active.current = null; setBusy(false); }
  }
  async function clear(): Promise<boolean> {
    stop();
    const task = new AbortController();
    active.current = task;
    setBusy(true);
    try {
      const response = await fetch("/api/avatar/chat", { method: "DELETE", headers: { "x-demo-code": code }, signal: task.signal });
      if (!response.ok) throw new Error("Could not start a new conversation. Please try again.");
      if (!current(task)) return false;
      setTurns([]); setAgent(initialAgentState()); setLog([]); setMode(null); setVoiceNote("");
      return true;
    } catch (error) {
      if (current(task)) emit({ type: "error", message: error instanceof Error ? error.message : "Could not start a new conversation." }, task);
      return false;
    } finally { if (active.current === task) { active.current = null; setBusy(false); } }
  }

  return { agent, turns, busy, voiceEnabled, setVoiceEnabled, voiceNote, error: agent.error, mode,
    runLive: (message: string) => run(message, "live"), runExample: () => run(RECORDED_EXAMPLE.run.message, "recorded"),
    speak, stop, clear, log };
}
