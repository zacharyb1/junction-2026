import { describe, expect, it } from "vitest";
import { readCompletionStream } from "@/lib/ukk-stream";

function stream(...parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
}

const chunk = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

describe("readCompletionStream", () => {
  it("reassembles chunks split in the middle of a line", async () => {
    const whole = chunk("A matter ") + chunk("of state.") + "data: [DONE]\n\n";
    const text: string[] = [];
    await readCompletionStream(stream(whole.slice(0, 17), whole.slice(17, 40), whole.slice(40)), (d) => text.push(d));
    expect(text.join("")).toBe("A matter of state.");
  });

  it("stops at [DONE]", async () => {
    const text: string[] = [];
    await readCompletionStream(stream(chunk("one"), "data: [DONE]\n\n", chunk("after")), (d) => text.push(d));
    expect(text.join("")).toBe("one");
  });

  it("adds nothing for chunks without content, comments or blank lines", async () => {
    const roleOnly = `data: ${JSON.stringify({ choices: [{ delta: { role: "assistant" } }] })}\n\n`;
    const text: string[] = [];
    await readCompletionStream(stream(": keep-alive\n\n", roleOnly, "\n", chunk("hi"), "data: [DONE]\n\n"), (d) => text.push(d));
    expect(text.join("")).toBe("hi");
  });

  it("rejects a stream that closes before [DONE]", async () => {
    await expect(readCompletionStream(stream(chunk("half")), () => {})).rejects.toThrow("stream ended early");
  });
});
