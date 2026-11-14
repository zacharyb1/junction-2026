import { describe, expect, it } from "vitest";
import { labels, langOf } from "@/lib/i18n";

describe("langOf", () => {
  it("keeps a real language tag as it is", () => {
    for (const tag of ["en", "fi", "sv", "en-GB", "fi-FI", "zh-Hans"]) expect(langOf(tag), tag).toBe(tag);
  });

  it("marks the page in the language of its labels when the case names its language in words", () => {
    expect(langOf("Finnish")).toBe("fi");
    expect(langOf("finnish (Finland)")).toBe("fi");
    expect(langOf("English")).toBe("en");
  });

  it("falls back to English, like the labels, for anything else", () => {
    for (const language of [undefined, "", "fi_FI ", "Klingon language", "12"]) {
      expect(langOf(language), String(language)).toBe(labels(language).locale.slice(0, 2));
    }
    expect(langOf("Klingon language")).toBe("en");
  });
});

describe("labels", () => {
  it("has the screen reader labels in both languages", () => {
    expect(labels("en").sourceNumber(3)).toBe("Source 3");
    expect(labels("fi").sourceNumber(3)).toBe("Lähde 3");
    expect(labels("fi").newTab).not.toBe(labels("en").newTab);
  });
});
