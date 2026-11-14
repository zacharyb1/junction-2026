---
name: Kaveri
description: A station sign system for the landing page of a butler that lives in a family group chat.
colors:
  sign-yellow: "oklch(0.875 0.13 92)"
  sign-black: "oklch(0.205 0.012 262)"
  route-blue: "oklch(0.43 0.075 258)"
  concourse: "oklch(0.962 0.004 250)"
  panel: "oklch(1 0 0)"
  status-go: "oklch(0.5 0.14 152)"
  status-go-lit: "oklch(0.84 0.19 150)"
  status-stop: "oklch(0.53 0.19 32)"
  status-stop-lit: "oklch(0.78 0.15 40)"
  ink-soft: "oklch(0.42 0.015 262)"
  on-black-soft: "oklch(0.82 0.01 262)"
  rule: "oklch(0.205 0.012 262 / 0.16)"
  rule-lit: "oklch(1 0 0 / 0.2)"
typography:
  display:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.625rem, 1.2rem + 6.1vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.018em"
  headline:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 3vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.12
  statement:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1rem + 1.3vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
  lead:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.1875rem, 1.05rem + 0.55vw, 1.5rem)"
    fontWeight: 500
    lineHeight: 1.24
  body:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Sofia Sans Semi Condensed, Sofia Sans, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.45
  note:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.45
  figure:
    fontFamily: "Sofia Sans Semi Condensed, Sofia Sans, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    fontFeature: "tnum"
rounded:
  lamp: "2px"
  number: "3px"
  panel: "4px"
  bubble: "14px"
spacing:
  gutter-phone: "1rem"
  gutter-tablet: "1.5rem"
  gutter-desktop: "2.5rem"
  section-phone: "3.5rem"
  section-desktop: "6rem"
components:
  way:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.sign-black}"
    typography: "{typography.body}"
    height: "3rem"
    padding: "0.625rem 1rem"
  way-primary:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.panel}"
    typography: "{typography.title}"
    height: "3.5rem"
    padding: "0.625rem 1rem"
  arrow-square:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
    width: "3.5rem"
  arrow-square-primary:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
    width: "3.5rem"
  arrow-square-hover:
    backgroundColor: "{colors.route-blue}"
    textColor: "{colors.panel}"
  arrow-square-primary-hover:
    backgroundColor: "{colors.route-blue}"
    textColor: "{colors.panel}"
  source-number:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.sign-black}"
    typography: "{typography.title}"
    rounded: "{rounded.number}"
    size: "2.25rem"
  source-number-open:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
  board-head:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
    padding: "0.5625rem 0.75rem"
  board:
    backgroundColor: "{colors.concourse}"
    textColor: "{colors.sign-black}"
    rounded: "{rounded.panel}"
  lamp-go:
    backgroundColor: "{colors.status-go}"
    textColor: "{colors.panel}"
    rounded: "{rounded.lamp}"
    size: "1.25rem"
  lamp-go-lit:
    backgroundColor: "{colors.status-go-lit}"
    textColor: "{colors.sign-black}"
    rounded: "{rounded.lamp}"
    size: "1.25rem"
  lamp-stop:
    backgroundColor: "{colors.status-stop}"
    textColor: "{colors.panel}"
    rounded: "{rounded.lamp}"
    size: "1.25rem"
  lamp-stop-lit:
    backgroundColor: "{colors.status-stop-lit}"
    textColor: "{colors.sign-black}"
    rounded: "{rounded.lamp}"
    size: "1.25rem"
  lamp-attention:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
    rounded: "{rounded.lamp}"
    size: "1.25rem"
  chip:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.sign-black}"
    typography: "{typography.label}"
    rounded: "{rounded.number}"
    padding: "0.25rem 0.5rem"
---

# Design System: Kaveri

**Scope.** This system is live on the landing page only (`src/app/page.tsx`, `src/components/landing/`). Its tokens and rules are in `src/components/landing/landing.css`, scoped to the `.landing` wrapper. `/try` and `/c/[id]` still use the shared shadcn tokens in `src/app/globals.css`. Taking this look to those pages is a team decision that has not been made.

## Overview

**Creative North Star: "Opaste, the station sign"**

Opaste is Finnish for a sign that shows the way. Kaveri's first users arrive in a country whose letters they cannot read, and the first thing that works for them there is the sign system of an airport or a station: an arrow, a number, a time. The page is built as that sign system. It tells a newcomer where to go and by when, and every line carries a number that leads to its source.

The system is flat and restrained. Cool grey and white carry the page, with a black departure board giving the scorecard its own weight. Yellow marks small cues, and muted blue carries links and the line map. One civic signage typeface does all the work, heavy at sign scale. There are no photographs and no illustrations. The pictures are the product's own interface: a family chat, a plan with numbered sources, a scorecard.

The product interface supplies the imagery: the family chat and its plan board sit directly below the sign.

**Key Characteristics:**
- Neutral fields, small yellow cues and muted blue routes; a black field for the scorecard.
- Type as the only image, set at sign scale.
- Every claim sits on the same row as its source number.
- Flat panels, small corners, no shadows.
- Arrows mean direction: right for a page of this site, up and right for another site, down for further down this page.

## Colors

Three neutral grounds, two restrained accents and two status colours. A status colour appears as a small lamp, and the lit red once more as the error line under a failed scenario.

### Primary
- **Signal Yellow** (`sign-yellow`): small cues that direct you. Source numbers, chips, arrows on black squares, Kaveri's mark and chat bubble, the Example tag, board titles and figures on black, and focus rings on black. Text on it is Sign Black. Yellow does not fill a section.

### Secondary
- **Route Blue** (`route-blue`): a muted blue for text links on light ground, the line map, hovered arrow squares, focus rings on light ground and on every direction row. It does not fill a section or a resting direction row.

### Tertiary
- **Go Green** (`status-go`, and `status-go-lit` on black): a quote that was found, a scenario that passed. Always a lamp with a check: white on green on light ground, black on the lit green on the black board.
- **Stop Red** (`status-stop`, and `status-stop-lit` on black): a quote that was not found, a scenario that failed. Always a lamp with a cross, coloured the same way.

### Neutral
- **Sign Black** (`sign-black`): all type on light ground, the primary direction row, arrow squares, the scorecard board, the footer, 2px rules.
- **Concourse** (`concourse`): the page's own ground, the overhead sign and its overscroll area, chat bubbles from other people, and the plan board's rows.
- **Panel White** (`panel`): the chat thread, an opened quote, specimens, secondary direction rows including the scorecard link, the line map and Telegram sections, the closing action band, the QR tile, and type on black or a hovered blue arrow square.
- **Soft inks** (`ink-soft`, `on-black-soft`): secondary text on neutral light ground and black respectively.
- **Hairlines** (`rule`, `rule-lit`): the 1px line between rows inside a board, and before the third hero direction row to separate the two white routes. Sign Black at 16% on light ground, white at 20% on dark ground.

### Named Rules
**The Field Rule.** Section fields are Concourse grey, Panel White or Sign Black. Yellow belongs to small signs and the bot's chat bubble; muted blue belongs to links, focus, hover and the line map. No gradients or decorative border accents. The blue ring and line of the line map are the map itself, not a border on a panel.

**The Two-Signal Rule.** Status is never carried by colour alone. A lamp always holds a glyph, and its words stand next to it. The one place that shows a lamp without its word is the result lane of the scorecard on a phone, where the word stays for screen readers.

**The Own-Ink Rule.** Secondary text uses `ink-soft` on light neutral fields and `on-black-soft` on black. Keep the softer text legible against its actual ground.

## Typography

**Display Font:** Sofia Sans (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Sofia Sans
**Label Font:** Sofia Sans Semi Condensed

**Character:** Sofia Sans was drawn for a city's public signs and notices. It is plain, slightly narrow and very legible, and at weight 800 it reads like a station name. The semi-condensed width sets boards, tables and small labels, where a row has to hold more.

Both are loaded with `next/font` in `src/components/landing/fonts.ts` and reach the page as `--font-sign` and `--font-board`.

### Hierarchy
The ramp is nine tokens at the top of `landing.css` (`--text-note` to `--text-display`). Every font size on the page is one of them. The one zero in the file is not a size: it hides the head of the result lane on a phone.

- **Display** (800, 42px to 88px fluid, 0.98): the one headline on the overhead sign. Balanced lines.
- **Headline** (800, 32px to 56px fluid, 1.02): section titles. The last sign uses the same size at line height 1.
- **Statement** (600, 22px to 32px fluid, 1.2): the sentence under the example chat that says who Kaveri is built for.
- **Title** (800, 22px, 1.12): stop names, claims, notices, the product name. The primary direction row uses this size at 700. A source numeral uses it in the semi-condensed width.
- **Lead** (500, 19px to 24px fluid, 1.24): the sentence on the sign. Emphasis is weight 800, nothing else.
- **Body** (400, 17px, 1.45): running text, section hints (500), direction rows (700), table rows. Paragraphs are capped near 46ch.
- **Label** (Semi Condensed 500 to 700, 15px): deadlines, sources, chips, the run strip, the line under a scenario. The regular width at this size sets the gloss beside the name, the section links (700), the head strip of the chat, the small print and the footer.
- **Note** (400 to 700, 14px): captions (400), stage directions in the chat (600), sender names (700). In the semi-condensed width it sets column heads, the name of the number column, field names in a specimen, the hint under the plan and the second line of a direction row.
- **Figure** (Semi Condensed 800, 36px, 1.1, tabular): the scorecard totals, and source numerals on a plan board from 64rem.

Label and Note have no line height of their own. They take it from where they sit: the page's 1.45 in running text, 1.2 in a chip or a head strip, the row's own in a direction row or a table.

### Named Rules
**The One Family Rule.** Everything is Sofia Sans in two widths. No serif, no monospace: an address or a number is set in the semi-condensed width, numbers with tabular figures.

**The Weight Rule.** Emphasis comes from weight (800 against 400 or 500) and size. No italics, no underline for emphasis, no highlight.

## Layout

A phone comes first. Content sits in one column inside a wrap of at most 84rem with a gutter of 1rem, 1.5rem from 40rem and 2.5rem from 64rem. Direction rows on the overhead sign ignore the gutter below 64rem and run edge to edge.

From 64rem the page uses one two-column split, `5fr` to `6fr` with a column gap of 8%: section title beside its hint, claim beside its specimen, the Telegram text beside its QR code. The overhead sign mirrors it (`6fr` to `5fr`), so the direction rows sit on the right. Inside the chat thread the chat and its plan board take the same `5fr` to `6fr` with a gap of 2.5rem. The line map turns from vertical to horizontal at the same width. From 48rem tables get their own columns, the three notices sit side by side and the scorecard totals run across the board.

Sections are full-bleed fields with 3.5rem of vertical padding, 6rem from 64rem. Density alternates: the sign and the boards are dense, the line map and the notices are open. Rows inside a section are separated by a 2px Sign Black rule above each row, never by cards.

Nothing may scroll sideways from 320px up.

A phone gets a shorter example: below 40rem the two small-talk messages are left out and only their note stays, so the life event, Kaveri's reply and the first numbered plan row share the first screen with the sign.

## Elevation & Depth

Flat. There are no shadows anywhere, and no blur or glass. Depth is said with colour only: a white panel on the grey concourse, a grey plan board inside the white chat thread, a white quote panel inside the grey board, a black board on its own field. The one `box-shadow` in the code is the white inner ring of a direction row's focus state. It draws a ring, not depth.

### Named Rules
**The Enamel Rule.** A sign is a flat plate. If something needs to stand out, give it a field or a rule, never a shadow.

## Shapes

Small, even corners: 4px on panels, boards, the QR tile and stand-alone direction rows, 3px on number squares, chips, Kaveri's mark and an opened quote, 2px on lamps. Full-bleed fields and rows on the overhead sign have none. Chat bubbles are the one soft shape (14px, with a 4px corner towards the speaker), because a chat has to stay recognisable as a chat. The stops of the line map are the one circle.

Lines are either a 2px rule in the ground's ink, black on light and white on black (a division that matters), or a 1px hairline, `rule` on light ground and `rule-lit` on dark ground (rows inside a board). Panels are never outlined: a panel is told from its ground by its field.

Glyphs are drawn on a 24 unit grid with a 3 unit stroke, square ends and mitred joins: arrow, check, cross and attention mark. The service bell that is Kaveri's mark is a filled shape on the same grid. They live in `src/components/landing/glyphs.tsx`. There is no other icon set on the page.

## Components

In the frontmatter a component's `typography` names its size step. Its weight and width are given here.

### Direction rows
The page's link that acts like a button (`way.tsx`).
- **Shape:** a full-width row, label on the left at Body size and weight 700, a 3.5rem arrow square on the right. At least 3rem tall, the primary row 3.5rem (3.25rem and 3.75rem from 64rem). Corners only when the row stands alone inside a section.
- **Arrow square:** the same width on every row so stacked squares form one column. Every resting square is Sign Black with a yellow arrow, including the primary row.
- **Primary:** Sign Black with a white label at Title size and weight 700. Used for the hero demo action and the Telegram section's bot link or browser fallback.
- **Secondary:** Panel White with a Sign Black label. The sample case and scorecard routes share this treatment, with a 1px rule before the third hero row. A row may carry a second, smaller line under its label (Note size, semi-condensed 500).
- **Hover and press:** every interactive direction row on this page turns its arrow square muted Route Blue with a white arrow, including primary rows. The arrow travels 0.25rem in its own direction, 0.5rem when pressed. Focus is a blue ring inside the row with a white ring inside that. Reduced motion keeps the colour change and drops the travel. A static example row keeps its resting colours and does not move.
- **The last sign:** the footer opens with the primary action as a full-bleed white band at headline size. Its black square with a yellow arrow reaches the edge of the screen. On hover the square turns muted Route Blue with a white arrow and the arrow travels 0.5rem. Its focus ring is Route Blue, inside the band.

### Source numbers
- **Style:** a yellow square with a black tabular numeral in the semi-condensed width at 800. 2.25rem with a Title numeral on a phone, 3.25rem with a Figure numeral from 64rem.
- **State:** black with a yellow numeral while its quote is open or the row is hovered.

### Plan board
The signature component (`chat-illustration.tsx`).
- **Structure:** a grey panel under a black head. The head holds the plan's title in yellow and the word "Source" over the number column. Then rows of what, by when and source number, a one-line hint, and a direction row to the case file. A row is at least 3.5rem tall, 4rem from 64rem, with a 0.75rem inset.
- **Behaviour:** each row is a native `<details>` sharing one `name`, so the whole row is the control, it works without script, and one quote is open at a time. One quote is open when the page loads. The open quote is a white panel with the sentence in the page's own words, the publisher and host, and a link to the page at that sentence.
- **Motion:** the departure-board flap. A row turns down from its top edge with `cubic-bezier(0.16, 1, 0.3, 1)`: once for the rows on load from 64rem (0.55s each, 0.11s apart), and for each opened quote at every width (0.4s). Reduced motion removes it.

### Chat thread
- **Style:** a white panel under a black head strip. Other people speak in Concourse grey, the phone's owner in Sign Black, Kaveri in Signal Yellow. Stage directions are a small centred line between two hairlines.

### Line map
- **Style:** ringed stops (1.5rem, 0.375rem Route Blue ring, filled with the field's colour) on a 0.375rem blue line. The order of the stops is the content, so there are no step numbers.

### Status lamps and chips
- **Lamp:** a 1.25rem square with a glyph. Green with a white check, red with a white cross, black with a yellow attention mark. On the black board the green and red are the lit values and the glyph is black.
- **Chip:** yellow with black type, semi-condensed 700, for a state that waits for the reader.

### Departure board
The scorecard (`scorecard.tsx`).
- **Structure:** one board on a black field. A strip with the run's name and its clock (for example "Ran 14 Nov, 00:23"), a header line of totals, then the lanes.
- **Totals:** a yellow Figure with its label beside it on the same line. A two-column list on a phone. From 48rem the pairs run across the board and wrap if they have to. Never a tile with a number over a label.
- **Lanes:** the result lamp comes first in its own narrow lane (lamp only on a phone, lamp and word from 48rem), then the scenario, country, quotes, time and an underlined link to the case file with a 44px tap height. Below 48rem country, quotes and time fold into one line under the scenario. Group names are yellow. Rows are set in the semi-condensed width with tabular figures.

### Navigation
- **Style:** a single row of section links on the overhead sign from 64rem, Label size at weight 700, underlined on hover. A phone has no navigation: the page is one column and the direction rows are the ways in.

## Do's and Don'ts

### Do:
- **Do** let neutral section fields run edge to edge, keeping yellow cues small and blue tied to routes and interaction.
- **Do** keep a claim and its source number on the same row.
- **Do** use the arrow that tells the truth: right for a page of this site, up and right for another site, down for an anchor.
- **Do** tint secondary text from its ground with the matching soft ink.
- **Do** keep tap targets at 44px or more and status readable without colour.
- **Do** take every font size from the ramp tokens in `landing.css`.
- **Do** read sample content from `src/data/sample-case.json` and totals from `src/data/scorecard.json`.

### Don't:
- **Don't** add shadows, gradients, blur or glass.
- **Don't** put an icon in a rounded square above a heading, or build a section from same-size cards.
- **Don't** outline panels in black or offset anything: yellow and black with outlines stops being a sign and becomes a poster.
- **Don't** stack a big number over a small label in a tile. A total sits on a line with its label.
- **Don't** bring in a second typeface, a monospace or italics.
- **Don't** use Kela's, Vero's, Telegram's or a transit operator's colours, marks or layouts. Kaveri is not affiliated with any of them.
- **Don't** use yellow or blue for decoration. Yellow directs, blue routes.
