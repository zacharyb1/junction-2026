import type { ActivityNote, AgentEvent, RecordedRun } from "./types";

export interface AgentState {
  pending: boolean;
  listening: boolean;
  speaking: boolean;
  tools: Record<string, { tool: string; label?: string }>;
  text: string;
  error: string | null;
}

export function initialAgentState(): AgentState {
  return { pending: false, listening: false, speaking: false, tools: {}, text: "", error: null };
}

/** Cancellation preserves the partial reply while clearing every active action. */
export function cancelAgentState(state: AgentState): AgentState {
  return { ...state, pending: false, listening: false, speaking: false, tools: {} };
}

export function reduceAgentEvent(state: AgentState, event: AgentEvent): AgentState {
  switch (event.type) {
    case "request-sent": return { ...initialAgentState(), pending: true };
    case "listen-start": return { ...state, listening: true, error: null };
    case "listen-end": return { ...state, listening: false };
    case "thinking": return state;
    case "tool-start":
      return state.pending
        ? { ...state, tools: { ...state.tools, [event.id]: { tool: event.tool, label: event.label } } }
        : state;
    case "tool-end": {
      const tools = { ...state.tools };
      delete tools[event.id];
      return { ...state, tools };
    }
    case "text": return state.pending ? { ...state, text: state.text + event.delta } : state;
    case "reply-done": return { ...state, pending: false, tools: {} };
    case "speech-start": return { ...state, speaking: true };
    case "speech-end": return { ...state, speaking: false };
    case "error": return { ...cancelAgentState(state), error: event.message };
  }
}

function toolDescription(tool: string): string {
  if (tool.includes("research_case")) return "Researching official pages";
  if (tool.includes("search")) return "Searching for information";
  if (tool.includes("skill_view")) return "Reading the task instructions";
  if (tool.includes("case")) return "Reading the case file";
  return "Working on your request";
}

export function activityNote(state: AgentState): ActivityNote {
  if (state.speaking) return { activity: "speaking", text: "Speaking" };
  if (state.listening) return { activity: "listening", text: "Listening" };
  const tools = Object.values(state.tools);
  if (tools.length) return { activity: "working", text: toolDescription(tools[tools.length - 1].tool) };
  if (state.pending) return { activity: "thinking", text: state.text ? "Preparing the reply" : "Thinking" };
  return { activity: "idle", text: state.error || (state.text ? "Reply ready" : "Ready when you are") };
}

type StreamOptions = { signal?: AbortSignal };
type EventHandler = (event: AgentEvent) => void;

function abortError(): DOMException {
  return new DOMException("The request was cancelled", "AbortError");
}

/**
 * Read Hermes tool-progress SSE and OpenAI text deltas from the same stream.
 * The caller sends request-sent before fetching and handles cancellation. Text is
 * never treated as speech: only the audio player may emit speech-start/end.
 */
export async function readAvatarStream(
  body: ReadableStream<Uint8Array>,
  onEvent: EventHandler,
  { signal }: StreamOptions = {},
): Promise<number> {
  if (signal?.aborted) throw abortError();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];
  let received = 0;
  let complete = false;
  let reasoning = false;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", cancel, { once: true });

  function dispatch() {
    const data = dataLines.join("\n");
    const name = eventName;
    dataLines = [];
    eventName = "";
    if (!data) return;
    if (data === "[DONE]") {
      complete = true;
      onEvent({ type: "reply-done" });
      return;
    }
    let value: Record<string, unknown>;
    try { value = JSON.parse(data); } catch { return; }
    if (!value || typeof value !== "object") return;
    if (name === "error" || value.error) throw new Error("The assistant could not finish its reply.");
    if (name === "hermes.tool.progress") {
      const id = value.toolCallId;
      const tool = value.tool;
      if (typeof id !== "string" || typeof tool !== "string") return;
      if (value.status === "running") {
        reasoning = false;
        onEvent({ type: "tool-start", id, tool, label: typeof value.label === "string" ? value.label : undefined });
      } else if (["completed", "failed", "cancelled", "canceled"].includes(String(value.status))) {
        onEvent({ type: "tool-end", id, tool });
      }
      return;
    }
    const choices = value.choices as { delta?: { content?: unknown; reasoning_content?: unknown } }[] | undefined;
    const delta = choices?.[0]?.delta;
    if (typeof delta?.reasoning_content === "string" && delta.reasoning_content && !reasoning) {
      reasoning = true;
      onEvent({ type: "thinking" });
    }
    if (typeof delta?.content === "string" && delta.content) {
      reasoning = false;
      received += delta.content.length;
      onEvent({ type: "text", delta: delta.content });
    }
  }

  function line(raw: string) {
    const value = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (!value) { dispatch(); return; }
    if (value.startsWith(":")) return;
    const separator = value.indexOf(":");
    const field = separator < 0 ? value : value.slice(0, separator);
    let content = separator < 0 ? "" : value.slice(separator + 1);
    if (content.startsWith(" ")) content = content.slice(1);
    if (field === "event") eventName = content;
    if (field === "data") dataLines.push(content);
  }

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (signal?.aborted) throw abortError();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (complete) return received;
      }
      if (done) {
        if (buffer) line(buffer);
        dispatch();
        if (complete) return received;
        throw new Error("The reply stream ended early. Try again.");
      }
    }
  } catch (error) {
    if (!signal?.aborted && !(error instanceof DOMException && error.name === "AbortError")) {
      onEvent({ type: "error", message: error instanceof Error ? error.message : "The reply failed." });
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Replay an explicitly labelled recording or synthetic fixture with cancellation. */
export async function replayRun(
  run: RecordedRun,
  onEvent: EventHandler,
  { signal }: StreamOptions = {},
): Promise<void> {
  if (signal?.aborted) throw abortError();
  const started = performance.now();
  for (const { atMs, event } of run.events) {
    const delay = Math.max(0, atMs - (performance.now() - started));
    await new Promise<void>((resolve, reject) => {
      const cancel = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
        reject(abortError());
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", cancel);
        resolve();
      }, delay);
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) cancel();
    });
    if (signal?.aborted) throw abortError();
    onEvent(event);
  }
}
