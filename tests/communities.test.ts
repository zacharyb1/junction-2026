import { describe, expect, it } from "vitest";
import { groundCommunity, kindOf } from "@/lib/engine/communities";

describe("kindOf", () => {
  it("trusts the address over the model", () => {
    expect(kindOf("https://www.facebook.com/groups/helsinkiparents", "Forum")).toBe("Facebook group");
    expect(kindOf("https://www.reddit.com/r/Finland/comments/abc", "Blog")).toBe("Reddit");
    expect(kindOf("https://areena.yle.fi/podcastit/1-123", "Other")).toBe("Podcast");
    expect(kindOf("https://www.vauva.fi/keskustelu/123", "Other")).toBe("Forum");
  });

  it("uses the model's kind for other sites", () => {
    expect(kindOf("https://example.com/episode-12", "podcast")).toBe("Podcast");
  });
});

describe("groundCommunity", () => {
  const PAGE = `Uniongelmat taaperolla
Meidän 2-vuotias heräilee joka yö kolmen aikaan, mikä on auttanut teillä?
Kokeilimme iltarutiinia ja se auttoi parissa viikossa.`;
  const url = "https://www.vauva.fi/keskustelu/4567/uniongelmat";

  it("keeps a thread whose line is on its page", () => {
    const c = groundCommunity({ title: "Uniongelmat taaperolla", kind: "Forum", quote: "Kokeilimme iltarutiinia ja se auttoi parissa viikossa.", url }, PAGE);
    expect(c).toMatchObject({ kind: "Forum", site: "vauva.fi" });
  });

  it("drops a thread whose line is not on its page", () => {
    expect(groundCommunity({ title: "Sleep", kind: "Forum", quote: "Melatonin fixed everything for us within one night.", url }, PAGE)).toBeNull();
  });
});
