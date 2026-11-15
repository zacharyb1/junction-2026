import { describe, expect, it } from "vitest";
import { advance, NO_PROGRESS } from "@/components/try-progress";
import { messages } from "@/lib/engine/messages";
import type { EngineEvent } from "@/lib/engine/research";

/**
 * The first look: Exa's lite search, back in well under a second while the structured searches run. It reaches the
 * page as one more search row that names the sites it found. Measured live on Sun 15 Nov: 0.7 s against about
 * 5 s for the structured searches of the same question.
 */
const look = (status: "running" | "done", hosts: string[] = []): EngineEvent => ({
  type: "search",
  focus: "first look",
  web: "official",
  status,
  steps: 0,
  pages: hosts.length,
  tookMs: status === "done" ? 705 : 0,
  ms: status === "done" ? 707 : 2,
  hosts,
});

describe("the first look on the research timeline", () => {
  it("is one row, replaced when the lite search is back, and keeps the sites it found", () => {
    let p = advance(NO_PROGRESS, look("running"));
    p = advance(p, { type: "search", focus: "actions and deadlines", web: "official", status: "running", steps: 0, pages: 0, tookMs: 0, ms: 5 });
    p = advance(p, look("done", ["kkv.fi", "infofinland.fi", "oikeus.fi"]));
    expect(p.searches).toHaveLength(2);
    expect(p.searches[0]).toMatchObject({ focus: "first look", status: "done", steps: 0, hosts: ["kkv.fi", "infofinland.fi", "oikeus.fi"] });
    expect(p.searches[1]).toMatchObject({ focus: "actions and deadlines", status: "running" });
  });
});

describe("the first look in the research trail", () => {
  it("says what it is, how many pages, how fast and where, in English and Finnish", () => {
    expect(messages("en").firstLookDone(5, "0.7", "kkv.fi, infofinland.fi")).toBe(
      "First look with Exa's lite search: 5 pages in 0.7 s (kkv.fi, infofinland.fi)",
    );
    expect(messages("en").firstLookDone(1, "0.4", "kela.fi")).toBe("First look with Exa's lite search: 1 page in 0.4 s (kela.fi)");
    expect(messages("fi").firstLookDone(5, "0.7", "kela.fi")).toBe("Ensisilmäys Exan lite-haulla: 5 sivua 0.7 sekunnissa (kela.fi)");
    expect(messages("fi").firstLook).toBe("ensisilmäys");
  });
});
