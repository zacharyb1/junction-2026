import { describe, expect, it } from "vitest";
import { CONNECTIONS } from "@/components/hud/setup-data";

describe("setup screen connections", () => {
  it("offers the three ways UKK can follow along", () => {
    expect(CONNECTIONS.map((c) => c.id)).toEqual(["telegram", "phone", "browser"]);
  });

  // The page is a mockup. Judges must not read a concept as something that already works.
  it("marks only the Telegram chat as live", () => {
    expect(CONNECTIONS.filter((c) => c.status === "live").map((c) => c.id)).toEqual(["telegram"]);
    for (const c of CONNECTIONS.filter((c) => c.status === "concept")) {
      expect(c.whenOn, c.id).toMatch(/not built yet/i);
    }
  });

  it("adds the bot to a group through Telegram's own link", () => {
    const telegram = CONNECTIONS.find((c) => c.id === "telegram");
    expect(telegram?.action?.href).toBe("https://t.me/junction_kaveri_bot?startgroup=true");
  });
});
