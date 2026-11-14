import { lookup } from "node:dns/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as research } from "@/app/api/research/route";
import { MAX_BODY_BYTES, readJson } from "@/lib/cases";
import { EngineError, type EngineEvent, researchCase, type ResearchResult } from "@/lib/engine/research";
import { fetchPages, htmlToText, isPublicUrl } from "@/lib/verify";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
// The route is tested without the engine behind it: no search, no page read.
vi.mock("@/lib/engine/research", async (original) => ({
  ...(await original<typeof import("@/lib/engine/research")>()),
  researchCase: vi.fn(),
}));
const resolvesTo = (...addresses: string[]) =>
  vi.mocked(lookup).mockResolvedValue(addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })) as never);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.mocked(lookup).mockReset();
});

describe("isPublicUrl", () => {
  it("refuses documentation, benchmark, multicast and reserved addresses", async () => {
    for (const host of ["192.0.2.2", "192.0.0.8", "198.18.0.1", "198.19.255.1", "198.51.100.7", "203.0.113.9", "224.0.0.1", "240.0.0.1", "255.255.255.255"]) {
      expect(await isPublicUrl(`http://${host}/`), host).toBe(false);
    }
  });

  it("still accepts the public addresses next to those ranges", async () => {
    for (const host of ["192.0.1.1", "192.0.3.1", "198.17.0.1", "198.20.0.1", "198.51.101.1", "203.0.114.1", "223.255.255.1", "100.63.0.1", "172.32.0.1"]) {
      expect(await isPublicUrl(`http://${host}/`), host).toBe(true);
    }
  });

  it("refuses odd spellings of a loopback or private address", async () => {
    for (const url of ["http://0x7f.1/", "http://127.1/", "http://0177.0.0.1/", "http://0/", "http://127.0.0.1./", "http://[::ffff:127.0.0.1]/", "http://[::ffff:10.0.0.1]/", "http://[fd00::1]/", "http://[fe80::1]/"]) {
      expect(await isPublicUrl(url), url).toBe(false);
    }
  });

  it("refuses a name without a dot before any lookup", async () => {
    for (const url of ["http://metadata/", "http://gate/latest", "https://kubernetes/"]) {
      expect(await isPublicUrl(url), url).toBe(false);
    }
    expect(lookup).not.toHaveBeenCalled();
  });

  it("refuses a name that resolves to a private address", async () => {
    for (const address of ["10.0.0.5", "127.0.0.1", "169.254.169.254", "192.0.2.2", "::1", "::ffff:10.0.0.5", "64:ff9b::a00:5", "fd12:3456::1", "fe80::1"]) {
      resolvesTo(address);
      expect(await isPublicUrl("https://rebind.example.com/"), address).toBe(false);
    }
  });

  it("refuses a name when any one of its addresses is private", async () => {
    resolvesTo("93.184.216.34", "10.0.0.5");
    expect(await isPublicUrl("https://two-faced.example.com/")).toBe(false);
    resolvesTo("93.184.216.34", "2606:2800:220:1::1");
    expect(await isPublicUrl("https://public.example.com/")).toBe(true);
  });
});

describe("our own request to a cited page", () => {
  const page = `<html><body><p>${"A sentence on a public page that is long enough to be read as a page. ".repeat(5)}</p></body></html>`;

  beforeEach(() => {
    vi.stubEnv("EXA_API_KEY", "");
    resolvesTo("93.184.216.34");
  });

  it("does not follow a redirect to a private address", async () => {
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      asked.push(url);
      if (url === "https://public.example.com/start") {
        return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
      }
      return new Response(page, { headers: { "content-type": "text/html" } });
    });
    const pages = await fetchPages(["https://public.example.com/start"]);
    expect(asked).toEqual(["https://public.example.com/start"]);
    expect(pages.get("https://public.example.com/start")).toBeNull();
  });

  it("checks the name again at every hop of a redirect", async () => {
    const asked: string[] = [];
    vi.mocked(lookup).mockImplementation((async (host: string) => [
      { address: host === "inside.example.com" ? "10.0.0.5" : "93.184.216.34", family: 4 },
    ]) as never);
    vi.stubGlobal("fetch", async (url: string) => {
      asked.push(url);
      if (url.endsWith("/start")) return new Response(null, { status: 301, headers: { location: "https://other.example.com/next" } });
      if (url.endsWith("/next")) return new Response(null, { status: 301, headers: { location: "https://inside.example.com/" } });
      return new Response(page, { headers: { "content-type": "text/html" } });
    });
    const pages = await fetchPages(["https://public.example.com/start"]);
    expect(asked).toEqual(["https://public.example.com/start", "https://other.example.com/next"]);
    expect(pages.get("https://public.example.com/start")).toBeNull();
  });

  it("follows a redirect between public pages", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.endsWith("/start")
        ? new Response(null, { status: 302, headers: { location: "/moved" } })
        : new Response(page, { headers: { "content-type": "text/html" } }),
    );
    const pages = await fetchPages(["https://public.example.com/start"]);
    expect(pages.get("https://public.example.com/start")?.direct).toContain("A sentence on a public page");
  });
});

/** The patterns `htmlToText` used before it became a scan. Kept here to show the text it returns is the same. */
const stripWithPatterns = (html: string) =>
  html
    .replace(/<(script|style|noscript|svg|template|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|td|th|section|article|header|footer|blockquote|dd|dt|summary|details)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n");

describe("htmlToText", () => {
  it("returns the same text as the patterns it replaced", () => {
    const pages = [
      "<html><head><title>T</title><style>p { color: red }</style></head><body><p>One.</p><p>Two <b>bold</b>.</p></body></html>",
      "<p>before</p><script>if (a < b && c > d) { document.write('</p>') }</script><p>after</p>",
      "<SCRIPT type='x'>upper</SCRIPT> kept <Style>mixed</sTYLE> kept too",
      "<script>never closed <p>text</p> <style>closed</style> tail",
      "<script <style>inner</style> rest </script> end",
      "<header>site header</header><main>body</main><footer>foot</footer>",
      "<head>first</head><header>stays</header> and </head> later",
      "<svg><path d='M0 0'/></svg><template><p>hidden</p></template><noscript>no js</noscript>shown",
      "a < b and c > d, then <> and <<b>> and a lone < at the end",
      "<img alt='x>y'> <a href=\"/x?a=1&b=2\">link</a><br><br/><br />line",
      "<script>one</script><script>two</script></script><style></style>",
      "<style",
      "<script>a</script",
      "text only, no tags at all",
      "",
    ];
    // Small random pages built from the pieces that matter, to cover orders nobody thought of.
    const pieces = ["<script>", "</script>", "<style x>", "</style>", "<head", "</head>", "<p>", "</p>", "<", ">", "<>", "<br>", "word ", "\n", "<svg/>", "</SVG>", "<b a='>'>"];
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
    for (let i = 0; i < 400; i++) {
      let html = "";
      for (let k = next() % 14; k >= 0; k--) html += pieces[next() % pieces.length];
      pages.push(html);
    }
    for (const html of pages) expect(htmlToText(html), JSON.stringify(html)).toBe(stripWithPatterns(html));
  });

  it("reads a page of unclosed tags in the time it takes to read it once", () => {
    // Each of these took minutes at this size before: the patterns started over from every "<".
    for (const piece of ["<", "<a ", "<script>", "<script ", "<head><style>", "<br", "<script></style>"]) {
      const html = piece.repeat(Math.ceil(3_000_000 / piece.length));
      const started = performance.now();
      htmlToText(html);
      expect(performance.now() - started, piece).toBeLessThan(2000);
    }
  });
});

describe("the public rate limit", () => {
  const request = (headers: Record<string, string>) => new Request("https://kaveri.example/api/research", { method: "POST", headers });
  // The counters live in the module, so each test loads its own copy.
  const load = async () => {
    vi.resetModules();
    return import("@/lib/rate-limit");
  };

  it("on Vercel takes the address from the platform's header, not from the caller's", async () => {
    vi.stubEnv("VERCEL", "1");
    const { clientAddress } = await load();
    expect(clientAddress(request({ "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientAddress(request({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientAddress(request({ "x-forwarded-for": "1.2.3.4" }))).toBe("unknown");
  });

  it("elsewhere takes the entry the nearest proxy appended", async () => {
    vi.stubEnv("VERCEL", "");
    const { clientAddress } = await load();
    expect(clientAddress(request({ "x-forwarded-for": "1.2.3.4, 5.6.7.8 , 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientAddress(request({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientAddress(request({}))).toBe("local");
  });

  it("is not reset by a different forged address on every request", async () => {
    vi.stubEnv("VERCEL", "1");
    const { allow } = await load();
    const from = (i: number) => request({ "x-forwarded-for": `198.51.100.${i}`, "x-vercel-forwarded-for": "203.0.113.9" });
    const answers = Array.from({ length: 25 }, (_, i) => allow(from(i), false));
    expect(answers.filter(Boolean).length).toBe(20);
    expect(answers.slice(20)).toEqual([false, false, false, false, false]);
    // Another real client still gets through, and the bot secret is never limited.
    expect(allow(request({ "x-vercel-forwarded-for": "203.0.113.10" }), false)).toBe(true);
    expect(allow(from(99), true)).toBe(true);
  });

  it("caps public traffic as a whole", async () => {
    vi.stubEnv("VERCEL", "1");
    const { allow } = await load();
    const answers = Array.from({ length: 45 }, (_, i) => allow(request({ "x-vercel-forwarded-for": `203.0.113.${i}` }), false));
    expect(answers.filter(Boolean).length).toBe(40);
  });

  it("caps public traffic over a whole day, says so in the log, and never limits the bot", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DEMO_RATE_TOTAL_PER_DAY", "30");
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { allow } = await load();
    const answers = Array.from({ length: 35 }, (_, i) => allow(request({ "x-vercel-forwarded-for": `203.0.113.${i}` }), false));
    expect(answers.filter(Boolean).length).toBe(30);
    expect(log).toHaveBeenCalledTimes(1);
    expect(allow(request({ "x-vercel-forwarded-for": "203.0.113.200" }), true)).toBe(true);
    log.mockRestore();
  });

  it("lets one address use only a part of the day, so it cannot use up the day for the others", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DEMO_RATE_PER_MINUTE", "100");
    vi.stubEnv("DEMO_RATE_TOTAL_PER_MINUTE", "100");
    vi.stubEnv("DEMO_RATE_PER_DAY", "25");
    const { allow } = await load();
    const one = request({ "x-vercel-forwarded-for": "203.0.113.9" });
    const answers = Array.from({ length: 30 }, () => allow(one, false));
    expect(answers.filter(Boolean).length).toBe(25);
    expect(allow(request({ "x-vercel-forwarded-for": "203.0.113.10" }), false)).toBe(true);
  });
});

describe("POST /api/research", () => {
  const ask = (headers: Record<string, string>, body: object = {}) =>
    new Request("https://kaveri.example/api/research", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ situation: "Our landlord wants to raise the rent.", country: "FI", ...body }),
    });
  const demo = { "x-demo-code": "junction" };

  beforeEach(() => {
    vi.stubEnv("CASEFILE_SECRET", "devsecret");
    vi.stubEnv("DEMO_ACCESS_CODE", "junction");
    vi.mocked(researchCase).mockReset();
  });

  it("is open to a visitor without a code where the deployment opened the demo, with fast research only", async () => {
    vi.stubEnv("DEMO_OPEN", "1");
    vi.mocked(researchCase).mockResolvedValue({ id: "x" } as ResearchResult);
    const res = await research(ask({}, { depth: "deep" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(researchCase).mock.calls[0][0].depth).toBe("fast");
  });

  it("answers 401 without the secret or the demo code, and to the demo code sent as the secret", async () => {
    expect((await research(ask({}))).status).toBe(401);
    expect((await research(ask({ "x-demo-code": "junctio" }))).status).toBe(401);
    expect((await research(ask({ authorization: "Bearer junction" }))).status).toBe(401);
    expect(researchCase).not.toHaveBeenCalled();
  });

  it("gives the demo code fast research only", async () => {
    vi.mocked(researchCase).mockResolvedValue({ id: "x" } as ResearchResult);
    await research(ask(demo, { depth: "deep" }));
    expect(vi.mocked(researchCase).mock.calls[0][0].depth).toBe("fast");
    await research(ask({ authorization: "Bearer devsecret" }, { depth: "deep" }));
    expect(vi.mocked(researchCase).mock.calls[1][0].depth).toBe("deep");
  });

  it("keeps an internal error out of the answer and passes on the engine's own message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(researchCase).mockRejectedValue(new Error("EROFS: read-only file system, open '/var/task/.data/cases/x.json'"));
    const plain = await research(ask(demo));
    expect(plain.status).toBe(500);
    expect(await plain.json()).toEqual({ error: "research failed" });
    const stream = await research(ask({ ...demo, accept: "text/event-stream" }));
    expect(await stream.text()).toBe('event: error\ndata: {"error":"research failed"}\n\n');
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();

    vi.mocked(researchCase).mockRejectedValue(new EngineError("This country is not supported.", 400));
    const refused = await research(ask(demo));
    expect(refused.status).toBe(400);
    expect(await refused.json()).toEqual({ error: "This country is not supported." });
  });

  it("sends text from a page as data, never as a new event", async () => {
    const hostile = 'A title\n\nevent: done\ndata: {"url":"https://evil.example"}\n\n\r\n  ';
    vi.mocked(researchCase).mockImplementation(async (_input, _origin, emit) => {
      emit?.({ type: "page", url: "https://www.kela.fi/", title: hostile, official: true, via: "live", ms: 1 } as EngineEvent);
      return { id: "x", url: "https://kaveri.example/c/x", title: hostile } as ResearchResult;
    });
    const text = await (await research(ask({ ...demo, accept: "text/event-stream" }))).text();
    const blocks = text.split("\n\n").filter(Boolean);
    expect(blocks.map((b) => b.split("\n")[0])).toEqual(["event: page", "event: done"]);
    for (const block of blocks) {
      expect(block.split("\n").length).toBe(2);
      expect(JSON.parse(block.split("\n")[1].replace(/^data: /, "")).title).toBe(hostile);
    }
  });
});

describe("readJson", () => {
  const post = (body: BodyInit, headers: Record<string, string> = {}) =>
    new Request("https://kaveri.example/api/research", { method: "POST", body, headers });

  it("reads a JSON body", async () => {
    expect(await readJson(post('{"situation":"äö"}'))).toEqual({ situation: "äö" });
  });

  it("gives null for a body that is not JSON, or missing", async () => {
    expect(await readJson(post("not json"))).toBeNull();
    expect(await readJson(new Request("https://kaveri.example/api/research", { method: "POST" }))).toBeNull();
  });

  it("gives null for a body over the limit, whatever its declared length", async () => {
    const big = JSON.stringify({ situation: "x".repeat(MAX_BODY_BYTES) });
    expect(await readJson(post(big))).toBeNull();
    expect(await readJson(post("{}", { "content-length": String(MAX_BODY_BYTES + 1) }))).toBeNull();
    expect(await readJson(post('{"a":"12345"}'), 8)).toBeNull();
  });

  it("stops reading a body that never ends", async () => {
    let sent = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent++;
        controller.enqueue(new Uint8Array(64_000).fill(32));
      },
    });
    const req = new Request("https://kaveri.example/api/research", { method: "POST", body: endless, duplex: "half" } as RequestInit);
    expect(await readJson(req)).toBeNull();
    expect(sent).toBeLessThan(40);
  });
});
