import { describe, expect, it, vi } from "vitest";
import { activityNote, cancelAgentState, initialAgentState, readAvatarStream, reduceAgentEvent, replayRun } from "@/lib/avatar/events";
import { nextClip, validateManifest } from "@/lib/avatar/scheduler";
import type { AgentEvent, Manifest } from "@/lib/avatar/types";

const manifest: Manifest = {
  profile: "test", label: "Test", poster: "/test.png", restPose: "front", width: 640, height: 360,
  clips: [
    { id: "front", file: "/front.mp4", from: "front", to: "front", kind: "loop", durationMs: 2000 },
    { id: "desk-a", file: "/desk-a.mp4", from: "desk", to: "desk", kind: "loop", durationMs: 2000 },
    { id: "desk-b", file: "/desk-b.mp4", from: "desk", to: "desk", kind: "loop", durationMs: 2000 },
    { id: "turn", file: "/turn.mp4", from: "front", to: "desk", kind: "transition", durationMs: 1000 },
    { id: "return", file: "/return.mp4", from: "desk", to: "front", kind: "transition", durationMs: 1000 },
  ],
  activities: {
    idle: { pose: "front", loops: ["front"] },
    listening: { pose: "front", loops: ["front"] },
    thinking: { pose: "front", loops: ["front"] },
    speaking: { pose: "front", loops: ["front"] },
    working: { pose: "desk", loops: ["desk-a", "desk-b"] },
  },
};

describe("avatar clip boundaries", () => {
  it("turns before working, alternates loops, and returns before speaking", () => {
    expect(validateManifest(manifest)).toEqual([]);
    expect(nextClip(manifest, "front", "working")?.id).toBe("turn");
    expect(nextClip(manifest, "desk", "working", 1)?.id).toBe("desk-b");
    expect(nextClip(manifest, "desk", "working", 2)?.id).toBe("desk-a");
    expect(nextClip(manifest, "desk", "speaking")?.id).toBe("return");
    expect(nextClip(manifest, "front", "speaking")?.id).toBe("front");
  });

  it("uses the newest activity after a turn, so a finished search is not acted out later", () => {
    const turn = nextClip(manifest, "front", "working")!;
    // The search ends while the turn plays. At its boundary, return immediately.
    expect(nextClip(manifest, turn.to, "idle")?.id).toBe("return");
  });

  it("finds multi-hop transitions without looping and refuses unreachable poses", () => {
    const extended = { ...manifest, clips: [
      ...manifest.clips.filter((clip) => clip.id !== "turn"),
      { id: "half-turn", file: "/half.mp4", from: "front", to: "half", kind: "transition" as const, durationMs: 500 },
      { id: "finish-turn", file: "/finish.mp4", from: "half", to: "desk", kind: "transition" as const, durationMs: 500 },
    ] };
    expect(nextClip(extended, "front", "working")?.id).toBe("half-turn");
    expect(nextClip(extended, "half", "working")?.id).toBe("finish-turn");
    const broken = { ...manifest, clips: manifest.clips.filter((clip) => clip.id !== "return") };
    expect(validateManifest(broken)).toContain("No transition from desk to front for idle.");
    expect(nextClip(broken, "desk", "idle")).toBeNull();
  });
});

describe("avatar activities", () => {
  it("keeps working until all concurrent tool calls finish", () => {
    let state = reduceAgentEvent(initialAgentState(), { type: "request-sent" });
    state = reduceAgentEvent(state, { type: "tool-start", id: "a", tool: "search" });
    state = reduceAgentEvent(state, { type: "tool-start", id: "b", tool: "search" });
    state = reduceAgentEvent(state, { type: "tool-end", id: "a", tool: "search" });
    expect(activityNote(state).activity).toBe("working");
    state = reduceAgentEvent(state, { type: "tool-end", id: "b", tool: "search" });
    expect(activityNote(state).activity).toBe("thinking");
    state = reduceAgentEvent(state, { type: "text", delta: "A reply" });
    expect(activityNote(state).activity).toBe("thinking");
    state = reduceAgentEvent(state, { type: "reply-done" });
    expect(activityNote(state).activity).toBe("idle");
    state = reduceAgentEvent(state, { type: "speech-start" });
    expect(activityNote(state).activity).toBe("speaking");
    expect(activityNote(reduceAgentEvent(state, { type: "speech-end" })).activity).toBe("idle");
  });

  it("clears activity on error/cancel and ignores late tool/text events", () => {
    let state = reduceAgentEvent(initialAgentState(), { type: "request-sent" });
    state = reduceAgentEvent(state, { type: "text", delta: "Partial reply" });
    state = reduceAgentEvent(state, { type: "tool-start", id: "a", tool: "search" });
    const cancelled = cancelAgentState(state);
    expect(cancelled.text).toBe("Partial reply");
    expect(activityNote(cancelled).activity).toBe("idle");
    expect(reduceAgentEvent(cancelled, { type: "tool-start", id: "late", tool: "search" })).toEqual(cancelled);
    expect(reduceAgentEvent(cancelled, { type: "text", delta: "late" })).toEqual(cancelled);
    const error = reduceAgentEvent(state, { type: "error", message: "Unavailable" });
    expect(activityNote(error)).toEqual({ activity: "idle", text: "Unavailable" });
    expect(error.tools).toEqual({});
  });
});

function stream(text: string, chunkSize = 1) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
      controller.close();
    },
  });
}

describe("avatar SSE", () => {
  it("decodes split UTF-8, multiline data and real Hermes progress shape", async () => {
    const events: AgentEvent[] = [];
    const count = await readAvatarStream(stream([
      ': heartbeat\r\n\r\n',
      'event: hermes.tool.progress\r\ndata: {"tool":"search","toolCallId":"call-1","status":"running"}\r\n\r\n',
      'event: hermes.tool.progress\ndata: {"tool":"search","toolCallId":"call-1","status":"completed"}\n\n',
      'data: {"choices":\ndata: [{"delta":{"content":"Hyvää!"}}]}\n\n',
      'data: [DONE]\n\n',
    ].join("")), (event) => events.push(event));
    expect(count).toBe(6);
    expect(events).toEqual([
      { type: "tool-start", id: "call-1", tool: "search", label: undefined },
      { type: "tool-end", id: "call-1", tool: "search" },
      { type: "text", delta: "Hyvää!" },
      { type: "reply-done" },
    ]);
  });

  it("fails a truncated stream instead of pretending the answer finished", async () => {
    const events: AgentEvent[] = [];
    await expect(readAvatarStream(stream('data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n'), (event) => events.push(event)))
      .rejects.toThrow("ended early");
    expect(events.map((event) => event.type)).toEqual(["text", "error"]);
  });

  it("surfaces server errors and releases the reader", async () => {
    const events: AgentEvent[] = [];
    const body = stream('event: error\ndata: {"error":"private upstream details"}\n\n');
    await expect(readAvatarStream(body, (event) => events.push(event))).rejects.toThrow("could not finish");
    expect(events).toEqual([{ type: "error", message: "The assistant could not finish its reply." }]);
    expect(body.locked).toBe(false);
  });

  it("aborts a blocked reader without reporting a server failure", async () => {
    const abort = new AbortController();
    const events: AgentEvent[] = [];
    const body = new ReadableStream<Uint8Array>({});
    const reading = readAvatarStream(body, (event) => events.push(event), { signal: abort.signal });
    abort.abort();
    await expect(reading).rejects.toMatchObject({ name: "AbortError" });
    expect(events).toEqual([]);
    expect(body.locked).toBe(false);
  });
});

it("cancels replay without delivering later events", async () => {
  vi.useFakeTimers();
  try {
    const controller = new AbortController();
    const events: AgentEvent[] = [];
    const playing = replayRun({ message: "Demo", source: "Synthetic", events: [
      { atMs: 0, event: { type: "request-sent" } },
      { atMs: 1000, event: { type: "text", delta: "Too late" } },
    ] }, (event) => events.push(event), { signal: controller.signal });
    const rejection = expect(playing).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await rejection;
    await vi.advanceTimersByTimeAsync(2000);
    expect(events).toEqual([{ type: "request-sent" }]);
  } finally { vi.useRealTimers(); }
});
