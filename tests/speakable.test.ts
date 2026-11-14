import { describe, expect, it } from "vitest";
import { SPEAKABLE_LIMIT, speakable } from "@/lib/speech";

describe("speakable", () => {
  it("drops links, markdown and source numbers", () => {
    const reply = "**Register first** at the city [1]. Case file: https://example.org/c/abc123\n\n- Then tell Kela.";
    expect(speakable(reply)).toBe("Register first at the city. Case file: \n- Then tell Kela.");
  });

  it("cuts a long reply after the last whole sentence that fits", () => {
    const reply = "This is one full sentence. ".repeat(60);
    const spoken = speakable(reply);
    expect(spoken.length).toBeLessThanOrEqual(SPEAKABLE_LIMIT);
    expect(spoken.endsWith(".")).toBe(true);
  });

  it("returns an empty string for a reply that is only a link", () => {
    expect(speakable("https://example.org/only")).toBe("");
  });
});
