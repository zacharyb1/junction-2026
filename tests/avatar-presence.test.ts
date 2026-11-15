import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIT_TOLERANCE_MS, MAX_RATE, MIN_RATE, nextListen, planLengthMs, planTalk, validatePresence,
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
  ({ id, kind, durationMs, src: `/avatar/desk/${id}.mp4`, sourceId: "pexels-5941016", sourceInMs: 0, sourceOutMs: durationMs, speed: 1 });
const fixture = (): PresenceManifest => ({
  id: "desk", label: "Desk", poster: "/avatar/desk/poster.jpg", width: 1280, height: 720, fps: 25, crossfadeMs: 240,
  segments: [segment("listen-a", "listen", 2480), segment("listen-b", "listen", 3120), segment("talk-a", "talk", 7400), segment("talk-b", "talk", 4200)],
  speech: { pregnancy: { src: "/avatar/desk/speech/pregnancy.mp3", durationMs: 15800, transcript: "Let's take this one step at a time.", provider: "elevenlabs", voice: "Bill" } },
  attribution: { creator: "A creator", sourceUrl: "https://www.pexels.com/video/5941016/", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", note: "Stock footage." },
});

/**
 * Independent brute force: does any sequence of talk segments fit the audio inside the rate bounds?
 * With `distinct`, a segment may not follow itself.
 */
function fitExists(talks: PresenceSegment[], target: number, distinct = false) {
  const max = target * MAX_RATE + FIT_TOLERANCE_MS;
  const seen = new Set<string>();
  const states: [number, string | null][] = [[0, null]];
  while (states.length) {
    const [sum, last] = states.pop()!;
    if (sum) {
      const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, sum / target));
      if (Math.abs(sum / rate - target) <= FIT_TOLERANCE_MS) return true;
    }
    for (const talk of talks) {
      if (distinct && talk.id === last) continue;
      const next = sum + talk.durationMs;
      const key = `${next}:${distinct ? talk.id : ""}`;
      if (next <= max && !seen.has(key)) { seen.add(key); states.push([next, talk.id]); }
    }
  }
  return false;
}
const adjacentRepeats = (ids: string[], lastId: string | null) =>
  ids.filter((id, index) => id === (index ? ids[index - 1] : lastId)).length;

describe("presence manifest validation", () => {
  it("accepts the contract shape", () => {
    expect(validatePresence(fixture())).toEqual([]);
  });

  it("names every broken rule", () => {
    const broken = fixture() as unknown as Record<string, unknown>;
    broken.segments = [
      segment("listen-a", "listen", 2480),
      { ...segment("listen-a", "listen", 2480) },
      { ...segment("talk-a", "talk", 300), src: "/avatar/other/talk-a.mp4" },
      { ...segment("talk-b", "talk", 4000), src: "/avatar/desk/../office/x.mp4" },
      { ...segment("odd", "listen", 3000), kind: "wave" },
    ];
    broken.speech = { pregnancy: { src: "/avatar/desk/speech/p.mp3", durationMs: 1000, transcript: "Hi", provider: "gemini", voice: "Kore" }, other: {} };
    broken.attribution = { creator: "", sourceUrl: "http://example.com", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", note: "x" };
    const problems = validatePresence(broken).join("\n");
    expect(problems).toMatch(/segment listen-a is listed twice/);
    expect(problems).toMatch(/segment talk-a must play a file under \/avatar\/desk\//);
    expect(problems).toMatch(/segment talk-a is too short/);
    expect(problems).toMatch(/segment talk-b must play a file under/);
    expect(problems).toMatch(/segment odd kind must be listen or talk/);
    expect(problems).toMatch(/speech pregnancy must name its provider, elevenlabs/);
    expect(problems).toMatch(/speech other is not a prepared scene/);
    expect(problems).toMatch(/attribution creator is missing/);
    expect(problems).toMatch(/attribution sourceUrl must be an https link/);
    expect(validatePresence(null)).toHaveLength(1);
    expect(validatePresence({ ...fixture(), segments: [segment("listen-a", "listen", 2480), segment("talk-a", "talk", 7400)] }).join("\n"))
      .toMatch(/At least two listen segments.*\n.*At least two talk segments/);
  });

  it("validates the published desk manifest and finds every file it names", async () => {
    const root = path.join(process.cwd(), "public");
    const manifest = JSON.parse(await readFile(path.join(root, "avatar/desk/presence.json"), "utf8")) as PresenceManifest;
    expect(validatePresence(manifest)).toEqual([]);
    const files = [manifest.poster, ...manifest.segments.map((item) => item.src), ...Object.values(manifest.speech).map((item) => item!.src)];
    for (const file of files) expect((await stat(path.join(root, file))).size, file).toBeGreaterThan(0);
  });
});

describe("listen chain", () => {
  const segments = fixture().segments.concat(segment("listen-c", "listen", 1320));

  it("never plays the same listen segment twice in a row, and uses all of them", () => {
    const random = seeded(7);
    const seen: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 300; i++) {
      const next: PresenceSegment = nextListen(segments, last, random)!;
      expect(next.kind).toBe("listen");
      expect(next.id).not.toBe(last);
      seen.push(next.id);
      last = next.id;
    }
    expect(new Set(seen)).toEqual(new Set(["listen-a", "listen-b", "listen-c"]));
  });

  it("repeats a single listen segment, and has nothing without one", () => {
    expect(nextListen([segment("only", "listen", 2000)], "only")?.id).toBe("only");
    expect(nextListen([segment("talk", "talk", 2000)], null)).toBeNull();
    // A random source that returns exactly 1 must not index past the end.
    expect(nextListen(segments, null, () => 1)?.kind).toBe("listen");
  });
});

describe("talk plans", () => {
  const sets: Record<string, PresenceSegment[]> = {
    contract: [segment("talk-a", "talk", 7400), segment("talk-b", "talk", 4200)],
    published: [segment("talk-a", "talk", 3280), segment("talk-b", "talk", 8640), segment("talk-a-rev", "talk", 3280), segment("talk-b-rev", "talk", 8640)],
    awkward: [segment("long-a", "talk", 9000), segment("long-b", "talk", 11000)],
  };

  for (const [name, talks] of Object.entries(sets)) {
    it(`fits the audio within ${FIT_TOLERANCE_MS} ms whenever a combination allows it (${name})`, () => {
      const random = seeded(name.length);
      const segments = [...talks, segment("listen-a", "listen", 2000)];
      for (let duration = 600; duration <= 70_000; duration += 173) {
        const plan = planTalk(segments, duration, null, random);
        expect(plan.rate).toBeGreaterThanOrEqual(MIN_RATE);
        expect(plan.rate).toBeLessThanOrEqual(MAX_RATE);
        expect(plan.ids.length).toBeGreaterThan(0);
        expect(plan.ids.every((id) => talks.some((talk) => talk.id === id))).toBe(true);
        const error = Math.abs(planLengthMs(segments, plan) - duration);
        if (fitExists(talks, duration)) expect(error, `${duration} ms`).toBeLessThanOrEqual(FIT_TOLERANCE_MS);
        if (fitExists(talks, duration, true)) expect(adjacentRepeats(plan.ids, null), `${duration} ms: ${plan.ids.join(",")}`).toBe(0);
      }
    });
  }

  it("returns the closest plan when nothing fits, for the caller to end at the audio's end", () => {
    const talks = sets.contract;
    const short = planTalk(talks, 1000, null, seeded(1));
    expect(short).toEqual({ ids: ["talk-b"], rate: MAX_RATE });
    // 9000 ms: 4200 + 4200 at 0.933 fits only by repeating; a repeat is better than missing by seconds.
    const gap = planTalk(talks, 9000, null, seeded(2));
    expect(Math.abs(planLengthMs(talks, gap) - 9000)).toBeLessThanOrEqual(FIT_TOLERANCE_MS);
  });

  it("does not open with the talk segment that played last", () => {
    for (let i = 0; i < 50; i++) {
      const plan = planTalk(sets.published, 12_000, "talk-a", seeded(i));
      expect(plan.ids[0]).not.toBe("talk-a");
    }
  });

  it("repeats segments in varied order for long audio", () => {
    const orders = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const plan = planTalk(sets.published, 120_000, null, seeded(100 + i));
      expect(plan.ids.length).toBeGreaterThan(sets.published.length * 2);
      expect(adjacentRepeats(plan.ids, null)).toBe(0);
      expect(new Set(plan.ids).size).toBe(sets.published.length);
      orders.add(plan.ids.join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("has no plan without talk segments or audio", () => {
    expect(planTalk([segment("listen-a", "listen", 2000)], 5000, null)).toEqual({ ids: [], rate: 1 });
    expect(planTalk(sets.contract, 0, null)).toEqual({ ids: [], rate: 1 });
    expect(planTalk(sets.contract, Number.NaN, null)).toEqual({ ids: [], rate: 1 });
  });
});

describe("hubs", () => {
  const hubbed = (id: string, kind: PresenceSegment["kind"], durationMs: number, startHub: number, endHub: number): PresenceSegment =>
    ({ ...segment(id, kind, durationMs), startHub, endHub });
  // The published desk repertoire: three rest poses (source frames 100, 181 and 396).
  const desk = [
    hubbed("listen-a", "listen", 3560, 100, 100), hubbed("listen-b", "listen", 2680, 181, 181), hubbed("listen-b-slow", "listen", 5360, 181, 181),
    hubbed("listen-c", "listen", 1320, 396, 396), hubbed("listen-c-slow", "listen", 2640, 396, 396),
    hubbed("talk-a", "talk", 3280, 100, 181), hubbed("talk-a-rev", "talk", 3280, 181, 100),
    hubbed("talk-b", "talk", 8640, 181, 396), hubbed("talk-b-rev", "talk", 8640, 396, 181),
  ];
  const byId = (id: string) => desk.find((item) => item.id === id)!;

  it("rejects half-named or non-frame hubs", () => {
    const manifest = fixture();
    manifest.segments[0] = { ...manifest.segments[0], startHub: 100 };
    manifest.segments[1] = { ...manifest.segments[1], startHub: 1.5, endHub: 2 };
    expect(validatePresence(manifest)).toEqual([
      "segment listen-a startHub and endHub must both be source frame numbers.",
      "segment listen-b startHub and endHub must both be source frame numbers.",
    ]);
  });

  it("mostly stays on the resting hub when idle, still visits every hub, and never repeats", () => {
    const random = seeded(11);
    let last: string | null = null;
    let hub = 181;
    let stays = 0;
    const hubs = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const next: PresenceSegment = nextListen(desk, last, random, hub)!;
      expect(next.id).not.toBe(last);
      if (next.startHub === hub) stays++;
      hubs.add(next.startHub!);
      last = next.id;
      hub = next.endHub!;
    }
    // listen-a is alone on its hub, so idle always leaves that one.
    expect(stays / 2000).toBeGreaterThan(0.5);
    expect(hubs).toEqual(new Set([100, 181, 396]));
  });

  it("plans the prepared answers as hub-to-hub chains that fit the audio", () => {
    for (const audio of [10913, 12214, 17090]) {
      for (const start of [100, 181, 396, null]) {
        const plan = planTalk(desk, audio, null, seeded(audio + (start ?? 0)), start);
        expect(Math.abs(planLengthMs(desk, plan) - audio), `${audio} from ${start}`).toBeLessThanOrEqual(FIT_TOLERANCE_MS);
        plan.ids.slice(1).forEach((id, index) => expect(byId(id).startHub).toBe(byId(plan.ids[index]).endHub));
      }
    }
  });

  it("starts on the resting hub when a chain from there fits", () => {
    for (const audio of [12214, 17090]) {
      const plan = planTalk(desk, audio, null, seeded(audio), 181);
      expect(byId(plan.ids[0]).startHub).toBe(181);
    }
  });
});
