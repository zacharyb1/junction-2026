import { describe, expect, it } from "vitest";
import { addDays, deliveryDays, GiftInput, giftQueries, groundIdea, MAX_ATTEMPTS, priceValue } from "@/lib/engine/gifts";

describe("priceValue", () => {
  it("reads European and English prices", () => {
    expect(priceValue("24,90 €")).toBe(24.9);
    expect(priceValue("€130.00")).toBe(130);
    expect(priceValue("1 234,50 €")).toBe(1234.5);
  });

  it("is null without a figure", () => {
    expect(priceValue("Ask for price")).toBeNull();
  });
});

describe("giftQueries", () => {
  it("asks with all clues first, then one clue at a time", () => {
    const queries = giftQueries({ clues: ["his chalk bag ripped", "goes bouldering", "follows climbing gyms"] }, "Finland");
    expect(queries).toHaveLength(MAX_ATTEMPTS);
    expect(queries[0]).toContain("his chalk bag ripped, goes bouldering, follows climbing gyms");
    expect(queries[1]).toContain("his chalk bag ripped");
    expect(queries[1]).not.toContain("goes bouldering");
  });

  it("asks only as often as there are different questions", () => {
    expect(giftQueries({ clues: ["loves tea"] }, "Finland")).toHaveLength(2);
  });

  it("asks a prompt as written first, then two other ways", () => {
    const queries = giftQueries({ prompt: "climbing chalk bag under 40 euros" }, "Finland");
    expect(queries).toHaveLength(MAX_ATTEMPTS);
    expect(queries[0]).toBe("climbing chalk bag under 40 euros");
    expect(new Set(queries).size).toBe(MAX_ATTEMPTS);
  });
});

describe("GiftInput", () => {
  it("accepts a prompt alone", () => {
    expect(GiftInput.safeParse({ prompt: "climbing chalk bag under 40 euros" }).success).toBe(true);
  });

  it("accepts a person with clues", () => {
    expect(GiftInput.safeParse({ recipient: "Mikko", clues: ["goes bouldering"] }).success).toBe(true);
  });

  it("refuses a request with neither", () => {
    expect(GiftInput.safeParse({ recipient: "Mikko" }).success).toBe(false);
  });
});

const PAGE = `Black Diamond Mojo chalk bag
Mojo Chalk Bag hinta 24,90 € sis. alv.
Toimitus 1-3 arkipäivässä. Ilmainen toimitus yli 50 € tilauksiin.
A classic chalk bag with a stiff rim and a brush holder.`;

const URL = "https://www.example-shop.fi/mojo-chalk-bag";

describe("deliveryDays", () => {
  it("takes the longest time in a range", () => {
    expect(deliveryDays("Delivery in 2–4 working days.")).toEqual({ days: 4, working: true });
  });

  it("reads Finnish working days", () => {
    expect(deliveryDays("Toimitus 1-3 arkipäivässä.")).toEqual({ days: 3, working: true });
  });

  it("reads calendar days", () => {
    expect(deliveryDays("Ships within 5 days.")).toEqual({ days: 5, working: false });
  });

  it("reads shipping and sending sentences", () => {
    expect(deliveryDays("Shipped with DHL GoGreen, 2–4 business days.")).toEqual({ days: 4, working: true });
    expect(deliveryDays("We will send this product in 2 days.")).toEqual({ days: 2, working: false });
  });

  it("ignores a number of days that is not about delivery", () => {
    expect(deliveryDays("You have 30 days to return the product.")).toBeNull();
  });

  it("is null when no number of days is given", () => {
    expect(deliveryDays("Fast delivery to your door.")).toBeNull();
    expect(deliveryDays("Free delivery over 50 €.")).toBeNull();
  });
});

describe("addDays", () => {
  it("skips the weekend for working days", () => {
    // Saturday plus 3 working days is Wednesday.
    expect(addDays("2026-11-14", 3, true)).toBe("2026-11-18");
  });

  it("counts every day for calendar days", () => {
    expect(addDays("2026-11-14", 3, false)).toBe("2026-11-17");
  });
});

describe("groundIdea", () => {
  const idea = {
    name: "Mojo Chalk Bag",
    why: "his chalk bag ripped",
    price: "24,90 €",
    priceQuote: "Mojo Chalk Bag hinta 24,90 € sis. alv.",
    delivery: "Toimitus 1-3 arkipäivässä.",
    url: URL,
  };

  it("keeps a product whose price and delivery are on its page", () => {
    const kept = groundIdea(idea, PAGE, "2026-11-14", "2026-11-20");
    expect(kept).toMatchObject({
      name: "Mojo Chalk Bag",
      price: "24,90 €",
      shop: "example-shop.fi",
      delivery: "Toimitus 1-3 arkipäivässä.",
      arrivesBy: "2026-11-18",
      late: false,
    });
  });

  it("marks a product that arrives after the occasion as late", () => {
    expect(groundIdea(idea, PAGE, "2026-11-14", "2026-11-17")?.late).toBe(true);
  });

  it("drops a product whose price is not on its page", () => {
    expect(groundIdea({ ...idea, price: "19,90 €", priceQuote: "Mojo Chalk Bag hinta 19,90 € sis. alv." }, PAGE, "2026-11-14")).toBeNull();
  });

  it("drops a product over the budget", () => {
    expect(groundIdea(idea, PAGE, "2026-11-14", undefined, 20)).toBeNull();
    expect(groundIdea(idea, PAGE, "2026-11-14", undefined, 25)?.price).toBe("24,90 €");
  });

  it("drops a product when its page was not read", () => {
    expect(groundIdea(idea, undefined, "2026-11-14")).toBeNull();
  });

  it("keeps the product but no delivery date when the page states no delivery time", () => {
    const kept = groundIdea({ ...idea, delivery: "Express delivery tomorrow guaranteed." }, PAGE, "2026-11-14", "2026-11-20");
    expect(kept?.price).toBe("24,90 €");
    expect(kept?.arrivesBy).toBeUndefined();
    expect(kept?.late).toBeUndefined();
  });
});
