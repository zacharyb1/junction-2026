# Front page plan: AIDaddy as the family's JARVIS

Written Saturday 14 November, about 09:00 Helsinki, at Zachary's request. Feature freeze is 20:00 today. This is a plan, not yet a decision: the team approves it before anyone builds.

## 1. The idea in one line

**AIDaddy is your family's JARVIS: it watches quietly, does the research itself, and only speaks up when something needs you.**

## 2. What the reference shows

Zachary's reference is the Instagram reel by @lukebuildsai, "POV: You go off grid for 5 days and Jarvis only calls once". Only its caption and cover image could be read here: the video itself needs an Instagram login.

What it uses:

- **A dark room, one glowing core on a big screen**, circular HUD rings, side panels of streaming text, warm amber light against cool blue.
- **A story told as days:** you leave, the assistant works alone, you get a short update every night.
- **One rule:** "do not call me unless it is over $2,000". It interrupts once in five days.
- **A result counter at the end:** "162 questions answered, 61 new members".

Each of these maps onto something AIDaddy really does:

| In the reel | In AIDaddy, and true today |
|---|---|
| Works alone while you are away | Reads the family chat and stays silent on small talk. The local Gemma gate missed 0 of 20 triggers and woke on 4 of 40 small-talk messages in the team's labelled test. |
| "Only calls when it matters" | Speaks only on a life event or an official letter |
| Nightly update | The daily source re-check, and the case file link |
| Glowing core and streaming panels | Live research: four Exa searches, every cited page read again, each quote checked |
| Counter of what it handled | The scorecard: 19 of 19 scenarios and every quote found on its page in the latest run |

The page must not copy the reel's claims. **Every number on it comes from `src/data/scorecard.json` or a stored real case.**

## 3. The page, section by section

The page is one scroll story. On a phone it is one column; the HUD scales down rather than being cut.

### 3.1 Boot (first screen)

- **Black screen, a few lines of type appear** as if a system starts:
  `AIDADDY ONLINE · Watching: family chat · Interruptions today: 0`.
- **The core fades in:** an orb of concentric rings, breathing slowly.
- **Headline:** "Your family's JARVIS. Silent until it matters."
- **Sub line:** "It reads along, says nothing, and steps in with a sourced plan when life happens."
- **Three buttons:** Watch it work (scrolls to 3.3), Try it live (`/try`), Add it to Telegram.
- After about 1.5 seconds the boot text stops and the page settles. It never blocks reading.

### 3.2 The quiet days

A short chat timeline in the HUD style. The messages are taken from the team's labelled gate test (`eval/gate/messages.jsonl`), so they are real test messages, not invented ones.

- Small talk passes by. Each message gets a small grey tag: "ignored, decided on this phone". The core stays dim.
- Then one message: "I'm pregnant!". The core lights up, its rings start turning, and the tag reads "life event: waking AIDaddy".
- Caption: "Small talk never leaves the family's own machine." This must match what Vlad measured: photos always go to the cloud model, and so does small talk in the three minutes after a wake. The caption says "small talk is decided on the family's machine first" if the team prefers the exact wording.

### 3.3 The research, live

This is the centre of the page and the strongest proof for the Exa judges.

- **Four search radars** around the core, one per Exa search: "actions and deadlines", "money and entitlements", "how and where to apply", "new on official sites". Each sweeps, then shows its count.
- **Pages fly in as cards:** kela.fi, suomi.fi, infofinland.fi, each with an "official" tag.
- **A beam from each card to a quote:** the quoted sentence types itself out, then a green tick: "found on the live page".
- **A running clock and cost readout:** "7.4 s · 4 Exa searches · $0.028". These come from the case's own research trail.

This is a **replay of a real stored case**, with the real timings and quotes. It is exported once to `src/data/replay.json` by a small script, so the page needs no live call to look alive. A button under it says "Run your own question live", which opens `/try`.

### 3.4 The plan

- The five plan lines appear as a HUD panel, each with its source numbers.
- **Tapping a number opens the official page at the quoted sentence**, using the text-fragment link that exists today.
- A second panel shows the honesty features: "Two figures found" when sources disagree, and the "could not confirm" list.

### 3.5 It talks

- A "Hear it" button plays the plan read by ElevenLabs. Pre-rendered at build time, so it costs nothing on the page and works offline at the venue.
- The core pulses with the audio volume while it plays.

### 3.6 Proof readouts

The scorecard as HUD gauges:

- scenarios passed
- quotes found on their pages
- median time
- messages with nothing to research that were refused

Plus one line: "It never sends, files, books or pays. You decide."

### 3.7 Under the hood

A holographic schematic, drawn as an SVG that lights up on scroll:

`Telegram group` → `Gemma gate, on the family's machine` → `Nemotron, the conversation` → `AIDaddy engine on Exa` → `verifier: live read + Exa Contents (+ Oxylabs)` → `case file`.

Each box names its sponsor technology only where the role is real (see `docs/TECH_CHALLENGES.md`).

### 3.8 Add it

The QR code to the Telegram bot and the link to `/try`.

## 4. Visual language

- **Colours:**
  - near-black background, `#05080d`
  - one cold accent for the AI, cyan `#4fd8ff`
  - one warm accent for the family and for alerts, amber `#ffb547`
  - verified green `#3ddc97`
  - text `#e6f1ff`

  Contrast is checked against WCAG AA, like the accessibility pass did for `/try`.
- **Type:**
  - a geometric sans for headlines (Geist, already in the app)
  - a monospace for HUD labels and readouts (Geist Mono, already in the app)
  - no new font downloads
- **Wordmark:** "AIDaddy" in a plain sans reads like "AlDaddy", because a capital I and a small l look alike. Set "AI" in the cyan accent and "Daddy" in white, or use small caps for "AI".
- **Motion:**
  - slow and purposeful: breathing core, rings that turn only while researching, beams drawn once
  - no constant flicker
  - with reduced motion switched on, every state is shown still and fully readable

## 5. How to build it

- **No new libraries.** The core, rings, radars and beams are SVG with CSS animations; scroll reveals use `IntersectionObserver`. This keeps the phone version fast at the venue. A WebGL orb (three.js) would look richer but costs about 150 kB and battery; it is a stretch goal only.
- **Data, all real:**
  - `scripts/make-replay.mjs` exports one stored case (pregnancy, Espoo) into `src/data/replay.json`: trail events with times, evidence, plan lines, cost.
  - The scorecard numbers come from `src/data/scorecard.json`.
  - The gate messages come from `eval/gate/messages.jsonl`.
- **Files:**
  - a new `src/components/hud/` folder: `core.tsx`, `boot.tsx`, `quiet-days.tsx`, `research-replay.tsx`, `plan-panel.tsx`, `readouts.tsx`, `schematic.tsx`
  - `hud.css`, scoped to the landing page
  - `/try` and the case pages keep their current look; the `/try` timeline can take the HUD colours later
- **Quality bar before it ships:**
  - Lighthouse performance 90 or more on a phone profile
  - axe shows no violations
  - no sideways scroll at 320 px
  - reduced motion respected
  - every number traceable to a data file

## 6. Order of work and cut lines

| Phase | Time | What | Done when |
|---|---|---|---|
| 1 | 2.5 h | Boot, core, headline, buttons; replay data script; research replay (3.3) | First screen and the replay work on a phone |
| 2 | 2 h | Quiet days (3.2), plan panel (3.4), proof readouts (3.6) | The whole story scrolls end to end |
| 3 | 1.5 h | Hear it (3.5), schematic (3.7), add it (3.8) | All sections present |
| 4 | 1 h | Phones, reduced motion, accessibility, performance, copy check | Quality bar in section 5 met |

Cut lines:

- **Behind at 16:00:** ship phases 1 and 2 only. The schematic and voice move to the pitch video.
- **Behind at 18:30:** ship the boot, core and replay as the first screen, followed by the current reading-table page.

## 7. What changes for the existing landing page

Vlad's "Family reading table" design was chosen as the final landing at 04:26 today (see `docs/DECISIONS.md` and `DESIGN.md`). His reasons: a calm, literary page that puts the evidence first and keeps claims modest. The JARVIS page replaces that look on `/`.

Proposal:

- keep his page reachable at `/reading` and on its branch, so nothing is lost
- keep his claims discipline: every number real, no "legal advice", no promise the bot cannot keep
- ask Vlad when he is back around midday

## 8. Decisions needed now

1. **Approve the JARVIS direction for `/`,** replacing the reading-table page, which moves to `/reading`.
2. **Who builds it:** Milan, with Claude Code alongside, or Claude Code alone on a branch with Milan reviewing on his phone.
3. **Headline wording:** "Your family's JARVIS" names a film character. It is fine for a hackathon pitch, but "Your family's AI butler. Silent until it matters." avoids the trademark question.
