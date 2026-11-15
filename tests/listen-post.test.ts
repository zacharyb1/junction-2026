import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUDGET, COOLDOWN_MS, type Effects, ListeningPost, ResearchFailed, RING_MS, SETTLE_MS } from "@/components/listen/post";
import type { ResearchResult } from "@/lib/engine/research";

/** A browser that is not there: it records what the post asks of it. */
function fakeBrowser(over: Partial<Effects> = {}) {
  const log: string[] = [];
  const asked: { situation: string; country: string; region?: string; language: string; scope: string }[] = [];
  let ears: Parameters<Effects["ears"]>[0] | null = null;
  let sayDone: (() => void) | null = null;
  const result = (plan: string[], verified = plan.length): ResearchResult =>
    ({ id: "case12345678", url: "https://example.test/c/case12345678", title: "A plan", plan, evidence: [], evidenceTotal: plan.length, evidenceVerified: verified }) as unknown as ResearchResult;
  let answer: () => Promise<ResearchResult> = async () => result(["Object in writing: within 14 days [1]"]);

  const fx: Effects = {
    ears(on) {
      ears = on;
      return {
        start: () => {
          log.push("ears:start");
          on.started();
        },
        stop: () => log.push("ears:stop"),
      };
    },
    research: async (body) => {
      asked.push(body);
      return answer();
    },
    describe: () => null,
    now: () => Date.now(),
    later(fn, ms) {
      const timer = setTimeout(fn, ms);
      return () => clearTimeout(timer);
    },
    visible: () => true,
    onVisible: () => () => {},
    awake: (on) => log.push(`awake:${on}`),
    prime: () => {},
    ring: (on) => log.push(`ring:${on}`),
    chime: () => log.push("chime"),
    notify: (title) => log.push(`notify:${title}`),
    pings: () => "on",
    askPings: async () => "on",
    say(_result, _language, done) {
      log.push("say");
      sayDone = done;
      return () => done();
    },
    load: () => ({}),
    save: () => {},
    ...over,
  };
  return {
    fx,
    log,
    asked,
    result,
    say: (text: string) => ears?.text(text, true),
    finishSaying: () => sayDone?.(),
    answerWith: (next: () => Promise<ResearchResult>) => (answer = next),
  };
}

const settle = () => vi.advanceTimersByTimeAsync(SETTLE_MS + 10);

describe("the listening post", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("says so when the browser cannot hear", () => {
    const post = new ListeningPost(fakeBrowser({ ears: () => null }).fx);
    post.start();
    expect(post.getSnapshot().status).toBe("unsupported");
  });

  it("keeps small talk on the device", async () => {
    const browser = fakeBrowser();
    const post = new ListeningPost(browser.fx);
    post.start();
    browser.say("what's for dinner");
    browser.say("did you buy milk");
    await settle();
    expect(post.getSnapshot().lines.map((line) => line.tag)).toEqual(["small", "small"]);
    expect(post.getSnapshot().jobs).toEqual([]);
    expect(browser.asked).toEqual([]);
  });

  it("hears a life event, waits for what follows, researches it and calls about a deadline", async () => {
    const browser = fakeBrowser();
    const post = new ListeningPost(browser.fx);
    post.change({ city: "Espoo" });
    post.start();
    expect(post.getSnapshot().status).toBe("listening");

    browser.say("did you buy milk");
    await vi.advanceTimersByTimeAsync(60_000);
    browser.say("the landlord wants to raise the rent by twelve percent");
    expect(post.getSnapshot().jobs[0]).toMatchObject({ state: "collecting", desk: "legal", kind: "rent" });
    await vi.advanceTimersByTimeAsync(2_000);
    browser.say("from the first of January");
    await settle();

    // Only the sentence, what followed it, and the desk's question were sent.
    expect(browser.asked).toHaveLength(1);
    expect(browser.asked[0]).toMatchObject({ country: "FI", region: "Espoo", language: "en", scope: "official" });
    expect(browser.asked[0].situation).toContain("raise the rent by twelve percent. from the first of January.");
    expect(browser.asked[0].situation).not.toContain("milk");

    // The plan has a deadline: AIDaddy calls, and stops listening while it rings.
    const job = post.getSnapshot().jobs[0];
    expect(job).toMatchObject({ state: "done", how: "call", call: "ringing" });
    expect(post.getSnapshot().ringing).toBe(job.id);
    expect(post.getSnapshot().status).toBe("paused");
    expect(browser.log).toContain("ring:true");
    expect(browser.log).toContain("notify:AIDaddy is calling");

    // Answered: it reads the plan, then listens again.
    post.answer(job.id);
    expect(browser.log).toContain("ring:false");
    expect(post.getSnapshot().speaking).toBe(job.id);
    browser.finishSaying();
    expect(post.getSnapshot().speaking).toBeNull();
    expect(post.getSnapshot().status).toBe("listening");
    expect(post.getSnapshot().jobs[0].call).toBe("answered");
  });

  it("pings when nothing is urgent", async () => {
    const browser = fakeBrowser();
    browser.answerWith(async () => browser.result(["Book the first clinic appointment [1]"]));
    const post = new ListeningPost(browser.fx);
    post.start();
    browser.say("I am pregnant");
    await settle();
    expect(post.getSnapshot().jobs[0]).toMatchObject({ state: "done", how: "ping" });
    expect(post.getSnapshot().ringing).toBeNull();
    expect(browser.log).toContain("chime");
    expect(browser.log).not.toContain("ring:true");
  });

  it("counts an unanswered call as missed and listens again", async () => {
    const browser = fakeBrowser();
    const post = new ListeningPost(browser.fx);
    post.start();
    browser.say("our flight to Lisbon was cancelled");
    await settle();
    expect(post.getSnapshot().ringing).not.toBeNull();
    await vi.advanceTimersByTimeAsync(RING_MS + 10);
    expect(post.getSnapshot().jobs[0].call).toBe("missed");
    expect(post.getSnapshot().ringing).toBeNull();
    expect(post.getSnapshot().status).toBe("listening");
    expect(browser.log).toContain("notify:Missed call from AIDaddy");
  });

  it("does not research the same topic twice in a row, unless asked by name", async () => {
    const browser = fakeBrowser();
    browser.answerWith(async () => browser.result(["Read the notice [1]"]));
    const post = new ListeningPost(browser.fx);
    post.start();
    browser.say("the landlord called about the rent increase");
    await settle();
    browser.say("that landlord again");
    await settle();
    expect(post.getSnapshot().lines.map((line) => line.tag)).toEqual(["event", "repeat"]);
    expect(browser.asked).toHaveLength(1);

    browser.say("AI daddy, can the landlord keep our deposit");
    await settle();
    expect(browser.asked).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(COOLDOWN_MS);
    browser.say("the landlord wrote again");
    await settle();
    expect(browser.asked).toHaveLength(3);
  });

  it("rests when a noisy room would spend the credit", async () => {
    const browser = fakeBrowser();
    browser.answerWith(async () => browser.result(["Read it [1]"]));
    const post = new ListeningPost(browser.fx);
    post.start();
    const topics = ["I am pregnant", "we are moving to Tampere", "I need a tax card", "my visa runs out", "the warranty ran out", "is it legal to bring snus"];
    for (const topic of topics) {
      browser.say(topic);
      await settle();
    }
    expect(browser.asked).toHaveLength(BUDGET.runs);
    expect(post.getSnapshot().lines.at(-1)?.tag).toBe("rest");
  });

  it("says plainly when there was nothing to research, or when research failed", async () => {
    const browser = fakeBrowser();
    browser.answerWith(async () => {
      throw new ResearchFailed("I could not find anything to research in that message.", true);
    });
    const post = new ListeningPost(browser.fx);
    post.type("AI daddy, tell me a joke about cats");
    await settle();
    expect(post.getSnapshot().jobs[0]).toMatchObject({ state: "nothing" });

    browser.answerWith(async () => {
      throw new ResearchFailed("The research engine could not be reached.");
    });
    post.type("we got an eviction notice");
    await settle();
    expect(post.getSnapshot().jobs[1]).toMatchObject({ state: "failed", progress: "The research engine could not be reached." });
    expect(browser.log).not.toContain("ring:true");
  });

  it("never calls about a plan with nothing confirmed", async () => {
    const browser = fakeBrowser();
    browser.answerWith(async () => browser.result(["Pay within 3 days [1]"], 0));
    const post = new ListeningPost(browser.fx);
    post.type("I got a parking ticket");
    await settle();
    expect(post.getSnapshot().jobs[0]).toMatchObject({ state: "done", how: "ping" });
  });

  it("stops when asked, and lets the screen sleep again", () => {
    const browser = fakeBrowser();
    const post = new ListeningPost(browser.fx);
    post.start();
    post.stop();
    expect(post.getSnapshot().status).toBe("off");
    expect(browser.log.slice(-2)).toEqual(["ears:stop", "awake:false"]);
  });
});
