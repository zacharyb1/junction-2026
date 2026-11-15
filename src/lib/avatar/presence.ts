/**
 * The filmed "desk" presence: one locked-off stock clip cut into short segments that all begin and end
 * in the same rest pose (the hub). Any segment may follow any other with a short crossfade, so the
 * player only has to choose an order. "listen" segments chain while the companion waits; "talk"
 * segments play while a voice is heard, chosen so that together they last as long as the audio.
 *
 * The manifest is written by the asset script to public/avatar/desk/presence.json.
 */
import type { PreparedSceneId } from "./prepared-scenes";

export type PresenceKind = "listen" | "talk";

export interface PresenceSegment {
  id: string;
  /** Path under public/, inside the manifest's own folder. The file carries no audio track. */
  src: string;
  kind: PresenceKind;
  /** Duration of the encoded file. */
  durationMs: number;
  /** Provenance in the source clip. */
  sourceId: string;
  sourceInMs: number;
  sourceOutMs: number;
  /** Speed the source interval was encoded at. */
  speed: number;
  /**
   * Source frames of the rest pose (hub) the segment starts and ends on. A join between equal hubs
   * shows no change of pose; a join between different hubs shows as a short dissolve. Optional: without
   * hubs every join is treated alike.
   */
  startHub?: number;
  endHub?: number;
}

export interface PresenceSpeech {
  src: string;
  durationMs: number;
  transcript: string;
  provider: "elevenlabs";
  voice: string;
}

export type PresenceSpeechSet = Partial<Record<PreparedSceneId, PresenceSpeech>>;

export interface PresenceManifest {
  id: string;
  label: string;
  /** A hub frame, shown under the videos until one can play. */
  poster: string;
  width: number;
  height: number;
  fps: number;
  crossfadeMs: number;
  segments: PresenceSegment[];
  speech: PresenceSpeechSet;
  attribution: { creator: string; sourceUrl: string; license: string; licenseUrl: string; note: string };
}

export interface TalkPlan {
  /** Talk segment ids in playing order. Empty when there is no talk segment. */
  ids: string[];
  /** playbackRate for every segment of the plan, inside [MIN_RATE, MAX_RATE]. */
  rate: number;
}

export const MIN_RATE = 0.9;
export const MAX_RATE = 1.1;
/** A plan fits when its length at the chosen rate is this close to the audio. */
export const FIT_TOLERANCE_MS = 150;
/** How often idle leaves its rest pose for another one when it could stay; that join shows as a dissolve. */
export const LEAVE_HUB = 0.3;
export const SPEECH_SCENES = ["pregnancy", "clinic", "employer"] as const satisfies readonly PreparedSceneId[];

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
    if (typeof segment.sourceInMs !== "number" || !Number.isFinite(segment.sourceInMs) || segment.sourceInMs < 0 ||
        typeof segment.sourceOutMs !== "number" || !Number.isFinite(segment.sourceOutMs) || segment.sourceOutMs <= segment.sourceInMs) {
      problems.push(`${label} source interval is invalid.`);
    }
    if (!isPositive(segment.speed)) problems.push(`${label} speed must be positive.`);
    const hubs = [segment.startHub, segment.endHub];
    if (hubs.some((hub) => hub !== undefined) && !hubs.every((hub) => Number.isInteger(hub) && (hub as number) >= 0)) {
      problems.push(`${label} startHub and endHub must both be source frame numbers.`);
    }
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

type Random = () => number;
const pick = <T>(items: readonly T[], random: Random): T =>
  items[Math.min(items.length - 1, Math.floor(Math.max(0, random()) * items.length))];

/**
 * The next listen segment: random, and never the one just played when there is another. Given the hub
 * the picture is resting on, it usually stays there (a seamless join) and sometimes, with probability
 * LEAVE_HUB, moves to another hub so that idle keeps its variety.
 */
export function nextListen(segments: readonly PresenceSegment[], lastId: string | null, random: Random = Math.random, hub: number | null = null): PresenceSegment | null {
  const listens = segments.filter((segment) => segment.kind === "listen");
  if (!listens.length) return null;
  const fresh = listens.filter((segment) => segment.id !== lastId);
  const pool = fresh.length ? fresh : listens;
  if (hub === null) return pick(pool, random);
  const here = pool.filter((segment) => segment.startHub === hub);
  const elsewhere = pool.filter((segment) => segment.startHub !== hub);
  if (here.length && (!elsewhere.length || random() >= LEAVE_HUB)) return pick(here, random);
  return pick(elsewhere.length ? elsewhere : pool, random);
}

const clampRate = (rate: number) => Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
/** How far a sequence of this summed length, at its best rate, misses the audio. */
function fit(sum: number, durationMs: number) {
  const rate = clampRate(sum / durationMs);
  return { rate, error: Math.abs(sum / rate - durationMs) };
}
const repeats = (ids: readonly string[], lastId: string | null) =>
  ids.reduce((count, id, index) => count + (id === (index ? ids[index - 1] : lastId) ? 1 : 0), 0);

type Candidate = { ids: string[]; rate: number; error: number; repeats: number; offHub?: boolean };
/** Lower is better: fitting first, then no immediate repeats, then a rate near 1. */
function better(a: Candidate, b: Candidate | null) {
  if (!b) return true;
  const aFits = a.error <= FIT_TOLERANCE_MS, bFits = b.error <= FIT_TOLERANCE_MS;
  if (aFits !== bFits) return aFits;
  if (!aFits) return a.error < b.error - 1 || (Math.abs(a.error - b.error) <= 1 && a.repeats < b.repeats);
  if (a.repeats !== b.repeats) return a.repeats < b.repeats;
  // Coarse buckets keep the random order of equally good plans.
  return Math.round(Math.abs(a.rate - 1) * 40) < Math.round(Math.abs(b.rate - 1) * 40);
}

/** Order a multiset of talk segments so that no segment follows itself, where that is possible. */
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

/** Exhaustive fallback: any multiset whose summed length fits, found on a 10 ms grid. */
function search(talks: readonly PresenceSegment[], durationMs: number, lastId: string | null, random: Random): Candidate | null {
  const step = 10;
  const limit = Math.ceil((durationMs * MAX_RATE + FIT_TOLERANCE_MS) / step);
  const from = new Map<number, { previous: number; segment: PresenceSegment; sum: number }>();
  const sums = new Map<number, number>([[0, 0]]);
  for (let bucket = 0; bucket <= limit; bucket++) {
    const sum = sums.get(bucket);
    if (sum === undefined) continue;
    for (const segment of talks) {
      const next = bucket + Math.max(1, Math.round(segment.durationMs / step));
      if (next > limit || sums.has(next)) continue;
      sums.set(next, sum + segment.durationMs);
      from.set(next, { previous: bucket, segment, sum: sum + segment.durationMs });
    }
  }
  // Segments of equal length are interchangeable in a sum; spread each count over all of them.
  const twins = new Map<number, PresenceSegment[]>();
  for (const segment of talks) twins.set(segment.durationMs, [...(twins.get(segment.durationMs) ?? []), segment]);
  let best: Candidate | null = null;
  for (const [bucket, sum] of sums) {
    if (!bucket) continue;
    const { rate, error } = fit(sum, durationMs);
    if (error > FIT_TOLERANCE_MS) continue;
    const counts = new Map<PresenceSegment, number>();
    const used = new Map<number, number>();
    for (let at = bucket; at; at = from.get(at)!.previous) {
      const { segment } = from.get(at)!;
      const group = twins.get(segment.durationMs)!;
      const turn = used.get(segment.durationMs) ?? Math.floor(random() * group.length);
      used.set(segment.durationMs, turn + 1);
      const member = group[turn % group.length];
      counts.set(member, (counts.get(member) ?? 0) + 1);
    }
    const ids = arrange(counts, lastId, random);
    const candidate = { ids, rate, error, repeats: repeats(ids, lastId) };
    if (better(candidate, best)) best = candidate;
  }
  return best;
}

/**
 * A plan in which every segment starts on the hub the one before it ended on, so its joins show no
 * change of pose. Random walks from the given hub (and, less often, from any hub, since the first join
 * interrupts a listen segment anyway); null when no walk fits the audio.
 */
function chain(talks: readonly PresenceSegment[], durationMs: number, lastId: string | null, startHub: number | null, random: Random): Candidate | null {
  const ceiling = durationMs * MAX_RATE + FIT_TOLERANCE_MS;
  const starts = [...new Set(talks.map((segment) => segment.startHub!))];
  let best: Candidate | null = null;
  for (let attempt = 0; attempt < 160; attempt++) {
    const from = startHub !== null && attempt % 3 !== 2 ? startHub : pick(starts, random);
    const ids: string[] = [];
    let sum = 0;
    let hub = from;
    let previous = lastId;
    while (sum < ceiling) {
      const out = talks.filter((segment) => segment.startHub === hub);
      if (!out.length) break;
      const fresh = out.filter((segment) => segment.id !== previous);
      const segment = pick(fresh.length ? fresh : out, random);
      ids.push(segment.id);
      sum += segment.durationMs;
      previous = segment.id;
      hub = segment.endHub!;
      const { rate, error } = fit(sum, durationMs);
      if (error > FIT_TOLERANCE_MS) continue;
      const candidate = { ids: [...ids], rate, error, repeats: repeats(ids, lastId), offHub: startHub !== null && from !== startHub };
      if (!best || (candidate.offHub !== best.offHub ? !candidate.offHub : better(candidate, best))) best = candidate;
    }
  }
  return best;
}

/**
 * Talk segments whose summed durations, played at `rate`, last `durationMs` (within FIT_TOLERANCE_MS)
 * whenever some combination allows it inside [MIN_RATE, MAX_RATE]. When the segments name their hubs,
 * a plan whose joins all meet on the same hub comes first, starting from `startHub` when one fits.
 * Otherwise it prefers orders without immediate
 * repeats (also against `lastId`, the talk segment played last), and for long audio repeats segments
 * in varied order. When nothing fits it returns the closest plan; the caller ends the talk when the
 * audio ends.
 */
export function planTalk(segments: readonly PresenceSegment[], durationMs: number, lastId: string | null, random: Random = Math.random, startHub: number | null = null): TalkPlan {
  const talks = segments.filter((segment) => segment.kind === "talk" && isPositive(segment.durationMs));
  if (!talks.length || !isPositive(durationMs)) return { ids: [], rate: 1 };
  // With hubs, prefer a plan whose joins keep the pose; otherwise any order of segments.
  if (talks.every((segment) => segment.startHub !== undefined && segment.endHub !== undefined)) {
    const chained = chain(talks, durationMs, lastId, startHub, random);
    if (chained) return { ids: chained.ids, rate: chained.rate };
  }
  const ceiling = durationMs * MAX_RATE + FIT_TOLERANCE_MS;
  let best: Candidate | null = null;
  for (let attempt = 0; attempt < 48; attempt++) {
    const ids: string[] = [];
    let sum = 0;
    // Some attempts may open with the last segment: a repeat is better than missing the audio by seconds.
    let previous = attempt % 4 === 3 ? null : lastId;
    while (sum < ceiling) {
      const fresh = talks.filter((segment) => segment.id !== previous);
      const segment = pick(fresh.length ? fresh : talks, random);
      ids.push(segment.id);
      sum += segment.durationMs;
      previous = segment.id;
      const { rate, error } = fit(sum, durationMs);
      const candidate = { ids: [...ids], rate, error, repeats: repeats(ids, lastId) };
      if (better(candidate, best)) best = candidate;
    }
    if (best && best.error <= FIT_TOLERANCE_MS && !best.repeats && attempt >= 3) break;
  }
  if (!best || best.error > FIT_TOLERANCE_MS || best.repeats) {
    const found = search(talks, durationMs, lastId, random);
    if (found && better(found, best)) best = found;
  }
  return { ids: best!.ids, rate: best!.rate };
}

/** Summed length of a plan at its rate. */
export function planLengthMs(segments: readonly PresenceSegment[], plan: TalkPlan) {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  return plan.ids.reduce((sum, id) => sum + (byId.get(id)?.durationMs ?? 0), 0) / plan.rate;
}
