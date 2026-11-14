import { describe, expect, it } from "vitest";
import { type FetchedPage, htmlToText, isPublicUrl, judge, quoteMatch, VERIFY_THRESHOLD } from "@/lib/verify";

const TEXT =
  "You must notify your employer no later than two months before the leave starts. The allowance is paid for 160 working days per parent. Applications are handled in the order they arrive at the office.";
const page = (direct: string | null, exa: string | null = null, oxylabs: string | null = null): FetchedPage => ({
  direct,
  exa,
  oxylabs,
  text: [direct, oxylabs, exa].filter(Boolean).join("\n"),
});

describe("htmlToText", () => {
  it("drops scripts and styles and keeps sentences apart", () => {
    const text = htmlToText("<html><head><title>x</title><style>p{}</style></head><body><p>First rule.</p><script>alert(1)</script><li>Second rule.</li></body></html>");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("p{}");
    expect(text.split("\n").map((l) => l.trim()).filter(Boolean)).toEqual(["First rule.", "Second rule."]);
  });

  it("decodes entities", () => {
    expect(htmlToText("<p>Kela &amp; Vero &#8364;5 &quot;now&quot;</p>")).toContain('Kela & Vero €5 "now"');
  });
});

describe("quoteMatch", () => {
  it("is 1 for a sentence on the page, whatever the case or punctuation", () => {
    expect(quoteMatch("The allowance is paid for 160 working days per parent.", TEXT)).toBe(1);
    expect(quoteMatch("the allowance is paid for 160 working days per parent", TEXT)).toBe(1);
  });

  it("is 0 for a sentence that is not there", () => {
    expect(quoteMatch("Dogs must be registered with the municipality every spring.", TEXT)).toBe(0);
  });

  it("does not count a number that is only part of a longer one", () => {
    expect(quoteMatch("paid for 60 working days", TEXT)).toBeLessThan(VERIFY_THRESHOLD);
  });
});

describe("judge", () => {
  const quote = "The allowance is paid for 160 working days per parent.";

  it("reports an unreachable page", () => {
    expect(judge(quote, null)).toEqual({ verification: "unreachable", match: 0 });
  });

  it("prefers the live reading, then Oxylabs, then Exa's copy", () => {
    expect(judge(quote, page(TEXT, TEXT)).checkedVia).toBe("live");
    expect(judge(quote, page(null, TEXT, TEXT)).checkedVia).toBe("oxylabs");
    expect(judge(quote, page(null, TEXT)).checkedVia).toBe("exa");
  });

  it("rejects a quote with a changed number", () => {
    const changed = "You must notify your employer no later than three months before the leave starts.";
    expect(judge(changed, page(TEXT)).verification).toBe("not_found");
  });

  it("rejects a quote with a word dropped", () => {
    const text = "You do not have to notify your employer before the leave starts in any of these cases at all.";
    const dropped = "You have to notify your employer before the leave starts in any of these cases at all.";
    expect(judge(dropped, page(text)).verification).toBe("not_found");
  });

  it("rejects two distant sentences joined into one quote", () => {
    const joined = "You must notify your employer no later than two months before the leave starts. Applications are handled in the order they arrive at the office.";
    expect(judge(joined, page(TEXT)).verification).toBe("not_found");
  });

  it("in a re-check, a quote last seen live must still be on the live reading", () => {
    const gone = "This page has changed and now says something else entirely about the rules for parents and their employers.";
    expect(judge(quote, page(gone, TEXT), true).verification).toBe("not_found");
    expect(judge(quote, page(gone, TEXT), false).verification).toBe("verified");
  });
});

describe("isPublicUrl", () => {
  it("accepts a public web address", async () => {
    expect(await isPublicUrl("https://93.184.216.34/page")).toBe(true);
  });

  it("refuses private, loopback and link-local hosts", async () => {
    for (const url of [
      "http://localhost/",
      "http://localhost./",
      "http://127.0.0.1/",
      "http://10.1.2.3/",
      "http://192.168.1.1/",
      "http://172.16.0.1/",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "http://2130706433/",
      "http://service.internal/",
    ]) {
      expect(await isPublicUrl(url), url).toBe(false);
    }
  });

  it("refuses other schemes, ports and credentials", async () => {
    for (const url of ["ftp://93.184.216.34/", "file:///etc/passwd", "javascript:alert(1)", "https://93.184.216.34:8443/", "https://user:pw@93.184.216.34/", "not a url"]) {
      expect(await isPublicUrl(url), url).toBe(false);
    }
  });
});
