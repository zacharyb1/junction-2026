import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { z } from "zod";

/** Real calls to one operator-configured test phone. Orders and payments are role-play. */
export const DemoCallInput = z.object({
  task: z.string().trim().min(3).max(1200).describe("The task or update in the person's words. Include their stated limits."),
  preferences: z.string().trim().max(800).default("").describe("Relevant preferences from this chat's memory or conversation; never invent them."),
});

type Call = z.infer<typeof DemoCallInput> & {
  id: string;
  status: "proposed" | "starting" | "in_progress" | "finished" | "failed" | "unknown";
  createdAt: string;
  startedAt?: string;
  destination: string;
  recipient: string;
  conversationId?: string;
  summary?: string;
  outcome?: "success" | "failure" | "unknown";
  note?: string;
};

const directory = () => path.join(process.cwd(), ".data", "demo-calls");
const filename = (id: string) => path.join(directory(), `${id}.json`);
const validId = (id: string) => /^[A-Za-z0-9_-]{24}$/.test(id);
const phone = () => process.env.DEMO_CALL_TO_NUMBER?.trim() ?? "";
const apiKey = () => process.env.ELEVENLABS_API_KEY ?? "";
const notice = "Demo: the phone conversation is real. Any purchase, booking or payment discussed is simulated.";

export function demoCallConfiguration() {
  const missing = ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_PHONE_NUMBER_ID"]
    .filter((name) => !process.env[name]?.trim());
  if (!/^\+[1-9]\d{7,14}$/.test(phone())) missing.push("DEMO_CALL_TO_NUMBER (international +number)");
  if (process.env.DEMO_CALLS_ENABLED !== "1") missing.push("DEMO_CALLS_ENABLED=1");
  return { ready: missing.length === 0, missing };
}

function view(call: Call) {
  // No full phone number or provider identifier in public chat/tool output.
  return {
    id: call.id, status: call.status, task: call.task, preferences: call.preferences,
    createdAt: call.createdAt, startedAt: call.startedAt, recipient: call.recipient,
    summary: call.summary, outcome: call.outcome, note: call.note,
    phoneEnding: call.destination.slice(-4), notice,
  };
}

async function save(call: Call) {
  await mkdir(directory(), { recursive: true });
  const temporary = `${filename(call.id)}.${nanoid(8)}.tmp`;
  await writeFile(temporary, JSON.stringify(call), { mode: 0o600 });
  await rename(temporary, filename(call.id));
}

async function load(id: string): Promise<Call | null> {
  if (!validId(id)) return null;
  try {
    return JSON.parse(await readFile(filename(id), "utf8")) as Call;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function prepareDemoCall(input: z.infer<typeof DemoCallInput>) {
  const configuration = demoCallConfiguration();
  if (!configuration.ready) return { status: "unavailable", ...configuration, notice };
  const call: Call = {
    ...DemoCallInput.parse(input),
    id: nanoid(24),
    status: "proposed",
    createdAt: new Date().toISOString(),
    destination: phone(),
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
});

/** Confirmation is conversational: Hermes must receive a new Yes to this exact proposal. */
export async function startDemoCall(id: string, confirmed: boolean) {
  if (!confirmed) return { status: "needs_confirmation", notice };
  const call = await load(id);
  if (!call) return { status: "not_found" };
  if (call.status !== "proposed") return view(call);
  const configuration = demoCallConfiguration();
  if (!configuration.ready) return { status: "unavailable", ...configuration, notice };
  if (call.destination !== phone()) return { status: "needs_new_proposal", note: "The test recipient changed. Prepare and confirm a new call." };

  // Durable exclusive claim: double tool calls, restarts and HTTP timeouts never redial this proposal.
  let claim;
  try {
    claim = await open(`${filename(id)}.started`, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return { status: "already_started", id, notice, next: "Read this call's status. Do not prepare another call to retry it." };
  }
  await claim.close();
  call.status = "starting";
  call.startedAt = new Date().toISOString();
  await save(call);
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
      method: "POST",
      headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: call.destination,
        call_recording_enabled: false,
        conversation_initiation_client_data: {
          dynamic_variables: { task: call.task, preferences: call.preferences || "No preference supplied", demo_notice: notice },
        },
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

export async function getDemoCall(id: string) {
  const call = await load(id);
  if (!call) return { status: "not_found" };
  if (!call.conversationId || call.status !== "in_progress") return view(call);
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(call.conversationId)}/summary`, {
      headers: { "xi-api-key": apiKey() }, signal: AbortSignal.timeout(10_000), cache: "no-store",
    });
    if (!response.ok) return { ...view(call), note: "The call result is not available yet. Check again shortly." };
    const summary = Summary.parse(await response.json());
    if (summary.status === "done" || summary.status === "failed") {
      call.status = summary.status === "done" ? "finished" : "failed";
      call.summary = summary.transcript_summary || "No conversation summary was returned.";
      call.outcome = summary.call_successful || "unknown";
      await save(call);
    }
    return view(call);
  } catch {
    return { ...view(call), note: "The call result could not be read. Do not assume it succeeded or start another call." };
  }
}
