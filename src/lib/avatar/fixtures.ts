import type { RecordedRun } from "./types";

/** Synthetic timing fixture; these events are not a real research result. */
export const DEMO_RUN: RecordedRun = {
  message: "Help me understand a letter about my rent.",
  source: "Illustrative sequence · no live research or generated speech",
  events: [
    { atMs: 0, event: { type: "request-sent" } },
    { atMs: 1600, event: { type: "thinking" } },
    { atMs: 3200, event: { type: "tool-start", id: "demo-research", tool: "mcp__casefile__research_case" } },
    { atMs: 5200, event: { type: "tool-start", id: "demo-page", tool: "search" } },
    { atMs: 7200, event: { type: "tool-end", id: "demo-page", tool: "search" } },
    { atMs: 9600, event: { type: "tool-end", id: "demo-research", tool: "mcp__casefile__research_case" } },
    { atMs: 10800, event: { type: "text", delta: "This is an illustrative playback. In a live conversation, the assistant’s reply and sources appear here while the avatar responds to real tool events." } },
    { atMs: 12400, event: { type: "reply-done" } },
  ],
};
