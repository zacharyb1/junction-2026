import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  answerDemoLine, demoCallConfiguration, getDemoCall, getDemoLine, prepareDemoCall, startDemoCall, webCallsAvailable,
} from "@/lib/demo-calls";

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

describe("demo calls on the browser line", () => {
  const origin = "https://aidaddy.example";
  const signed = (conversation = "conv_1") =>
    response({ signed_url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=test-agent&conversation_signature=secret-signature&conversation_id=${conversation}` });

  beforeEach(() => {
    // No phone number and no test phone: the operator has only the agent, so calls ring in a browser.
    vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "");
    vi.stubEnv("DEMO_CALL_TO_NUMBER", "");
  });

  /** A confirmed call that is ringing, and the id in its answer link. */
  async function ringing() {
    const call = await proposal();
    const started = await startDemoCall(call.id, true, origin);
    if (!("answerUrl" in started) || !started.answerUrl) throw new Error("Expected a ringing line");
    return { call, started, answerId: started.answerUrl.split("/").at(-1)! };
  }

  it("needs only the agent, and says which line a proposal will ring", async () => {
    expect(demoCallConfiguration()).toMatchObject({ ready: true, line: "browser" });
    expect(webCallsAvailable()).toBe(true);
    const call = await proposal();
    expect(call).toMatchObject({ line: "browser", recipient: "Test desk" });
    expect("phoneEnding" in call).toBe(false);
  });

  it("keeps a half-configured phone line unavailable instead of falling back", async () => {
    vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "test-phone");
    expect(await prepareDemoCall(task)).toMatchObject({ status: "unavailable", line: "phone" });
    expect(webCallsAvailable()).toBe(false);
  });

  it("opens the public page for a real phone only on the operator's second choice", async () => {
    vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "test-phone");
    vi.stubEnv("DEMO_CALL_TO_NUMBER", "+15550123456");
    expect(demoCallConfiguration().ready).toBe(true);
    expect(webCallsAvailable()).toBe(false);
    vi.stubEnv("DEMO_CALLS_WEB", "1");
    expect(webCallsAvailable()).toBe(true);
  });

  it("rings at a web address after confirmation, without contacting the provider", async () => {
    const { call, started, answerId } = await ringing();
    expect(started).toMatchObject({ status: "ringing", answerUrl: `${origin}/call/line/${answerId}` });
    // The answer link must not be the call id: the answerer may not read the household's request or result.
    expect(answerId).not.toBe(call.id);
    expect(await getDemoCall(answerId)).toEqual({ status: "not_found" });
    expect(await getDemoLine(answerId)).toEqual({ status: "ringing", recipient: "Test desk", notice: call.notice, maxSeconds: 120 });
    expect(network).not.toHaveBeenCalled();
  });

  it("does not ring without a confirmation or without a public address", async () => {
    const call = await proposal();
    expect(await startDemoCall(call.id, false, origin)).toMatchObject({ status: "needs_confirmation" });
    expect(await startDemoCall(call.id, true)).toMatchObject({ status: "unavailable" });
    expect(await getDemoCall(call.id)).toMatchObject({ status: "proposed" });
  });

  it("hands the answerer one link to the agent with the confirmed task", async () => {
    const { call, answerId } = await ringing();
    network.mockResolvedValueOnce(signed());
    const answered = await answerDemoLine(answerId);
    expect(answered).toMatchObject({
      status: "in_progress",
      signedUrl: expect.stringContaining("conversation_signature=secret-signature"),
      dynamicVariables: { ...task, demo_notice: call.notice },
    });
    const [url, init] = network.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=test-agent&include_conversation_id=true");
    expect(init.headers).toMatchObject({ "xi-api-key": "test-key" });
    // The household's page never sees the link or the provider's conversation id.
    network.mockResolvedValueOnce(response({ status: "in-progress" }));
    const seen = JSON.stringify(await getDemoCall(call.id, { transcript: true }));
    expect(seen).not.toContain("secret-signature");
    expect(seen).not.toContain("conv_1");
  });

  it("is answered once, also when two people tap at the same moment", async () => {
    const { answerId } = await ringing();
    network.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return signed();
    });
    const answers = await Promise.all([answerDemoLine(answerId), answerDemoLine(answerId)]);
    expect(answers.filter((answer) => "signedUrl" in answer)).toHaveLength(1);
    expect(await answerDemoLine(answerId)).toEqual(expect.not.objectContaining({ signedUrl: expect.anything() }));
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("keeps ringing when the provider gives no usable link", async () => {
    const { call, answerId } = await ringing();
    network.mockResolvedValueOnce(response({}, 500));
    expect(await answerDemoLine(answerId)).toMatchObject({ status: "ringing", note: expect.stringContaining("Try again") });
    // A link without a conversation id could never be read back, so it is not handed out either.
    network.mockResolvedValueOnce(response({ signed_url: "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=test-agent&conversation_signature=x" }));
    const refused = await answerDemoLine(answerId);
    expect(refused).toMatchObject({ status: "ringing" });
    expect("signedUrl" in refused).toBe(false);
    expect(await getDemoCall(call.id)).toMatchObject({ status: "ringing" });
    network.mockResolvedValueOnce(signed());
    expect(await answerDemoLine(answerId)).toMatchObject({ status: "in_progress" });
  });

  it("reports the provider's summary and what was said, and nothing before the call ends", async () => {
    const { call, answerId } = await ringing();
    network.mockResolvedValueOnce(signed());
    await answerDemoLine(answerId);
    // The answerer's browser has not connected yet: the provider does not know the conversation.
    network.mockResolvedValueOnce(response({ detail: "not found" }, 404));
    expect(await getDemoCall(call.id)).toMatchObject({ status: "in_progress" });
    network.mockResolvedValueOnce(response({
      status: "done", transcript_summary: "The office moved the collection to Saturday at 10.", call_successful: "success",
      // The agent's tone marks are for the voice; "[B12]" is not one and stays.
      messages: [
        { role: "agent", message: "[happy] Hello, this is AIDaddy." }, { role: "user", message: " Saturday at ten works for [B12]. " },
        { role: "agent", message: null }, { role: "agent", message: "[thoughtful]" },
      ],
    }));
    const result = await getDemoCall(call.id, { transcript: true });
    expect(result).toMatchObject({
      status: "finished", outcome: "success", summary: "The office moved the collection to Saturday at 10.",
      transcript: [{ speaker: "aidaddy", text: "Hello, this is AIDaddy." }, { speaker: "recipient", text: "Saturday at ten works for [B12]." }],
    });
    expect("notice" in result && result.notice).toContain("simulated");
    // The chat tool gets the summary; the transcript is for the web page.
    expect("transcript" in (await getDemoCall(call.id))).toBe(false);
    expect(await getDemoLine(answerId)).toMatchObject({ status: "finished" });
    expect(JSON.stringify(await getDemoLine(answerId))).not.toContain("Saturday");
  });

  it("stops ringing after ten minutes and fails an answered call that never connected", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const unanswered = await ringing();
      vi.setSystemTime(Date.now() + 11 * 60_000);
      expect(await getDemoLine(unanswered.answerId)).toMatchObject({ status: "failed" });
      expect(await answerDemoLine(unanswered.answerId)).toMatchObject({ status: "failed" });
      expect(await getDemoCall(unanswered.call.id)).toMatchObject({ status: "failed", note: expect.stringContaining("Nobody answered") });

      const answered = await ringing();
      network.mockResolvedValueOnce(signed("conv_2"));
      await answerDemoLine(answered.answerId);
      network.mockResolvedValue(response({ detail: "not found" }, 404));
      expect(await getDemoCall(answered.call.id)).toMatchObject({ status: "in_progress" });
      vi.setSystemTime(Date.now() + 6 * 60_000);
      expect(await getDemoCall(answered.call.id)).toMatchObject({ status: "failed", note: expect.stringContaining("never connected") });
      expect(network).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts no more calls in an hour than the operator allows", async () => {
    vi.stubEnv("DEMO_CALLS_PER_HOUR", "2");
    await ringing();
    await ringing();
    const third = await proposal();
    expect(await startDemoCall(third.id, true, origin)).toMatchObject({ status: "busy" });
    // The proposal is still good once the hour has room again.
    vi.stubEnv("DEMO_CALLS_PER_HOUR", "3");
    expect(await startDemoCall(third.id, true, origin)).toMatchObject({ status: "ringing" });
  });

  it("asks for a new proposal when the operator switches lines", async () => {
    const call = await proposal();
    vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "test-phone");
    vi.stubEnv("DEMO_CALL_TO_NUMBER", "+15550123456");
    expect(await startDemoCall(call.id, true, origin)).toMatchObject({ status: "needs_new_proposal" });
    expect(network).not.toHaveBeenCalled();
  });

  it("rejects invalid answer ids without reading outside the call store", async () => {
    expect(await getDemoLine("../cases/private")).toEqual({ status: "not_found" });
    expect(await answerDemoLine("../../etc/passwd")).toEqual({ status: "not_found" });
    expect(await answerDemoLine("A".repeat(24))).toEqual({ status: "not_found" });
    expect(network).not.toHaveBeenCalled();
  });
});
