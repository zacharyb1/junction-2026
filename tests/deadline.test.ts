import { describe, expect, it } from "vitest";
import { icsFor, parseDeadline, resolveDeadline, toIso } from "@/lib/deadline";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("parseDeadline", () => {
  it("reads one clear period before a day", () => {
    expect(parseDeadline("no later than two months before the expected date of birth of the child")).toMatchObject({
      amount: 2,
      unit: "month",
      direction: "before",
    });
    expect(parseDeadline("two months in advance")).toMatchObject({ amount: 2, unit: "month", direction: "before" });
  });

  it("reads one clear period after a day", () => {
    expect(parseDeadline("within 30 days")).toMatchObject({ amount: 30, unit: "day", direction: "after" });
    expect(parseDeadline("within one month of your move")).toMatchObject({ amount: 1, unit: "month", direction: "after" });
    expect(parseDeadline("no later than one week after the move")).toMatchObject({ amount: 1, unit: "week", direction: "after" });
  });

  it("reads Finnish and Swedish phrases", () => {
    expect(parseDeadline("viimeistään kaksi kuukautta ennen laskettua aikaa")).toMatchObject({ amount: 2, unit: "month", direction: "before" });
    expect(parseDeadline("kolmen kuukauden kuluessa")).toMatchObject({ amount: 3, unit: "month", direction: "after" });
    expect(parseDeadline("inom två veckor")).toMatchObject({ amount: 2, unit: "week", direction: "after" });
  });

  it("returns nothing for anything that is not one clear period", () => {
    for (const phrase of [
      "every 4 weeks",
      "2 to 3 working days",
      "35 %",
      "EUR 210",
      "Monday to Friday 9.00–16.00",
      "as soon as possible",
      "at least 14 days after the notice",
      "before the final inspection",
    ]) {
      expect(parseDeadline(phrase), phrase).toBeNull();
    }
  });
});

describe("resolveDeadline", () => {
  it("counts months back and clamps at the end of a month", () => {
    expect(toIso(resolveDeadline({ amount: 2, unit: "month", direction: "before" }, day("2027-07-15")))).toBe("2027-05-15");
    expect(toIso(resolveDeadline({ amount: 1, unit: "month", direction: "before" }, day("2027-03-31")))).toBe("2027-02-28");
  });

  it("counts days and weeks forward", () => {
    expect(toIso(resolveDeadline({ amount: 30, unit: "day", direction: "after" }, day("2026-11-14")))).toBe("2026-12-14");
    expect(toIso(resolveDeadline({ amount: 1, unit: "week", direction: "after" }, day("2026-12-28")))).toBe("2027-01-04");
  });

  it("skips weekends for working days", () => {
    // Friday 13 Nov 2026 plus 3 working days is Wednesday 18 Nov.
    expect(toIso(resolveDeadline({ amount: 3, unit: "day", direction: "after", workingDays: true }, day("2026-11-13")))).toBe("2026-11-18");
  });
});

describe("icsFor", () => {
  const ics = icsFor({
    title: "Apply for the maternity grant; before, the due date",
    date: day("2027-05-15"),
    description: "no later than two months before the expected date of birth",
    url: "https://example.org/c/abc",
    uid: "abc-1",
    now: day("2026-11-14"),
  });

  it("is an all-day event with CRLF line ends", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270515");
    expect(ics.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
  });

  it("escapes text and carries two reminders", () => {
    // Long lines are folded with a line break and a space. Unfold before reading the text.
    expect(ics.replace(/\r\n /g, "")).toContain(String.raw`Apply for the maternity grant\; before\, the due date`);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("UID:");
  });
});
