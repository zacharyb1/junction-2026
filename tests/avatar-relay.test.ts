import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/avatar/chat/route";
import { POST as localChat } from "@/app/api/ukk/route";
import { mayResearch } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";

vi.mock("@/app/api/ukk/route", () => ({ POST: vi.fn(async () => Response.json({ local: true })) }));
vi.mock("@/lib/cases", async (original) => ({
  ...(await original<typeof import("@/lib/cases")>()), mayResearch: vi.fn(() => true),
}));
vi.mock("@/lib/rate-limit", () => ({ allow: vi.fn(() => true) }));

const request = (body: unknown = { message: "Find official pages" }, signal?: AbortSignal) => new Request(
  "https://concept.example/api/avatar/chat", {
    method: "POST", body: JSON.stringify(body), signal,
    headers: { "x-demo-code": "demo", authorization: "Bearer private", cookie: "private=cookie", "x-forwarded-for": "1.2.3.4" },
  },
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AVATAR_UPSTREAM", "https://team.example");
  vi.mocked(mayResearch).mockReturnValue(true);
  vi.mocked(allow).mockReturnValue(true);
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => new URL(String(url)).pathname === "/api/aidaddy" ? new Response("data: [DONE]\n\n", {
    headers: { "content-type": "text/event-stream", "set-cookie": "remote=secret" },
  }) : new Response("<html>Not found</html>", { status: 404, headers: { "content-type": "text/html" } })));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("avatar chat relay", () => {
  it("defaults to the existing local handler without making a network request", async () => {
    vi.stubEnv("AVATAR_UPSTREAM", "");
    const req = request();
    expect(await (await POST(req)).json()).toEqual({ local: true });
    expect(localChat).toHaveBeenCalledWith(req);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards only a validated message and demo code to the fixed path", async () => {
    const response = await POST(request({ message: "  Hello  " }));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("https://team.example/api/aidaddy");
    expect(init).toMatchObject({ method: "POST", redirect: "error", body: '{"message":"Hello"}' });
    expect(init?.headers).toEqual({ "content-type": "application/json", accept: "text/event-stream", "x-demo-code": "demo" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).toBe("data: [DONE]\n\n");
  });

  it("keeps the access and rate gates ahead of the remote request", async () => {
    vi.mocked(mayResearch).mockReturnValue(false);
    expect((await POST(request())).status).toBe(401);
    vi.mocked(mayResearch).mockReturnValue(true);
    vi.mocked(allow).mockReturnValue(false);
    expect((await POST(request())).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([{ message: "" }, { message: "x".repeat(1501) }, { message: "ok", url: "https://other.example" }])(
    "rejects invalid bodies before a network request", async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(["http://team.example", "https://user:pass@team.example", "https://team.example/path", "https://team.example?url=x", "https://team.example#fragment"])(
    "refuses an unsafe origin configuration %s", async (origin) => {
      vi.stubEnv("AVATAR_UPSTREAM", origin);
      expect((await POST(request())).status).toBe(503);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("propagates client cancellation to the upstream request", async () => {
    const controller = new AbortController();
    await POST(request(undefined, controller.signal));
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    controller.abort();
    expect(signal?.aborted).toBe(true);
  });

  it.each([401, 429, 503])("preserves actionable upstream status %s without leaking its body", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response("private upstream error", { status }));
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("private upstream");
  });

  it("rejects an HTML success page instead of pretending it is a reply stream", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("<html>login</html>", { headers: { "content-type": "text/html" } }));
    expect((await POST(request())).status).toBe(502);
  });

  it("offers the recorded example when the remote chat route is missing", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("<html>Not found</html>", { status: 404 }));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("Live chat is unavailable at this address. You can still watch the recorded example.");
  });
});
