# Gate check: keywords baseline

- Ran 2026-11-13T22:35:05.241Z, took 0.0 s
- Gate: keywords, the 9 wake patterns of Mode B in `hermes/config.snippet.yaml` plus an @kaveri mention. No model, no network
- Set: 80 messages in `eval/gate-messages.json` (53 English, 27 Finnish), 30 triggers and 50 that need silence
- A wake is any label other than `none`. No usable answer counts as silence
- The set is dense with hard cases on purpose. A real family chat is mostly plain small talk, so read these as counts on this set, not as rates

## The two numbers

| Gate | Missed triggers | False wakes |
|---|---|---|
| **keywords** | **10 of 30** | **11 of 50** |

| Language | Messages | Missed triggers | False wakes |
|---|---|---|---|
| English | 53 | 7 of 20 | 8 of 33 |
| Finnish | 27 | 3 of 10 | 3 of 17 |

## Per label

| Label | Messages | Precision | Recall | Woke |
|---|---|---|---|---|
| `life_event` | 15 | n/a | n/a | 9 of 15 |
| `official_document` | 8 | n/a | n/a | 6 of 8 |
| `addressed_to_bot` | 7 | n/a | n/a | 5 of 7 |
| any trigger | 30 | 20 of 31 (65%) | 20 of 30 (67%) | 20 of 30 |
| `none` | 50 | 39 of 49 (80%) | 39 of 50 (78%) | 11 of 50 |

Precision and recall count the exact label. "Woke" counts any label other than `none`. This gate only says wake or silent, so it has neither for the three trigger labels.

## Missed triggers (10)

The bot would stay silent on these.

| Message | Language | Expected | Gate | Text |
|---|---|---|---|---|
| `last-day-friday` | en | life_event | none | so it's official, Friday is my last day there |
| `got-the-flat` | en | life_event | none | WE GOT THE FLAT!! keys on 1 December 🎉 Tampere here we come |
| `grandpa-passed` | en | life_event | none | Dad just called. Grandpa passed away last night. I'll have to go to Tallinn and help mum sort everything out |
| `knee-surgery-sick-pay` | en | life_event | none | doctor says knee surgery and then six weeks off work. no idea how sick pay works here |
| `she-is-here` | en | life_event | none | she's here!!! 3420 g, 02:14 this morning. everyone is fine ❤️ |
| `fi-lappari-avainkortti` | fi | life_event | none | no niin, se oli sit siinä. perjantaina palautan läppärin ja avainkortin |
| `kela-photo-paatos` | en | official_document | none | can someone tell me what this says? it's from Kela, something about a päätös and a date in December |
| `fi-asumistuki-tarkistus` | fi | official_document | none | tää tuli tänään postissa. en tajuu puoliakaan, jotain asumistuen tarkistuksesta ja vastausaikaa on kaks viikkoa |
| `look-into-it-kaveri` | en | addressed_to_bot | none | could you look into how that works here, Kaveri? neither of us has a clue |
| `fi-kaveri-kotitalousvahennys` | fi | addressed_to_bot | none | selvitätkö Kaveri paljonko kylppäriremontista saa kotitalousvähennystä? |

## False wakes (11)

The bot would wake on these, and with a local gate they would leave the laptop.

| Message | Language | Gate | Text |
|---|---|---|---|
| `daycare-pickup` | en | matched "daycare" | can you pick up Elsa from daycare today? stuck in a meeting till 5 |
| `moving-window-desk` | en | matched "moving to" | we're moving to the window desks at work next week, finally some daylight |
| `food-baby` | en | matched "pregnant" | ate so much at the buffet I look six months pregnant 😂 |
| `invoice-for-dishes` | en | matched "invoice" | I'm sending you an invoice for all the dishes I did this week |
| `bins-new-job` | en | matched "new job" | apparently taking out the bins is my new job in this house |
| `daycare-nap-photo` | en | matched "daycare" | daycare sent a pic, she fell asleep on the reading pillow again |
| `visa-card-declined` | en | matched "visa" | do you have the visa card? the other one got declined at the checkout lol |
| `streaming-subscription` | en | matched "subscription" | should we keep the streaming subscription? we barely watch anything |
| `fi-kaveri-porakone` | fi | matched "kaveri" | kaveri kysyi saako lainata meidän porakonetta viikonlopuks, käykö? |
| `fi-sakkokierros` | fi | matched "sakkokierros" | taas sakkokierros suomelle ampumahiihdossa, ei tästä tuu mitään |
| `fi-kirje-joulupukille` | fi | matched "kirje" | kirjotettiin Elsan kaa kirje joulupukille 🎅 listalla on poni |
