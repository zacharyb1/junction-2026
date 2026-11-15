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


<!-- impeccable:scoped-design route="/avatar" tokens="avatar-studio" -->
# Scoped Design System: Avatar studio (`/avatar`)

This appendix records only the built `/avatar` prototype on 15 November 2026. The preceding reading-table document, its frontmatter and the main site's design authority remain unchanged. The avatar tokens below use an `avatar-` prefix and apply only inside this route; they are a separate YAML token document, not additions to the reading-table palette. `.impeccable/design.json` points to this block and extends it with scoped component samples, motion and responsive behavior.

```yaml
name: AIDaddy — Avatar studio (/avatar only)
description: A chalk-sage companion scene with a pine-ink conversation and natural movement.
colors:
  avatar-ground: '#f3f4ee'
  avatar-ink: '#263d34'
  avatar-muted: '#637167'
  avatar-line: '#dce1d7'
  avatar-pine: '#355b48'
  avatar-pine-hover: '#244534'
  avatar-paper: '#fffef9'
  avatar-selection: '#d4e0c9'
  avatar-scene: '#d9ded2'
  avatar-control-hover: '#e7ebe1'
  avatar-input-line: '#ccd6c6'
  avatar-input-ground: '#f7f8f2'
  avatar-message-inset: '#edf0e6'
typography:
  avatar-body:
    fontFamily: Geist, sans-serif
    fontSize: 14px
    lineHeight: 1.55
  avatar-name:
    fontFamily: Geist, sans-serif
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -.9px
  avatar-welcome:
    fontFamily: Geist, sans-serif
    fontSize: 32px
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: -.95px
  avatar-welcome-mobile:
    fontFamily: Geist, sans-serif
    fontSize: 22px
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: -.5px
  avatar-prose:
    fontFamily: Geist, sans-serif
    fontSize: 13px
    lineHeight: 1.7
  avatar-panel-title:
    fontFamily: Geist, sans-serif
    fontSize: 14px
    fontWeight: 550
    lineHeight: 1.55
  avatar-field-label:
    fontFamily: Geist, sans-serif
    fontSize: 12px
    fontWeight: 550
    lineHeight: 1.55
rounded:
  avatar-scene: 16px
  avatar-panel: 12px
  avatar-composer: 10px
  avatar-control: 7px
  avatar-send: 8px
  avatar-choice: 6px
spacing:
  avatar-small-gap: 8px
  avatar-control-gap: 12px
  avatar-inset: 24px
  avatar-shell: 48px
  avatar-shell-medium: 30px
  avatar-shell-mobile: 16px
components:
  avatar-button-primary:
    backgroundColor: '{colors.avatar-pine}'
    textColor: '{colors.avatar-paper}'
    rounded: '{rounded.avatar-control}'
    padding: 11px 15px
  avatar-button-primary-hover:
    backgroundColor: '{colors.avatar-pine-hover}'
    textColor: '{colors.avatar-paper}'
  avatar-send:
    backgroundColor: '{colors.avatar-pine}'
    textColor: '{colors.avatar-paper}'
    rounded: '{rounded.avatar-send}'
    height: 44px
    width: 44px
  avatar-name-input:
    backgroundColor: '{colors.avatar-paper}'
    textColor: '{colors.avatar-ink}'
    rounded: '{rounded.avatar-control}'
    padding: 9px 11px
    width: 100%
  avatar-conversation-panel:
    backgroundColor: '{colors.avatar-paper}'
    textColor: '{colors.avatar-ink}'
    rounded: '{rounded.avatar-panel}'
  avatar-composer:
    backgroundColor: '{colors.avatar-input-ground}'
    textColor: '{colors.avatar-ink}'
    rounded: '{rounded.avatar-composer}'
    padding: 10px 9px 10px 14px
```

## Overview

**Creative North Star: "Humanist field guide to a personal companion"**

Avatar studio is a humanist field guide to a personal companion: chalk-sage ground, pine ink, natural media and plain sans typography. The filmed or illustrated scene carries presence; the conversation carries useful words. Soft corners and fine rules organize the controls without competing with the person.

`src/app/avatar/page.tsx` renders `SiteShell bare`. The light frame override requires a site wrapper containing the avatar studio; the avatar stylesheet owns this route's visual rules. This is an isolated concept, not a replacement for Zachary's main UI or the reading-table world. The scene-led composition is recorded in the companion surface brief and is not a global page template.

**Key Characteristics:**
- A large scene beside a narrower conversation, followed by a single-column mobile sequence.
- Pine text and actions on pale sage and warm paper, with quiet tonal insets.
- Natural media motion and explicit text status; the user can pause a prepared performance, including its soundtrack.
- Names, focus and tone are real settings, with honest distinctions between filmed, illustrated and recorded material.

## Colors

### Primary
- **Pine action** (`avatar-pine`) supplies send/save fills, selected outlines, input focus and carets; **deep pine** (`avatar-pine-hover`) is the filled-action hover.

### Neutral
- **Chalk sage** (`avatar-ground`) is the page ground; **warm paper** (`avatar-paper`) is the conversation, fields and scene controls.
- **Pine ink** (`avatar-ink`) and **quiet sage ink** (`avatar-muted`) separate reading text from supporting labels.
- **Sage rule** (`avatar-line`) divides groups. **Input rule** (`avatar-input-line`) defines fields, and **input ground** (`avatar-input-ground`) separates the composer.
- **Scene sage** (`avatar-scene`) is the media fallback. **Control wash** (`avatar-control-hover`), **message inset** (`avatar-message-inset`) and **selection sage** (`avatar-selection`) are purposeful state surfaces.

**The Scoped World Rule.** These tokens belong to `/avatar`; the existing site and reading-table tokens keep their meanings and authority.

## Typography

Geist loads through the existing root `next/font` setup and reaches the avatar through `var(--font-sans), sans-serif`. The body, companion name, welcome line, replies and field labels use the extracted roles above. Diagnostic event text uses the existing Geist Mono variable only inside the secondary disclosure.

The name is the primary page heading; the welcome line is a conversation invitation. Below 540px the name is 26px. At 900px and below, the welcome switches to the compact `avatar-welcome-mobile` role and shorter text. Replies use the prose role with paragraph gaps, explicit lists and underlined links. On small phones the composer text becomes 16px. The implementation also uses compact 9–12px hints and supporting labels; these are observed details, not a recommended global minimum text scale.

## Layout

The page is centered at a maximum width of 1600px. Its default side inset is `avatar-shell`; it becomes `avatar-shell-medium` at 1200px, `avatar-inset` at 900px, and `avatar-shell-mobile` at 540px. The topbar is 96px high, then 78px at 900px and 72px at 540px.

Above 900px, the grid gives the scene the remaining width beside a 390px conversation column, with a 40px gap. At 1200px and below the column is 350px with a 24px gap; at 1500px and above it is 420px with a 48px gap. The scene uses an 8:5 frame with cover-cropped media. The desktop conversation panel height is `clamp(610px, calc(100dvh - 190px), 790px)`; its thread scrolls and its composer remains a flex child beneath it.

At 900px and below the scene leads a single column, capped at 380px high. The stage keeps an explicit 100% width, so this height cap preserves a full-width tablet scene with cover-cropped media. The empty conversation is content-sized, with a compact invitation and prompt rows; below 540px only the first prompt is shown. Once messages exist, the conversation height is `clamp(360px, 60dvh, 560px)` and the thread scrolls within the remaining space. The composer stays in normal document flow beneath that thread: it is neither sticky nor a floating overlay. The settings panel has its own vertical scrolling and a 760px mobile maximum height.

**The In-Flow Conversation Rule.** Preserve the bounded message thread and its in-flow composer together; the composer must not cover messages or controls at the bottom of the panel.

## Elevation & Depth

Depth is mostly tonal: warm paper against chalk sage, a pale user-message inset and fine borders. Only the media status note and round pause control use the soft shadow (`0 1px 5px #182a2412`). Focused composers and selected portraits use a 1px pine spread ring. The sidecar records these exact shadows; no global elevated-card system is inferred from them.

## Shapes

The scene, conversation panel, composer and small controls use the separate radius tokens above. The scene reduces to a 10px radius at 540px. The pause control is circular. Portrait options and inputs have small corners; tone choices use the choice radius. Controls retain a 44px minimum height, and icon-only actions have accessible names.

## Components

### Actions and navigation

Send and Save companion use pine fills, warm-paper text and deep-pine hover. Personalize is a transparent, outlined control whose hover and expanded state share a pale wash. Voice and Try a prepared conversation are quiet text-and-icon buttons beneath the scene. A compact brand link returns home. The prototype information lives in a footer disclosure.

Buttons transition background and text color over 140ms with `ease`; disabled buttons use opacity .42. Focusable elements receive a 2px pine outline with a 4px offset. The composer instead shows a pine border and 1px spread ring while focus is within it. These states are separate from the data state and remain visible without motion.

### Scene and motion

The scene uses a local poster and two video layers, revealing an incoming video only after a decoded frame is available. Every Desk video starts and ends on one rest frame: three idle clips (the rest frame with breathing, slight head movement and blinks) chain in varied order while it waits; a prepared answer plays its own performance, started with its ElevenLabs voice and kept in step with it; a live answer is covered by generic speaking clips timed to the audio. Joins are 100 ms opacity crossfades between near-identical frames. Pause and resume control picture and voice together; muting keeps the picture talking. A completed answer can be explicitly replayed. Stop, or a new message, dissolves out of a gesture into idle over 340 ms; a stopped sentence must not remain frozen with raised hands.

Ari and Noor keep the illustrated shared-pose scheduler. There is no CSS crossfade between faces. Document hiding pauses playback; reduced motion retains the poster and explanatory text while speech remains available. The tiny active status dot breathes over 1.7s; the page disables CSS animations and transitions under reduced motion. Illustrated movement previews and Desk event diagnostics remain inside the secondary disclosure.

Desk uses solo stock footage from Pexels video 5941016; Ari and Noor are original illustrated alternatives. Keep its provenance with `public/avatar/desk/presence.json` and `docs/AVATAR_DESK_ASSETS.md`. The prepared voice is synthetic (ElevenLabs, voice Chris). Prepared answers may use experimental local lip-sync (MuseTalk, mouth region only), live answers are not lip-synchronised, and the page says which applies beside the picture and in the prototype information. Experimental lip-sync is not a claim of finished visual quality; custom appearances and role-specific rooms are not generated by these settings.

### Conversation and sources

Messages use named bylines and readable paragraphs. User messages receive a pale inset; assistant replies remain on paper. Saved citations expand through a native disclosure into source links and quoted text. Prepared scene labels distinguish the saved example from live replies. The clinic and employer follow-ups open their corresponding saved passages immediately and select distinct prepared performances; they do not simulate a new search. Prepared speech has a transcript and explicit replay action. Live completed replies retain Read aloud.

Loading, failure, stopped and incomplete replies have explicit text states. The composer accepts a new message while the previous answer is speaking; sending it interrupts that turn. Stop cancels the current request and voice while preserving completed text and citations. Prepared conversations remain outside live memory, with that separation explained above the composer.

### Personalization and fields

Personalize replaces the conversation panel with settings. Three ready-made look choices show local previews; the selected look has a pine ring and check. The name field accepts up to 32 characters. Focus choices are Everyday support, Letters & paperwork and Thoughtful shopping; response tones are Calm, To the point and Warm. Saving applies the selected name, focus and tone to subsequent live requests and stores preferences in this browser. It does not change the room or prepared script. Switching appearance stops active playback and the current request. Escape and the back action restore focus to Personalize.

## Do's and Don'ts

### Do:
- **Do** keep this world scoped to /avatar and preserve the main site and reading-table designs.
- **Do** keep the mobile composer in normal flow beneath the bounded conversation thread.
- **Do** keep text status, visible focus, 44px button targets and the reduced-motion poster available.
- **Do** preserve source and license attribution when replacing or optimizing the Desk footage or poster.
- **Do** show Desk as a filmed stand-in, Ari and Noor as illustrations, and prepared conversations as saved examples.

### Don't:
- **Don’t** extend these colors, type roles or scene geometry to other routes.
- **Don’t** describe dubbed stock footage as custom generation or synchronized speech, or present recorded research as a live search.
- **Don’t** use motion or a colored dot as the only indication of the assistant’s state.
- **Don’t** turn the movement diagnostics into the primary conversation interface.
