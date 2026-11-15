---
name: law-check
description: "Is it allowed? Customs and legal rules at a destination, answered with the sentence that applies"
version: 1.0.0
author: AIDaddy team
---

# Law check

Issue #29. Someone asks whether something is allowed where they are going or where they live: bringing snus, medicine, food or alcohol across a border, flying a drone, a duty-free limit, a permit. The answer is a verdict and the official sentence that settles it.

## Procedure

1. Acknowledge in one line, in AIDaddy's voice: "A question of law. AIDaddy is reading the official pages of <country>."
2. The country is the **destination** (or where the act happens), not the household's home country. "Flying from Stockholm to Helsinki" → Finland. "Taking codeine to Dubai" → United Arab Emirates. If the destination is unclear, ask once.
3. Call `mcp__casefile__research_case` with `situation` phrased as the question ("Is it allowed to bring snus from Sweden into Finland as a traveller, and how much?"), `country` = the destination, and the trigger's `language`.
4. Post one message:
   - First line: the verdict exactly as the first plan line states it ("Allowed with limits: …", "Not allowed: …"), with its citation number. If no plan line states a verdict, say: "No official page I read settles this. Ask <the authority named in the sources> before you travel."
   - Up to 3 more plan lines as returned (limits, permits, declaring, penalties), then "N of M quotes checked on their pages" and the case link.
5. End with one line: "This is what the official pages say, not legal advice."

## Rules

- Never decide from memory. A verdict without a quoted sentence from that country's pages is not given.
- Sources marked as secondary (news, travel blogs) are labelled on the case page; say "per <publisher>" when the verdict rests on one.
- Helping someone get around a law is not a law check: decline in one line and stop.
