import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFixtureRenderer, createGeminiRenderer } from "../scripts/avatar/renderers.mjs";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const videoJob = { id: "idle", kind: "video", prompt: "Return to the starting pose.", images: [], durationMs: 4000 };

describe("avatar media provider interface", () => {
  it("supplies existing video offline even when a key happens to be set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "unused-test-key");
    const network = vi.fn(() => { throw new Error("Offline rendering must not use the network"); });
    vi.stubGlobal("fetch", network);
    const fixtureDir = path.join(process.cwd(), "public/avatar/test");
    const output = await createFixtureRenderer({ fixtureDir }).render(videoJob);
    expect(output.mimeType).toBe("video/mp4");
    expect(output.bytes).toEqual(await readFile(path.join(fixtureDir, "idle.mp4")));
    expect(network).not.toHaveBeenCalled();
  });

  it("refuses arbitrary fixture paths", async () => {
    const renderer = createFixtureRenderer({ fixtureDir: path.join(process.cwd(), "public/avatar/test") });
    await expect(renderer.render({ ...videoJob, id: "../../.env.local" })).rejects.toThrow();
  });

  it("translates reference-image jobs inside the Gemini adapter", async () => {
    const payload = Buffer.from("mock-generated-video");
    const fetchImpl = vi.fn(async () => Response.json({ status: "completed", steps: [
      { type: "model_output", content: [{ type: "video", mime_type: "video/mp4", data: payload.toString("base64") }] },
    ] }));
    const renderer = createGeminiRenderer({ apiKey: "test-key", fetchImpl });
    const reference = { bytes: Buffer.from("mock-frame"), mimeType: "image/png" };
    const output = await renderer.render({ ...videoJob, images: [reference, reference] });
    expect(output).toEqual({ bytes: payload, mimeType: "video/mp4" });
    const [url, options] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    expect(new Headers(options.headers).get("Api-Revision")).toBe("2026-05-20");
    const body = JSON.parse(String(options.body));
    expect(body.model).toBe("gemini-omni-1.2-flash");
    expect(body.input.filter((part: { type: string }) => part.type === "image")).toHaveLength(2);
    expect(body.response_format).toMatchObject({ type: "video", duration: "4s" });
    expect(body.store).toBe(false);
  });

  it("surfaces provider failures without retrying or echoing its response body", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ error: { message: "sensitive provider echo" } }, { status: 429 }));
    const renderer = createGeminiRenderer({ apiKey: "test-key", fetchImpl });
    const error = await renderer.render(videoJob).catch((reason: Error) => reason);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/429/);
    expect((error as Error).message).not.toMatch(/sensitive provider echo/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects a text-only answer to a video request", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ status: "completed", steps: [
      { type: "model_output", content: [{ type: "text", text: "A description of a person" }] },
    ] }));
    await expect(createGeminiRenderer({ apiKey: "test-key", fetchImpl }).render(videoJob)).rejects.toThrow();
  });
});
