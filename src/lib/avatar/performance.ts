export type PerformanceIntent = "presence" | "attention" | "work";
export type PerformanceTake = {
  id: string;
  src: string;
  kind: PerformanceIntent | "handover";
  sourceId: string;
  /** Provenance in the original performance. src is an already trimmed file. */
  sourceInMs: number;
  sourceOutMs: number;
};

export type PerformanceManifest = {
  id: string;
  label: string;
  poster: string;
  width: number;
  height: number;
  takes: PerformanceTake[];
};

export type PerformanceRequest = {
  /** Every deliberate play/replay must have a new id. Audio is embedded in src. */
  id: string;
  src: string;
  captions?: { fromMs: number; toMs: number; text: string }[];
};

export type PerformanceSpeechEvent = {
  id: string;
  type: "playing" | "paused" | "ended" | "error";
  message?: string;
};

function valid(take: PerformanceTake) {
  return !!take.id && !!take.src && !!take.sourceId &&
    Number.isFinite(take.sourceInMs) && Number.isFinite(take.sourceOutMs) &&
    take.sourceInMs >= 0 && take.sourceOutMs > take.sourceInMs;
}

/** Mount-local history: differently named cuts cannot replay the same source movement. */
export class PerformanceHistory {
  private used: PerformanceTake[] = [];
  private requests = new Set<string>();
  private generation = 0;

  available(take: PerformanceTake) {
    return valid(take) && !this.used.some((previous) =>
      previous.sourceId === take.sourceId &&
        previous.sourceInMs < take.sourceOutMs && take.sourceInMs < previous.sourceOutMs);
  }

  choose(manifest: PerformanceManifest, intent: PerformanceIntent, handover = false) {
    const kinds: PerformanceTake["kind"][] = handover
      ? ["handover", "attention", "presence"]
      : intent === "presence" ? ["presence"] : [intent, "presence"];
    for (const kind of kinds) {
      const take = manifest.takes.find((candidate) => candidate.kind === kind && this.available(candidate));
      if (take) return take;
    }
    return null;
  }

  /** Reserve on reveal, so a cancelled preload does not consume its performance. */
  consume(take: PerformanceTake) {
    if (!this.available(take)) return false;
    this.used.push({ ...take });
    return true;
  }

  request(id: string) {
    if (!id || this.requests.has(id)) return null;
    this.requests.add(id);
    return ++this.generation;
  }

  cancel() { this.generation++; }
  current(token: number) { return token === this.generation; }

  /** Only effect cleanup may release a request that never started (React Strict Mode). */
  releaseUnplayed(id: string) { this.requests.delete(id); }
}
