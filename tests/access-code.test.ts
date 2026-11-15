import { describe, expect, it } from "vitest";
import { withCode } from "@/components/site/access-code";

describe("withCode", () => {
  it("leaves every address alone when the visitor has no code", () => {
    expect(withCode("/try", "")).toBe("/try");
    expect(withCode("/chat", "")).toBe("/chat");
  });

  it("adds the code to the three pages that read one", () => {
    expect(withCode("/try", "table7")).toBe("/try?code=table7");
    expect(withCode("/chat", "table7")).toBe("/chat?code=table7");
    expect(withCode("/autopilot", "table7")).toBe("/autopilot?code=table7");
  });

  it("does not hand the code to pages that have no use for it", () => {
    for (const href of ["/", "/demo", "/demo/chat", "/setup", "/scorecard", "/c/AzP8JIyzfPeJYESo", "/tryout", "https://t.me/x"]) {
      expect(withCode(href, "table7")).toBe(href);
    }
  });

  it("keeps a query and an anchor that are already there", () => {
    expect(withCode("/try?lang=fi", "table7")).toBe("/try?lang=fi&code=table7");
    expect(withCode("/chat#voice", "table7")).toBe("/chat?code=table7#voice");
  });

  it("escapes a code that is not plain letters", () => {
    expect(withCode("/try", "a b&c")).toBe("/try?code=a%20b%26c");
  });
});
