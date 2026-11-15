import { describe, expect, it } from "vitest";
import { blank, groundOpportunity, lensesFor } from "@/lib/engine/opportunities";

describe("blank", () => {
  it("treats the model's placeholders as no value", () => {
    for (const v of ['""', "Empty", "none", "N/A", "  "]) expect(blank(v)).toBe("");
    expect(blank("free admission")).toBe("free admission");
  });
});

describe("lensesFor", () => {
  it("makes one search per kind of fact the household gave", () => {
    const lenses = lensesFor({
      city: "Helsinki",
      members: ["Anna, 34", "Mikko, 36", "Sem, 6"],
      situation: ["Mikko lost his job", "renting"],
      interests: ["jazz", "bouldering"],
    });
    expect(lenses.map((l) => l.name)).toEqual(["interests", "situation", "children", "money"]);
    expect(lenses[0].query).toContain("jazz, bouldering");
    expect(lenses[0].query).toContain("Helsinki");
    expect(lenses[1].goal).toContain("Mikko lost his job");
    expect(lenses[2].query).toContain("Sem, 6");
    expect(lenses[2].query).not.toContain("Anna");
  });

  it("always looks for money people miss, even with only a city", () => {
    expect(lensesFor({ city: "Tampere" }).map((l) => l.name)).toEqual(["money"]);
  });
});

describe("groundOpportunity", () => {
  const PAGE = `Free jazz at Savoy
Savoy-teatteri offers 40 free tickets for the jazz night on 22 November 2026.
Tickets are given out on the evening, first come first served.`;
  const url = "https://www.savoyteatteri.fi/jazz-night";

  it("keeps an opportunity whose sentence and value are on its page", () => {
    const kept = groundOpportunity(
      { title: "Free jazz night at Savoy", value: "40 free tickets", why: "likes jazz", quote: "Savoy-teatteri offers 40 free tickets for the jazz night on 22 November 2026.", url },
      PAGE,
      "interests",
    );
    expect(kept).toMatchObject({ title: "Free jazz night at Savoy", value: "40 free tickets", source: "savoyteatteri.fi", lens: "interests" });
  });

  it("drops an opportunity whose quote is not on the page", () => {
    expect(groundOpportunity({ title: "Free jazz", quote: "Every visitor gets a free drink and a free ticket to the opera.", url }, PAGE, "interests")).toBeNull();
  });

  it("drops an opportunity whose value names a figure the page does not have", () => {
    expect(
      groundOpportunity({ title: "Free jazz", value: "100 free tickets", quote: "Savoy-teatteri offers 40 free tickets for the jazz night on 22 November 2026.", url }, PAGE, "interests"),
    ).toBeNull();
  });
});
