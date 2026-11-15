---
name: AIDaddy — At home
description: Warm paper, white cards with soft corners, one terracotta accent, and one face (the orb in peach and butter). Soft and warm, like home, not a clinic.
source: the team's design project for the household app (phone screens 1 to 7, the laptop board and the orb options); the orb is option A, "Sunday morning"
colors:
  ground: '#fbf8f3'        # --hud-bg, --background
  card: '#ffffff'          # --hud-panel, --card, --popover
  text: '#211b17'          # --hud-text, --foreground           15.9:1 on the ground
  dim: '#6b625b'           # --hud-dim, --muted-foreground       5.6:1 on the ground, 6.0:1 on a card
  accent: '#b84f2a'        # --hud-accent, --primary, --ring     4.7:1 on the ground, white on it 5.0:1. The design's #c4572f, one step darker to pass AA both ways
  accent-hi: '#9d4122'     # --hud-accent-hi                     a filled button under the pointer
  honey: '#96600f'         # --hud-amber                         4.8:1   attention, the person's move
  green: '#23744a'         # --hud-green                         5.4:1   confirmed, done
  ink: '#ffffff'           # --hud-ink, --primary-foreground     text on an accent, honey or green fill
  line: '#e5dccf'          # --hud-line, --border                card and box edges
  line-soft: '#efe8dd'     # --hud-line-soft                     dividers inside a card, header and footer lines
  field-edge: '#9c8f7e'    # --input                             3:1, the edge of a text field
  fill: '#f6f0e7'          # --hud-fill                          a ruled row, a soft surface
  fill-hi: '#ede4d6'       # --hud-fill-hi                       the same under the pointer, a pressed switch
  bubble: '#f1ebe2'        # --hud-bubble, --secondary, --accent a person's chat message, a soft tile
  orb: ['#ffe3cf', '#ffb38a', '#ffd76e', '#f59aa8']   # --orb-a to --orb-d: peach, apricot, butter, rose
  orb-done: ['#e6f2df', '#9fd3b0', '#f6dd7f', '#ffb59a']  # the orb when confirmed: sage, mint, butter, peach
  invalid: '#b3261e'       # --destructive
typography:
  family: Inter (next/font, --font-sans). One face for everything a person reads; --hud-ui is the same face for labels, buttons and figures.
  display:  { fontSize: 'clamp(2.6rem, 9vw, 5rem)',   fontWeight: 700, lineHeight: 1,    letterSpacing: -0.035em }  # front page hero only
  title:    { fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: -0.025em }
  heading:  { fontSize: 1.15rem, fontWeight: 600, lineHeight: 1.3 }
  lede:     { fontSize: 'clamp(1.02rem, 1.6vw, 1.2rem)', fontWeight: 400, lineHeight: 1.55 }   # at most 58ch, in dim
  body:     { fontSize: 1rem,   fontWeight: 400, lineHeight: 1.55 }
  note:     { fontSize: 0.9rem, fontWeight: 400, lineHeight: 1.55 }   # at most 72ch
  button:   { fontSize: 0.95rem, fontWeight: 600, lineHeight: 1.2 }   # sentence case
  nav:      { fontSize: 0.8rem, fontWeight: 500 }                     # sentence case
  state:    { fontSize: 0.82rem, fontWeight: 600 }                    # sentence case, with its light
  label:    { fontSize: 0.72rem to 0.75rem, fontWeight: 600, letterSpacing: 0.05em, textTransform: uppercase }  # a section label, a card's title bar, a figure's caption. Short words only
shape:
  control: 14px            # --radius: a button, a field
  card: 20px               # --radius-card: a card, a panel
  pill: 99px               # a badge, a tag, a chip
  shadow: '0 1px 2px rgb(60 40 25 / 0.05), 0 8px 24px rgb(60 40 25 / 0.05)'   # --hud-shadow, on a card
  button-shadow: '0 6px 16px rgb(184 79 42 / 0.28)'                              # under a filled button
---

# Design System: AIDaddy

## Overview

AIDaddy looks like something that belongs in a home. The ground is warm paper. What can be read or pressed sits on a white card with soft corners and a faint shadow. One colour, a terracotta, marks what can be acted on. One face, the orb, says what AIDaddy is doing.

The look comes from the team's design project for the household app and was applied to the whole site on 15 November 2026. It replaced a near-black "control room" look; the stylesheets keep their `--hud-` token names and `hud-`/`site-` class names from that time, and only the values and shapes changed. Do not read a name as a colour: `--hud-amber` is the honey of "your move", and the class `site-state--cyan` is the accent.

## Colors

The table in the front matter is complete. Rules:

- **One accent.** Terracotta is for the thing to press, the link, the label above a title and the working light. It is never a large background.
- **Text is near-black brown, never pure black**, and secondary text is `dim`. Both pass AA on the ground and on a card.
- **Edges are hairlines in tan**, not in the accent. A card is told from the ground by its white, its edge and its shadow together.
- **Tints** of the accent, honey and green (5 to 15 per cent) may fill a row or a tag that carries that meaning.

### The state code

A state is always a light and a word, never a colour alone.

| State | Colour | Meaning |
| --- | --- | --- |
| working | accent | AIDaddy is doing something now |
| your move | honey | something waits for the person |
| confirmed | green | found, checked, done |
| idle | dim | nothing is happening |

## Typography

Inter everywhere. Titles are bold with tight tracking. Sentences, buttons, links and states are in sentence case. Only a short label (a section label, the title bar of a card, the caption of a figure) is in capitals, at 0.05em. Nothing a person reads is smaller than 0.8rem except such a label.

## Shapes and depth

Soft corners: 14px on a control, 20px on a card, a full pill on a badge or tag, a circle for the orb and for an avatar. A card has one soft shadow; a filled button has a shadow in its own colour; nothing glows. There are no grids, brackets or scan lines.

The ground carries two soft lights, peach from the top right and butter from the left, and nothing else.

## Components

- **Button** (`site-btn`, `hud-btn`, the shared `Button`): 48px tall (44px compact), white with a hairline edge; the main one is filled with the accent and has white text. One filled button per view.
- **Card** (`site-panel`, `hud-panel`, the shared `Card`): white, hairline, 20px corners, soft shadow. A title bar is a label row with a soft line under it.
- **Field**: white, the field edge, 14px corners, 44px tall. The label stands above it in the text colour.
- **Row** (`site-row`): a soft fill with a 3px rule on the left in the colour of its meaning: a source, a reply of AIDaddy, a thing that was heard.
- **Badge and tag**: a pill with short words.
- **Icon tile**: a 44px white tile with a hairline edge and a drawn sign in the accent, as on the setup cards.
- **The orb** (`Core`, `AIDaddyAvatar`, `src/app/icon.svg`): AIDaddy's face. A ball in peach with apricot, butter and rose inside and a light at the top left. It breathes at rest, its colours swirl fast while AIDaddy works, and it turns to garden colours when something is confirmed. In the chat a light inside grows with the voice and a ring shows the state. One orb per view where it carries a state. The still picture (the icon, the small mark, share images, the app icons) is the same ball without motion.

### How the shared layer reaches a page

`site.css` is unlayered and Tailwind's utilities are layered, so a shared rule beats every utility on the same element. Three kinds of rule follow from that.

1. **Inherited rules** have no specificity (`:where()`), so any class in any stylesheet outranks them. They dress what a page already uses, with no edit.
2. **Named classes** are written `.site .site-x`, so they outrank an element rule of a page.
3. **The property contract**: these properties belong to the shared layer, and a utility for them on the same element does nothing.

| Element | Properties taken | Way out |
| --- | --- | --- |
| `h1` | font-size, weight, line-height, letter-spacing, text-wrap | `site-title--compact` |
| a paragraph directly under a page's `header` | max-width, font-size, line-height | use `PageHead` |
| a link inside a paragraph | colour, underline | `no-underline` on the link |
| `blockquote` | font-size (1rem), upright, line-height | |
| `summary` | list-style, cursor, the `+` sign | `list-none` on the summary |
| `.rounded-sm` to `.rounded-4xl` | border-radius (14px) | `rounded-full`, `rounded-none` |
| `.border.bg-card` | background (the panel fill) | leave out `bg-card` |
| input, select | min-height 44px, corner, fill, no ring, edge on focus | |
| textarea | corner, fill, no ring, edge on focus; its height stays free | |
| badge | height, padding, font, tracking, case, wrapping; colours stay free | `whitespace-normal` for a sentence |
| card | position, overflow, border, corner, fill, no ring; title size | |
| `site-btn` | display, gap, minimum size, padding, border, corner, fill, shadow, colour, font, tracking, case | the modifiers; width and margin stay free |

## Motion

Slow, and only where it means something. These things move, and nothing else:

1. **The orb**: it breathes in 4 s; the colours inside turn once in 14 s at rest and once in 2.4 s while AIDaddy works; the glow grows while it works.
2. **The voice orb**: still at rest and while it listens; its colours turn only while it thinks; the light inside grows with the voice.
3. **A working light** fades to a quarter and back in 1.1 s.
4. **A running bar** sweeps in 1.6 s; a recording's bar fills over the recording's own length and ends green.
5. **A new row** rises 10px over 0.45 s (`site-rise`).
6. **A control answers** the pointer in 0.2 s (border, fill, shadow).
7. The front page's own story: its scroll reveal and its replay.

With `prefers-reduced-motion: reduce` every animation and transition under `.site` is off, each moving part shows its end state, and the word beside it carries the meaning.

## Accessibility

- WCAG AA on the ground and on a card: every text pair above is 4.5:1 or better; a field's edge is 3:1.
- **One focus sign**: `outline: 2px solid #b84f2a; outline-offset: 3px`, on every control. No ring, no change of border.
- **Targets**: 44px on a phone. A source chip is 28px to look at with a 44 by 44px touch area; a navigation link has a touch area at least 44px wide.
- **Never colour alone**: a light has a word; Pass and Fail are words; a link in a sentence is underlined; a running, done or stopped step has a hidden word.
- **Sentences are not set in capitals** and field labels stay in sans in the text colour.
- A link that opens a new tab ends in `↗` and says so in hidden words.
- A live region is on the page before anything happens, and what only decorates (the clock, a mirrored line) is hidden from it.
- Reduced motion as above. Sticky and large things need height as well as width.

## Do's and Don'ts

### Do:

- Start a page with `SiteShell` and `PageHead`; link to `/try`, `/chat` and `/autopilot` with `SiteLink`; style a link as a button with `linkButtonClasses` or `LinkButton`.
- Keep a plan line and its sentence together: the quote stands under the line it supports, with its source.
- Label an example as an example, and a concept as a concept.
- Show failures: a failed scenario, its error text and a row without a case file stay on the page.
- Say that a pass checks source grounding, not whether every possible step is covered.
- Use real text, never a screenshot of text.
- Check a page by a direct load, at 1440 and 390, and with reduced motion.

### Don't:

- Don't add a colour, a font, a corner radius or a second focus sign.
- Don't use a `hud-` class outside the front page, `/setup` and `/autopilot`, except `hud-core` through `Core`: after a click from the front page it looks right and after a reload it is broken.
- Don't set a sentence in capitals, and don't bring back a mono face, a grid, a bracket or a glow.
- Don't let colour or motion carry a meaning alone.
- Don't put a second face on a screen: one orb where it carries a state.
- Don't animate what means nothing: no turning mark in the header, no orb that turns at rest beside text someone is reading.

## Not part of the system

- **The replay pictures** (`.chatdemo`, `.bdemo`, `.cdemo`): pictures of other people's software, with their own shapes. The phone in `.tdemo` shows AIDaddy's own screen and uses this palette by hand. No shared rule reaches inside `.demo-stage`. Their size, zoom steps and timing are fixed, because the pitch videos are recorded from them.
- **The front page's story pieces** in `hud.css`: the family chat panel, the gauges, the schematic and the four lines above the title. `hud.css` also keeps its own copies of the button, the card and the orb; they are identical to the shared ones.
- **The browser extension** cannot load `site.css` and copies the values by hand. It uses the system fonts behind Inter, and the dot of its in-page panel keeps its four colours (watching accent, checking honey, ready green, not looking grey).
- **A mark in the header**, a scan line on a panel, a monitor frame around a replay: considered and left out.
- **Tables**: the scorecard styles its own in `src/app/scorecard/scorecard.css`.
- **Popups**: the tokens sit on `.site`, and the body under it is white. A popup that is portaled to the body needs the tokens moved first.
- **A dark theme.** The earlier control-room look is in the history, not in the code.
- **The four recorded demo videos** in `docs/pitch/` were recorded in the earlier look. They show the same scenes; re-record them with `scripts/record-demos.mjs` when they should match.
