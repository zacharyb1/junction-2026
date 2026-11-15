import { describe, expect, it } from "vitest";
import { groundHelper } from "@/lib/engine/helpers";

const PAGE = `Putkimiehet Oy – LVI-palvelut Helsingissä
Vuotava hana? Korjaamme sen nopeasti.
Hinnasto: Käyntimaksu 49 €, työ 65 €/h.
Soita 09 123 4567 tai lähetä viesti.`;
const url = "https://www.putkimiehet.example/hinnasto";

describe("groundHelper", () => {
  it("keeps a company with the phone and price its page shows", () => {
    const h = groundHelper({ name: "Putkimiehet Oy", service: "plumbing", phone: "09 123 4567", price: "49 €", priceQuote: "Hinnasto: Käyntimaksu 49 €, työ 65 €/h.", url }, PAGE);
    expect(h).toMatchObject({ name: "Putkimiehet Oy", phone: "09 123 4567", price: "49 €", site: "putkimiehet.example" });
  });

  it("drops a phone number and a price the page does not show, but keeps the company", () => {
    const h = groundHelper({ name: "Putkimiehet Oy", service: "plumbing", phone: "040 999 8888", price: "39 €", priceQuote: "Käyntimaksu 39 €.", url }, PAGE);
    expect(h).toMatchObject({ name: "Putkimiehet Oy", phone: "", price: "", priceQuote: "" });
  });

  it("drops a company its page does not name", () => {
    expect(groundHelper({ name: "Vesivelho Ab", service: "plumbing", url }, PAGE)).toBeNull();
  });
});
