---
name: AIDaddy — Control room
description: A near-black control room. One accent, one face (the glowing core), and a state code that says whose move it is.
colors:
  ground: '#05080d'            # --hud-bg, --background
  text: '#e6f1ff'              # --hud-text, --foreground          17.6:1 on the ground, 15.8:1 on a panel
  dim: '#9db0c9'               # --hud-dim, --muted-foreground      9.1:1 / 8.2:1
  cyan: '#4fd8ff'              # --hud-cyan, --primary              12.0:1 / 10.8:1   the single accent
  cyan-hi: '#8ae6ff'           # --hud-cyan-hi                      the primary button under the pointer
  amber: '#ffb547'             # --hud-amber, --ring                11.4:1 / 10.3:1   attention, the person's move, focus
  green: '#3ddc97'             # --hud-green                        11.4:1 / 10.2:1   confirmed, done
  ink: '#03131c'               # --hud-ink, --primary-foreground    text on a cyan or amber fill, 11.3:1 and 10.7:1
  ink-green: '#03140c'         # --hud-ink-green                    text on a green fill, 10.7:1
  line: 'rgb(79 216 255 / 0.22)'       # --hud-line, --border       panel and box edges
  line-soft: 'rgb(79 216 255 / 0.08)'  # --hud-line-soft            dividers inside a panel, the grid, header and footer lines
  field-edge: 'rgb(157 176 201 / 0.55)' # --input                   3.3:1, the only sign of where a field is
  fill: 'rgb(79 216 255 / 0.05)'       # --hud-fill                 secondary button, field, ruled row
  fill-hi: 'rgb(79 216 255 / 0.14)'    # --hud-fill-hi              the same under the pointer, a pressed switch
  panel: 'linear-gradient(180deg, rgb(13 24 38 / 0.92), rgb(8 14 23 / 0.92))'  # --hud-panel
  bubble: '#141f2e'            # --hud-bubble                       a person's chat message
  card: '#0b1521'              # --card, --popover
  secondary: '#101d2c'
  muted: '#0e1a28'
  accent-surface: '#12233a'    # --accent
  invalid: '#ff8a80'           # --destructive, read only by an invalid form field
typography:
  display:      { fontFamily: Geist, fontSize: 'clamp(2.9rem, 11vw, 6rem)',    fontWeight: 600, lineHeight: 0.96, letterSpacing: -0.035em }  # 96px at 1440, 46.4px at 390; front page hero only
  title:        { fontFamily: Geist, fontSize: 'clamp(1.8rem, 5vw, 3rem)',     fontWeight: 600, lineHeight: 1.05, letterSpacing: -0.025em }  # 48 / 50.4px at 1440, 28.8 / 30.24px at 390
  title-compact: { fontFamily: Geist, fontSize: 'clamp(1.4rem, 3.2vw, 1.9rem)', fontWeight: 600, lineHeight: 1.1, letterSpacing: -0.02em }   # 30.4px at 1440, 22.4px at 390; also the title of a part
  panel-heading: { fontFamily: Geist, fontSize: 1.15rem, fontWeight: 600, lineHeight: 1.3 }                                                   # 18.4px
  lede:         { fontFamily: Geist, fontSize: 'clamp(1.02rem, 1.6vw, 1.2rem)', fontWeight: 400, lineHeight: 1.55 }                           # 19.2 / 29.76px at 1440, 16.32 / 25.3px at 390, at most 58ch
  body:         { fontFamily: Geist, fontSize: 1rem,   fontWeight: 400, lineHeight: 1.55 }   # 16 / 24.8px
  note:         { fontFamily: Geist, fontSize: 0.9rem, fontWeight: 400, lineHeight: 1.55 }   # 14.4 / 22.3px, at most 72ch; also Tailwind text-sm
  small:        { fontFamily: Geist, fontSize: 0.8rem, fontWeight: 400, lineHeight: 1.5 }    # 12.8px; also Tailwind text-xs; nothing is smaller in sans
  label:        { fontFamily: Geist Mono, fontSize: 0.72rem, fontWeight: 500, lineHeight: 1.3, letterSpacing: 0.16em, textTransform: uppercase }  # 11.52px
  micro-label:  { fontFamily: Geist Mono, fontSize: 0.66rem, fontWeight: 500, lineHeight: 1.3, letterSpacing: 0.12em, textTransform: uppercase }  # 10.56px: badge, tag, readout caption
  state-word:   { fontFamily: Geist Mono, fontSize: 0.75rem, fontWeight: 500, lineHeight: 1.2, letterSpacing: 0.16em, textTransform: uppercase }  # 12px
  button:       { fontFamily: Geist Mono, fontSize: 0.8rem,  fontWeight: 500, lineHeight: 1,   letterSpacing: 0.1em,  textTransform: uppercase }  # 12.8px; 600 on a filled button
  panel-title:  { fontFamily: Geist Mono, fontSize: 0.7rem,  fontWeight: 500, lineHeight: 1.3, letterSpacing: 0.14em, textTransform: uppercase }  # 11.2px
  nav:          { fontFamily: Geist Mono, fontSize: 0.75rem, fontWeight: 500, lineHeight: 1,   letterSpacing: 0.12em, textTransform: uppercase }  # 12px at every width; 0.06em below 640px
  status:       { fontFamily: Geist Mono, fontSize: 0.8rem,  fontWeight: 400, lineHeight: 1.45 }                                                  # machine text, sentence case
  figure:       { fontFamily: Geist Mono, fontSize: 1.5rem,  fontWeight: 500, lineHeight: 1, fontVariantNumeric: tabular-nums }                   # 24px in a readout
  clock:        { fontFamily: Geist Mono, fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', fontWeight: 500, lineHeight: 1, letterSpacing: -0.02em }       # 40px at 1440, 28px at 390
rounded:
  corner: 3px        # every button, panel, field, chip, tag, badge and card
  bubble: 16px 16px 4px 16px   # a person's chat message: the one shape that is not crisp
  round: 50%         # lights, the core, the switch on /setup
spacing:
  wrap: 'min(1120px, 100% - 2rem)'           # x=160 at 1440, x=16 at 390
  page-top: 'clamp(2.5rem, 6vw, 4rem)'       # 64px / 40px from the header to the label
  page-bottom: 'clamp(3.5rem, 9vw, 7rem)'    # 112px / 56px to the footer
  block-gap: 'clamp(1.75rem, 4vw, 3rem)'     # 48px / 28px: head to content, block to block
  head-gap: 0.9rem                            # 14.4px: label to title, title to lede
  column-gap: 'clamp(1.5rem, 4vw, 3rem)'
  split: '1.25fr 0.75fr from 900px'           # 670px + 402px at 1440 (x=160 and x=878); one column below
  part-top: 'clamp(1.75rem, 4vw, 2.5rem)'    # above a numbered part, under its soft line
  panel-padding: 1rem
  panel-title-padding: 0.7rem 1rem
  actions-gap: 0.75rem
  target: 44px
  button-height: 48px                         # 44px for a button inside a form, a card or a row
  breakpoints: 640px, 768px, 900px            # header on one row; table columns; two columns and the large core (with min-height 700px where a thing is sticky or large)
components:
  page-head: PageHead (site-head)
  split-and-rail: site-split, site-rail
  panel: site-panel, site-panel-title, site-panel-body; a shared Card is one by itself
  ruled-row: site-row
  readouts: site-readouts
  button: site-btn (--primary, --amber, --compact, --cta, --icon)
  field: the shared input, textarea and select
  tag: site-tag; a shared Badge is one by itself
  source-chip: site-chip
  state-word: site-state
  light: site-dot
  bar: site-bar
  clock: site-clock
  core: Core (hud-core), the chat's voice orb (AIDaddyAvatar), the small mark
  bubble: site-bubble
  header-footer: SiteShell
---

# Design System: AIDaddy

## Overview

AIDaddy is a butler in a family's group chat that researches life events and answers with a plan whose every line carries a quote from an official page. Every page a visitor can reach is one room: a control room on a near-black ground with a faint grid and two lights, cold from the machine at the top right, warm from the family at the lower left.

Three ideas hold the room together.

1. **One face.** AIDaddy is the glowing core: on the front page, as the voice orb on the chat page, as the small mark in the browser tab and the extension's toolbar. Where a core is on a screen it shows what AIDaddy is doing.
2. **One state code.** Colour says whose move it is, a word beside the light says what is happening, and motion says that something is happening right now.
3. **One vocabulary.** A page is built from the same few parts in the same places: a head, panels with two corner brackets, ruled rows, mono readouts, the same button.

The source of truth is `src/components/site/site.css` (tokens, the shared classes, the core's CSS) with the components beside it. `src/components/hud/hud.css` holds the front page's own story pieces. The front page `/` is the reference: when a value is in doubt, measure it there.

The paper edition (`/reading`) was retired on 14 November 2026; its scorecard is at `/scorecard`, its privacy statement on `/setup`. The decision is in `docs/DECISIONS.md`.

## Colors

The palette is fixed. No page introduces a colour; a new shade is an alpha of one of these.

- **Cyan `#4fd8ff`** is the single accent and the machine: labels, links, the primary button, panel edges and brackets, left rules, live figures, the core.
- **Amber `#ffb547`** is attention and the family: the person's move, a live microphone, a concept that is not built, a step that failed, and keyboard focus.
- **Green `#3ddc97`** is confirmed: a quote found on its page, a finished run, "Live".
- **Text `#e6f1ff`** for content, **dim `#9db0c9`** for explanation. Nothing lighter than dim carries text.
- Errors are attention: an amber ruled row. Coral (`--destructive`) is only what a shared form control reads when it is invalid.

### The state code

One code for every core, light and state word on the site. A light never stands alone: a word is beside it.

| State | Whose move | Light and word | `Core` | Voice orb on `/chat` | Words in use |
| --- | --- | --- | --- | --- | --- |
| Idle | nobody | dim `#9db0c9`, steady | `idle`: dim cyan, slow | ring dim, still | Standing by |
| Your move | the person | amber, steady | | ring amber, still (the microphone is live) | Listening |
| Working | AIDaddy | cyan, the light pulses in 1.1 s | `active`: bright, fast, the amber family arc | ring cyan, inner rings turn | Researching, Thinking, Checking live |
| Speaking | AIDaddy | cyan, steady | | ring cyan, the heart follows the voice | Speaking |
| Confirmed | nobody | green, steady | `done`: green | | Case file ready, 19/19 passed, Pass, Checked live |

Attention that is not a state of AIDaddy is also amber and also has a word: Stopped, Fail, Concept, a recorded run shown in place of a live one.

What a screen or a channel is, in three label words: **Live** (green), **Replay** (cyan), **Concept** (amber). These are labels, not lights of the state code.

Buttons follow the same reading: cyan asks AIDaddy for something; the amber button is the family's own yes.

## Typography

Geist for text, Geist Mono for labels, buttons, state words and figures. Both come from `next/font` in `src/app/layout.tsx`. No other font.

### Hierarchy

| Step | Class or element | 1440 | 390 |
| --- | --- | --- | --- |
| Display | `.hud h1` (front page only) | 96px / 92.2px | 46.4px / 44.5px |
| Page title | `site-title`, any `h1` under `.site` | 48px / 50.4px, -1.2px | 28.8px / 30.24px, -0.72px |
| Compact title, part title | `site-title--compact`, `site-h2` | 30.4px / 33.4px | 22.4px / 24.6px |
| Panel heading | a card's title | 18.4px / 23.9px | same |
| Lede | `site-lede` | 19.2px / 29.76px, at most 58ch | 16.32px / 25.3px |
| Body | | 16px / 24.8px | same |
| Note | `site-note`, `text-sm` | 14.4px / 22.3px, at most 72ch | same |
| Small | `text-xs` | 12.8px / 19.2px | same |
| Label | `site-eyebrow` | Geist Mono 11.52px, 500, 0.16em, capitals | same |
| Micro label | `site-micro`, a badge, a tag, a readout caption | Geist Mono 10.56px, 500, 0.12em, capitals | same |
| State word | `site-state` | Geist Mono 12px, 500, 0.16em, capitals | same |
| Button | `site-btn` | Geist Mono 12.8px, 500 (600 filled), 0.1em, capitals | same |
| Panel title bar | `site-panel-title` | Geist Mono 11.2px, 500, 0.14em, capitals | same |
| Status text | `site-status` | Geist Mono 12.8px / 18.6px, sentence case | same |
| Figure | a readout's `dd` | Geist Mono 24px, 500, tabular | same |
| Clock | `site-clock` | Geist Mono 40px | 28px |

### Named Rules

- **Capitals are for short labels.** Mono capitals carry at most about 24 characters: a tag, a badge, a state word, an item of a title bar, one part of a label (a label may join two or three such parts with `//`). A sentence stays in sans, in sentence case, and may wrap: a verification badge, a stage line, a run label, a field label. Buttons keep the button face at any length and wrap below 640px.
- **Two title sizes below the front page.** The page title, and the compact title for a page whose stage needs the height and for the parts of a page.
- **Figures are mono and tabular**, with the caption under the figure and first in the markup.
- **Signs are type**: `→` leads on in the same tab, `↗` opens a new tab, `✓` found, `+` and `–` open and close, `//` parts a label and is hidden from screen readers. An icon from the icon set stays only where it names a control that has no words (microphone, send, copy) or carries a state.

## Layout

- **Wrap**: `site-wrap`, `min(1120px, 100% - 2rem)`: 160px free at 1440, 16px at 390.
- **Page**: `main.site-wrap.site-page`: 64px (40px on a phone) from the header to the label, 112px (56px) to the footer, 48px (28px) between its blocks.
- **Head**: label row, title, lede, 14.4px apart. The label row may end in a state word. From 900px a head may carry a core at its right (11rem); below 900px that core is not shown.
- **Split**: `site-split`: the work on the left (1.25fr), one instrument on the right (0.75fr, `site-rail`), from 900px; 670px and 402px at 1440. One column below 900px, in the order of the markup. A rail may stay in view (`site-rail--sticky`) only on a window at least 900px wide and 700px tall, and only when it is shorter than that.
- **Parts**: `site-section` under a soft line; inside `site-numbered` each part is counted `01 //`, `02 //` above its title.
- **Breakpoints**: 640px (header on one row), 768px (table columns), 900px (two columns, head core). The front page, `/setup` and `/autopilot` turn at 900px too.
- No page scrolls sideways at 390px. The header's navigation fits at 320px.

## Elevation & Depth

There are no drop shadows. Depth is light.

- **The ground**: `#05080d`, a fixed layer with a 56px grid of 1px soft lines, a cyan light `radial-gradient(60% 55% at 78% 8%, rgb(79 216 255 / 0.13), transparent 70%)` and an amber light `radial-gradient(45% 40% at 5% 70%, rgb(255 181 71 / 0.06), transparent 70%)`.
- **A panel** stands on it with the panel gradient, a 1px line and two corner brackets.
- **A glow** is a blur without offset in the element's own colour: 8px on a light, 30px on a filled button (44px under the pointer), 24px on the source a citation number has jumped to, 28px behind the clock.

### Named Rules

- **Brackets**: 14 by 14px, 2px cyan, top left and bottom right, drawn at -1px over the panel's own border. They use both pseudo-elements of the panel, so a panel never clips its overflow and a box that scrolls is an inner element.
- **One edge**: `--border` is the panel line (0.22). Dividers inside a panel are the soft line (0.08).

## Shapes

One corner: 3px. A person's chat message is the one round shape (16px with one 4px corner). Lights, the core and the `/setup` switch are round. Inside a replay the pictures of other people's software keep their own shapes.

## Components

Each part is a class in `site.css`; tones are modifier classes (`--cyan`, `--amber`, `--green`, `--dim`).

| Part | Name | Values | Use it for |
| --- | --- | --- | --- |
| Page head | `PageHead` from `@/components/site/page-head` (`label`, `labelTone`, `state`, `title`, `titleId`, `compact`, `lede`, `aside`, `children`); `Slash` for the `//` | label, title, lede 14.4px apart; state word at the right end of the label row; `aside` 11rem from 900px | The head of every page below the front page. Write a two-part label as `Kind<Slash />Label` |
| Split and rail | `site-split`, `site-split--three`, `site-rail`, `site-rail--sticky` | 1.25fr and 0.75fr from 900px; the rail spans the rows beside it | A page with one instrument: the live run, the voice orb, the case file's readouts |
| Stack, actions | `site-stack`, `site-actions` | 48px (28px) between blocks; 12px between buttons | Blocks under each other; a row of buttons |
| Part | `site-section`, `site-section-head`, `site-numbered`, `site-h2` | soft line above, 40px (28px) under it; counter in the label voice | The parts of a long page |
| Panel | `site-panel`, `site-panel-title`, `site-panel-body`; any shared `Card` | gradient, 1px line, 3px, two brackets; title bar 11.2px mono capitals, first child cyan, soft line under it; body padding 1rem | The main surfaces of a page. A hand-written `border bg-card` box takes the fill and the edge without brackets |
| Ruled row | `site-row`, `--roomy`, `--amber`, `--green` | 2px left rule, fill at 5%, padding 0.6rem 0.8rem (roomy 0.85rem 1rem) | A page that was read, a source, AIDaddy's reply, an error (amber), a confirmed line (green) |
| Readouts | `site-readouts`, `--stack` | joined cells with soft lines; figure 24px mono; caption 10.56px mono capitals | Two to five figures with captions |
| Button | `site-btn`; `--primary` (cyan fill, glow), `--amber` (the family's yes), `--compact` (44px), `--cta` (48px on a shared button), `--icon` | 48px, 3px, line and 5% fill, mono capitals; hover: cyan line and 14% fill; disabled: half opacity, no glow, no hover | Every button and every link that looks like one. A shared `Button` and `linkButtonClasses` carry it by themselves |
| Pressed button | `aria-pressed="true"` on a `site-btn`; with `data-tone="amber"` | cyan line, 14% fill, cyan text; amber for a live microphone | A switch that is on |
| Field | shared `Input`, `Textarea`, `select` in a page | `--input` edge, 5% cyan fill, 3px, 44px; label in sans above it | Every form field |
| Tag | `site-tag`, `--green`, `--amber`, `--cyan`; a shared `Badge` | 10.56px mono capitals, 1px line, 3px, at least 24px tall | A status word in a box. A badge that carries a sentence takes the class `whitespace-normal` and stays in sans |
| Source chip | `site-chip`, `--open`, `--lg`; `site-chips` for a row | 28px (44px large), green line, green at 8%; `--open` is an amber outline | A citation number. Green: its quote was found. Amber outline: it was not |
| State word | `site-state`, `--cyan`, `--amber`, `--green`, `--working` | an 8px light and a 12px mono word | The state of a screen or of AIDaddy |
| Light | `site-dot`, `--cyan`, `--amber`, `--green`, `--working` | 8px, glow 8px at 70% | A light inside a line of text |
| Status text | `site-status` | mono 12.8px, sentence case | A short machine fact; on a `site-row` it is the status line |
| Bar | `site-bar`, `--waiting`, `--running`, `--stopped` | 3px track at 14%, cyan fill with a 10px glow | One search running; how far a recording is |
| Clock | `site-clock`, `--done` | cyan with a glow, green when done | Elapsed seconds of a live run |
| Links | `site-link`; `site-arrow` | cyan, underlined, offset 3px; arrow link 14.72px, 44px tall, underlined under the pointer | A link in a sentence (any link inside a paragraph is one by itself); a link that stands alone and ends in `→` or `↗` |
| Bubble | `site-bubble` | 16px with one 4px corner, `#141f2e` | A person's own message |
| Numbered steps | `site-steps` on an `ol` with `role="list"` | amber mono counters at 13.6px, dashed soft line under each | A plan |
| Core | `Core` from `@/components/site/core` (`state`: idle, active, done; `className`: `hud-core--small` 16rem, `hud-core--tiny` 4.5rem, 3.5rem on a phone) | five rings, a glow, a heart; see the state code | AIDaddy's face where it shows a state |
| Voice orb | `AIDaddyAvatar` inside `site-orb` in a `site-station` | 4.5rem; 16rem beside the conversation on a window 900px wide and 700px tall | The one face of `/chat` |
| Small mark | the drawing below | one broken ring, a soft heart, a white centre, on a `#05080d` tile or disc | Anything under 48px: the tab icon, the extension's 16 and 32px icons, the avatars inside the replays |
| Header and footer | `SiteShell` | header 61px (93px below 640px); below 380px the third link reads "Talk" | Every page |

The small mark, the only drawing of the face for small sizes (for a round avatar the `rect` becomes `<circle cx="16" cy="16" r="16" fill="#05080d"/>`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <radialGradient id="g">
      <stop offset="0" stop-color="#e6f9ff"/>
      <stop offset="0.35" stop-color="#4fd8ff"/>
      <stop offset="1" stop-color="#4fd8ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="32" height="32" rx="3" fill="#05080d"/>
  <circle cx="16" cy="16" r="11.5" fill="none" stroke="#4fd8ff" stroke-width="2.6" stroke-dasharray="39 7.5 17 8.76" transform="rotate(-62 16 16)"/>
  <circle cx="16" cy="16" r="7" fill="url(#g)"/>
  <circle cx="16" cy="16" r="2.6" fill="#f2fcff"/>
</svg>
```

From 48px up the picture is `public/aidaddy-avatar.svg`.

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
| `.rounded-sm` to `.rounded-4xl` | border-radius (3px) | `rounded-full`, `rounded-none` |
| `.border.bg-card` | background (the panel fill) | leave out `bg-card` |
| input, select | min-height 44px, corner, fill, no ring, edge on focus | |
| textarea | corner, fill, no ring, edge on focus; its height stays free | |
| badge | height, padding, font, tracking, case, wrapping; colours stay free | `whitespace-normal` for a sentence |
| card | position, overflow, border, corner, fill, no ring; title size | |
| `site-btn` | display, gap, minimum size, padding, border, corner, fill, shadow, colour, font, tracking, case | the modifiers; width and margin stay free |

## Motion

Slow, and only where it means something. These things move, and nothing else:

1. **The core**: slow at rest (22 to 80 s a turn), a second fast turn while AIDaddy works (1.8 to 6 s), the heart breathing in 5 s (1.1 s while working); colour changes take 0.8 s.
2. **The voice orb**: still at rest and while it listens; its inner rings turn (2.4 and 3.2 s) only while it thinks; its heart grows with the voice.
3. **A working light** fades to a quarter and back in 1.1 s.
4. **A running bar** sweeps in 1.6 s; a recording's bar fills over the recording's own length and ends green.
5. **A new row** rises 10px over 0.45 s (`site-rise`).
6. **A control answers** the pointer in 0.2 s (border, fill, glow).
7. The front page's own story: its scroll reveal, its replay, its boot lines.

One working sign per panel: where a panel holds the core, the core, the clock and the bars are enough. With `prefers-reduced-motion: reduce` every animation and transition under `.site` is off, each moving part shows its end state, and the word beside it carries the meaning.

## Accessibility

- WCAG AA on the ground and on a panel: every text pair above is 8:1 or better; a field's edge is 3.3:1.
- **One focus sign**: `outline: 2px solid #ffb547; outline-offset: 3px`, on every control. No ring, no change of border.
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
- Don't set a sentence in mono capitals.
- Don't let colour or motion carry a meaning alone.
- Don't put a second face on a screen: one core where it carries a state.
- Don't animate what means nothing: no turning mark in the header, no orb that turns at rest beside text someone is reading.

## Not part of the system

- **The replay pictures** (`.chatdemo`, `.tdemo`, `.bdemo`, `.cdemo`): pictures of other people's software, light on purpose, with their own shapes. No shared rule reaches inside `.demo-stage`. Their size, zoom steps and timing are fixed, because the pitch videos are recorded from them.
- **The front page's story pieces** in `hud.css`: the family chat panel, the gauges, the schematic, the boot lines, and its ten mono and eleven small sans sizes. They are measured, not unified. `hud.css` also keeps its own copies of the button, the panel and the core; they are identical to the shared ones.
- **The browser extension** cannot load `site.css` and copies the values by hand. It uses the system fonts behind Geist, and the dot of its in-page panel keeps its four colours (watching cyan, checking amber, ready green, not looking grey).
- **A mark in the header**, a scan line on a panel, a monitor frame around a replay: considered and left out.
- **Tables**: the scorecard styles its own in `src/app/scorecard/scorecard.css`.
- **Popups**: the tokens sit on `.site`, and the body under it is white. A popup that is portaled to the body needs the tokens moved first.
- **A light theme.**
