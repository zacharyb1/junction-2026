import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONNECTIONS } from "@/components/hud/setup-data";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("setup page connections", () => {
  it("offers the three ways AIDaddy can follow along", () => {
    expect(CONNECTIONS.map((c) => c.id)).toEqual(["telegram", "voice", "browser"]);
  });

  // A visitor must not read a new piece as one that has run in real households for a while.
  it("marks only the Telegram chat as live, and names the limits of the first versions", () => {
    expect(CONNECTIONS.filter((c) => c.status === "live").map((c) => c.id)).toEqual(["telegram"]);
    const voice = CONNECTIONS.find((c) => c.id === "voice");
    expect(voice?.limits).toMatch(/while the page is open/);
    expect(voice?.limits).toMatch(/cannot listen from a locked phone/);
    expect(CONNECTIONS.find((c) => c.id === "browser")?.limits).toMatch(/not in the Chrome Web Store/);
  });

  // The page was a mockup once. Every button now has to lead to something that exists.
  it("leads every connection to something real", () => {
    const [telegram, voice, browser] = CONNECTIONS;
    expect(telegram.action.href).toBe("https://t.me/junction_kaveri_bot?startgroup=true");
    expect(voice.action.href).toBe("/listen");
    expect(existsSync(path.join(ROOT, "src/app/listen/page.tsx"))).toBe(true);
    expect(browser.action.href).toBe("/aidaddy-extension.zip");
    expect(existsSync(path.join(ROOT, "public/aidaddy-extension.zip"))).toBe(true);
    expect(browser.steps?.length).toBeGreaterThan(0);
  });

  it("says for every connection how it is switched off", () => {
    for (const c of CONNECTIONS) expect(c.control, c.id).toMatch(/stops it|pauses it|reads nothing/);
  });
});
