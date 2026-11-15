import { mkdir, open, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { z } from "zod";

/**
 * AIDaddy makes a call for the household, after the household confirms it.
 *
 * The conversation is real: an ElevenLabs agent speaks with whoever answers. Orders and payments are role-play.
 * There are two lines, and the operator's settings pick one:
 * - phone: ElevenLabs dials one test phone through an imported Twilio number.
 * - browser: no phone number is needed. The call rings at a web address; whoever opens it and answers
 *   talks to the same agent through their browser's microphone.
 */
export const DemoCallInput = z.object({
  task: z.string().trim().min(3).max(1200).describe("The task or update in the person's words. Include their stated limits."),
  preferences: z.string().trim().max(800).default("").describe("Relevant preferences from this chat's memory or conversation; never invent them."),
});

type Line = "phone" | "browser";

type Call = z.infer<typeof DemoCallInput> & {
  id: string;
  status: "proposed" | "starting" | "ringing" | "in_progress" | "finished" | "failed" | "unknown";
  createdAt: string;
  startedAt?: string;
  answeredAt?: string;
  /** Calls saved before the browser line existed have no line; they were phone calls. */
  line?: Line;
  /** The test phone's number, or empty on the browser line. */
  destination: string;
  /** Browser line: the id in the address where the call rings. It is not the call id, so the answerer cannot read the request. */
  answerId?: string;
  answerUrl?: string;
  recipient: string;
  conversationId?: string;
  summary?: string;
  outcome?: "success" | "failure" | "unknown";
  transcript?: { speaker: "aidaddy" | "recipient"; text: string }[];
  note?: string;
};

const directory = () => path.join(process.cwd(), ".data", "demo-calls");
const filename = (id: string) => path.join(directory(), `${id}.json`);
const pointer = (answerId: string) => path.join(directory(), `line-${answerId}.json`);
const validId = (id: string) => /^[A-Za-z0-9_-]{24}$/.test(id);
const phone = () => process.env.DEMO_CALL_TO_NUMBER?.trim() ?? "";
const apiKey = () => process.env.ELEVENLABS_API_KEY ?? "";
const setting = (name: string) => process.env[name]?.trim() ?? "";
const notice = "Demo: the phone conversation is real. Any purchase, booking or payment discussed is simulated.";
const API = "https://api.elevenlabs.io";

/** A browser call that nobody answers stops ringing after this long. */
const RING_MS = 10 * 60_000;
/** The agent ends a conversation after two minutes; an answered call with no result after this long never connected. */
const CONNECT_MS = 5 * 60_000;
/** The same limit the agent is set up with in scripts/setup-call-agent.mjs. */
const MAX_CALL_SECONDS = 120;

/** A phone setting chooses the phone line; with neither phone setting, calls ring in a browser. */
const configuredLine = (): Line => (setting("ELEVENLABS_PHONE_NUMBER_ID") || phone() ? "phone" : "browser");

export function demoCallConfiguration() {
  const line = configuredLine();
  const missing = ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID"].filter((name) => !setting(name));
  if (line === "phone") {
    if (!setting("ELEVENLABS_PHONE_NUMBER_ID")) missing.push("ELEVENLABS_PHONE_NUMBER_ID");
    if (!/^\+[1-9]\d{7,14}$/.test(phone())) missing.push("DEMO_CALL_TO_NUMBER (international +number)");
  }
  if (process.env.DEMO_CALLS_ENABLED !== "1") missing.push("DEMO_CALLS_ENABLED=1");
  return { ready: missing.length === 0, missing, line };
}

/**
 * Whether a visitor of the web page may ask for a call. The browser line rings nobody's phone, so it is open
 * wherever calls are on. Ringing a real phone from the public page is a second choice the operator makes.
 */
export function webCallsAvailable() {
  const { ready, line } = demoCallConfiguration();
  return ready && (line === "browser" || process.env.DEMO_CALLS_WEB === "1");
}

function view(call: Call, withTranscript = false) {
  // No full phone number or provider identifier in public chat/tool output.
  const line = call.line ?? "phone";
  return {
    id: call.id, status: call.status, line, task: call.task, preferences: call.preferences,
    createdAt: call.createdAt, startedAt: call.startedAt, recipient: call.recipient,
    summary: call.summary, outcome: call.outcome, note: call.note,
    ...(line === "phone" ? { phoneEnding: call.destination.slice(-4) } : {}),
    // The address is only useful while the line rings.
    ...(call.status === "ringing" && call.answerUrl ? { answerUrl: call.answerUrl } : {}),
    ...(withTranscript && call.transcript ? { transcript: call.transcript } : {}),
    notice,
  };
}

async function save(call: Call) {
  await mkdir(directory(), { recursive: true });
  const temporary = `${filename(call.id)}.${nanoid(8)}.tmp`;
  await writeFile(temporary, JSON.stringify(call), { mode: 0o600 });
  await rename(temporary, filename(call.id));
}

async function read<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

const load = async (id: string) => (validId(id) ? read<Call>(filename(id)) : null);

/** Creates the marker file, or answers false when it exists: the durable "only once" for dialing and answering. */
async function claim(file: string) {
  try {
    await (await open(file, "wx", 0o600)).close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return false;
  }
}

/** How many calls were started in the last hour, counted from the claims on disk so a restart does not reset it. */
async function startedLastHour() {
  const names = await readdir(directory()).catch(() => [] as string[]);
  const since = Date.now() - 3_600_000;
  const times = await Promise.all(
    names.filter((name) => name.endsWith(".started")).map((name) => stat(path.join(directory(), name)).then((s) => s.mtimeMs, () => 0)),
  );
  return times.filter((time) => time >= since).length;
}

export async function prepareDemoCall(input: z.infer<typeof DemoCallInput>) {
  const configuration = demoCallConfiguration();
  if (!configuration.ready) return { status: "unavailable", ...configuration, notice };
  const call: Call = {
    ...DemoCallInput.parse(input),
    id: nanoid(24),
    status: "proposed",
    createdAt: new Date().toISOString(),
    line: configuration.line,
    destination: configuration.line === "phone" ? phone() : "",
    recipient: process.env.DEMO_CALL_RECIPIENT || "our test recipient",
  };
  await save(call);
  return { ...view(call), next: "Show this task and these preferences, explain the demo, and wait for the person's confirmation. Do not start the call in this turn." };
}

const Started = z.object({ success: z.boolean(), conversation_id: z.string().min(1).nullable().optional() });
const Summary = z.object({
  status: z.enum(["initiated", "in-progress", "processing", "done", "failed"]),
  transcript_summary: z.string().nullable().optional(),
  call_successful: z.enum(["success", "failure", "unknown"]).nullable().optional(),
  messages: z.array(z.object({ role: z.string(), message: z.string().nullable().optional() })).nullable().optional(),
});

/**
 * Confirmation is conversational in the chat (Hermes must receive a new Yes to this exact proposal) and a
 * button on the web page. `origin` is this site's address; the browser line needs it for the answer link.
 */
export async function startDemoCall(id: string, confirmed: boolean, origin = "") {
  if (!confirmed) return { status: "needs_confirmation", notice };
  const call = await load(id);
  if (!call) return { status: "not_found" };
  if (call.status !== "proposed") return view(call);
  const configuration = demoCallConfiguration();
  if (!configuration.ready) return { status: "unavailable", ...configuration, notice };
  const line = call.line ?? "phone";
  if (line !== configuration.line || (line === "phone" && call.destination !== phone())) {
    return { status: "needs_new_proposal", note: "The test recipient changed. Prepare and confirm a new call." };
  }
  if (line === "browser" && !/^https?:\/\//.test(origin)) {
    return { status: "unavailable", ready: false, missing: ["PUBLIC_BASE_URL (the address where the call rings)"], notice };
  }
  const perHour = Number(process.env.DEMO_CALLS_PER_HOUR ?? 12);
  if ((await startedLastHour()) >= perHour) {
    return { status: "busy", id, notice, note: `The demo line has made its ${perHour} calls for this hour. Try again later.`, next: "Say that the demo line is busy. The proposal stays valid; do not prepare another one." };
  }

  // Durable exclusive claim: double tool calls, restarts and HTTP timeouts never redial this proposal.
  if (!(await claim(`${filename(id)}.started`))) {
    return { status: "already_started", id, notice, next: "Read this call's status. Do not prepare another call to retry it." };
  }
  call.startedAt = new Date().toISOString();

  if (line === "browser") {
    // Nothing is sent to the provider yet: a conversation, and its cost, begins only when somebody answers.
    call.answerId = nanoid(24);
    call.answerUrl = `${origin.replace(/\/$/, "")}/call/line/${call.answerId}`;
    call.status = "ringing";
    await writeFile(pointer(call.answerId), JSON.stringify({ id: call.id }), { mode: 0o600 });
    await save(call);
    return {
      ...view(call),
      next: "The test line is ringing in a browser, not on a phone. Give the person the answerUrl and say that whoever opens it and taps Answer talks to AIDaddy. " +
        "Then use get_demo_call for the result; never say the task is finished just because the line rings.",
    };
  }

  call.status = "starting";
  await save(call);
  try {
    const response = await fetch(`${API}/v1/convai/twilio/outbound-call`, {
      method: "POST",
      headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: call.destination,
        call_recording_enabled: false,
        conversation_initiation_client_data: { dynamic_variables: variables(call) },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      // A provider/server failure can happen after dialing; do not silently retry it.
      call.status = response.status >= 500 ? "unknown" : "failed";
      call.note = `Calling provider returned HTTP ${response.status}. Check the provider before another attempt.`;
    } else {
      const started = Started.parse(await response.json());
      call.status = started.success && started.conversation_id ? "in_progress" : started.success ? "unknown" : "failed";
      if (started.conversation_id) call.conversationId = started.conversation_id;
      if (call.status === "unknown") call.note = "The provider accepted the call without a conversation ID. Check its dashboard; do not redial.";
    }
  } catch {
    call.status = "unknown";
    call.note = "The provider result could not be read. The phone may already be ringing. Check the dashboard before another attempt.";
  }
  await save(call);
  return { ...view(call), next: "Report the actual status. Use get_demo_call for the result after the conversation; never say the task is finished just because dialing started." };
}

/** What the agent is told for this call. The names match the agent's prompt in scripts/setup-call-agent.mjs. */
const variables = (call: Call) => ({ task: call.task, preferences: call.preferences || "No preference supplied", demo_notice: notice });

/** Ends a browser call that rang too long without an answer. */
async function settle(call: Call) {
  const age = (since?: string) => (since ? Date.now() - Date.parse(since) : 0);
  if (call.status === "ringing" && age(call.startedAt) > RING_MS) {
    call.status = "failed";
    call.note = "Nobody answered the test line within ten minutes. Nothing was arranged.";
    await save(call);
  }
  return call;
}

const byAnswerId = async (answerId: string) => {
  if (!validId(answerId)) return null;
  const found = await read<{ id: string }>(pointer(answerId));
  const call = found ? await load(found.id) : null;
  return call && call.answerId === answerId ? settle(call) : null;
};

/** What the answering page may know: that AIDaddy is calling, and for whom. Never the request or the result. */
const lineView = (call: Call) => ({ status: call.status, recipient: call.recipient, notice, maxSeconds: MAX_CALL_SECONDS });

export async function getDemoLine(answerId: string) {
  const call = await byAnswerId(answerId);
  return call ? lineView(call) : { status: "not_found" };
}

/**
 * Somebody answered the browser line. Returns a one-time link to the agent and what to tell it.
 * One call is answered once: a second visitor, or a second tap, gets the call's state and no link.
 */
export async function answerDemoLine(answerId: string) {
  const call = await byAnswerId(answerId);
  if (!call) return { status: "not_found" };
  if (call.status !== "ringing") return lineView(call);
  if (!demoCallConfiguration().ready) return { ...lineView(call), status: "unavailable" };
  const marker = `${filename(call.id)}.answered`;
  if (!(await claim(marker))) return { ...lineView(call), status: "in_progress" };
  try {
    const query = new URLSearchParams({ agent_id: setting("ELEVENLABS_AGENT_ID"), include_conversation_id: "true" });
    const response = await fetch(`${API}/v1/convai/conversation/get-signed-url?${query}`, {
      headers: { "xi-api-key": apiKey() }, signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { signed_url: signedUrl } = z.object({ signed_url: z.string().startsWith("wss://") }).parse(await response.json());
    // Without the conversation's id the result could never be read back, so such a link is not handed out.
    const conversationId = new URL(signedUrl).searchParams.get("conversation_id");
    if (!conversationId) throw new Error("no conversation id");
    call.status = "in_progress";
    call.conversationId = conversationId;
    call.answeredAt = new Date().toISOString();
    await save(call);
    return { ...lineView(call), signedUrl, dynamicVariables: variables(call) };
  } catch (error) {
    // Asking for a link starts no conversation, so the line may keep ringing and be answered again.
    console.error("Demo call line could not be connected", error instanceof Error ? error.message : error);
    await unlink(marker).catch(() => {});
    return { ...lineView(call), note: "The line could not be connected. Try again in a moment." };
  }
}

export async function getDemoCall(id: string, options: { transcript?: boolean } = {}) {
  const loaded = await load(id);
  if (!loaded) return { status: "not_found" };
  const call = await settle(loaded);
  const shown = () => view(call, options.transcript);
  if (!call.conversationId || call.status !== "in_progress") return shown();
  try {
    const response = await fetch(`${API}/v1/convai/conversations/${encodeURIComponent(call.conversationId)}/summary?max_messages=80`, {
      headers: { "xi-api-key": apiKey() }, signal: AbortSignal.timeout(10_000), cache: "no-store",
    });
    if (!response.ok) {
      // The provider knows a browser conversation only once the answerer's browser connects.
      if (call.line === "browser" && response.status === 404 && Date.now() - Date.parse(call.answeredAt ?? call.createdAt) > CONNECT_MS) {
        call.status = "failed";
        call.note = "The line was answered, but the conversation never connected. Nothing was arranged.";
        await save(call);
        return shown();
      }
      return { ...shown(), note: "The call result is not available yet. Check again shortly." };
    }
    const summary = Summary.parse(await response.json());
    if (summary.status === "done" || summary.status === "failed") {
      call.status = summary.status === "done" ? "finished" : "failed";
      call.summary = summary.transcript_summary || "No conversation summary was returned.";
      call.outcome = summary.call_successful || "unknown";
      const said = (summary.messages ?? []).filter((turn) => turn.message?.trim());
      if (said.length) {
        call.transcript = said.slice(0, 80).map((turn) => ({
          speaker: turn.role === "agent" ? "aidaddy" as const : "recipient" as const,
          text: turn.message!.trim().slice(0, 1000),
        }));
      }
      await save(call);
    }
    return shown();
  } catch {
    return { ...shown(), note: "The call result could not be read. Do not assume it succeeded or start another call." };
  }
}
