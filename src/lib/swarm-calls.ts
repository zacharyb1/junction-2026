import { mkdir, open, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { z } from "zod";

/**
 * Swarm calls: one task the household confirmed, asked of several recipients at once.
 *
 * ElevenLabs runs the conversations with its agent in AIDaddy's voice and dials them through a Twilio number
 * imported into ElevenLabs (scripts/setup-swarm-calls.mjs). One confirmation starts one batch, and the batch
 * rings every chosen recipient in parallel. The results come back side by side so the household can compare.
 *
 * Who can be called is the operator's list (SWARM_CALL_RECIPIENTS), never a number found on the web or typed in
 * a chat. Purchases, bookings and payments discussed on a call are role-play; the agent has no tool for them.
 */
export const SwarmInput = z.object({
  task: z.string().trim().min(3).max(1200).describe("The question or request to put to every recipient, in the person's words, with their limits."),
  preferences: z.string().trim().max(800).default("").describe("Preferences the person stated for this task; never invent them."),
  recipients: z.array(z.string().trim().min(1).max(60)).max(20).optional()
    .describe("Names from the operator's recipient list to call. Omit to call everyone on the list."),
});
export type SwarmInput = z.input<typeof SwarmInput>;

type Recipient = { id: string; name: string; phone: string };

type CallResult = {
  recipientId: string;
  name: string;
  phoneEnding: string;
  status: "pending" | "dispatched" | "initiated" | "in_progress" | "completed" | "failed" | "cancelled" | "voicemail";
  conversationId?: string;
  outcome?: "success" | "failure" | "unknown";
  answer?: string;
  /** The price the recipient said, as the agent wrote it down. Absent when they named none. */
  price?: number;
  /** ISO code such as EUR, as the agent wrote it down; absent when the recipient did not say. */
  currency?: string;
  summary?: string;
  durationSeconds?: number;
  /** ElevenLabs kept the audio of this call (only when the swarm was recorded). */
  hasAudio?: boolean;
  transcript?: { speaker: "aidaddy" | "recipient"; text: string }[];
};

type Swarm = {
  id: string;
  task: string;
  preferences: string;
  status: "proposed" | "starting" | "calling" | "finished" | "failed" | "cancelled" | "unknown";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  recipients: Recipient[];
  /** Whether these calls are recorded. Fixed at the proposal, so the household confirms it. */
  record?: boolean;
  batchId?: string;
  calls: CallResult[];
  note?: string;
};

export const notice = "Demo: the phone conversations are real. Any purchase, booking or payment discussed is simulated.";
const API = "https://api.elevenlabs.io";
const setting = (name: string) => process.env[name]?.trim() ?? "";
const directory = () => path.join(process.cwd(), ".data", "swarm-calls");
const filename = (id: string) => path.join(directory(), `${id}.json`);
const validId = (id: string) => /^[A-Za-z0-9_-]{24}$/.test(id);
const PHONE = /^\+[1-9]\d{7,14}$/;
/** Recipient statuses after which ElevenLabs will not dial again. */
const FINAL = new Set(["completed", "failed", "cancelled", "voicemail"]);

/**
 * The operator's recipients: `Name:+358401234567, Other name:+358409876543`. A malformed entry makes the whole
 * list unusable rather than silently dropping someone the household expects to be asked.
 */
export function swarmRecipients(): { recipients: Recipient[]; error?: string } {
  const raw = setting("SWARM_CALL_RECIPIENTS");
  if (!raw) return { recipients: [] };
  const recipients: Recipient[] = [];
  for (const entry of raw.split(",").map((part) => part.trim()).filter(Boolean)) {
    const at = entry.lastIndexOf(":");
    const name = entry.slice(0, at).trim();
    const phone = entry.slice(at + 1).replace(/[\s-]/g, "");
    if (at < 1 || !name || !PHONE.test(phone)) return { recipients: [], error: `SWARM_CALL_RECIPIENTS entry "${name || entry.slice(0, 20)}" is not Name:+number` };
    if (recipients.some((r) => r.name.toLowerCase() === name.toLowerCase())) return { recipients: [], error: `SWARM_CALL_RECIPIENTS names "${name}" twice` };
    if (recipients.some((r) => r.phone === phone)) return { recipients: [], error: `SWARM_CALL_RECIPIENTS lists the number of "${name}" twice` };
    recipients.push({ id: `r${recipients.length + 1}`, name, phone });
  }
  return { recipients };
}

const maxCalls = () => Math.max(1, Math.min(20, Number(setting("SWARM_MAX_CALLS") || 5)));
/** Recording is the operator's choice; the agent must also keep audio (scripts/setup-swarm-calls.mjs with the same setting). */
const recording = () => setting("SWARM_RECORD_CALLS") === "1";
/** Said in the agent's first line, before anything else, whenever a call is recorded. */
export const recordingNotice = "This call is recorded so the household can listen to it.";

export function swarmConfiguration() {
  const missing = ["ELEVENLABS_API_KEY", "ELEVENLABS_SWARM_AGENT_ID", "ELEVENLABS_PHONE_NUMBER_ID"].filter((name) => !setting(name));
  const { recipients, error } = swarmRecipients();
  if (error) missing.push(error);
  else if (!recipients.length) missing.push("SWARM_CALL_RECIPIENTS (Name:+number, comma separated)");
  if (setting("SWARM_CALLS_ENABLED") !== "1") missing.push("SWARM_CALLS_ENABLED=1");
  return { ready: missing.length === 0, missing, recipients: recipients.map((r) => r.name), maxCalls: maxCalls(), recorded: recording() };
}

/** What chat and tool output may show: names and the last four digits, never a full number or provider id. */
function view(swarm: Swarm, withTranscript = false) {
  const done = swarm.calls.filter((c) => FINAL.has(c.status)).length;
  return {
    id: swarm.id,
    status: swarm.status,
    task: swarm.task,
    preferences: swarm.preferences,
    createdAt: swarm.createdAt,
    startedAt: swarm.startedAt,
    finishedAt: swarm.finishedAt,
    recipients: swarm.recipients.map((r) => ({ name: r.name, phoneEnding: r.phone.slice(-4) })),
    recorded: Boolean(swarm.record),
    ...(swarm.calls.length ? { progress: `${done} of ${swarm.calls.length} calls ended` } : {}),
    // Conversation ids stay private, like the batch id. A recording is reached through this server only.
    calls: swarm.calls.map((call) => ({
      recipientId: call.recipientId, name: call.name, phoneEnding: call.phoneEnding, status: call.status,
      outcome: call.outcome, answer: call.answer, price: call.price, currency: call.currency,
      summary: call.summary, durationSeconds: call.durationSeconds,
      ...(call.hasAudio ? { audio: `/api/swarm/${swarm.id}/audio/${call.recipientId}` } : {}),
      ...(withTranscript && call.transcript ? { transcript: call.transcript } : {}),
    })),
    note: swarm.note,
    notice,
  };
}

async function save(swarm: Swarm) {
  await mkdir(directory(), { recursive: true });
  const temporary = `${filename(swarm.id)}.${nanoid(8)}.tmp`;
  await writeFile(temporary, JSON.stringify(swarm), { mode: 0o600 });
  await rename(temporary, filename(swarm.id));
}

async function load(id: string): Promise<Swarm | null> {
  if (!validId(id)) return null;
  try {
    return JSON.parse(await readFile(filename(id), "utf8")) as Swarm;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Creates a marker file, or answers false when it exists: the durable "only once" for starting a swarm. */
async function claim(file: string) {
  try {
    await (await open(file, "wx", 0o600)).close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return false;
  }
}

/** Calls dialled in the last hour, counted from the swarms on disk so a restart does not reset the limit. */
async function callsLastHour() {
  const names = await readdir(directory()).catch(() => [] as string[]);
  const since = Date.now() - 3_600_000;
  let count = 0;
  for (const name of names.filter((n) => n.endsWith(".started"))) {
    const time = await stat(path.join(directory(), name)).then((s) => s.mtimeMs, () => 0);
    if (time < since) continue;
    const swarm = await load(name.replace(/\.json\.started$/, ""));
    count += swarm?.recipients.length ?? 1;
  }
  return count;
}

async function api(pathname: string, init: RequestInit = {}, timeout = 15_000) {
  return fetch(`${API}${pathname}`, {
    ...init,
    headers: { "xi-api-key": setting("ELEVENLABS_API_KEY"), "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(timeout),
    cache: "no-store",
  });
}

export async function prepareSwarm(input: SwarmInput) {
  const configuration = swarmConfiguration();
  if (!configuration.ready) return { status: "unavailable", ...configuration, notice };
  const parsed = SwarmInput.parse(input);
  const all = swarmRecipients().recipients;
  let chosen = all;
  if (parsed.recipients?.length) {
    const wanted = parsed.recipients.map((name) => name.toLowerCase());
    chosen = all.filter((r) => wanted.includes(r.name.toLowerCase()));
    const unknown = parsed.recipients.filter((name) => !all.some((r) => r.name.toLowerCase() === name.toLowerCase()));
    if (unknown.length) {
      return { status: "unknown_recipients", unknown, available: all.map((r) => r.name), notice,
        next: "Only people on the operator's list can be called. Ask which of the available recipients to call." };
    }
  }
  if (chosen.length > configuration.maxCalls) {
    return { status: "too_many", requested: chosen.length, maxCalls: configuration.maxCalls, available: all.map((r) => r.name), notice,
      next: `Ask the person to choose at most ${configuration.maxCalls} recipients.` };
  }
  const swarm: Swarm = {
    id: nanoid(24),
    task: parsed.task,
    preferences: parsed.preferences,
    status: "proposed",
    createdAt: new Date().toISOString(),
    recipients: chosen,
    record: recording(),
    calls: [],
  };
  await save(swarm);
  return {
    ...view(swarm),
    next: "Show the task, the preferences and every recipient who will be called at the same time, explain the demo, " +
      (swarm.record ? "say that the calls are recorded and that each recipient hears so first, " : "") +
      "and wait for the person's confirmation. Do not start the calls in this turn.",
  };
}

const Batch = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]),
  recipients: z.array(z.object({
    id: z.string(),
    status: z.enum(["pending", "dispatched", "initiated", "in_progress", "completed", "failed", "cancelled", "voicemail"]),
    conversation_id: z.string().nullable().optional(),
    phone_number: z.string().nullable().optional(),
  })).optional(),
});

/** What the agent is told on each call. The names match the agent's prompt in scripts/setup-swarm-calls.mjs. */
const variables = (swarm: Swarm, recipient: Recipient) => ({
  task: swarm.task,
  preferences: swarm.preferences || "No preference supplied",
  recipient_name: recipient.name,
  demo_notice: notice,
  // Part of the agent's first line; a space keeps that line natural when nothing is recorded.
  recording_notice: swarm.record ? recordingNotice : " ",
});

/**
 * Starts every call of a confirmed proposal at once, as one ElevenLabs batch over the imported Twilio number.
 * Confirmation is conversational in the chat (a new Yes to this exact proposal) and `confirmed: true` here.
 */
export async function startSwarm(id: string, confirmed: boolean) {
  if (!confirmed) return { status: "needs_confirmation", notice };
  const swarm = await load(id);
  if (!swarm) return { status: "not_found" };
  if (swarm.status !== "proposed") return view(swarm);
  const configuration = swarmConfiguration();
  if (!configuration.ready) return { status: "unavailable", ...configuration, notice };

  // The operator's list may have changed since the proposal; a changed number needs a fresh confirmation.
  const current = swarmRecipients().recipients;
  const changed = swarm.recipients.some((r) => !current.some((c) => c.name === r.name && c.phone === r.phone));
  if (changed) return { status: "needs_new_proposal", note: "The recipient list changed. Prepare and confirm a new swarm." };
  if (Boolean(swarm.record) !== recording()) {
    return { status: "needs_new_proposal", note: "Whether calls are recorded changed since the proposal. Prepare and confirm a new swarm." };
  }

  const perHour = Number(setting("SWARM_CALLS_PER_HOUR") || 20);
  if ((await callsLastHour()) + swarm.recipients.length > perHour) {
    return { status: "busy", id, notice, note: `The demo line has used its ${perHour} calls for this hour. Try again later.`,
      next: "Say that the line is busy. The proposal stays valid; do not prepare another one." };
  }

  // Durable exclusive claim: double tool calls, restarts and HTTP timeouts never redial this proposal.
  if (!(await claim(`${filename(id)}.started`))) {
    return { status: "already_started", id, notice, next: "Read this swarm's status. Do not prepare another one to retry it." };
  }
  swarm.status = "starting";
  swarm.startedAt = new Date().toISOString();
  await save(swarm);

  try {
    const response = await api("/v1/convai/batch-calling/submit", {
      method: "POST",
      body: JSON.stringify({
        call_name: `AIDaddy swarm ${swarm.id}`,
        agent_id: setting("ELEVENLABS_SWARM_AGENT_ID"),
        agent_phone_number_id: setting("ELEVENLABS_PHONE_NUMBER_ID"),
        // Everyone at once: the point of a swarm is that the answers arrive together.
        target_concurrency_limit: swarm.recipients.length,
        telephony_call_config: { ringing_timeout_secs: 45, twilio_call_recording_enabled: false },
        recipients: swarm.recipients.map((r) => ({
          id: `${swarm.id}-${r.id}`,
          phone_number: r.phone,
          conversation_initiation_client_data: { dynamic_variables: variables(swarm, r) },
        })),
      }),
    }, 20_000);
    if (!response.ok) {
      // A provider failure can happen after dialing began; never retry it silently.
      swarm.status = response.status >= 500 ? "unknown" : "failed";
      swarm.note = `Calling provider returned HTTP ${response.status}. Check the ElevenLabs batch calls before another attempt.`;
    } else {
      const batch = Batch.parse(await response.json());
      swarm.batchId = batch.id;
      swarm.status = "calling";
      swarm.calls = swarm.recipients.map((r) => ({ recipientId: r.id, name: r.name, phoneEnding: r.phone.slice(-4), status: "pending" }));
    }
  } catch {
    swarm.status = "unknown";
    swarm.note = "The provider's answer could not be read. Phones may already be ringing. Check ElevenLabs before another attempt.";
  }
  await save(swarm);
  return {
    ...view(swarm),
    next: "Report the actual status. Use get_swarm_call for the results; never say the task is done because phones are ringing.",
  };
}

const Conversation = z.object({
  status: z.enum(["initiated", "in-progress", "processing", "done", "failed"]),
  has_audio: z.boolean().optional(),
  transcript: z.array(z.object({ role: z.string(), message: z.string().nullable().optional() })).nullable().optional(),
  metadata: z.object({ call_duration_secs: z.number().nullable().optional() }).partial().nullable().optional(),
  analysis: z.object({
    call_successful: z.enum(["success", "failure", "unknown"]).nullable().optional(),
    transcript_summary: z.string().nullable().optional(),
    data_collection_results: z.record(z.string(), z.object({ value: z.unknown().optional() }).loose()).nullable().optional(),
  }).loose().nullable().optional(),
}).loose();

/**
 * The words of one turn. The agent marks its tone for the voice with tags such as "[happy]"; they are
 * directions for the speech model, never spoken, so they do not belong in what was said.
 */
const spoken = (text: string) => text.replace(/\[[a-z]+(?: [a-z]+){0,2}\]\s*/g, "").trim().slice(0, 1000);

/**
 * The agent's written-down price: a number, or a string such as "35,50". Anything else, zero, a negative or an
 * absurd figure is no price rather than a guess. The recipient's own words stay in `answer` and the transcript.
 */
function priceOf(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value
    : typeof value === "string" && /^\s*\d{1,7}(?:[.,]\d{1,2})?\s*$/.test(value) ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(parsed) && parsed > 0 && parsed < 10_000_000 ? Math.round(parsed * 100) / 100 : undefined;
}

/** Reads one finished conversation. Answers false while ElevenLabs is still processing it. */
async function readConversation(call: CallResult) {
  if (!call.conversationId || call.summary !== undefined) return true;
  const response = await api(`/v1/convai/conversations/${encodeURIComponent(call.conversationId)}`, {}, 10_000);
  if (!response.ok) return false;
  const conversation = Conversation.parse(await response.json());
  if (conversation.status !== "done" && conversation.status !== "failed") return false;
  const analysis = conversation.analysis ?? {};
  call.outcome = analysis.call_successful ?? "unknown";
  call.summary = analysis.transcript_summary || "No conversation summary was returned.";
  const collected = analysis.data_collection_results ?? {};
  const answer = collected.answer?.value;
  if (typeof answer === "string" && answer.trim()) call.answer = answer.trim().slice(0, 500);
  const price = priceOf(collected.price?.value);
  if (price !== undefined) call.price = price;
  const currency = collected.currency?.value;
  if (typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency.trim())) call.currency = currency.trim().toUpperCase();
  if (conversation.has_audio) call.hasAudio = true;
  if (typeof conversation.metadata?.call_duration_secs === "number") call.durationSeconds = conversation.metadata.call_duration_secs;
  const said = (conversation.transcript ?? [])
    .map((turn) => ({ speaker: turn.role === "agent" ? "aidaddy" as const : "recipient" as const, text: spoken(turn.message ?? "") }))
    .filter((turn) => turn.text);
  if (said.length) call.transcript = said.slice(0, 80);
  return true;
}

/** Side by side: who answered what. Built from the provider's results only, never written by a model. */
function comparison(swarm: Swarm) {
  const answered = swarm.calls.filter((c) => c.status === "completed" && c.summary !== undefined);
  const unanswered = swarm.calls.filter((c) => c.status !== "completed" && FINAL.has(c.status));
  // Prices are compared only within one currency; a price with no stated currency is compared with nothing.
  const priced = answered.filter((c) => c.price !== undefined && c.currency);
  const currencies = [...new Set(priced.map((c) => c.currency))];
  const lowest = currencies.length === 1 ? Math.min(...priced.map((c) => c.price!)) : undefined;
  return {
    answered: answered.map((c) => ({ name: c.name, outcome: c.outcome, answer: c.answer ?? c.summary, price: c.price, currency: c.currency })),
    unanswered: unanswered.map((c) => ({ name: c.name, status: c.status })),
    agreed: answered.filter((c) => c.outcome === "success").map((c) => c.name),
    ...(lowest !== undefined
      ? { cheapest: { price: lowest, currency: currencies[0], names: priced.filter((c) => c.price === lowest).map((c) => c.name) } }
      : {}),
  };
}

/**
 * The recording of one call, fetched from ElevenLabs as it is asked for and never stored here.
 * Null when the swarm was not recorded, the call has no audio, or the provider has none.
 */
export async function getSwarmAudio(id: string, recipientId: string): Promise<Response | null> {
  const swarm = await load(id);
  const call = swarm?.record ? swarm.calls.find((c) => c.recipientId === recipientId) : undefined;
  if (!call?.hasAudio || !call.conversationId) return null;
  const response = await api(`/v1/convai/conversations/${encodeURIComponent(call.conversationId)}/audio`, {}, 30_000).catch(() => null);
  if (!response?.ok || !response.body) return null;
  return new Response(response.body, {
    headers: { "content-type": response.headers.get("content-type") ?? "audio/mpeg", "cache-control": "private, no-store" },
  });
}

export async function getSwarm(id: string, options: { transcript?: boolean } = {}) {
  const swarm = await load(id);
  if (!swarm) return { status: "not_found" };
  if (swarm.status !== "calling" || !swarm.batchId) {
    return { ...view(swarm, options.transcript), ...(swarm.status === "finished" ? { comparison: comparison(swarm) } : {}) };
  }
  try {
    const response = await api(`/v1/convai/batch-calling/${encodeURIComponent(swarm.batchId)}`, {}, 10_000);
    if (!response.ok) return { ...view(swarm, options.transcript), note: "The calls' progress is not available yet. Check again shortly." };
    const batch = Batch.parse(await response.json());
    for (const item of batch.recipients ?? []) {
      // ElevenLabs answers with its own recipient ids (rcpt_...), not the ones sent, so a call is found by its
      // number, which is unique within a swarm (swarmRecipients refuses a list that repeats one).
      const digits = (item.phone_number ?? "").replace(/[^\d+]/g, "");
      const recipient = swarm.recipients.find((r) => `${swarm.id}-${r.id}` === item.id || (digits && r.phone === digits));
      const call = recipient && swarm.calls.find((c) => c.recipientId === recipient.id);
      if (!call) continue;
      call.status = item.status;
      if (item.conversation_id) call.conversationId = item.conversation_id;
    }
    const read = await Promise.all(swarm.calls.filter((c) => c.status === "completed").map((c) => readConversation(c).catch(() => false)));
    const batchOver = batch.status === "completed" || batch.status === "failed" || batch.status === "cancelled";
    if (batchOver && swarm.calls.every((c) => FINAL.has(c.status)) && read.every(Boolean)) {
      swarm.status = batch.status === "cancelled" ? "cancelled" : batch.status === "failed" && !swarm.calls.some((c) => c.status === "completed") ? "failed" : "finished";
      swarm.finishedAt = new Date().toISOString();
    }
    await save(swarm);
    const finished = swarm.status === "finished";
    return {
      ...view(swarm, options.transcript),
      ...(finished ? { comparison: comparison(swarm) } : {}),
      next: finished
        ? "Compare the answers for the person, naming who said what. Say that anything agreed was simulated."
        : "Some calls are still going. Check again in a little while; do not start another swarm for the same task.",
    };
  } catch {
    return { ...view(swarm, options.transcript), note: "The results could not be read. Do not assume the calls succeeded or start new ones." };
  }
}

/** Stops the calls that have not ended. Calls already answered keep their results. */
export async function cancelSwarm(id: string) {
  const swarm = await load(id);
  if (!swarm) return { status: "not_found" };
  if (swarm.status === "proposed") {
    swarm.status = "cancelled";
    await save(swarm);
    return view(swarm);
  }
  if (swarm.status !== "calling" || !swarm.batchId) return view(swarm);
  const response = await api(`/v1/convai/batch-calling/${encodeURIComponent(swarm.batchId)}/cancel`, { method: "POST" }).catch(() => null);
  if (!response?.ok) return { ...view(swarm), note: "The calls could not be cancelled. Check ElevenLabs." };
  return getSwarm(id);
}
