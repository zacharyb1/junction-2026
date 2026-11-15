---
name: product-finder
description: "A product to buy, a gift or anything else: real products with prices checked on the shop's own page"
version: 2.0.0
author: AIDaddy team
---

# Product finder

Issue #30, widened from gifts to any product. Someone wants to buy something ("I need a gift for Sem, he likes cars", "a cheap electric kettle", "winter boots for a 5-year-old under 60 euros"). AIDaddy finds products that can be bought now, with the price taken from each shop's own page. Ordering and paying are never yours to do: the person opens the shop link and buys it themselves.

## When

- A message asks to find, compare, choose or buy a product, a gift, a present or a non-prescription medicine. Birthday ideas from the `birthday-planner` reminder job also go here for the gift part.
- Not for rules, rights or benefits: those go to `research_case`.
- If the person asks you to phone someone to arrange a purchase, follow the Demo phone calls procedure in SOUL.md: confirm remembered preferences, then call only the configured test recipient. Ordering and payment are simulated. Product searches and ordinary shop links still follow the steps below.

## Steps

1. Follow SOUL's work-notice rule: the Telegram runtime announces the search; elsewhere acknowledge briefly with the first tool call.
2. Call `mcp__casefile__find_products` with `prompt`: the person's own words, with what they need, who it is for and what they like, plus a price limit if they gave one ("electric kettle under 40 euros", "gift for Sem who likes cars"). Add `budget` when they named a highest price, `occasion` (YYYY-MM-DD) when they named a date it must arrive by, and `country` when it is not Finland.
3. Post up to 6 products as the tool returned them, one line each: name, price exactly as returned, the shop, and the full shop URL (the web page shows the product picture above that URL). Add the delivery sentence when there is one. A product with `late: true` arrives after the date: say so plainly on its line, and list it last.
4. Add nothing the tool did not return: no other products, no prices of your own, no "probably in stock".
5. If `ideas` is empty or the call failed, say in one line that no shop page showed a price for this, and ask for other words.
6. End with one line: they open the link and buy it themselves; AIDaddy does not order or pay.

## Medicines

Medicines are products too ("I need painkillers", "something for hay fever", "ibuprofen 400"), with four extra rules:

- Search pharmacies: write the `prompt` as "<medicine or need>, from a Finnish online pharmacy (apteekki)". In Finland only licensed pharmacies sell medicines online.
- Post the products and prices as for anything else, and add one line: "Read the package leaflet, and ask the pharmacist if unsure. This is not medical advice."
- Never give a dose, a choice between medicines, or a judgement of symptoms. If the person asks, send them to the pharmacist or a doctor.
- A prescription-only medicine cannot be bought without a prescription: say so in one line and do not search. Chest pain, trouble breathing, a severe allergic reaction or other urgent symptoms: tell them to call 112 now. For other health worries, the medical helpline is 116117.

## Rules

- Do not ask questions before searching when the message already says what is wanted. One search first, questions after.
- Never store what someone likes or buys in memory unless they ask you to remember it.
