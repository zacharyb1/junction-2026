import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDemoCall, prepareDemoCall, startDemoCall } from "@/lib/demo-calls";

let temporary: string;
const network = vi.fn();
const task = { task: "Arrange a collection for Saturday morning", preferences: "I prefer collection before 11 and no plastic packaging" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), "aidaddy-calls-"));
  vi.spyOn(process, "cwd").mockReturnValue(temporary);
  vi.stubGlobal("fetch", network);
  for (const [key, value] of Object.entries({
    DEMO_CALLS_ENABLED: "1", ELEVENLABS_API_KEY: "test-key", ELEVENLABS_AGENT_ID: "test-agent",
    ELEVENLABS_PHONE_NUMBER_ID: "test-phone", DEMO_CALL_TO_NUMBER: "+15550123456", DEMO_CALL_RECIPIENT: "Test desk",
  })) vi.stubEnv(key, value);
  network.mockReset();
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(temporary, { recursive: true, force: true });
});

async function proposal() {
  const result = await prepareDemoCall(task);
  expect(result.status).toBe("proposed");
  if (!("id" in result)) throw new Error("Expected a prepared call");
  return result;
}

describe("demo calls", () => {
  it("only prepares; preserves preferences and requires a later confirmation", async () => {
    const call = await proposal();
    expect(call).toMatchObject({ ...task, recipient: "Test desk", phoneEnding: "3456" });
    expect(call.notice).toContain("simulated");
    expect(JSON.stringify(call)).not.toContain("+15550123456");
    expect(await startDemoCall(call.id, false)).toMatchObject({ status: "needs_confirmation" });
    expect(network).not.toHaveBeenCalled();
  });

  it("is unavailable by default and never invents a call result", async () => {
    vi.stubEnv("DEMO_CALLS_ENABLED", "0");
    expect(await prepareDemoCall(task)).toMatchObject({ status: "unavailable", ready: false });
    expect(network).not.toHaveBeenCalled();
  });

  it("dials the configured test phone with the exact confirmed task", async () => {
    const call = await proposal();
    network.mockResolvedValue(response({ success: true, conversation_id: "conversation-1" }));
    expect(await startDemoCall(call.id, true)).toMatchObject({ status: "in_progress" });
    const [url, init] = network.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/convai/twilio/outbound-call");
    expect(JSON.parse(init.body)).toMatchObject({
      to_number: "+15550123456", call_recording_enabled: false,
      conversation_initiation_client_data: { dynamic_variables: task },
    });
    expect(JSON.stringify(await startDemoCall(call.id, true))).not.toContain("conversation-1");
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("claims the proposal once even for concurrent confirmations", async () => {
    const call = await proposal();
    network.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return response({ success: true, conversation_id: "conversation-1" });
    });
    await Promise.all([startDemoCall(call.id, true), startDemoCall(call.id, true)]);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("requires a new proposal when the operator changes the destination", async () => {
    const call = await proposal();
    vi.stubEnv("DEMO_CALL_TO_NUMBER", "+15550987654");
    expect(await startDemoCall(call.id, true)).toMatchObject({ status: "needs_new_proposal" });
    expect(network).not.toHaveBeenCalled();
  });

  it("does not redial after a timeout or assume it failed to connect", async () => {
    const call = await proposal();
    network.mockRejectedValue(new Error("Timeout with private details"));
    expect(await startDemoCall(call.id, true)).toMatchObject({ status: "unknown" });
    expect(await startDemoCall(call.id, true)).toMatchObject({ status: "unknown" });
    expect(network).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await getDemoCall(call.id))).not.toContain("private details");
  });

  it("reports an explicit provider rejection even without a conversation ID", async () => {
    const call = await proposal();
    network.mockResolvedValue(response({ success: false, message: "Call was not initiated" }));
    expect(await startDemoCall(call.id, true)).toMatchObject({ status: "failed" });
    await startDemoCall(call.id, true);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("returns the provider's result without presenting simulated payment as real", async () => {
    const call = await proposal();
    network.mockResolvedValueOnce(response({ success: true, conversation_id: "conversation-1" }));
    await startDemoCall(call.id, true);
    network.mockResolvedValueOnce(response({ status: "processing" }));
    expect(await getDemoCall(call.id)).toMatchObject({ status: "in_progress" });
    network.mockResolvedValueOnce(response({ status: "done", transcript_summary: "The test desk agreed to Saturday at 10.", call_successful: "success" }));
    const result = await getDemoCall(call.id);
    expect(result).toMatchObject({ status: "finished", summary: "The test desk agreed to Saturday at 10.", outcome: "success" });
    expect("notice" in result && result.notice).toContain("simulated");
  });

  it("does not turn a failed or unreadable call into a successful task", async () => {
    const call = await proposal();
    network.mockResolvedValueOnce(response({ success: true, conversation_id: "conversation-1" }));
    await startDemoCall(call.id, true);
    network.mockResolvedValueOnce(response({}, 503));
    expect(await getDemoCall(call.id)).toMatchObject({ status: "in_progress" });
    network.mockResolvedValueOnce(response({ status: "failed", call_successful: "failure" }));
    expect(await getDemoCall(call.id)).toMatchObject({ status: "failed", outcome: "failure" });
  });

  it("rejects invalid IDs without reading outside the call store", async () => {
    expect(await startDemoCall("../cases/private", true)).toEqual({ status: "not_found" });
    expect(await getDemoCall("../cases/private")).toEqual({ status: "not_found" });
    expect(network).not.toHaveBeenCalled();
  });
});
