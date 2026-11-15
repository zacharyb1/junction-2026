"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { cancelAgentState, initialAgentState, readAvatarStream, reduceAgentEvent, replayRun } from "@/lib/avatar/events";
import { playAvatarAudio, type AvatarAudioControl, type AvatarSpeechClock } from "@/lib/avatar/play-voice";
import { RECORDED_EXAMPLE } from "@/lib/avatar/recorded-example";
import { PREPARED_SCENES, type PreparedSceneId } from "@/lib/avatar/prepared-scenes";
import type { PresenceSpeechSet, PresenceTalking } from "@/lib/avatar/presence";
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
  scene?: PreparedSceneId;
  sources?: { n: number; label: string; url: string; quote: string }[];
  status: "streaming" | "complete" | "cancelled" | "error";
}

/**
 * A voice that is audibly (or, when muted, silently) playing now; the picture talks for its duration.
 * `scene` names a prepared answer, whose own performance video the picture plays; `clock` is the audio.
 */
export type ConversationTalking = PresenceTalking;

export const VOICE_UNAVAILABLE = "Voice is unavailable on this server. The reply is ready to read.";
/** Speech rate used only when a decoded file does not report its duration. */
const estimateMs = (text: string) => Math.max(1500, text.length * 65);

export function useAvatarConversation({ code, liveConfigured, voiceConfigured, settings, preparedSpeech = {}, paused = false, holdForPicture = false }: {
  code: string; liveConfigured: boolean; voiceConfigured: boolean; settings: CompanionSettings;
  /** Prepared ElevenLabs answers for the prepared scenes, from the presence manifest. */
  preparedSpeech?: PresenceSpeechSet;
  /** Pauses the playing voice together with the picture. */
  paused?: boolean;
  /**
   * A prepared answer with a performance video waits for the picture to release it (clock.hold), so the
   * two start together. Only for a stage that does release it; play-voice caps the wait.
   */
  holdForPicture?: boolean;
}) {
  const [talking, setTalking] = useState<ConversationTalking>(null);
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
  const audioControl = useRef<AvatarAudioControl | null>(null);
  const pausedRef = useRef(paused);
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
    audioControl.current = null;
    setTalking(null);
    setAgent(cancelAgentState);
    setTurns((list) => list.map((turn) => turn.status === "streaming" ? { ...turn, status: "cancelled" } : turn));
    setBusy(false);
    setVoiceNote("");
  }
  function setVoiceEnabled(next: SetStateAction<boolean>) {
    const value = typeof next === "function" ? next(voicePreference.current) : next;
    voicePreference.current = value;
    setVoice(value);
    // Muting silences the playing voice without stopping it, so the picture keeps talking with it.
    audioControl.current?.setMuted(!value);
  }
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) audioControl.current?.pause(); else audioControl.current?.resume();
  }, [paused]);
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
    const talkId = `voice-${++sequence.current}`;
    const onSpeech = (playing: boolean) => {
      if (activeVoice.current !== voiceTask || (playing && signal.aborted)) return;
      emit({ type: playing ? "speech-start" : "speech-end" }, task);
    };
    // The picture starts talking when the audio actually starts, for as long as the audio lasts. A held
    // prepared answer is announced at once instead, so the picture can load its video and release it.
    const audio = (fallbackMs: number, { knownMs, scene, held = false }: { knownMs?: number; scene?: PreparedSceneId; held?: boolean } = {}) => {
      let clock: AvatarSpeechClock | undefined;
      const announce = (durationMs: number) => {
        if (activeVoice.current !== voiceTask || signal.aborted) return;
        setTalking({ id: talkId, durationMs, ...(scene ? { scene } : {}), ...(clock ? { clock } : {}) });
      };
      return {
        signal, onSpeech, held, muted: !voicePreference.current, paused: pausedRef.current,
        onControl: (control: AvatarAudioControl, playing: AvatarSpeechClock) => {
          if (activeVoice.current !== voiceTask) return;
          audioControl.current = control;
          clock = playing;
          if (held) announce(knownMs ?? fallbackMs);
        },
        onStart: (decodedMs: number) => {
          if (!held) announce(knownMs ?? (Number.isFinite(decodedMs) ? decodedMs : fallbackMs));
        },
      };
    };
    let objectUrl: string | undefined;
    try {
      const prepared = turn.scene ? preparedSpeech[turn.scene] : undefined;
      if (prepared) {
        setVoiceNote(`Prepared answer · ElevenLabs voice ${prepared.voice}`);
        await playAvatarAudio(prepared.src, audio(prepared.durationMs, { knownMs: prepared.durationMs, scene: turn.scene, held: holdForPicture && Boolean(prepared.video) }));
      } else if (turn.source === "recorded" && (!turn.scene || turn.scene === "pregnancy")) {
        setVoiceNote("Recorded voice for this example");
        await playAvatarAudio(RECORDED_EXAMPLE.audio, audio(estimateMs(turn.text)));
      } else if (turn.source === "recorded") {
        setVoiceNote("No prepared voice for this scene. The answer is ready to read.");
      } else if (voiceConfigured) {
        setVoiceNote("Preparing voice…");
        const response = await fetch("/api/aidaddy/speak", {
          method: "POST", headers: { "content-type": "application/json", "x-demo-code": code },
          body: JSON.stringify({ text: turn.text.slice(0, 5000) }), signal,
        });
        if (!response.ok) throw new Error("Voice is unavailable right now. Your reply is ready to read.");
        const blob = await response.blob();
        if (signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setVoiceNote("ElevenLabs voice");
        await playAvatarAudio(objectUrl, audio(estimateMs(turn.text)));
      } else {
        setVoiceNote(VOICE_UNAVAILABLE);
      }
    } catch (error) {
      if (current(task) && !signal.aborted) setVoiceNote(error instanceof Error ? error.message : "Voice could not play. You can still read the reply.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setTalking((value) => value?.id === talkId ? null : value);
      if (activeVoice.current === voiceTask) { activeVoice.current = null; audioControl.current = null; }
    }
  }

  async function run(message: string, source: "live" | "recorded", scene?: PreparedSceneId) {
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
    const scenario = scene ? PREPARED_SCENES[scene] : undefined;
    const reply: ConversationTurn = { id, role: "assistant", text: "", source, scene, status: "streaming", ...(scenario ? { sources: [...scenario.sources] } : source === "recorded" ? { sources: RECORDED_EXAMPLE.sources } : {}) };
    setTurns((list) => [...list, { id: userId, role: "user", text: value, source, scene, status: "complete" }, reply]);
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
      if (source === "recorded") {
        if (!scene || scene === "pregnancy") await replayRun(RECORDED_EXAMPLE.run, receive, { signal: task.signal });
        else {
          // A source inspection is immediate; do not stage a search that never ran.
          receive({ type: "request-sent" });
          receive({ type: "text", delta: PREPARED_SCENES[scene].text });
          receive({ type: "reply-done" });
        }
      }
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
      if (voicePreference.current || (scene && preparedSpeech[scene])) await playVoice({ ...reply, text, status: "complete" }, task);
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
    // Asking to hear a reply turns the voice on.
    setVoiceEnabled(true);
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
    runLive: (message: string) => run(message, "live"), runExample: (scene: PreparedSceneId = "pregnancy") => run(PREPARED_SCENES[scene].question, "recorded", scene),
    speak, stop, clear, log, talking };
}
