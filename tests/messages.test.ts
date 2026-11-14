import { describe, expect, it } from "vitest";
import { type Messages, messages } from "@/lib/engine/messages";
import { labels } from "@/lib/i18n";

const finland = { code: "FI", name: "Finland", region: "Espoo" };

/** Every sentence the engine can write, with the same sample values in each language. */
const all = (m: Messages): string[] => [
  ...Object.values(m.focus),
  m.pinnedOpen(finland),
  m.pinnedOfficial(finland, 62),
  m.pinnedNoList(finland),
  m.searching(true, m.focus.actions),
  m.searching(false, m.focus.money),
  m.searchingNews,
  m.searchesSkipped(1, 3),
  m.searchesSkipped(2, 3),
  m.opening(1),
  m.opening(6),
  m.readBlocked(1),
  m.readBlocked(2),
  m.checking,
  m.foundNews(1),
  m.foundNews(2),
  m.building,
  m.pageNotOpened("Hae äitiysavustusta", "kela.fi"),
  m.quoteNotFound("Hae äitiysavustusta", "kela.fi"),
  m.figureNotOnPage("Hae äitiysavustusta", "kela.fi"),
  m.factNotStated("Hae äitiysavustusta", "170 €", "kela.fi"),
  m.factElsewhere("Hae äitiysavustusta", "170 €", "kela.fi"),
  m.twoFigures("35 %", 2, "40 %", 5),
  m.differentFigures("35 %", 2, "40 %", 5),
  m.sourcedPlan("Olen raskaana."),
  m.unknownCountry("Narnia"),
  m.unsupportedCountry,
  m.nothingToResearch,
  m.searchFailed("timeout"),
  m.nothingConfirmed,
];

describe("messages", () => {
  it("gives Finnish for a Finnish request and English for every other language", () => {
    const finnish = messages("fi");
    for (const language of ["fi", "FI", "fi-FI", "Finnish"]) expect(messages(language)).toBe(finnish);
    const english = messages("en");
    expect(english).not.toBe(finnish);
    for (const language of ["en", "en-GB", "sv", "de", "es", "fr", "et", "uk", "xx"]) expect(messages(language)).toBe(english);
  });

  // Other code, the landing page and stored cases carry these exact sentences.
  it("keeps the English wording character for character", () => {
    const m = messages("en");
    expect(m.focus).toEqual({
      actions: "actions and deadlines",
      money: "money and entitlements",
      apply: "how and where to apply",
      exceptions: "exceptions and missed deadlines",
      options: "options that fit",
      details: "practical details",
      rule: "what the law or customs rule says",
      conditions: "limits, permits and penalties",
    });
    expect(m.pinnedOpen(finland)).toBe(
      "Pinned to Espoo, Finland. This is a choice, not a rule, so searching the open web and labelling each source.",
    );
    expect(m.pinnedOpen({ code: "FI", name: "Finland" })).toBe(
      "Pinned to Finland. This is a choice, not a rule, so searching the open web and labelling each source.",
    );
    expect(m.pinnedOfficial(finland, 62)).toBe("Pinned to Finland. Searching 62 official sites first.");
    expect(m.pinnedNoList(finland)).toBe(
      "Pinned to Finland. No official site list for this country yet, so searching the open web and labelling each source.",
    );
    expect(m.searching(true, "actions and deadlines")).toBe("Exa search on official sites: actions and deadlines");
    expect(m.searching(false, "practical details")).toBe("Exa search on the open web: practical details");
    expect(m.searchingNews).toBe("Exa search on official sites: pages published in the last four months");
    expect(m.searchesSkipped(1, 3)).toBe("1 of 3 searches failed and were skipped");
    expect(m.opening(6)).toBe("Opening 6 cited pages: our own live request plus Exa Contents");
    expect(m.readBlocked(2)).toBe("Read 2 blocked pages live through the Oxylabs Web API");
    expect(m.checking).toBe("Checking every quote, amount and deadline against the page text");
    expect(m.foundNews(2)).toBe("Found 2 recent official pages on this topic");
    expect(m.building).toBe("Building the case file");

    expect(m.pageNotOpened("Apply for the grant", "kela.fi")).toBe("Apply for the grant: the cited page could not be opened (kela.fi).");
    expect(m.quoteNotFound("Apply for the grant", "kela.fi")).toBe("Apply for the grant: the quoted sentence was not found on kela.fi.");
    expect(m.figureNotOnPage("Apply for the grant", "kela.fi")).toBe(
      "Apply for the grant: this figure is not on kela.fi, so the step is left out.",
    );
    expect(m.factNotStated("Apply for the grant", "170 €", "kela.fi")).toBe(
      'Apply for the grant: "170 €" could not be matched to a sentence on the cited page (kela.fi), so it is left out.',
    );
    expect(m.factElsewhere("Apply for the grant", "170 €", "kela.fi")).toBe(
      'Apply for the grant: "170 €" is on the cited page (kela.fi), but not in a sentence about this step, so it is not shown with it.',
    );
    expect(m.twoFigures("35 %", 2, "40 %", 5)).toBe(
      'Two figures found: "35 %" [2] and "40 %" [5]. Check which one applies to you.',
    );
    expect(m.differentFigures("35 %", 2, "40 %", 5)).toBe(
      'Different figures appear: "35 %" [2] and "40 %" [5]. They may apply to different years or cases, so read both quotes.',
    );
    expect(m.sourcedPlan("We are moving to Tampere.")).toBe("Sourced plan for: We are moving to Tampere.");

    expect(m.unknownCountry("Narnia")).toBe('Unknown country "Narnia". Use an English country name or a two-letter code.');
    expect(m.unsupportedCountry).toBe("This country is not supported.");
    expect(m.nothingToResearch).toBe(
      "I could not find anything to research in that message. Describe what happened in a sentence or two, for example: “Our landlord wants to raise the rent by 15 percent from next month.”",
    );
    expect(m.searchFailed("timeout")).toBe("Exa search failed: timeout");
    expect(m.nothingConfirmed).toBe("Sources were found, but no claim could be confirmed on the cited pages.");
  });

  it("has a Finnish sentence of its own for every English one", () => {
    const english = all(messages("en"));
    const finnish = all(messages("fi"));
    expect(finnish).toHaveLength(english.length);
    finnish.forEach((sentence, i) => expect(sentence, english[i]).not.toBe(english[i]));
    // No English function word may be left in a Finnish sentence. Names of services stay: Exa, Exa Contents, Oxylabs, Web API.
    // ("on" is left out of the list: it is a Finnish word.)
    const leftover = /\b(the|and|of|to|is|are|you|your|for|not|was|were|page|pages|search|found|sites?)\b/i;
    for (const sentence of finnish) expect(sentence).not.toMatch(leftover);
  });

  it("passes titles, hosts, figures and reasons through unchanged in Finnish", () => {
    const m = messages("fi");
    for (const note of [
      m.pageNotOpened("Hae äitiysavustusta", "kela.fi"),
      m.quoteNotFound("Hae äitiysavustusta", "kela.fi"),
      m.figureNotOnPage("Hae äitiysavustusta", "kela.fi"),
    ]) {
      expect(note.startsWith("Hae äitiysavustusta: ")).toBe(true);
      expect(note).toContain("kela.fi");
    }
    for (const note of [m.factNotStated("Hae äitiysavustusta", "170 €", "kela.fi"), m.factElsewhere("Hae äitiysavustusta", "170 €", "kela.fi")]) {
      expect(note.startsWith("Hae äitiysavustusta: ")).toBe(true);
      expect(note).toContain("”170 €”");
      expect(note).toContain("kela.fi");
    }
    expect(m.sourcedPlan("Olen raskaana.")).toContain("Olen raskaana.");
    expect(m.unknownCountry("Narnia")).toContain("Narnia");
    expect(m.searchFailed("timeout")).toContain("timeout");
    expect(m.searching(true, m.focus.money)).toContain(m.focus.money);
  });

  // The engine renumbers citations in a conflict note by the form [3], and looks for it to avoid saying a conflict twice.
  it("writes citation numbers as [n] in both languages", () => {
    for (const language of ["en", "fi"]) {
      const m = messages(language);
      for (const note of [m.twoFigures("35 %", 2, "40 %", 5), m.differentFigures("35 %", 2, "40 %", 5)]) {
        expect(note.match(/\[(\d+)\]/g)).toEqual(["[2]", "[5]"]);
        expect(note).toContain("35 %");
        expect(note).toContain("40 %");
      }
    }
  });

  it("names the country in Finnish and keeps the town as written", () => {
    const m = messages("fi");
    expect(m.pinnedOfficial(finland, 62)).toBe("Maa: Suomi. Haku aloitetaan 62 virallisesta sivustosta.");
    expect(m.pinnedOpen(finland)).toContain("Espoo, Suomi");
    expect(m.pinnedNoList({ code: "SE", name: "Sweden" })).toContain("Ruotsi");
  });

  it("counts one and many correctly in Finnish", () => {
    const m = messages("fi");
    expect(m.opening(1)).toContain("1 lähdesivu ");
    expect(m.opening(6)).toContain("6 lähdesivua ");
    expect(m.foundNews(1)).toContain("1 tuore sivu ");
    expect(m.foundNews(3)).toContain("3 tuoretta sivua ");
    expect(m.searchesSkipped(1, 3)).toBe("3 hausta 1 epäonnistui, ja se ohitettiin");
    expect(m.searchesSkipped(2, 3)).toBe("3 hausta 2 epäonnistui, ja ne ohitettiin");
  });
});

describe("case page labels added with the Finnish notes", () => {
  it("shows the country in the language of the case", () => {
    expect(labels("en").country("Finland")).toBe("Finland");
    expect(labels("fi").country("Finland")).toBe("Suomi");
    expect(labels("fi").country("Sweden")).toBe("Ruotsi");
    // A name that is not an English country name stays as it was stored.
    expect(labels("fi").country("Suomi")).toBe("Suomi");
    expect(labels("fi").country("Somewhere")).toBe("Somewhere");
  });

  it("keeps the English confidence and draft words as they were stored", () => {
    const t = labels("en");
    for (const level of ["low", "medium", "high"] as const) expect(t.confidence[level]).toBe(level);
    for (const kind of ["email", "letter", "checklist"] as const) expect(t.draftKind[kind]).toBe(kind);
  });
});
