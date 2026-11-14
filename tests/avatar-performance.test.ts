import { describe, expect, it } from "vitest";
import { PerformanceHistory, type PerformanceManifest, type PerformanceTake } from "../src/lib/avatar/performance";

const take = (id: string, kind: PerformanceTake["kind"], from: number, to: number, sourceId = "actor") =>
  ({ id, kind, src: `/${id}.mp4`, sourceId, sourceInMs: from, sourceOutMs: to });
const manifest = (takes: PerformanceTake[]): PerformanceManifest =>
  ({ id: "solo", label: "Solo", poster: "/poster.jpg", width: 100, height: 100, takes });

describe("finite forward-only performance history", () => {
  it("rejects reused source movement even under another take name or intent", () => {
    const history = new PerformanceHistory();
    const original = take("first", "presence", 0, 10_000);
    expect(history.consume(original)).toBe(true);
    expect(history.consume(original)).toBe(false);
    expect(history.consume(take("different-name", "work", 8_000, 12_000))).toBe(false);
    expect(history.consume(take("contains-first", "attention", 0, 20_000))).toBe(false);
    expect(history.consume(take("inside-first", "presence", 1_000, 2_000))).toBe(false);
    expect(history.consume(take("adjacent", "presence", 10_000, 20_000))).toBe(true);
    expect(history.consume(take("another-source", "presence", 0, 10_000, "other-actor"))).toBe(true);
    expect(history.consume(take("first", "presence", 0, 10_000, "another-profile"))).toBe(true);
  });

  it("chooses compatible unused takes, then a quiet presence, then exhausts", () => {
    const history = new PerformanceHistory();
    const stage = manifest([
      take("quiet", "presence", 0, 10),
      take("work-a", "work", 10, 20),
      take("overlap", "work", 15, 25),
      take("work-b", "work", 20, 30),
      take("unrelated", "attention", 30, 40),
    ]);
    for (const expected of ["work-a", "work-b", "quiet"]) {
      const next = history.choose(stage, "work");
      expect(next?.id).toBe(expected);
      expect(history.consume(next!)).toBe(true);
    }
    expect(history.choose(stage, "work")).toBeNull();
    expect(history.choose(stage, "attention")?.id).toBe("unrelated");
  });

  it("reserves only on reveal, and uses handover then attention then presence after speech", () => {
    const history = new PerformanceHistory();
    const stage = manifest([take("quiet", "presence", 0, 10), take("attend", "attention", 10, 20), take("return", "handover", 20, 30)]);
    expect(history.choose(stage, "work", true)?.id).toBe("return");
    expect(history.choose(stage, "work", true)?.id).toBe("return");
    for (const expected of ["return", "attend", "quiet"]) {
      const next = history.choose(stage, "work", true);
      expect(next?.id).toBe(expected);
      history.consume(next!);
    }
    expect(history.choose(stage, "presence", true)).toBeNull();
  });

  it("never chooses invalid or zero-duration provenance", () => {
    const history = new PerformanceHistory();
    const stage = manifest([take("zero", "presence", 0, 0), take("negative", "presence", -1, 10), take("nan", "presence", 0, NaN)]);
    expect(history.choose(stage, "presence")).toBeNull();
  });

  it("requires an explicit new request id to replay and invalidates cancelled callbacks", () => {
    const history = new PerformanceHistory();
    const first = history.request("answer-1")!;
    expect(history.current(first)).toBe(true);
    expect(history.request("answer-1")).toBeNull();
    history.cancel();
    expect(history.current(first)).toBe(false);
    expect(history.request("answer-1")).toBeNull();
    const replay = history.request("answer-1-replay-2")!;
    expect(history.current(replay)).toBe(true);
    expect(history.current(first)).toBe(false);
    const replacement = history.request("answer-2")!;
    expect(history.current(replay)).toBe(false);
    expect(history.current(replacement)).toBe(true);
  });
});
