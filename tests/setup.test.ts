import { describe, expect, it } from "vitest";
import { CONNECTIONS } from "@/components/hud/setup-data";

describe("setup screen connections", () => {
  it("offers the three ways AIDaddy can follow along", () => {
    expect(CONNECTIONS.map((c) => c.id)).toEqual(["telegram", "phone", "browser"]);
  });

  // Judges must not read something that is not switched on as something that already works.
  it("marks as live only what a visitor can really switch on", () => {
    expect(CONNECTIONS.filter((c) => c.status === "live").map((c) => c.id)).toEqual(["telegram", "phone"]);
    for (const c of CONNECTIONS.filter((c) => c.status !== "live")) {
      expect(c.whenOn, c.id).toMatch(/connects nothing|not built yet/i);
    }
  });

  it("starts listening on its own page, on the device where it is switched on", () => {
    const phone = CONNECTIONS.find((c) => c.id === "phone");
    expect(phone?.opens).toBe("/listen");
    expect(phone?.action).toMatchObject({ href: "/listen", internal: true });
    expect(phone?.whenOn).toMatch(/only while that page is open/i);
  });

  it("adds the bot to a group through Telegram's own link", () => {
    const telegram = CONNECTIONS.find((c) => c.id === "telegram");
    expect(telegram?.action?.href).toBe("https://t.me/junction_kaveri_bot?startgroup=true");
  });
});
