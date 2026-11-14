/**
 * The video avatar concept (issue 65): shared types.
 *
 * The avatar is a set of pre-rendered clips. Every clip starts on one named pose and ends on one
 * named pose, with the same reference image for each shared pose. This permits pose-compatible
 * scheduling; generated clips still need a visual review for natural motion and seams. What the avatar does is decided by
 * what the agent is really doing, read from the reply stream of `/api/ukk`.
 *
 * Three layers, each knowing nothing about the next:
 *   AgentEvent  what happened (a tool started, text arrived, audio is playing)
 *   Activity    what the avatar should be doing because of it
 *   Clip        which file plays, chosen so that poses line up
 */

/** A resting position shared by clips, for example "front" (facing the viewer) or "desk" (at the laptop). */
export type PoseId = string;

/** The acting vocabulary. Every profile has clips for each of these. */
export type Activity = "idle" | "listening" | "thinking" | "working" | "speaking";

export const ACTIVITIES: readonly Activity[] = ["idle", "listening", "thinking", "working", "speaking"];

/** One video file. */
export interface Clip {
  id: string;
  /** Path under `public/`, for example "/avatar/default/idle.mp4". */
  file: string;
  /** Pose on the first frame. */
  from: PoseId;
  /** Pose on the last frame. A loop has `to === from`. */
  to: PoseId;
  /** A loop may repeat while its activity lasts. A transition plays once, to move between poses. */
  kind: "loop" | "transition";
  durationMs: number;
}

/** One look: the same acting rules rendered for one person in one place. */
export interface Manifest {
  /** Folder name under `public/avatar/`. */
  profile: string;
  /** Name shown in the profile picker. */
  label: string;
  width: number;
  height: number;
  /** Still picture of the rest pose, shown until the first clip can play. Path under `public/`. */
  poster: string;
  /** Pose the avatar starts in. */
  restPose: PoseId;
  clips: Clip[];
  /** For each activity: the pose it is acted in, and the loops that may play (ids of clips with kind "loop"). */
  activities: Record<Activity, { pose: PoseId; loops: string[] }>;
  /** True when the clips are generated test cards, not a rendered person. */
  placeholder?: boolean;
  /** Provenance of the visible person; illustrated clips are locally rendered, not AI video. */
  medium?: "illustrated" | "generated" | "stock";
  attribution?: { creator: string; title: string; sourceUrl: string; license: string; licenseUrl: string; note: string };
}

/**
 * What the page knows about the agent, in the order it happened. The stream reader, the microphone
 * and the audio player produce these; a recorded run replays the same list.
 */
export type AgentEvent =
  /** The visitor's microphone is recording, or stopped. */
  | { type: "listen-start" }
  | { type: "listen-end" }
  /** The message was sent and the reply stream is open. */
  | { type: "request-sent" }
  /** The model is reasoning before or between tool calls. Sent once per burst, not per chunk. */
  | { type: "thinking" }
  /** A tool call began, from `event: hermes.tool.progress` with status "running". */
  | { type: "tool-start"; id: string; tool: string; label?: string }
  /** That tool call ended, status "completed". */
  | { type: "tool-end"; id: string; tool: string }
  /** A piece of reply text. */
  | { type: "text"; delta: string }
  /** The reply stream closed normally. */
  | { type: "reply-done" }
  /** Spoken audio of the reply started or stopped. */
  | { type: "speech-start" }
  | { type: "speech-end" }
  | { type: "error"; message: string };

/** One event of a recorded run: `atMs` is the time since the message was sent. */
export interface TimedEvent {
  atMs: number;
  event: AgentEvent;
}

/** A recorded run that can be replayed with no backend. */
export interface RecordedRun {
  /** What the visitor asked. */
  message: string;
  /** Where and when it was recorded, for the page's caption. */
  source: string;
  events: TimedEvent[];
}

/** What the page shows under the avatar while it acts: a plain line about the real action. */
export interface ActivityNote {
  activity: Activity;
  /** For example "Researching official pages" while `mcp__casefile__research_case` runs. */
  text: string;
}
