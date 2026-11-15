import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSwarm, getSwarm, prepareSwarm, startSwarm, swarmConfiguration } from "@/lib/swarm-calls";

/** A fake ElevenLabs: records requests and answers from `routes`. No network. */
let requests: { url: string; method: string; body: unknown }[] = [];
let routes: Record<string, () => Response> = {};
const reply = (body: unknown, status = 200) => () => Response.json(body, { status });

let folder = "";
beforeEach(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "swarm-"));
  vi.spyOn(process, "cwd").mockReturnValue(folder);
  vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
  vi.stubEnv("ELEVENLABS_SWARM_AGENT_ID", "agent_1");
  vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "phnum_1");
  vi.stubEnv("SWARM_CALL_RECIPIENTS", "Shop A:+358401111111, Shop B:+358402222222,Shop C:+358403333333");
  vi.stubEnv("SWARM_CALLS_ENABLED", "1");
  requests = [];
  routes = {};
  vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = String(input);
    requests.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : undefined });
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return Response.json({ detail: "not found" }, { status: 404 });
    return routes[key]();
  }));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await rm(folder, { recursive: true, force: true });
});

const prepare = async (extra: object = {}) => {
  const result = await prepareSwarm({ task: "Do you have the blue kettle in stock?", preferences: "Under 40 euros", ...extra });
  expect(result.status).toBe("proposed");
  return (result as { id: string }).id;
};

describe("swarm configuration", () => {
  it("is unavailable until every setting is present", () => {
    vi.stubEnv("SWARM_CALLS_ENABLED", "");
    vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "");
    const config = swarmConfiguration();
    expect(config.ready).toBe(false);
    expect(config.missing).toEqual(expect.arrayContaining(["ELEVENLABS_PHONE_NUMBER_ID", "SWARM_CALLS_ENABLED=1"]));
  });

  it("rejects a malformed recipient list as a whole", () => {
    vi.stubEnv("SWARM_CALL_RECIPIENTS", "Shop A:+358401111111,Shop B:0402222222");
    expect(swarmConfiguration().ready).toBe(false);
  });
});

describe("prepareSwarm", () => {
  it("dials nobody and shows only the last four digits", async () => {
    const result = await prepareSwarm({ task: "Do you have the blue kettle in stock?" });
    expect(requests).toHaveLength(0);
    expect(JSON.stringify(result)).not.toContain("+358401111111");
    expect((result as { recipients: { phoneEnding: string }[] }).recipients.map((r) => r.phoneEnding)).toEqual(["1111", "2222", "3333"]);
  });

  it("only calls people on the operator's list", async () => {
    const result = await prepareSwarm({ task: "Do you have it?", recipients: ["Shop A", "Some shop from the web"] });
    expect(result.status).toBe("unknown_recipients");
  });

  it("chooses recipients by name and limits their number", async () => {
    const chosen = await prepareSwarm({ task: "Do you have it?", recipients: ["shop b"] });
    expect((chosen as { recipients: { name: string }[] }).recipients.map((r) => r.name)).toEqual(["Shop B"]);
    vi.stubEnv("SWARM_MAX_CALLS", "2");
    expect((await prepareSwarm({ task: "Do you have it?" })).status).toBe("too_many");
  });
});

describe("startSwarm", () => {
  it("needs a confirmation", async () => {
    const id = await prepare();
    expect((await startSwarm(id, false)).status).toBe("needs_confirmation");
    expect(requests).toHaveLength(0);
  });

  it("rings every recipient at once in one batch over the imported Twilio number", async () => {
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare();
    const result = await startSwarm(id, true);
    expect(result.status).toBe("calling");
    expect(requests).toHaveLength(1);
    const body = requests[0].body as Record<string, unknown> & { recipients: { phone_number: string; conversation_initiation_client_data: { dynamic_variables: Record<string, string> } }[] };
    expect(body).toMatchObject({ agent_id: "agent_1", agent_phone_number_id: "phnum_1", target_concurrency_limit: 3 });
    expect(body.recipients.map((r) => r.phone_number)).toEqual(["+358401111111", "+358402222222", "+358403333333"]);
    expect(body.recipients[1].conversation_initiation_client_data.dynamic_variables).toMatchObject({
      task: "Do you have the blue kettle in stock?", preferences: "Under 40 euros", recipient_name: "Shop B",
    });
  });

  it("starts a proposal only once", async () => {
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare();
    const [first, second] = await Promise.all([startSwarm(id, true), startSwarm(id, true)]);
    expect([first.status, second.status].sort()).toEqual(["already_started", "calling"]);
    expect(requests.filter((r) => r.url.includes("submit"))).toHaveLength(1);
    expect((await startSwarm(id, true)).status).toBe("calling");
    expect(requests.filter((r) => r.url.includes("submit"))).toHaveLength(1);
  });

  it("marks a provider failure as unknown and never redials", async () => {
    routes["/batch-calling/submit"] = reply({ detail: "boom" }, 502);
    const id = await prepare();
    expect((await startSwarm(id, true)).status).toBe("unknown");
    expect((await startSwarm(id, true)).status).toBe("unknown");
    expect(requests).toHaveLength(1);
  });

  it("asks for a new proposal when a recipient's number changed", async () => {
    const id = await prepare();
    vi.stubEnv("SWARM_CALL_RECIPIENTS", "Shop A:+358409999999,Shop B:+358402222222,Shop C:+358403333333");
    expect((await startSwarm(id, true)).status).toBe("needs_new_proposal");
    expect(requests).toHaveLength(0);
  });

  it("keeps to the hourly call limit", async () => {
    vi.stubEnv("SWARM_CALLS_PER_HOUR", "4");
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    expect((await startSwarm(await prepare(), true)).status).toBe("calling");
    expect((await startSwarm(await prepare(), true)).status).toBe("busy");
  });
});

describe("getSwarm", () => {
  const conversation = (answer: string, outcome = "success") => reply({
    conversation_id: "x", agent_id: "agent_1", status: "done",
    metadata: { call_duration_secs: 42 },
    transcript: [{ role: "agent", message: "[warm] Hello, this is AIDaddy." }, { role: "user", message: answer }],
    analysis: { call_successful: outcome, transcript_summary: `They said: ${answer}`, data_collection_results: { answer: { data_collection_id: "answer", rationale: "", value: answer } } },
  });

  it("compares the answers once every call ended", async () => {
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare();
    await startSwarm(id, true);

    routes["/batch-calling/batch_1"] = reply({ id: "batch_1", status: "in_progress", recipients: [
      { id: "rcpt_r1", phone_number: "+358401111111", status: "completed", conversation_id: "conv_1" },
      { id: "rcpt_r2", phone_number: "+358402222222", status: "in_progress", conversation_id: "conv_2" },
      { id: "rcpt_r3", phone_number: "+358403333333", status: "pending", conversation_id: null },
    ] });
    routes["/conversations/conv_1"] = conversation("Yes, 35 euros");
    const running = await getSwarm(id);
    expect(running.status).toBe("calling");
    expect(running).not.toHaveProperty("comparison");

    routes["/batch-calling/batch_1"] = reply({ id: "batch_1", status: "completed", recipients: [
      { id: "rcpt_r1", phone_number: "+358401111111", status: "completed", conversation_id: "conv_1" },
      { id: "rcpt_r2", phone_number: "+358402222222", status: "completed", conversation_id: "conv_2" },
      { id: "rcpt_r3", phone_number: "+358403333333", status: "voicemail", conversation_id: null },
    ] });
    routes["/conversations/conv_2"] = conversation("Sold out until Friday", "failure");
    const done = await getSwarm(id, { transcript: true }) as { status: string; comparison: unknown; calls: { transcript: unknown[] }[] };
    expect(done.status).toBe("finished");
    expect(done.comparison).toEqual({
      answered: [
        { name: "Shop A", outcome: "success", answer: "Yes, 35 euros" },
        { name: "Shop B", outcome: "failure", answer: "Sold out until Friday" },
      ],
      unanswered: [{ name: "Shop C", status: "voicemail" }],
      agreed: ["Shop A"],
    });
    expect(done.calls[0].transcript[0]).toEqual({ speaker: "aidaddy", text: "Hello, this is AIDaddy." });
    expect(JSON.stringify(done)).not.toContain("conv_1");

    // A finished swarm is read from disk without asking the provider again.
    const before = requests.length;
    expect((await getSwarm(id)).status).toBe("finished");
    expect(requests).toHaveLength(before);
  });

  it("waits while a finished call is still being processed", async () => {
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare({ recipients: ["Shop A"] });
    await startSwarm(id, true);
    routes["/batch-calling/batch_1"] = reply({ id: "batch_1", status: "completed", recipients: [{ id: "rcpt_r1", phone_number: "+358401111111", status: "completed", conversation_id: "conv_1" }] });
    routes["/conversations/conv_1"] = reply({ status: "processing" });
    expect((await getSwarm(id)).status).toBe("calling");
  });
});

describe("prices and recordings", () => {
  const finished = (id: string, n: number) => reply({ id: "batch_1", status: "completed", recipients: Array.from({ length: n }, (_, i) => (
    { id: `rcpt_${i + 1}`, phone_number: `+35840${String(i + 1).repeat(7)}`, status: "completed", conversation_id: `conv_${i + 1}` })) });
  const said = (collected: Record<string, unknown>, hasAudio = false) => reply({
    status: "done", has_audio: hasAudio, transcript: [],
    analysis: { call_successful: "success", transcript_summary: "ok",
      data_collection_results: Object.fromEntries(Object.entries(collected).map(([k, value]) => [k, { data_collection_id: k, rationale: "", value }])) },
  });

  it("passes each stated price into the results and names the cheapest", async () => {
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare();
    await startSwarm(id, true);
    routes["/batch-calling/batch_1"] = finished(id, 3);
    routes["/conversations/conv_1"] = said({ answer: "Yes, 35.50 euros", price: 35.5, currency: "eur" });
    routes["/conversations/conv_2"] = said({ answer: "Yes, 32 euros", price: "32,00", currency: "EUR" });
    routes["/conversations/conv_3"] = said({ answer: "We have it, ask in store", price: "about thirty" });
    const done = await getSwarm(id) as { calls: { price?: number; currency?: string }[]; comparison: { cheapest: unknown } };
    expect(done.calls.map((c) => [c.price, c.currency])).toEqual([[35.5, "EUR"], [32, "EUR"], [undefined, undefined]]);
    expect(done.comparison.cheapest).toEqual({ price: 32, currency: "EUR", names: ["Shop B"] });
  });

  it("names no cheapest across different currencies", async () => {
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare({ recipients: ["Shop A", "Shop B"] });
    await startSwarm(id, true);
    routes["/batch-calling/batch_1"] = finished(id, 2);
    routes["/conversations/conv_1"] = said({ price: 35, currency: "EUR" });
    routes["/conversations/conv_2"] = said({ price: 300, currency: "SEK" });
    expect((await getSwarm(id) as { comparison: object }).comparison).not.toHaveProperty("cheapest");
  });

  it("records only when the proposal said so, and tells each recipient first", async () => {
    vi.stubEnv("SWARM_RECORD_CALLS", "1");
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare({ recipients: ["Shop A"] });
    expect((await getSwarm(id) as { recorded: boolean }).recorded).toBe(true);
    await startSwarm(id, true);
    const sent = requests[0].body as { recipients: { conversation_initiation_client_data: { dynamic_variables: Record<string, string> } }[] };
    expect(sent.recipients[0].conversation_initiation_client_data.dynamic_variables.recording_notice).toMatch(/recorded/);

    vi.stubEnv("SWARM_RECORD_CALLS", "");
    expect((await startSwarm(await prepare(), true)).status).toBe("calling");
    vi.stubEnv("SWARM_RECORD_CALLS", "1");
    const unrecorded = await prepare();
    vi.stubEnv("SWARM_RECORD_CALLS", "");
    expect((await startSwarm(unrecorded, true)).status).toBe("needs_new_proposal");
  });

  it("streams a recording through this server without showing the conversation id", async () => {
    vi.stubEnv("SWARM_RECORD_CALLS", "1");
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare({ recipients: ["Shop A"] });
    await startSwarm(id, true);
    routes["/batch-calling/batch_1"] = finished(id, 1);
    routes["/conversations/conv_1/audio"] = () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
    routes["/conversations/conv_1"] = said({ answer: "Yes" }, true);
    const done = await getSwarm(id) as { calls: { audio?: string }[] };
    expect(done.calls[0].audio).toBe(`/api/swarm/${id}/audio/r1`);
    expect(JSON.stringify(done)).not.toContain("conv_1");

    const { GET } = await import("@/app/api/swarm/[id]/audio/[recipientId]/route");
    const ctx = (recipientId: string) => ({ params: Promise.resolve({ id, recipientId }) }) as never;
    const audio = await GET(new Request("http://localhost/x"), ctx("r1"));
    expect(audio.headers.get("content-type")).toBe("audio/mpeg");
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect((await GET(new Request("http://localhost/x"), ctx("r9"))).status).toBe(404);
  });
});

describe("cancelSwarm", () => {
  it("cancels a proposal so it can no longer start", async () => {
    const id = await prepare();
    expect((await cancelSwarm(id)).status).toBe("cancelled");
    expect((await startSwarm(id, true)).status).toBe("cancelled");
    expect(requests).toHaveLength(0);
  });

  it("stops a running batch at the provider", async () => {
    routes["/batch-calling/submit"] = reply({ id: "batch_1", status: "pending" });
    const id = await prepare({ recipients: ["Shop A"] });
    await startSwarm(id, true);
    routes["/batch-calling/batch_1/cancel"] = reply({ id: "batch_1", status: "cancelled" });
    routes["/batch-calling/batch_1"] = reply({ id: "batch_1", status: "cancelled", recipients: [{ id: "rcpt_r1", phone_number: "+358401111111", status: "cancelled", conversation_id: null }] });
    expect((await cancelSwarm(id)).status).toBe("cancelled");
    expect(requests.some((r) => r.url.endsWith("/batch-calling/batch_1/cancel") && r.method === "POST")).toBe(true);
  });
});
