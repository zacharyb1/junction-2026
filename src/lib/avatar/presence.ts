/**
 * The filmed "desk" presence: silent videos made from one locked-off stock clip, every one of which
 * starts and ends on the same rest frame. Any video may therefore follow any other with a short
 * crossfade between two practically identical frames, and the player only has to choose an order.
 * "listen" videos are the idle (the rest frame brought to life); "talk" videos are generic speaking
 * takes, planned to cover a live answer's audio. A prepared answer has its own performance video,
 * timed to its recording and named in `speech`.
 *
 * The manifest is public/avatar/desk/presence.json; scripts/avatar/sync-desk-manifest.mjs refreshes
 * every duration in it from the files.
 */
import type { PreparedSceneId } from "./prepared-scenes";
import type { AvatarSpeechClock } from "./play-voice";

export type PresenceKind = "listen" | "talk";

export interface PresenceSegment {
  id: string;
  /** Path under public/, inside the manifest's own folder. The file carries no audio track. */
  src: string;
  kind: PresenceKind;
  /** Duration of the encoded file. */
  durationMs: number;
  /** The source clip it was made from. */
  sourceId: string;
}

export type PresenceLipSync = "musetalk" | "none";

export interface PresenceSpeech {
  src: string;
  durationMs: number;
  transcript: string;
  provider: "elevenlabs";
  voice: string;
  /** The performance filmed for this answer, played once with the audio. Without it, generic talk covers the audio. */
  video?: string;
  videoDurationMs?: number;
  /** "musetalk": the mouth region of the video is generated to match this audio. */
  lipSync?: PresenceLipSync;
}

export type PresenceSpeechSet = Partial<Record<PreparedSceneId, PresenceSpeech>>;

export interface PresenceManifest {
  id: string;
  label: string;
  /** The rest frame, shown under the videos until one can play. */
  poster: string;
  width: number;
  height: number;
  fps: number;
  /** Source frame every video starts and ends on. */
  restFrame: number;
  crossfadeMs: number;
  segments: PresenceSegment[];
  speech: PresenceSpeechSet;
  attribution: { creator: string; sourceUrl: string; license: string; licenseUrl: string; note: string };
}

/** A voice the picture should talk with. `scene` names a prepared answer; `clock` is its playing audio. */
export type PresenceTalking = { id: string; durationMs: number; scene?: PreparedSceneId; clock?: AvatarSpeechClock } | null;

export interface TalkPlan {
  /** Talk segment ids in playing order. Empty when there is no talk segment. */
  ids: string[];
  /** playbackRate for every segment of the plan, inside [MIN_RATE, MAX_RATE]. */
  rate: number;
}

export const MIN_RATE = 0.92;
export const MAX_RATE = 1.08;
/** A plan fits when its length at the chosen rate is this close to the target. */
export const FIT_TOLERANCE_MS = 150;
/**
 * A plan that ends before the audio leaves the voice over a resting face, so a shortfall costs this
 * many times as much as the same overshoot (where the hands are still settling as the voice ends).
 */
export const SHORTFALL_WEIGHT = 3;
/** A take played twice in a row repeats its gestures visibly; a plan pays this much per forced repeat. */
export const REPEAT_COST_MS = 1000;
export const SPEECH_SCENES = ["pregnancy", "clinic", "employer"] as const satisfies readonly PreparedSceneId[];
export const LIP_SYNC = ["musetalk", "none"] as const satisfies readonly PresenceLipSync[];

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** A public path inside the manifest's own folder, without traversal. */
export function presencePath(id: string, src: unknown): src is string {
  return typeof src === "string" && src.startsWith(`/avatar/${id}/`) &&
    /^\/avatar\/[a-z0-9-]+\/[a-zA-Z0-9_./-]+$/.test(src) && !src.split("/").some((part) => part === ".." || part === ".");
}

/** Every problem with a manifest, in plain words. An empty list means the player may use it. */
export function validatePresence(manifest: unknown): string[] {
  if (!isRecord(manifest)) return ["The manifest is not an object."];
  const problems: string[] = [];
  const id = manifest.id;
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
    problems.push("id must be a lowercase folder name.");
    return problems;
  }
  if (!isText(manifest.label)) problems.push("label is missing.");
  if (!presencePath(id, manifest.poster)) problems.push(`poster must be a file under /avatar/${id}/.`);
  for (const key of ["width", "height", "fps"] as const) if (!isPositive(manifest[key])) problems.push(`${key} must be a positive number.`);
  if (!Number.isInteger(manifest.restFrame) || (manifest.restFrame as number) < 0) problems.push("restFrame must be a source frame number.");
  const crossfade = manifest.crossfadeMs;
  if (!isPositive(crossfade) || crossfade > 1000) problems.push("crossfadeMs must be between 1 and 1000.");
  const segments = Array.isArray(manifest.segments) ? manifest.segments : [];
  if (!Array.isArray(manifest.segments)) problems.push("segments must be a list.");
  const ids = new Set<string>();
  segments.forEach((segment: unknown, index) => {
    const label = isRecord(segment) && typeof segment.id === "string" ? `segment ${segment.id}` : `segment ${index + 1}`;
    if (!isRecord(segment)) { problems.push(`${label} is not an object.`); return; }
    if (!isText(segment.id)) problems.push(`${label} has no id.`);
    else if (ids.has(segment.id)) problems.push(`${label} is listed twice.`);
    else ids.add(segment.id);
    if (!presencePath(id, segment.src)) problems.push(`${label} must play a file under /avatar/${id}/.`);
    if (segment.kind !== "listen" && segment.kind !== "talk") problems.push(`${label} kind must be listen or talk.`);
    if (!isPositive(segment.durationMs)) problems.push(`${label} durationMs must be positive.`);
    else if (isPositive(crossfade) && segment.durationMs <= crossfade * 2) problems.push(`${label} is too short for its crossfades.`);
    if (!isText(segment.sourceId)) problems.push(`${label} has no sourceId.`);
  });
  for (const kind of ["listen", "talk"] as const) {
    const count = segments.filter((segment: unknown) => isRecord(segment) && segment.kind === kind).length;
    if (count < 2) problems.push(`At least two ${kind} segments are needed; found ${count}.`);
  }
  if (!isRecord(manifest.speech)) problems.push("speech must be an object.");
  else {
    for (const [scene, speech] of Object.entries(manifest.speech)) {
      if (!(SPEECH_SCENES as readonly string[]).includes(scene)) { problems.push(`speech ${scene} is not a prepared scene.`); continue; }
      if (!isRecord(speech)) { problems.push(`speech ${scene} is not an object.`); continue; }
      if (!presencePath(id, speech.src)) problems.push(`speech ${scene} must play a file under /avatar/${id}/.`);
      if (!isPositive(speech.durationMs)) problems.push(`speech ${scene} durationMs must be positive.`);
      if (!isText(speech.transcript)) problems.push(`speech ${scene} has no transcript.`);
      if (speech.provider !== "elevenlabs") problems.push(`speech ${scene} must name its provider, elevenlabs.`);
      if (!isText(speech.voice)) problems.push(`speech ${scene} has no voice name.`);
      if (speech.video !== undefined || speech.videoDurationMs !== undefined) {
        if (!presencePath(id, speech.video)) problems.push(`speech ${scene} video must be a file under /avatar/${id}/.`);
        if (!isPositive(speech.videoDurationMs)) problems.push(`speech ${scene} videoDurationMs must be positive.`);
      }
      if (speech.lipSync !== undefined && !(LIP_SYNC as readonly unknown[]).includes(speech.lipSync)) problems.push(`speech ${scene} lipSync must be musetalk or none.`);
      if (speech.lipSync === "musetalk" && speech.video === undefined) problems.push(`speech ${scene} cannot be lip-synced without a video.`);
    }
  }
  const credit = manifest.attribution;
  if (!isRecord(credit)) problems.push("attribution is missing.");
  else {
    for (const key of ["creator", "license", "note"] as const) if (!isText(credit[key])) problems.push(`attribution ${key} is missing.`);
    for (const key of ["sourceUrl", "licenseUrl"] as const) {
      if (typeof credit[key] !== "string" || !/^https:\/\/\S+$/.test(credit[key] as string)) problems.push(`attribution ${key} must be an https link.`);
    }
  }
  return problems;
}

/** The performance video of a prepared answer, as a segment the player can show; null when it has none. */
export function answerSegment(manifest: Pick<PresenceManifest, "speech">, scene: PreparedSceneId): PresenceSegment | null {
  const speech = manifest.speech[scene];
  if (!speech?.video || !isPositive(speech.videoDurationMs)) return null;
  return { id: `answer-${scene}`, src: speech.video, kind: "talk", durationMs: speech.videoDurationMs, sourceId: "answer" };
}

/** True when at least one prepared answer plays a lip-synced performance. */
export const hasLipSync = (speech: PresenceSpeechSet) => Object.values(speech).some((entry) => entry?.lipSync === "musetalk" && entry.video);

type Random = () => number;
const pick = <T>(items: readonly T[], random: Random): T =>
  items[Math.min(items.length - 1, Math.floor(Math.max(0, random()) * items.length))];

/** The next listen segment: random, and never the one just played when there is another. */
export function nextListen(segments: readonly PresenceSegment[], lastId: string | null, random: Random = Math.random): PresenceSegment | null {
  const listens = segments.filter((segment) => segment.kind === "listen");
  if (!listens.length) return null;
  const fresh = listens.filter((segment) => segment.id !== lastId);
  return pick(fresh.length ? fresh : listens, random);
}

const clampRate = (rate: number) => Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
/** The best rate for a summed length, and what the result costs against the target. */
function fit(sum: number, durationMs: number) {
  const rate = clampRate(sum / durationMs);
  const length = sum / rate;
  return { rate, cost: length >= durationMs ? length - durationMs : (durationMs - length) * SHORTFALL_WEIGHT };
}

/** Order a multiset of talk segments so that no segment follows itself (nor `lastId`), where that is possible. */
function arrange(counts: Map<PresenceSegment, number>, lastId: string | null, random: Random): string[] {
  const left = new Map(counts);
  const ids: string[] = [];
  let previous = lastId;
  for (let total = [...left.values()].reduce((a, b) => a + b, 0); total > 0; total--) {
    const available = [...left.entries()].filter(([, count]) => count > 0);
    const max = Math.max(...available.map(([, count]) => count));
    // The most frequent segment must be placed now if it would otherwise be forced to follow itself.
    const urgent = available.filter(([segment, count]) => count === max && count > total / 2 && segment.id !== previous);
    const fresh = available.filter(([segment]) => segment.id !== previous);
    const [segment] = pick(urgent.length ? urgent : fresh.length ? fresh : available, random);
    ids.push(segment.id);
    left.set(segment, left.get(segment)! - 1);
    previous = segment.id;
  }
  return ids;
}
const repeats = (ids: readonly string[], lastId: string | null) =>
  ids.reduce((count, id, index) => count + (id === (index ? ids[index - 1] : lastId) ? 1 : 0), 0);

/**
 * Talk segments that cover `durationMs` of audio when played at one rate inside [MIN_RATE, MAX_RATE].
 * Every combination of segments is considered (on a 10 ms grid) and costs how far it misses the
 * audio, a shortfall counting SHORTFALL_WEIGHT times an overshoot, plus REPEAT_COST_MS for every time
 * no order can avoid playing a take twice in a row. A plan fits when that cost is within
 * FIT_TOLERANCE_MS; among fitting plans the fewest segments win (every join is a return to rest), then
 * the rate nearest 1. Otherwise the cheapest plan wins. Its order avoids repeats, also against
 * `lastId`, the talk segment played last. The caller ends the talk when the audio ends.
 */
export function planTalk(segments: readonly PresenceSegment[], durationMs: number, lastId: string | null, random: Random = Math.random): TalkPlan {
  const talks = segments.filter((segment) => segment.kind === "talk" && isPositive(segment.durationMs));
  if (!talks.length || !isPositive(durationMs)) return { ids: [], rate: 1 };
  const step = 10;
  const shortest = Math.min(...talks.map((segment) => segment.durationMs));
  // Longer than this cannot beat one more segment's worth of overshoot.
  const limit = Math.ceil((durationMs * MAX_RATE + shortest + FIT_TOLERANCE_MS) / step);
  type Cell = { count: number; sum: number; from: number; segment: PresenceSegment };
  const cells = new Map<number, Cell>();
  const start = { count: 0, sum: 0, from: -1, segment: talks[0] };
  cells.set(0, start);
  // Fewest segments for every reachable sum; ties keep variety by a random choice.
  for (let bucket = 0; bucket <= limit; bucket++) {
    const cell = cells.get(bucket);
    if (!cell) continue;
    for (const segment of talks) {
      const next = bucket + Math.max(1, Math.round(segment.durationMs / step));
      if (next > limit) continue;
      const known = cells.get(next);
      const candidate = { count: cell.count + 1, sum: cell.sum + segment.durationMs, from: bucket, segment };
      if (!known || candidate.count < known.count || (candidate.count === known.count && random() < 0.5)) cells.set(next, candidate);
    }
  }
  const countsAt = (bucket: number) => {
    const counts = new Map<PresenceSegment, number>();
    for (let at = bucket; at > 0; at = cells.get(at)!.from) {
      const { segment } = cells.get(at)!;
      counts.set(segment, (counts.get(segment) ?? 0) + 1);
    }
    return counts;
  };
  /** Repeats no order can avoid: the most frequent segment outnumbers the gaps between the others. */
  const forced = (counts: Map<PresenceSegment, number>) => {
    let total = 0, max = 0;
    for (const count of counts.values()) { total += count; max = Math.max(max, count); }
    return Math.max(0, 2 * max - total - 1);
  };
  type Choice = { bucket: number; cost: number; count: number; rate: number; fits: boolean };
  const order = (a: Choice, b: Choice) => {
    if (a.fits !== b.fits) return a.fits ? -1 : 1;
    if (!a.fits && Math.abs(a.cost - b.cost) > 1) return a.cost - b.cost;
    if (a.count !== b.count) return a.count - b.count;
    return Math.abs(a.rate - 1) - Math.abs(b.rate - 1);
  };
  let best: Choice | null = null;
  for (const [bucket, cell] of cells) {
    if (!bucket) continue;
    const { rate, cost: miss } = fit(cell.sum, durationMs);
    // Repeats only add cost, so a plan that already misses by more than the best cannot win.
    if (best && miss > Math.max(best.cost, FIT_TOLERANCE_MS) + 1) continue;
    const cost = miss + forced(countsAt(bucket)) * REPEAT_COST_MS;
    const choice = { bucket, cost, count: cell.count, rate, fits: cost <= FIT_TOLERANCE_MS };
    if (!best || order(choice, best) < 0) best = choice;
  }
  const counts = countsAt(best!.bucket);
  let ids = arrange(counts, lastId, random);
  for (let attempt = 0; attempt < 8 && repeats(ids, lastId); attempt++) ids = arrange(counts, lastId, random);
  return { ids, rate: best!.rate };
}

/** Summed length of a plan at its rate. */
export function planLengthMs(segments: readonly PresenceSegment[], plan: TalkPlan) {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  return plan.ids.reduce((sum, id) => sum + (byId.get(id)?.durationMs ?? 0), 0) / plan.rate;
}
