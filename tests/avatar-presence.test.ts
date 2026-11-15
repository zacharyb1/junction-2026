import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  answerSegment, FIT_TOLERANCE_MS, hasLipSync, MAX_RATE, MIN_RATE, nextListen, planLengthMs, planTalk, REPEAT_COST_MS, SHORTFALL_WEIGHT, validatePresence,
  type PresenceManifest, type PresenceSegment,
} from "../src/lib/avatar/presence";

/** Deterministic random source, so failures reproduce. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const segment = (id: string, kind: PresenceSegment["kind"], durationMs: number): PresenceSegment =>
  ({ id, kind, durationMs, src: `/avatar/desk/${id}.mp4`, sourceId: "pexels-5941016" });
const fixture = (): PresenceManifest => ({
  id: "desk", label: "Desk", poster: "/avatar/desk/poster.jpg", width: 1280, height: 720, fps: 25, restFrame: 406, crossfadeMs: 100,
  segments: [segment("idle-a", "listen", 24320), segment("idle-b", "listen", 24160), segment("talk-4s", "talk", 4160), segment("talk-8s", "talk", 8160)],
  speech: {
    pregnancy: {
      src: "/avatar/desk/speech/pregnancy.mp3", durationMs: 11471, transcript: "Let's take this one step at a time.", provider: "elevenlabs", voice: "Chris",
      video: "/avatar/desk/answers/pregnancy.mp4", videoDurationMs: 11800, lipSync: "musetalk",
    },
  },
  attribution: { creator: "A creator", sourceUrl: "https://www.pexels.com/video/5941016/", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", note: "Stock footage." },
});
/** The generic talk files as published (durations of the current encodes). */
const deskTalks = [
  segment("talk-4s", "talk", 4160), segment("talk-6s", "talk", 5720), segment("talk-8s", "talk", 8160),
  segment("talk-10s", "talk", 9880), segment("talk-12s", "talk", 12280),
];
const adjacentRepeats = (ids: string[], lastId: string | null) =>
  ids.filter((id, index) => id === (index ? ids[index - 1] : lastId)).length;

// --- Independent readers for the published files, so the manifest is checked without ffprobe.
type Box = { type: string; start: number; end: number };
function boxes(data: Buffer, start: number, end: number): Box[] {
  const found: Box[] = [];
  for (let at = start; at + 8 <= end;) {
    let size = data.readUInt32BE(at);
    const type = data.toString("latin1", at + 4, at + 8);
    let header = 8;
    if (size === 1) { size = Number(data.readBigUInt64BE(at + 8)); header = 16; }
    if (size === 0) size = end - at;
    if (size < header) break;
    found.push({ type, start: at + header, end: at + size });
    at += size;
  }
  return found;
}
/** Movie duration, track handler types and the video track's size, from an MP4 file. */
function readMp4(data: Buffer) {
  const moov = boxes(data, 0, data.length).find((box) => box.type === "moov")!;
  const children = boxes(data, moov.start, moov.end);
  const mvhd = children.find((box) => box.type === "mvhd")!;
  const version = data[mvhd.start];
  const timescale = data.readUInt32BE(mvhd.start + (version ? 20 : 12));
  const duration = version ? Number(data.readBigUInt64BE(mvhd.start + 24)) : data.readUInt32BE(mvhd.start + 16);
  const tracks = children.filter((box) => box.type === "trak").map((trak) => {
    const inner = boxes(data, trak.start, trak.end);
    const tkhd = inner.find((box) => box.type === "tkhd")!;
    const mdia = inner.find((box) => box.type === "mdia")!;
    const hdlr = boxes(data, mdia.start, mdia.end).find((box) => box.type === "hdlr")!;
    return {
      handler: data.toString("latin1", hdlr.start + 8, hdlr.start + 12),
      width: data.readUInt32BE(tkhd.end - 8) / 65536, height: data.readUInt32BE(tkhd.end - 4) / 65536,
    };
  });
  return { durationMs: duration / timescale * 1000, tracks };
}
/** Duration of an MPEG audio file, counted frame by frame (the encoder's header frame included). */
function mp3DurationMs(data: Buffer) {
  let at = 0;
  if (data.toString("latin1", 0, 3) === "ID3") at = 10 + ((data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9]);
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const rates = [44100, 48000, 32000];
  let samples = 0, rate = 0;
  while (at + 4 <= data.length) {
    const header = data.readUInt32BE(at);
    if ((header >>> 21) !== 0x7ff) { at++; continue; }
    const mpeg1 = ((header >>> 19) & 3) === 3, layer3 = ((header >>> 17) & 3) === 1;
    const bitrate = bitrates[(header >>> 12) & 15] * 1000;
    rate = rates[(header >>> 10) & 3];
    if (!mpeg1 || !layer3 || !bitrate || !rate) { at++; continue; }
    at += Math.floor(144 * bitrate / rate) + ((header >>> 9) & 1);
    samples += 1152;
  }
  return samples / rate * 1000;
}

describe("presence manifest validation", () => {
  it("accepts the contract shape", () => {
    expect(validatePresence(fixture())).toEqual([]);
    const plain = fixture();
    delete plain.speech.pregnancy!.video; delete plain.speech.pregnancy!.videoDurationMs; plain.speech.pregnancy!.lipSync = "none";
    expect(validatePresence(plain)).toEqual([]);
  });

  it("names every broken rule", () => {
    const broken = fixture() as unknown as Record<string, unknown>;
    broken.segments = [
      segment("idle-a", "listen", 24320),
      { ...segment("idle-a", "listen", 2480) },
      { ...segment("talk-4s", "talk", 150), src: "/avatar/other/talk-a.mp4" },
      { ...segment("talk-8s", "talk", 4000), src: "/avatar/desk/../office/x.mp4" },
      { ...segment("odd", "listen", 3000), kind: "wave" },
    ];
    broken.restFrame = 1.5;
    broken.speech = {
      pregnancy: { src: "/avatar/desk/speech/p.mp3", durationMs: 1000, transcript: "Hi", provider: "gemini", voice: "Kore", video: "/avatar/office/p.mp4", lipSync: "wav2lip" },
      clinic: { src: "/avatar/desk/speech/c.mp3", durationMs: 1000, transcript: "Hi", provider: "elevenlabs", voice: "Chris", lipSync: "musetalk" },
      other: {},
    };
    broken.attribution = { creator: "", sourceUrl: "http://example.com", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", note: "x" };
    const problems = validatePresence(broken).join("\n");
    expect(problems).toMatch(/restFrame must be a source frame number/);
    expect(problems).toMatch(/segment idle-a is listed twice/);
    expect(problems).toMatch(/segment talk-4s must play a file under \/avatar\/desk\//);
    expect(problems).toMatch(/segment talk-4s is too short/);
    expect(problems).toMatch(/segment talk-8s must play a file under/);
    expect(problems).toMatch(/segment odd kind must be listen or talk/);
    expect(problems).toMatch(/speech pregnancy must name its provider, elevenlabs/);
    expect(problems).toMatch(/speech pregnancy video must be a file under \/avatar\/desk\//);
    expect(problems).toMatch(/speech pregnancy videoDurationMs must be positive/);
    expect(problems).toMatch(/speech pregnancy lipSync must be musetalk or none/);
    expect(problems).toMatch(/speech clinic cannot be lip-synced without a video/);
    expect(problems).toMatch(/speech other is not a prepared scene/);
    expect(problems).toMatch(/attribution creator is missing/);
    expect(problems).toMatch(/attribution sourceUrl must be an https link/);
    expect(validatePresence(null)).toHaveLength(1);
    expect(validatePresence({ ...fixture(), segments: [segment("idle-a", "listen", 24320), segment("talk-4s", "talk", 4160)] }).join("\n"))
      .toMatch(/At least two listen segments.*\n.*At least two talk segments/);
  });

  it("turns a prepared answer's video into a playable segment and says when lip-sync is claimed", () => {
    const manifest = fixture();
    expect(answerSegment(manifest, "pregnancy")).toMatchObject({ id: "answer-pregnancy", src: "/avatar/desk/answers/pregnancy.mp4", kind: "talk", durationMs: 11800 });
    expect(answerSegment(manifest, "clinic")).toBeNull();
    expect(hasLipSync(manifest.speech)).toBe(true);
    manifest.speech.pregnancy!.lipSync = "none";
    expect(hasLipSync(manifest.speech)).toBe(false);
  });
});

describe("the published desk manifest", async () => {
  const root = path.join(process.cwd(), "public");
  const manifest = JSON.parse(await readFile(path.join(root, "avatar/desk/presence.json"), "utf8")) as PresenceManifest;

  it("is valid, with one rest frame, three idles, five generic talks and three prepared answers", () => {
    expect(validatePresence(manifest)).toEqual([]);
    expect(manifest).not.toHaveProperty("segments.0.startHub");
    expect(manifest.crossfadeMs).toBe(100);
    expect(manifest.segments.filter((item) => item.kind === "listen").map((item) => item.id)).toEqual(["idle-a", "idle-b", "idle-c"]);
    expect(manifest.segments.filter((item) => item.kind === "talk").map((item) => item.id)).toEqual(["talk-4s", "talk-6s", "talk-8s", "talk-10s", "talk-12s"]);
    expect(Object.keys(manifest.speech).sort()).toEqual(["clinic", "employer", "pregnancy"]);
    for (const [scene, speech] of Object.entries(manifest.speech)) {
      expect(speech).toMatchObject({ provider: "elevenlabs", voice: "Chris", video: `/avatar/desk/answers/${scene}.mp4` });
      expect(["musetalk", "none"]).toContain(speech!.lipSync);
    }
  });

  it("lists durations that match the files, which are silent 1280x720 videos", async () => {
    expect((await stat(path.join(root, manifest.poster))).size).toBeGreaterThan(0);
    const videos = [
      ...manifest.segments.map((item) => ({ src: item.src, durationMs: item.durationMs })),
      ...Object.values(manifest.speech).map((item) => ({ src: item!.video!, durationMs: item!.videoDurationMs! })),
    ];
    for (const video of videos) {
      const file = readMp4(await readFile(path.join(root, video.src)));
      // One frame (40 ms at 25 fps) of slack for how a container rounds its duration.
      expect(Math.abs(file.durationMs - video.durationMs), video.src).toBeLessThanOrEqual(40);
      expect(file.tracks.map((track) => track.handler), video.src).toEqual(["vide"]);
      expect(file.tracks[0], video.src).toMatchObject({ width: manifest.width, height: manifest.height });
    }
    for (const speech of Object.values(manifest.speech)) {
      // Counting frames includes the encoder's header frame and padding that a player skips (about 50 ms).
      const measured = mp3DurationMs(await readFile(path.join(root, speech!.src)));
      expect(measured - speech!.durationMs, speech!.src).toBeGreaterThanOrEqual(-10);
      expect(measured - speech!.durationMs, speech!.src).toBeLessThanOrEqual(80);
    }
  });

  it("uses the transcripts of the authored dialogue", async () => {
    const dialogue = JSON.parse(await readFile(path.join(process.cwd(), "src/data/avatar-performance-dialogue.json"), "utf8")) as
      { provider: string; voice: string; scenes: { id: string; speech: string }[] };
    expect(dialogue).toMatchObject({ provider: "elevenlabs", voice: "Chris" });
    for (const scene of dialogue.scenes) expect(manifest.speech[scene.id as "pregnancy"]?.transcript).toBe(scene.speech);
  });
});

describe("idle order", () => {
  const idles = [segment("idle-a", "listen", 24320), segment("idle-b", "listen", 24160), segment("idle-c", "listen", 24280)];

  it("never plays the same idle twice in a row, and uses all of them in varied order", () => {
    const random = seeded(7);
    const seen: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 300; i++) {
      const next: PresenceSegment = nextListen([...idles, ...deskTalks], last, random)!;
      expect(next.kind).toBe("listen");
      expect(next.id).not.toBe(last);
      seen.push(next.id);
      last = next.id;
    }
    expect(new Set(seen)).toEqual(new Set(["idle-a", "idle-b", "idle-c"]));
    // Not a fixed rotation: some idle is followed by each of the other two.
    const followers = new Set(seen.slice(1).filter((_, index) => seen[index] === "idle-a"));
    expect(followers).toEqual(new Set(["idle-b", "idle-c"]));
  });

  it("repeats a single idle, and has nothing without one", () => {
    expect(nextListen([segment("only", "listen", 2000)], "only")?.id).toBe("only");
    expect(nextListen(deskTalks, null)).toBeNull();
    // A random source that returns exactly 1 must not index past the end.
    expect(nextListen(idles, null, () => 1)?.kind).toBe("listen");
  });
});

describe("live talk plans", () => {
  const miss = (length: number, target: number) => length >= target ? length - target : (target - length) * SHORTFALL_WEIGHT;
  /** Back-to-back repeats no order of these counts can avoid. */
  const forced = (counts: number[]) => Math.max(0, 2 * Math.max(...counts) - counts.reduce((a, b) => a + b, 0) - 1);
  const cost = (ids: string[], length: number, target: number) =>
    miss(length, target) + forced([...new Set(ids)].map((id) => ids.filter((item) => item === id).length)) * REPEAT_COST_MS;
  /** Independent brute force over multisets: the lowest cost any plan can reach inside the rate bounds. */
  function bestCost(talks: PresenceSegment[], target: number) {
    let best = Infinity;
    const counts = talks.map(() => 0);
    const walk = (from: number, sum: number) => {
      if (sum) {
        const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, sum / target));
        best = Math.min(best, miss(sum / rate, target) + forced(counts.filter(Boolean)) * REPEAT_COST_MS);
      }
      if (sum > target * MAX_RATE + 13_000) return;
      for (let index = from; index < talks.length; index++) {
        counts[index]++;
        walk(index, sum + talks[index].durationMs);
        counts[index]--;
      }
    };
    walk(0, 0);
    return best;
  }

  it("covers live audio from 1 s to 45 s inside the rate bounds, as well as any plan can", () => {
    const random = seeded(3);
    for (let duration = 1000; duration <= 45_000; duration += 237) {
      const plan = planTalk(deskTalks, duration, null, random);
      expect(plan.rate).toBeGreaterThanOrEqual(MIN_RATE);
      expect(plan.rate).toBeLessThanOrEqual(MAX_RATE);
      expect(plan.ids.length).toBeGreaterThan(0);
      expect(plan.ids.every((id) => deskTalks.some((talk) => talk.id === id))).toBe(true);
      const achieved = cost(plan.ids, planLengthMs(deskTalks, plan), duration);
      expect(achieved, `${duration} ms: ${plan.ids.join(",")} at ${plan.rate}`).toBeLessThanOrEqual(Math.max(FIT_TOLERANCE_MS, bestCost(deskTalks, duration) + 10));
      expect(adjacentRepeats(plan.ids, null), `${duration} ms: ${plan.ids.join(",")}`).toBe(0);
    }
  });

  it("prefers one take to several when one fits, and covers rather than falls short", () => {
    expect(planTalk(deskTalks, 8000, null, seeded(1)).ids).toEqual(["talk-8s"]);
    expect(planTalk(deskTalks, 12_000, null, seeded(1)).ids).toEqual(["talk-12s"]);
    // 7 s fits nothing inside the bounds: 8.16 s at the fastest rate overshoots by 0.56 s; 5.72 s at the slowest falls 0.78 s short.
    const gap = planTalk(deskTalks, 7000, null, seeded(1));
    expect(gap).toEqual({ ids: ["talk-8s"], rate: MAX_RATE });
    expect(planLengthMs(deskTalks, gap)).toBeGreaterThan(7000);
  });

  it("does not open with the talk played last, and mixes takes in long answers", () => {
    for (let i = 0; i < 30; i++) expect(planTalk(deskTalks, 22_000, "talk-12s", seeded(i)).ids[0]).not.toBe("talk-12s");
    for (const duration of [30_000, 45_000, 60_000, 90_000]) {
      const plan = planTalk(deskTalks, duration, "talk-4s", seeded(duration));
      expect(adjacentRepeats(plan.ids, "talk-4s"), plan.ids.join(",")).toBe(0);
      expect(new Set(plan.ids).size).toBeGreaterThan(1);
    }
  });

  it("has no plan without talk segments or audio", () => {
    expect(planTalk([segment("idle-a", "listen", 2000)], 5000, null)).toEqual({ ids: [], rate: 1 });
    expect(planTalk(deskTalks, 0, null)).toEqual({ ids: [], rate: 1 });
    expect(planTalk(deskTalks, Number.NaN, null)).toEqual({ ids: [], rate: 1 });
  });
});
