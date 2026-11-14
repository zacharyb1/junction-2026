import { describe, expect, it } from "vitest";
import { hostOf, isOfficial, resolveJurisdiction } from "@/lib/engine/jurisdiction";

describe("resolveJurisdiction", () => {
  it("resolves codes and English names", () => {
    expect(resolveJurisdiction("FI").code).toBe("FI");
    expect(resolveJurisdiction("fi").code).toBe("FI");
    expect(resolveJurisdiction("Finland", "Espoo")).toMatchObject({ code: "FI", region: "Espoo", known: true });
    expect(resolveJurisdiction("France").code).toBe("FR");
    expect(resolveJurisdiction("Germany").code).toBe("DE");
  });

  it("resolves names in the other answer languages", () => {
    expect(resolveJurisdiction("Suomi").code).toBe("FI");
    expect(resolveJurisdiction("Sverige").code).toBe("SE");
    expect(resolveJurisdiction("Deutschland").code).toBe("DE");
    expect(resolveJurisdiction("Ruotsi").code).toBe("SE");
  });

  it("resolves common aliases and a place after the country", () => {
    expect(resolveJurisdiction("UK").code).toBe("GB");
    expect(resolveJurisdiction("Scotland").code).toBe("GB");
    expect(resolveJurisdiction("USA").code).toBe("US");
    expect(resolveJurisdiction("Turkey").code).toBe("TR");
    expect(resolveJurisdiction("Czech Republic").code).toBe("CZ");
    expect(resolveJurisdiction("Finland (Espoo)").code).toBe("FI");
    expect(resolveJurisdiction("Finland, Helsinki").code).toBe("FI");
  });

  it("never returns a retired code", () => {
    for (const name of ["France", "Serbia", "Benin", "Burkina Faso", "Timor-Leste"]) {
      expect(["FX", "YU", "DY", "HV", "TP", "SU", "ZR"]).not.toContain(resolveJurisdiction(name).code);
    }
  });

  it("gives an empty code for an unknown country, never a guess", () => {
    expect(resolveJurisdiction("Atlantis").code).toBe("");
    expect(resolveJurisdiction("XX").code).toBe("");
    expect(resolveJurisdiction("EU").code).toBe("");
  });

  it("adds EU-wide official sites for member states only", () => {
    const hasEuropa = (country: string) => resolveJurisdiction(country).officialDomains.some((d) => d.endsWith("europa.eu"));
    expect(hasEuropa("FI")).toBe(true);
    expect(hasEuropa("US")).toBe(false);
  });
});

describe("isOfficial", () => {
  const fi = resolveJurisdiction("FI");
  const us = resolveJurisdiction("US");

  it("knows listed hosts and their subdomains", () => {
    expect(isOfficial("https://www.kela.fi/during-pregnancy", fi)).toBe(true);
    expect(isOfficial("https://asiointi.kela.fi/x", fi)).toBe(true);
  });

  it("knows wildcard and suffix hosts", () => {
    expect(isOfficial("https://www.sf.gov/information", us)).toBe(true);
    expect(isOfficial("https://www.gov.uk/claim", fi)).toBe(true);
    expect(isOfficial("https://commission.europa.eu/news", fi)).toBe(true);
  });

  it("does not trust a look-alike host", () => {
    expect(isOfficial("https://kela.fi.example.com/", fi)).toBe(false);
    expect(isOfficial("https://notkela.fi/", fi)).toBe(false);
    expect(isOfficial("https://example.com/kela.fi", fi)).toBe(false);
    expect(isOfficial("not a url", fi)).toBe(false);
  });

  it("reads the host without www", () => {
    expect(hostOf("https://WWW.Kela.fi/x")).toBe("kela.fi");
    expect(hostOf("nonsense")).toBe("");
  });
});
