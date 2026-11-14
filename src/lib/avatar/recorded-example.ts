import replay from "@/data/replay.json";
import type { RecordedRun, TimedEvent } from "./types";

/**
 * A public, committed Engine recording, adapted to the avatar event vocabulary.
 * The tool names below are playback aliases, not recorded Hermes tool calls.
 * Only search entries with explicit running/done events become tool events;
 * stage/page entries do not establish individual tool execution intervals.
 */
const events: TimedEvent[] = [{ atMs: 0, event: { type: "request-sent" } }];

for (const entry of replay.events) {
  if (entry.type !== "search" || !entry.focus || !entry.web) continue;
  const id = `recorded-search:${JSON.stringify([entry.focus, entry.web])}`;
  const tool = "recorded-engine-search";
  if (entry.status === "running") {
    events.push({
      atMs: entry.ms,
      event: { type: "tool-start", id, tool, label: `Recorded Exa search: ${entry.focus} (${entry.web})` },
    });
  } else if (entry.status === "done") {
    events.push({ atMs: entry.ms, event: { type: "tool-end", id, tool } });
  }
}

const { title, plan } = replay.result;
events.push(
  { atMs: replay.result.ms, event: { type: "text", delta: `${title}\n\n${plan.map((step, index) => `${index + 1}. ${step}`).join("\n")}` } },
  { atMs: replay.result.ms, event: { type: "reply-done" } },
);

// Keep original event order when timestamps match, including text before done.
const timedEvents = events
  .map((event, index) => ({ event, index }))
  .sort((a, b) => a.event.atMs - b.event.atMs || a.index - b.index)
  .map(({ event }) => event);

const sources = Array.from(new Map(replay.result.evidence.map((entry) => [
  entry.url,
  { label: entry.title, url: entry.url },
])).values()).slice(0, 4);

/**
 * The MP3 was saved for this same Case (IRZUhuWnAtPEZVHw).
 * `plan` is the stored written plan, not a complete audio transcript.
 * Speech events must come from actual audio playback, never this timing list.
 */
export const RECORDED_EXAMPLE: {
  run: RecordedRun;
  title: string;
  plan: string[];
  audio: string;
  sources: { label: string; url: string }[];
  recordedAt: string;
} = {
  run: {
    message: replay.request.situation,
    source: "Recorded on 14 November 2026 · original timing · no live research",
    events: timedEvents,
  },
  title,
  plan: [...plan],
  audio: "/hud/plan.mp3",
  sources,
  recordedAt: replay.recordedAt,
};
