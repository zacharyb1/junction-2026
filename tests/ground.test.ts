import { describe, expect, it } from "vitest";
import { contains, pageNumbers, sharedWords, snapQuote, supportFor, unbackedNumbers } from "@/lib/engine/ground";

const PAGE = `Household deduction
You can deduct 35 % of the work, up to 1 600 euros per person in 2025. The credit is granted for work done at home.
You must notify your employer no later than two months before the leave starts. The notice may be given later for a good reason.
Hakemus on tehtävä kolmen kuukauden kuluessa lapsen syntymästä. Tuki on 1 234,50 euroa kuukaudessa.
Refunds are paid within 7 days after the request. You do not need to apply before 14 days have passed.
The year 2026 brings changes. Call 12 for help with section 20 of the act within days.
The allowance is paid for 3 weeks. The fee is 30 euros and it is due in November.`;

const LIST = `Compensation depends on the distance of the flight.
250 € for flights of up to 1 500 km
400 € for flights between 1 500 and 3 500 km
600 € for flights of more than 3 500 km
Meals and refreshments are offered while you wait.`;

describe("snapQuote", () => {
  it("keeps a quote that is on the page word for word", () => {
    expect(snapQuote("The credit is granted for work done at home.", PAGE)).toEqual({
      quote: "The credit is granted for work done at home.",
      snapped: false,
    });
  });

  it("replaces a quote with a changed number by the page's real sentence", () => {
    const result = snapQuote("You can deduct 40 % of the work, up to 1 600 euros per person in 2025.", PAGE);
    expect(result?.snapped).toBe(true);
    expect(result?.quote).toContain("35 %");
    expect(result?.quote).not.toContain("40 %");
  });

  it("replaces a quote with a dropped word by the page's real sentence", () => {
    const result = snapQuote("You need to apply before 14 days have passed.", PAGE);
    // The page's sentence, with its "not", takes the place of the model's version.
    expect(result?.snapped).toBe(true);
    expect(result?.quote).toContain("You do not need to apply before 14 days have passed.");
  });

  it("returns nothing when no sentence on the page is close", () => {
    expect(snapQuote("Dogs must be registered with the municipality every spring.", PAGE)).toBeNull();
  });

  it("only ever returns text that is on the page", () => {
    for (const quote of ["You can deduct 35 % of the work", "notify your employer two months before", "Refunds are paid within 7 days"]) {
      const result = snapQuote(quote, PAGE);
      expect(result).not.toBeNull();
      expect(contains(PAGE, result!.quote)).toBe(true);
    }
  });
});

describe("supportFor", () => {
  it("finds an amount and a deadline in one sentence", () => {
    expect(supportFor("35% up to €1,600", PAGE)?.sentence).toContain("35 %");
    expect(supportFor("2 months before the leave starts", PAGE)?.sentence).toContain("two months before");
  });

  it("rejects a changed number", () => {
    expect(supportFor("40% up to €1,600", PAGE)).toBeNull();
    expect(supportFor("3 months before the leave starts", PAGE)).toBeNull();
  });

  it("does not find a single digit inside a longer number", () => {
    expect(supportFor("within 2 days", PAGE)).toBeNull();
  });

  it("rejects a deadline that points the other way in time", () => {
    expect(supportFor("14 days after applying", PAGE)).toBeNull();
    expect(supportFor("within 7 days after the request", PAGE)).not.toBeNull();
  });

  it("does not take a figure from a neighbouring sentence", () => {
    // 7 is in one sentence and "apply" in the next. Together they would look like "apply within 7 days".
    expect(supportFor("apply within 7 days", PAGE, 0.9)).toBeNull();
  });

  it("wants the unit to sit by its figure", () => {
    expect(supportFor("paid for 3 weeks", PAGE)).not.toBeNull();
    expect(supportFor("paid for 3 years", PAGE)).toBeNull();
    expect(supportFor("the fee is 30 euros", PAGE)).not.toBeNull();
    expect(supportFor("the fee is due in 30 days", PAGE)).toBeNull();
  });

  it("matches an English value against a Finnish sentence by number and unit", () => {
    expect(supportFor("within 3 months of the birth", PAGE, 0.5)).not.toBeNull();
    expect(supportFor("1234.50 euros per month", PAGE, 0.5)).not.toBeNull();
  });

  it("accepts tiered amounts on list lines that follow each other", () => {
    const support = supportFor("250 €, 400 € or 600 €", LIST);
    expect(support?.sentence.startsWith("250 € for flights")).toBe(true);
    expect(support?.sentence).toContain("600 €");
  });

  it("rejects tiers that are not all on the page", () => {
    expect(supportFor("250 €, 400 € or 800 €", LIST)).toBeNull();
  });
});

describe("unbackedNumbers", () => {
  it("lists figures that no page has", () => {
    expect(unbackedNumbers("Claim 40 % in 2025, up to 1600 euros", pageNumbers(PAGE))).toEqual(["40"]);
    expect(unbackedNumbers("Claim 35 % in 2025, up to 1 600 euros", pageNumbers(PAGE))).toEqual([]);
  });

  it("accepts figures the family gave", () => {
    expect(unbackedNumbers("Your rent rises by 15 percent", pageNumbers(PAGE), new Set(["15"]))).toEqual([]);
  });
});

describe("contains and sharedWords", () => {
  it("contains only whole words", () => {
    expect(contains("You are unable to apply.", "able to apply")).toBe(false);
    expect(contains("You are able to apply.", "Able to apply")).toBe(true);
  });

  it("counts longer shared words, not numbers", () => {
    expect(sharedWords("You must notify your employer", "Notify the employer about the leave")).toBe(2);
    expect(sharedWords("within 30 days", "30 days after")).toBe(0);
  });
});
