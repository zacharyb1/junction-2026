import type { EngineEvent, ResearchResult } from "@/lib/engine/research";
import { type Emergency, emergencyIn, emergencyNumber } from "@/lib/emergency";
import { decide, DESKS, type Desk, importance, situation, type Trigger } from "@/lib/listen";

/**
 * The listening post behind /listen: it hears sentences on this device, decides here which of them is a matter
 * for AIDaddy, sends only those to the research Engine, and comes back with a ping or a call.
 * An emergency is different: AIDaddy says what to do at once, in fixed words, and sends nothing (src/lib/emergency.ts).
 *
 * Everything a browser does for it (the microphone, sound, notifications, the network) comes in as `Effects`,
 * so the rules can be tested without a browser. The page reads its state with `subscribe` and `getSnapshot`.
 */

/** model: the presenter's switch for the model check. Off, nothing but a matter leaves the device. */
export type Settings = { language: "en" | "fi"; country: string; city: string; code: string; model: boolean };

export type Line = {
  id: number;
  text: string;
  at: number;
  /**
   * small: stays on the device. event: sent to research. repeat: already being handled. rest: over the hourly limit.
   * emergency: AIDaddy spoke up. checking: the model check is reading it. model: the model check found a matter.
   */
  tag: "small" | "event" | "repeat" | "rest" | "emergency" | "checking" | "model";
};

export type Job = {
  id: number;
  desk: Desk;
  kind: string;
  heard: string;
  /** When it was heard. */
  at: number;
  state: "collecting" | "working" | "done" | "nothing" | "failed";
  /** What the desk is doing right now, in the Engine's own words. */
  progress: string;
  result?: ResearchResult;
  how?: "call" | "ping";
  call?: "ringing" | "answered" | "missed" | "declined";
};

/** An emergency AIDaddy heard and spoke up about. It stays on the screen until it is closed. */
export type Alarm = { id: number; kind: Emergency; heard: string; at: number; speaking: boolean };

export type Status = "off" | "listening" | "paused" | "denied" | "unsupported" | "trouble";

export type Snapshot = {
  status: Status;
  /** Why it is paused or stopped, when there is a reason to give. */
  note: string;
  /** Words still being spoken. */
  interim: string;
  lines: Line[];
  jobs: Job[];
  /** The job AIDaddy is calling about, and the job it is reading out. */
  ringing: number | null;
  speaking: number | null;
  alarm: Alarm | null;
  /** Notifications: ask (not decided), on, blocked, or none (this browser has none). */
  pings: "ask" | "on" | "blocked" | "none";
  settings: Settings;
};

export type Ears = { start(language: Settings["language"]): void; stop(): void };

/** Research refused or failed before a result. `nothing` means the sentence held nothing to research. */
export class ResearchFailed extends Error {
  constructor(
    message: string,
    public nothing = false,
  ) {
    super(message);
  }
}

export type Effects = {
  /** The microphone and the browser's speech-to-text. Null when this browser has none. */
  ears(on: { started(): void; text(text: string, final: boolean): void; ended(why: "silence" | "denied" | "trouble"): void }): Ears | null;
  /** The model check for one sentence the phrase list let pass: a matter, small talk, or "off" when it cannot answer. */
  sort(text: string, code: string): Promise<"matter" | "small" | "off">;
  research(
    body: { situation: string; country: string; region?: string; language: string; scope: string },
    code: string,
    onEvent: (event: EngineEvent) => void,
  ): Promise<ResearchResult>;
  /** What a progress event says, or null when it says nothing worth showing. */
  describe(event: EngineEvent): string | null;
  now(): number;
  /** Run `fn` after `ms`. Returns a function that cancels it. */
  later(fn: () => void, ms: number): () => void;
  visible(): boolean;
  /** Calls `fn` whenever the page comes back to the front. Returns a function that stops that. */
  onVisible(fn: () => void): () => void;
  /** Keep the screen on, so the page keeps listening. */
  awake(on: boolean): void;
  /** Called on a tap, so sound may play later. */
  prime(): void;
  ring(on: boolean): void;
  chime(): void;
  notify(title: string, body: string): void;
  pings(): Snapshot["pings"];
  askPings(): Promise<Snapshot["pings"]>;
  /** Read a result aloud. Calls `done` when finished. Returns a function that stops it. */
  say(result: ResearchResult, language: Settings["language"], done: () => void): () => void;
  /** Fetch the emergency words ahead, so they can be said at once and without the network. */
  ready(language: Settings["language"], number: string): void;
  /** Say the fixed words for an emergency, after a short alarm tone. Calls `done` when finished. Returns a function that stops it. */
  warn(kind: Emergency, language: Settings["language"], number: string, done: () => void): () => void;
  load(): Partial<Settings>;
  save(settings: Settings): void;
};

/** After a life event is heard, wait this long for the sentences that follow, then start. */
export const SETTLE_MS = 5_000;
/** The same kind of matter is not researched twice within this time. */
export const COOLDOWN_MS = 20 * 60_000;
/** At most this many research runs in this window, so a noisy room cannot spend the credit. */
export const BUDGET = { runs: 5, perMs: 30 * 60_000 };
/** How long a call rings before it counts as missed. */
export const RING_MS = 30_000;
/** The same emergency is not said twice within this time: by then the people are talking to the emergency operator. */
export const QUIET_MS = 3 * 60_000;
const KEEP_LINES = 30;
const KEEP_JOBS = 10;

export const DEFAULTS: Settings = { language: "en", country: "FI", city: "", code: "", model: false };
/** The model check reads only sentences at least this long: "yes", "okay then" and "see you" are small talk. */
export const MODEL_MIN_WORDS = 4;

export const INITIAL: Snapshot = {
  status: "off",
  note: "",
  interim: "",
  lines: [],
  jobs: [],
  ringing: null,
  speaking: null,
  alarm: null,
  pings: "none",
  settings: DEFAULTS,
};

const NOTES = {
  asking: "Waiting for the microphone. Allow it when the browser asks.",
  background: "Paused: this page is in the background. Bring it back to the front to go on.",
  talking: "Paused while AIDaddy rings or talks, so it does not hear itself.",
  denied: "The microphone is blocked for this site. Allow it in the browser's site settings, then press Start.",
  unsupported: "This browser cannot turn speech into text. Use Chrome, Edge or Safari. You can still type what was said.",
  trouble: "The browser's speech service did not answer. Trying again.",
};

export class ListeningPost {
  private state: Snapshot = INITIAL;
  private readonly listeners = new Set<() => void>();
  private ears: Ears | null = null;
  /** The person pressed Start and has not pressed Stop. */
  private wanted = false;
  /** Above zero while AIDaddy rings or talks. */
  private hushed = 0;
  private loaded = false;
  private nextId = 1;
  private retries = 0;
  private readonly triggers = new Map<number, { trigger: Trigger; line: number }>();
  private readonly lastRun = new Map<string, number>();
  private readonly lastAlarm = new Map<Emergency, number>();
  private runs: number[] = [];
  private stopWatching: (() => void) | null = null;
  private cancelRetry: (() => void) | null = null;
  private cancelRing: (() => void) | null = null;
  private stopSaying: (() => void) | null = null;

  constructor(private readonly fx: Effects) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The saved settings are read on the first look from a browser, not on the server. */
  getSnapshot = (): Snapshot => {
    if (!this.loaded) {
      this.loaded = true;
      this.state = { ...this.state, pings: this.fx.pings(), settings: { ...DEFAULTS, ...this.fx.load() } };
    }
    return this.state;
  };

  private set(patch: Partial<Snapshot>) {
    this.state = { ...this.getSnapshot(), ...patch };
    for (const listener of this.listeners) listener();
  }

  private job(id: number, patch: Partial<Job>) {
    this.set({ jobs: this.state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)) });
  }

  // ---- settings ----

  change(patch: Partial<Settings>) {
    const settings = { ...this.getSnapshot().settings, ...patch };
    this.set({ settings });
    // The access code belongs to the tab, not to this device, so it is not saved.
    this.fx.save({ ...settings, code: "" });
    if (this.wanted && (patch.language || patch.country)) this.fx.ready(settings.language, emergencyNumber(settings.country));
    // A new language takes effect at once: the ears start again in it.
    if (patch.language && this.wanted && !this.hushed) {
      this.ears?.stop();
      this.listen();
    }
  }

  async allowPings() {
    this.set({ pings: await this.fx.askPings() });
  }

  // ---- listening ----

  start() {
    this.fx.prime();
    if (this.wanted) return;
    this.ears ??= this.fx.ears({
      started: () => {
        this.retries = 0;
        this.set({ status: "listening", note: "" });
      },
      text: (text, final) => (final ? this.hear(text) : this.set({ interim: text })),
      ended: (why) => this.ended(why),
    });
    if (!this.ears) {
      this.set({ status: "unsupported", note: NOTES.unsupported });
      return;
    }
    this.wanted = true;
    this.fx.ready(this.state.settings.language, emergencyNumber(this.state.settings.country));
    this.set({ status: "paused", note: NOTES.asking });
    this.fx.awake(true);
    this.stopWatching = this.fx.onVisible(() => {
      this.fx.awake(this.wanted);
      this.listen();
    });
    this.listen();
  }

  stop() {
    this.wanted = false;
    this.cancelRetry?.();
    this.stopWatching?.();
    this.stopWatching = null;
    this.ears?.stop();
    this.fx.awake(false);
    this.set({ status: "off", note: "", interim: "" });
  }

  private listen() {
    if (!this.wanted || this.hushed || !this.ears) return;
    if (!this.fx.visible()) {
      this.set({ status: "paused", note: NOTES.background, interim: "" });
      return;
    }
    this.ears.start(this.state.settings.language);
  }

  private ended(why: "silence" | "denied" | "trouble") {
    this.set({ interim: "" });
    if (!this.wanted) return;
    if (why === "denied") {
      this.wanted = false;
      this.fx.awake(false);
      this.set({ status: "denied", note: NOTES.denied });
      return;
    }
    if (this.hushed) return;
    if (!this.fx.visible()) {
      this.set({ status: "paused", note: NOTES.background });
      return;
    }
    // The browser ends a session after a pause in speech. It is started again; after trouble, a little later each time.
    if (why === "trouble") {
      this.retries += 1;
      this.set({ status: "trouble", note: NOTES.trouble });
    }
    const wait = why === "trouble" ? Math.min(15_000, 1_000 * 2 ** this.retries) : 300;
    this.cancelRetry = this.fx.later(() => this.listen(), wait);
  }

  private hush() {
    this.hushed += 1;
    if (this.hushed === 1 && this.wanted) {
      this.cancelRetry?.();
      this.ears?.stop();
      this.set({ status: "paused", note: NOTES.talking, interim: "" });
    }
  }

  private unhush() {
    this.hushed = Math.max(0, this.hushed - 1);
    if (!this.hushed) this.listen();
  }

  // ---- hearing ----

  /** Drop the sentences that were heard. The matters a desk took on stay. */
  forget() {
    this.set({ lines: [], interim: "" });
  }

  /** A typed sentence goes the same way as a heard one. It works without the microphone. */
  type(text: string) {
    this.fx.prime();
    this.hear(text);
  }

  /** One finished sentence. Decided here; nothing leaves the device unless it is a matter for a desk. */
  hear(raw: string) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) return;
    const now = this.fx.now();
    const previous = this.state.lines.at(-1);
    // Some phones report the same sentence twice.
    if (previous && previous.text === text && now - previous.at < 2_000) return;

    const line: Line = { id: this.nextId++, text, at: now, tag: "small" };
    // An emergency comes before everything else: no waiting, no research, no limit.
    const emergency = emergencyIn(text);
    if (emergency) {
      const last = this.lastAlarm.get(emergency);
      const said = last !== undefined && now - last < QUIET_MS;
      line.tag = said ? "repeat" : "emergency";
      this.set({ interim: "", lines: [...this.state.lines, line].slice(-KEEP_LINES) });
      if (!said) this.alarm(emergency, text, now);
      return;
    }
    const trigger = decide(text);
    if (!trigger && this.state.settings.model && text.split(" ").length >= MODEL_MIN_WORDS) {
      // The phrase list let it pass. With the switch on, the server's model has a look before it counts as small talk.
      line.tag = "checking";
      this.set({ interim: "", lines: [...this.state.lines, line].slice(-KEEP_LINES) });
      void this.check(line.id, text);
      return;
    }
    if (trigger) {
      const busy = this.state.jobs.some((job) => job.kind === trigger.kind && (job.state === "collecting" || job.state === "working"));
      const recent = this.lastRun.get(trigger.kind);
      this.runs = this.runs.filter((at) => now - at < BUDGET.perMs);
      // A question put to AIDaddy by name is always taken; an overheard topic is not researched twice in a row.
      if (busy || (!trigger.addressed && recent !== undefined && now - recent < COOLDOWN_MS)) line.tag = "repeat";
      else if (this.runs.length >= BUDGET.runs) line.tag = "rest";
      else line.tag = "event";
    }
    this.set({ interim: "", lines: [...this.state.lines, line].slice(-KEEP_LINES) });
    if (!trigger || line.tag !== "event") return;

    this.begin(trigger, line.id, text, now);
  }

  private begin(trigger: Trigger, lineId: number, text: string, now: number) {
    this.runs.push(now);
    this.lastRun.set(trigger.kind, now);
    const job: Job = { id: this.nextId++, desk: trigger.desk, kind: trigger.kind, heard: text, at: now, state: "collecting", progress: "Listening for what comes next" };
    this.triggers.set(job.id, { trigger, line: lineId });
    this.set({ jobs: [...this.state.jobs, job].slice(-KEEP_JOBS) });
    this.fx.later(() => void this.work(job.id), SETTLE_MS);
  }

  private retag(lineId: number, tag: Line["tag"]) {
    this.set({ lines: this.state.lines.map((line) => (line.id === lineId ? { ...line, tag } : line)) });
  }

  /** The model check's answer for one sentence. A matter goes to the life events desk, as on Telegram. */
  private async check(lineId: number, text: string) {
    const answer = await this.fx.sort(text, this.state.settings.code).catch(() => "off" as const);
    if (answer !== "matter") return this.retag(lineId, "small");
    const now = this.fx.now();
    this.runs = this.runs.filter((at) => now - at < BUDGET.perMs);
    if (this.runs.length >= BUDGET.runs) return this.retag(lineId, "rest");
    this.retag(lineId, "model");
    // Each sentence is its own matter: the model gives no topic to check "already on it" against.
    this.begin({ kind: `heard-${lineId}`, desk: "life", urgent: false, addressed: false }, lineId, text, now);
  }

  private async work(id: number) {
    const known = this.triggers.get(id);
    const job = this.state.jobs.find((item) => item.id === id);
    if (!known || !job) return;
    const { settings, lines } = this.state;
    const index = lines.findIndex((line) => line.id === known.line);
    const heard = index >= 0 ? lines : [{ text: job.heard, at: this.fx.now() }];
    const body = {
      situation: situation(heard, Math.max(0, index), job.desk),
      country: settings.country,
      region: settings.city.trim() || undefined,
      language: settings.language,
      scope: DESKS[job.desk].scope,
    };
    this.job(id, { state: "working", progress: "Asking the research engine" });
    try {
      const result = await this.fx.research(body, settings.code, (event) => {
        const progress = this.fx.describe(event);
        if (progress) this.job(id, { progress });
      });
      // One call at a time: a second urgent result during a call arrives as a ping.
      const free = this.state.ringing === null && this.state.speaking === null;
      const how = importance(known.trigger, result) === "call" && free ? "call" : "ping";
      this.job(id, { state: "done", result, how, progress: "" });
      if (how === "call") this.call(id, result);
      else this.ping(result);
    } catch (error) {
      const nothing = error instanceof ResearchFailed && error.nothing;
      this.job(id, {
        state: nothing ? "nothing" : "failed",
        progress: nothing ? "Nothing in that needs a plan." : error instanceof Error ? error.message : "The research did not finish.",
      });
    } finally {
      this.triggers.delete(id);
    }
  }

  // ---- coming back: a ping or a call ----

  private ping(result: ResearchResult) {
    this.fx.chime();
    this.fx.notify(`AIDaddy: ${result.title}`, (result.plan[0] ?? "").replace(/\s*\[\d+\]/g, ""));
  }

  private call(id: number, result: ResearchResult) {
    this.hush();
    this.job(id, { call: "ringing" });
    this.set({ ringing: id });
    this.fx.ring(true);
    this.fx.notify("AIDaddy is calling", result.title);
    this.cancelRing = this.fx.later(() => this.endRing(id, "missed"), RING_MS);
  }

  private endRing(id: number, outcome: "missed" | "declined") {
    if (this.state.ringing !== id) return;
    this.cancelRing?.();
    this.fx.ring(false);
    this.job(id, { call: outcome });
    this.set({ ringing: null });
    const result = this.state.jobs.find((job) => job.id === id)?.result;
    if (outcome === "missed" && result) this.fx.notify("Missed call from AIDaddy", result.title);
    this.unhush();
  }

  decline(id: number) {
    this.endRing(id, "declined");
  }

  answer(id: number) {
    if (this.state.ringing !== id) return;
    this.cancelRing?.();
    this.fx.ring(false);
    this.job(id, { call: "answered" });
    this.set({ ringing: null });
    this.speak(id, true);
  }

  /** Read a finished plan aloud, on a button or when a call is answered. */
  read(id: number) {
    this.fx.prime();
    if (this.state.ringing !== null || this.state.speaking !== null) return;
    this.hush();
    this.speak(id, true);
  }

  private speak(id: number, hushed: boolean) {
    const result = this.state.jobs.find((job) => job.id === id)?.result;
    if (!result) {
      if (hushed) this.unhush();
      return;
    }
    this.set({ speaking: id });
    this.stopSaying = this.fx.say(result, this.state.settings.language, () => {
      if (this.state.speaking !== id) return;
      this.stopSaying = null;
      this.set({ speaking: null });
      this.unhush();
    });
  }

  hangUp() {
    this.stopSaying?.();
  }

  // ---- an emergency: AIDaddy speaks up by itself ----

  private alarm(kind: Emergency, heard: string, at: number) {
    this.lastAlarm.set(kind, at);
    // Whatever AIDaddy was ringing or reading stops.
    if (this.state.ringing !== null) this.endRing(this.state.ringing, "declined");
    this.stopSaying?.();
    const id = this.nextId++;
    this.set({ alarm: { id, kind, heard, at, speaking: false } });
    this.fx.notify(`AIDaddy: call ${emergencyNumber(this.state.settings.country)} now`, heard);
    this.warn(id);
  }

  private warn(id: number) {
    const alarm = this.state.alarm;
    if (!alarm || alarm.id !== id) return;
    this.hush();
    this.set({ alarm: { ...alarm, speaking: true } });
    const { language, country } = this.state.settings;
    this.stopSaying = this.fx.warn(alarm.kind, language, emergencyNumber(country), () => {
      this.stopSaying = null;
      if (this.state.alarm?.id === id) this.set({ alarm: { ...this.state.alarm, speaking: false } });
      this.unhush();
    });
  }

  /** Say the emergency words once more, on a button. */
  again() {
    this.fx.prime();
    const alarm = this.state.alarm;
    if (!alarm || alarm.speaking || this.state.ringing !== null || this.state.speaking !== null) return;
    this.warn(alarm.id);
  }

  /** Close the emergency words. AIDaddy stops talking and listens again. */
  dismiss() {
    if (this.state.alarm?.speaking) this.stopSaying?.();
    this.set({ alarm: null });
  }
}
