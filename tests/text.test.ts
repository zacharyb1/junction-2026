import { describe, expect, it } from "vitest";
import { figuresIn, includesWhole, isNumber, normalise, numbersIn, tokens } from "@/lib/text";

describe("numbersIn", () => {
  it("reads thousands separators as one number", () => {
    expect(numbersIn("up to 1 600 euros")).toEqual(["1600"]);
    expect(numbersIn("up to 1,600 euros")).toEqual(["1600"]);
    expect(numbersIn("bis zu 1.600 Euro")).toEqual(["1600"]);
    expect(numbersIn("1 600 euroa")).toEqual(["1600"]);
  });

  it("reads decimals the same with a comma or a point", () => {
    expect(numbersIn("2,5 %")).toEqual(["2.5"]);
    expect(numbersIn("2.5%")).toEqual(["2.5"]);
    expect(numbersIn("1,600.50")).toEqual(["1600.5"]);
  });

  it("does not merge a day and a year, or items of a list", () => {
    expect(numbersIn("on 14 2026")).toEqual(["14", "2026"]);
    expect(numbersIn("steps 3, 4 and 5")).toEqual(["3", "4", "5"]);
  });

  it("reads number words in English, Finnish and Swedish", () => {
    expect(numbersIn("two months")).toEqual(["2"]);
    expect(numbersIn("kolmen kuukauden kuluessa")).toEqual(["3"]);
    expect(numbersIn("inom två veckor")).toEqual(["2"]);
  });

  it("keeps single digits and never finds a number inside another", () => {
    expect(numbersIn("within 2 days")).toEqual(["2"]);
    expect(numbersIn("in 2026 call 12")).not.toContain("2");
  });

  it("splits a hyphen from a figure", () => {
    expect(numbersIn("a 3-month period")).toEqual(["3"]);
    expect(numbersIn("2026-11-14")).toEqual(["2026", "11", "14"]);
  });
});

describe("tokens", () => {
  it("gives units one spelling across languages", () => {
    expect(tokens("within 3 months")).toEqual(["within", "3", "month"]);
    expect(tokens("kolmen kuukauden kuluessa")).toEqual(["3", "month", "within"]);
    expect(tokens("inom tre månader")).toEqual(["within", "3", "month"]);
  });

  it("gives deadline phrases one spelling", () => {
    expect(tokens("no later than two months before the leave starts")).toEqual(["latest", "2", "month", "before", "leave", "starts"]);
    expect(tokens("prior to the move")).toEqual(["before", "move"]);
  });

  it("separates a figure from its sign", () => {
    expect(tokens("35%")).toEqual(["35", "%"]);
    expect(tokens("€1,600")).toEqual(["€", "1600"]);
    expect(tokens("150 euroa")).toEqual(["150", "€"]);
  });
});

describe("isNumber", () => {
  it("accepts figures and dotted dates only", () => {
    expect(isNumber("1600")).toBe(true);
    expect(isNumber("2.5")).toBe(true);
    expect(isNumber("14.11.2026")).toBe(true);
    expect(isNumber("14a")).toBe(false);
    expect(isNumber("month")).toBe(false);
  });
});

describe("includesWhole", () => {
  const has = (hay: string, needle: string) => includesWhole(normalise(hay), normalise(needle));

  it("finds whole words and whole numbers", () => {
    expect(has("You are able to apply within 2 months.", "able to apply")).toBe(true);
    expect(has("You are able to apply within 2 months.", "2 months")).toBe(true);
  });

  it("does not find a part of a word or of a number", () => {
    expect(has("You are unable to apply.", "able to apply")).toBe(false);
    expect(has("within 12 months", "2 months")).toBe(false);
    expect(has("up to 1 600 euros", "600 euros")).toBe(false);
    expect(has("anything", "")).toBe(false);
  });
});

describe("figuresIn", () => {
  it("returns periods and amounts in the text's own words", () => {
    expect(figuresIn("The lessee must be notified two months in advance.")).toEqual(["two months in advance"]);
    expect(figuresIn("Submit a claim for rectification within 30 days.")).toEqual(["within 30 days"]);
    expect(figuresIn("Omavastuu on 150 euroa vuodessa.")).toEqual(["150 euroa"]);
    expect(figuresIn("The grant amounts to EUR 210.")).toEqual(["EUR 210"]);
    expect(figuresIn("The fee is €1,600.50 or 25.5% of income.")).toEqual(["€1,600.50", "25.5%"]);
  });

  it("ignores years, phone numbers and section numbers", () => {
    expect(figuresIn("In 2026 the rules change. Call 112. See section 14 of the act.")).toEqual([]);
  });
});
