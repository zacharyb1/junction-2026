import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as aidaddy } from "@/app/api/aidaddy/route";
import { readSession, signSession } from "@/lib/aidaddy";

const KEY = "test-aidaddy-api-key-0123456789";
const CODE = "demo-code";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://aidaddy.example/api/aidaddy", {
    method: "POST",
    headers: { "content-type": "application/json", "x-demo-code": CODE, ...headers },
    body: JSON.stringify(body),
  });
}

function upstream(status = 200, headers: Record<string, string> = {}) {
  const sse = 'data: {"choices":[{"delta":{"content":"A matter of state."}}]}\n\ndata: [DONE]\n\n';
  return vi.fn().mockResolvedValue(
    new Response(status === 200 ? sse : "upstream failure", {
      status,
      headers: { "content-type": "text/event-stream", ...headers },
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("DEMO_ACCESS_CODE", CODE);
  vi.stubEnv("CASEFILE_SECRET", "bot-secret");
  // The UKK_* variable names predate the rename and stay: the server's private env file sets them.
  vi.stubEnv("UKK_API_URL", "http://hermes-web:8642");
  vi.stubEnv("UKK_API_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/aidaddy", () => {
  it("answers a visitor without a code where the deployment opened the demo", async () => {
    vi.stubEnv("DEMO_OPEN", "1");
    vi.stubGlobal("fetch", upstream());
    const res = await aidaddy(request({ message: "hi" }, { "x-demo-code": "" }));
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a visitor without the demo code", async () => {
    vi.stubGlobal("fetch", upstream());
    const res = await aidaddy(request({ message: "hi" }, { "x-demo-code": "" }));
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses an empty message and one over 1,500 characters", async () => {
    vi.stubGlobal("fetch", upstream());
    expect((await aidaddy(request({ message: "" }))).status).toBe(400);
    expect((await aidaddy(request({ message: "x".repeat(1501) }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("points to the server's chat when the backend is not configured here", async () => {
    vi.stubEnv("UKK_API_URL", "");
    vi.stubGlobal("fetch", upstream());
    const res = await aidaddy(request({ message: "hi" }));
    expect(res.status).toBe(503);
    expect((await res.json()).chatUrl).toMatch(/^https:\/\/.+\/chat$/);
  });

  it("forwards the message to AIDaddy with the key and streams the reply", async () => {
    vi.stubGlobal("fetch", upstream());
    const res = await aidaddy(request({ message: "I just moved to Espoo" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://hermes-web:8642/v1/chat/completions");
    expect((init!.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(String(init!.body));
    // The web-only Hermes instance was set up with this model name, which predates the rename.
    expect(body.model).toBe("ukk");
    expect(body.stream).toBe(true);
    // Hermes only reports "api_server", so the route tells AIDaddy where it is: the web page, no reminders.
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toMatch(/web page/i);
    expect(body.messages[0].content).toMatch(/reminders/i);
    expect(body.messages[1]).toEqual({ role: "user", content: "I just moved to Espoo" });
    expect(await res.text()).toContain("A matter of state.");
  });

  it("keeps the visitor's Hermes session in a signed cookie", async () => {
    vi.stubGlobal("fetch", upstream(200, { "x-hermes-session-id": "20261114_101500_abcd1234" }));
    const res = await aidaddy(request({ message: "hi" }));
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^aidaddy_session=/);
    // The browser sends the cookie back only to the address in its Path, which must be this route's own.
    expect(cookie).toMatch(/; Path=\/api\/aidaddy;/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const value = decodeURIComponent(cookie.split(";")[0].slice("aidaddy_session=".length));
    expect(readSession(value)).toBe("20261114_101500_abcd1234");
  });

  it("continues a session from a cookie it signed", async () => {
    vi.stubGlobal("fetch", upstream());
    const cookie = `aidaddy_session=${encodeURIComponent(signSession("20261114_101500_abcd1234"))}`;
    await aidaddy(request({ message: "and then?" }, { cookie }));
    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers["x-hermes-session-id"]).toBe("20261114_101500_abcd1234");
  });

  it("ignores a cookie it did not sign, so nobody can open another visitor's session", async () => {
    vi.stubGlobal("fetch", upstream());
    for (const value of ["20261114_101500_abcd1234", "20261114_101500_abcd1234.forged", signSession("a") + "x"]) {
      vi.mocked(fetch).mockClear();
      await aidaddy(request({ message: "hi" }, { cookie: `aidaddy_session=${encodeURIComponent(value)}` }));
      const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>;
      expect(headers["x-hermes-session-id"], value).toBeUndefined();
    }
  });

  it("says AIDaddy is busy when the backend is at its limit", async () => {
    vi.stubGlobal("fetch", upstream(429));
    const res = await aidaddy(request({ message: "hi" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("AIDaddy is busy, try again in a minute.");
  });

  it("hides backend failures behind a plain message", async () => {
    vi.stubGlobal("fetch", upstream(500));
    const res = await aidaddy(request({ message: "hi" }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("upstream failure");
  });

  it("never sends the key back to the browser", async () => {
    vi.stubGlobal("fetch", upstream(200, { "x-hermes-session-id": "s1" }));
    const res = await aidaddy(request({ message: "hi" }));
    const everything = JSON.stringify([...res.headers]) + (await res.text());
    expect(everything).not.toContain(KEY);
  });
});
