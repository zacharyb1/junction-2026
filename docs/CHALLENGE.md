# Challenge: The Internet Butler / Your Personal Assistant (Exa)

Track: Agentic AI. Chosen Fri 13 Nov 2026.

## Challenge text (short)
Build an agent that takes tedious tasks in people's lives off their hands. It should find what matters across the web, work out what needs to happen, and get the task as close to done as it can, leaving the final approval to the user. Demo on a real case.

Examples they name: is a rent increase legal, which benefits a family qualifies for, planning occasions, errands, travel disruption.

## Judging criteria (20% each, verbatim headings)
1. **Use of Exa**: retrieve information that could not have come from a model's training data alone.
2. **Usefulness**: to a specific group of real people.
3. **Clarity**: in showing sources.
4. **Originality**: how original the idea is.
5. **Working implementation**: the demo works on live queries, including ones the judges try themselves.

## Prizes
- 1st: $2,500 cash, $5,000 Exa credits, hoodie each, TRMNL dashboard.
- 2nd: $1,500 cash, $3,000 credits, hoodie each, macropad.
- 3rd: $500 cash, $1,000 credits, hoodie each.

## What Exa provides
- $50 credits per person through a promo code (removed from this public repo after the event), redeemed at dashboard.exa.ai/billing.
- Search API (fast, balanced, deep), Contents API (text, highlights, summaries, subpages).
- Filters by date, domain, category. Structured JSON output. Past versions of pages.
- Websets, Monitors, hosted MCP server, Python and JS SDKs. Demos at demos.exa.ai.
- Engineers on site, Discord channel. Workshop Sat 16:30 to 17:00, Loft, 4th floor.

## Our idea
- **One-liner:** The butler that lives in your family group chat. It overhears a life event, digs through the live web with Exa, and comes back with a sourced plan, deadlines and drafts. You approve with one tap.
- **User:** international families in Finland, who handle Kela, Vero, Migri and landlords in a language they do not read. The engine works for any country, which is what judges will test.
- **Wow moment:** someone types "I'm pregnant" in the family chat. Nobody asked the bot anything. A minute later it posts the plan with money, deadlines and who does what, every line linked to an official page with the quoted sentence.
- **Why us:** the team are internationals living in Finland. We have done this paperwork in a foreign language.

## How each criterion is covered
| Criterion | What we show |
|---|---|
| Use of Exa | Date and domain filtered search, structured output, page contents for quote checks, change watch. A badge where the live web contradicted the model's memory. |
| Usefulness | One concrete group, one real case end to end, deadlines turned into reminders, drafts ready to send. |
| Clarity | Every claim has a number, link, quoted sentence, page date, fetch time and a "quote verified" mark. Unverified items are listed as such. |
| Originality | Ambient trigger in a group chat, case file, verified quotes, memory versus web. |
| Working | Judges scan a QR code and try their own life. A 20-scenario scorecard backs the claim. |

## Rejected along the way
- Hostinger, Cala, S-Pankki, Valio: excluded by the team, see `docs/DECISIONS.md`.
- AfterQuery teaching environment: strong fit, kept as the idea we did not take. Risk was an unproven gap.
- Exa funding scout for founders: replaced by the family butler, which fits the brief's "people's lives" more directly.
