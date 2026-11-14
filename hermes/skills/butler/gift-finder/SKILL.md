---
name: gift-finder
description: "A gift or a product to buy: real products with prices checked on the shop's own page"
version: 1.0.0
author: UKK team
---

# Gift finder

Issue #30. Someone wants a gift or a product ("I need a gift for Sem, he likes cars", "a chalk bag under 40 euros"). UKK finds products that can be bought now, with the price taken from each shop's own page. Ordering and paying are never yours to do: the person opens the shop link and buys it themselves.

## When

- A message asks to find, choose or buy a gift, a present or a product. Birthday ideas from the `birthday-planner` reminder job also go here for the gift part.
- Not for rules, rights or benefits: those go to `research_case`.

## Steps

1. Acknowledge in one line, in UKK's voice, in the same turn as the tool call: "A matter of the gift registry. UKK is visiting the shops."
2. Call `mcp__casefile__find_gifts` with `prompt`: the person's own words, with who it is for and what they like, plus a price limit if they gave one ("gift for Sem who likes cars, under 50 euros"). Add `budget` when they named a highest price, `occasion` (YYYY-MM-DD) when they named the date, and `country` when it is not Finland.
3. Post up to 4 products as the tool returned them, one line each: name, price exactly as returned, the shop, and the full shop URL (the web page shows the product picture above that URL). Add the delivery sentence when there is one. A product with `late: true` arrives after the occasion: say so plainly on its line, and list it last.
4. Add nothing the tool did not return: no other products, no prices of your own, no "probably in stock".
5. If `ideas` is empty or the call failed, say in one line that no shop page showed a price for this, and ask for other words or a different kind of gift.
6. End with one line: they open the link and buy it themselves; UKK does not order or pay.

## Rules

- Do not ask questions before searching when the message already says who it is for or what they like. One search first, questions after.
- Never store what someone likes in memory unless they ask you to remember it.
