import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// The extension's files are plain browser scripts. They also export themselves for these tests.
const require = createRequire(import.meta.url);
const { AIDaddyGate } = require("../extension/gate.js");
const { AIDADDY_OFFICIAL_HOSTS } = require("../extension/official-hosts.js");

const settings = { paused: false, pausedHosts: [] as string[], country: "FI" };
const page = (over: Record<string, unknown> = {}) => ({
  url: "https://www.kela.fi/maternity-grant",
  title: "Maternity grant | Kela",
  heading: "Maternity grant",
  text: "You can apply for the maternity grant when your pregnancy has lasted 154 days.",
  fields: [],
  hasPassword: false,
  hasCard: false,
  ...over,
});

describe("the extension's local gate", () => {
  it("wakes on an official page about a benefit, and knows its country", () => {
    const verdict = AIDaddyGate.decide(page(), settings, AIDADDY_OFFICIAL_HOSTS);
    expect(verdict).toMatchObject({ read: true, relevant: true, country: "FI" });
  });

  it("treats a subdomain of an official site as that site", () => {
    expect(AIDaddyGate.official("asiointi.kela.fi", AIDADDY_OFFICIAL_HOSTS)).toMatchObject({ host: "kela.fi", country: "FI" });
  });

  it("stays quiet on an ordinary page", () => {
    const verdict = AIDaddyGate.decide(
      page({ url: "https://www.youtube.com/watch?v=1", title: "Cat video", heading: "", text: "A cat falls off a sofa." }),
      settings,
      AIDADDY_OFFICIAL_HOSTS,
    );
    expect(verdict).toMatchObject({ read: true, relevant: false });
  });

  it("wakes on an application form outside the official list", () => {
    const verdict = AIDaddyGate.decide(
      page({
        url: "https://daycare.example.fi/apply",
        title: "Daycare application",
        heading: "Apply for a place",
        text: "Send the application four months before the need begins.",
        fields: [{ label: "Child's name" }, { label: "Start date" }],
      }),
      settings,
      AIDADDY_OFFICIAL_HOSTS,
    );
    expect(verdict).toMatchObject({ relevant: true, country: "FI" });
  });

  it("never reads a page with a password or a payment field", () => {
    expect(AIDaddyGate.decide(page({ hasPassword: true }), settings, AIDADDY_OFFICIAL_HOSTS).read).toBe(false);
    expect(AIDaddyGate.decide(page({ hasCard: true }), settings, AIDADDY_OFFICIAL_HOSTS).read).toBe(false);
  });

  it("does not read when paused, or paused on this site", () => {
    expect(AIDaddyGate.decide(page(), { ...settings, paused: true }, AIDADDY_OFFICIAL_HOSTS).read).toBe(false);
    expect(AIDaddyGate.decide(page(), { ...settings, pausedHosts: ["kela.fi"] }, AIDADDY_OFFICIAL_HOSTS).read).toBe(false);
  });

  it("does not read browser pages", () => {
    expect(AIDaddyGate.decide(page({ url: "chrome://settings" }), settings, AIDADDY_OFFICIAL_HOSTS).read).toBe(false);
  });

  it("writes a question that names the page and its form", () => {
    const question = AIDaddyGate.question(page({ fields: [{ label: "Due date" }, { label: "Bank" }] }));
    expect(question).toContain("kela.fi");
    expect(question).toContain("Maternity grant");
    expect(question).toContain("Due date, Bank");
    expect(question.length).toBeLessThanOrEqual(1400);
  });
});

describe("filling a form", () => {
  const profile = { givenName: "Anna", familyName: "Virtanen", email: "anna@example.com", city: "Espoo", postcode: "02100" };

  it("recognises fields in English and Finnish", () => {
    expect(AIDaddyGate.fieldKind({ type: "text", label: "Etunimi" })).toBe("givenName");
    expect(AIDaddyGate.fieldKind({ type: "text", autocomplete: "family-name" })).toBe("familyName");
    expect(AIDaddyGate.fieldKind({ type: "email", name: "email" })).toBe("email");
    expect(AIDaddyGate.fieldKind({ type: "text", label: "Postinumero" })).toBe("postcode");
    expect(AIDaddyGate.fieldKind({ type: "text", label: "Full name" })).toBe("fullName");
  });

  it("never fills an identity number, a bank account, a password or a code", () => {
    expect(AIDaddyGate.fieldKind({ type: "text", label: "Henkilötunnus" })).toBeNull();
    expect(AIDaddyGate.fieldKind({ type: "text", label: "Bank account (IBAN)" })).toBeNull();
    expect(AIDaddyGate.fieldKind({ type: "password", label: "Password" })).toBeNull();
    expect(AIDaddyGate.fieldKind({ type: "text", label: "Card name" })).toBeNull();
  });

  it("takes values from the saved profile, and nothing when the profile is empty", () => {
    expect(AIDaddyGate.profileValue("fullName", profile)).toBe("Anna Virtanen");
    expect(AIDaddyGate.profileValue("city", profile)).toBe("Espoo");
    expect(AIDaddyGate.profileValue("phone", profile)).toBe("");
  });
});

describe("source links", () => {
  it("opens the page at the quoted sentence", () => {
    const link = AIDaddyGate.highlightUrl("https://www.kela.fi/maternity-grant", "You can apply for the maternity grant when your pregnancy has lasted 154 days.");
    expect(link).toContain("#:~:text=You%20can%20apply%20for%20the,");
  });
});
