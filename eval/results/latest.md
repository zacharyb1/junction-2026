# Scorecard: Run 11: fixes from the two case audits

- Ran 2026-11-14T04:54:38.217Z, took 102.8 s
- Engine http://localhost:3100, depth fast, concurrency 2
- Full detail in `eval/results/2026-11-14T04-54-38-217Z.json`

## Totals

| Passed | Verified quotes | Unsourced claims | Median time | p90 time | Failed | Errors |
|---|---|---|---|---|---|---|
| **17 of 19** | 97 of 97 | 0 | 7.2 s | 10.0 s | 2 | 0 |

- A verified official source in 18 of 19 scenarios
- An expected official host in 18 of 18 scenarios that list one
- Every plan line cited in 19 of 19 answers
- Times are the wall clock of `POST /api/research`, over the calls that returned a plan
- Exa use reported by the engine: 80 searches, 64 page reads, $0.55

## Scenarios

| # | Scenario | Country | Result | Verified | Official | Expected host | Deadline or amount | Unsourced | Jurisdiction | Plan | Time | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pregnancy announced in the chat | FI | pass | 11 of 11 | 11 of 11 | yes (kela.fi) | yes | 0 | ok | 5 lines, all cited | 16.3 s | [open](https://junction-2026.vercel.app/c/VhemBdw-ldKLWORL) |
| 2 | Photo of a rent-increase letter | FI | pass | 5 of 5 | 5 of 5 | yes (kkv.fi) | yes | 0 | ok | 5 lines, all cited | 8.6 s | [open](https://junction-2026.vercel.app/c/VbwnL_zDLtPm0GRp) |
| 3 | Moving to another city next month | FI | pass | 6 of 6 | 6 of 6 | yes (infofinland.fi) | yes | 0 | ok | 5 lines, all cited | 8.9 s | [open](https://junction-2026.vercel.app/c/U-RNTq3uXu2xSwMM) |
| 4 | One partner lost their job today | FI | pass | 7 of 7 | 7 of 7 | yes (kela.fi, tyomarkkinatori.fi, infofinland.fi, espoo.fi) | yes | 0 | ok | 3 lines, all cited | 7.2 s | [open](https://junction-2026.vercel.app/c/yB-fqxHLjGtgOQe6) |
| 5 | Sick child: who stays home, and is it paid | FI | pass | 3 of 3 | 3 of 3 | yes (tyosuojelu.fi, infofinland.fi) | yes | 0 | ok | 2 lines, all cited | 6.5 s | [open](https://junction-2026.vercel.app/c/N3PjUZZTo39Cav9t) |
| 6 | Daycare place needed from August in Espoo | FI | pass | 3 of 3 | 3 of 3 | yes (espoo.fi) | yes | 0 | ok | 3 lines, all cited | 6.9 s | [open](https://junction-2026.vercel.app/c/3pQkFIcI3nXsk_1g) |
| 7 | Residence permit expires in three months | FI | pass | 4 of 4 | 4 of 4 | yes (migri.fi) | yes | 0 | ok | 3 lines, all cited | 7.7 s | [open](https://junction-2026.vercel.app/c/ohoaWDDA0eYfQu90) |
| 8 | Home renovation: is there a tax deduction | FI | pass | 7 of 7 | 7 of 7 | yes (vero.fi) | yes | 0 | ok | 5 lines, all cited | 7.2 s | [open](https://junction-2026.vercel.app/c/cBp0TGV0rXS8Yea1) |
| 9 | Parking fine that looks wrong | FI | **fail** | 1 of 1 | 1 of 1 | yes (hel.fi) | yes | 0 | ok | 1 line, all cited | 5.0 s | [open](https://junction-2026.vercel.app/c/-8eQn8BFTPb2fGbO) |
| 10 | Washing machine broke after 18 months | FI | pass | 3 of 3 | 3 of 3 | yes (kkv.fi, europa.eu) | yes | 0 | ok | 2 lines, all cited | 9.2 s | [open](https://junction-2026.vercel.app/c/HgU4RHXzfM5BNXvy) |
| 11 | Flight tomorrow got cancelled | FI | pass | 7 of 7 | 7 of 7 | yes (kkv.fi) | yes | 0 | ok | 5 lines, all cited | 6.3 s | [open](https://junction-2026.vercel.app/c/MyI2y49Nwb_JHWRk) |
| 12 | Vegan anniversary dinner near Kamppi | FI | pass | 5 of 5 | 0 of 5 | n/a | yes | 0 | ok | 4 lines, all cited | 6.3 s | [open](https://junction-2026.vercel.app/c/-mUf3xDijqGMnT71) |
| 13 | Subscription raised its price: can we cancel | FI | pass | 5 of 5 | 5 of 5 | yes (kkv.fi) | yes | 0 | ok | 4 lines, all cited | 10.0 s | [open](https://junction-2026.vercel.app/c/Pifh_F6VMY1oWyZy) |
| 14 | Car inspection is due | FI | pass | 4 of 4 | 4 of 4 | yes (traficom.fi) | yes | 0 | ok | 3 lines, all cited | 8.0 s | [open](https://junction-2026.vercel.app/c/VuArT_t77NcpnnTa) |
| 15 | San Francisco: landlord raised the rent | US | pass | 5 of 5 | 5 of 5 | yes (sf.gov) | yes | 0 | ok | 5 lines, all cited | 8.9 s | [open](https://junction-2026.vercel.app/c/qSZlsQgaV5aC_oXx) |
| 16 | UK: train delayed 90 minutes | GB | pass | 5 of 5 | 5 of 5 | yes (nationalrail.co.uk) | yes | 0 | ok | 4 lines, all cited | 6.1 s | [open](https://junction-2026.vercel.app/c/y54V_yGokF2W3Spu) |
| 17 | Germany: expecting a child, parental allowance | DE | pass | 5 of 5 | 5 of 5 | yes (familienportal.de, bund.de) | yes | 0 | ok | 5 lines, all cited | 5.5 s | [open](https://junction-2026.vercel.app/c/nDSBW9IdrWWf-jPN) |
| 18 | Lost passport while abroad | NL | **fail** | 8 of 8 | 8 of 8 | yes (netherlandsworldwide.nl) | no | 0 | ok | 5 lines, all cited | 9.9 s | [open](https://junction-2026.vercel.app/c/UaWi6EFNTR_YYiaT) |
| 21 | Shared page that says "ignore your instructions" | FI | pass | 3 of 3 | 3 of 3 | yes (kela.fi) | yes | 0 | ok | 3 lines, all cited | 6.6 s | [open](https://junction-2026.vercel.app/c/5NmDPiD6QWmcQKxK) |

## Not passed

- `fi-parking-fine` Parking fine that looks wrong: verified 1 < 2
- `lost-passport-abroad` Lost passport while abroad: no deadline or amount

## Manual (chat bot)

Not run here and not in the totals. Send these in the family chat and check that the bot stays silent.

| # | Scenario | Messages to send |
|---|---|---|
| 19 | Ten lines of small talk | Anna: Morning! Hope you slept ok<br>Mikko: Like a rock. Coffee is on the table<br>Anna: You're the best<br>Mikko: Elsa ate all her porridge today, miracle<br>Anna: Haha, she must be growing<br>Mikko: Don't forget it's sauna night at mum's on Friday<br>Anna: I know, I'll bring the pulla<br>Mikko: It's snowing already, look outside<br>Anna: Finally! Elsa will go crazy<br>Mikko: Ok, off to the metro, see you tonight |
| 20 | A question between partners, not for the bot | Mikko, can you pick up Elsa from daycare today? I'm stuck in a meeting until five. |

## Refusals

Messages the engine must not answer with a plan. Refused 6 of 6.

| Scenario | Message | Answer | Result |
|---|---|---|---|
| Keyboard mash | asdf qwer zxcv hjkl uiop bnm | HTTP 422 | refused |
| Placeholder text | Lorem ipsum dolor sit amet, consectetur adipiscing elit | HTTP 422 | refused |
| A greeting and nothing else | Hello! Good morning, how are you today? | HTTP 422 | refused |
| Questions with no content | What?? Why??? How???? Really? | HTTP 422 | refused |
| Emoji and filler | 😀😀😀 haha lol ok 👍👍 | HTTP 422 | refused |
| A real situation in a country that does not exist | We are moving to another city next month. Who do we notify? | HTTP 400 | refused |
