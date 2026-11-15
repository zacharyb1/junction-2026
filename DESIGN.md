---
name: AIDaddy — The family reading table
description: Ivory paper, cranberry annotations and useful words that a family can read and check together.
colors:
  primary: "#98112c"
  primary-hover: "#740b22"
  paper: "#fffaf1"
  panel: "#fffdf8"
  ink: "#211b1d"
  muted-ink: "#65544e"
  rule: "#dfcdb8"
  rule-soft: "#eaded0"
  inset: "#f5ecdd"
  rose: "#f7e9e5"
  rose-ink: "#741129"
  selection: "#f5c7cd"
  confirmed: "#38604a"
  confirmed-fill: "#e8eee3"
  waiting: "#86551b"
  invalid: "#a12424"
  field-edge: "#a08b79"
  placeholder: "#756157"
typography:
  display:
    fontFamily: "Chiron Sung HK, serif"
    fontSize: "clamp(44px, 4.4vw, 66px)"
    fontWeight: 400
    lineHeight: 1.13
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Chiron Sung HK, serif"
    fontSize: "clamp(2.4rem, 4.6vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  section:
    fontFamily: "Chiron Sung HK, serif"
    fontSize: "clamp(30px, 3vw, 42px)"
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Chiron Sung HK, serif"
    fontSize: "1.3rem"
    fontWeight: 700
  body:
    fontFamily: "Lora, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
  lede:
    fontFamily: "Lora, serif"
    fontSize: "1.06rem"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.84rem"
    fontWeight: 500
  control:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
  note:
    fontFamily: "Kalam, cursive"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  evidence: "4px"
  tag: "8px"
  suggestion: "10px"
  control: "12px"
  field: "0.8rem"
  form: "14px"
  conversation: "16px"
  avatar: "22%"
  circle: "50%"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1.2rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1.2rem"
  button-secondary-hover:
    backgroundColor: "{colors.rose}"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 0.75rem"
    height: "44px"
  navigation:
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
  tag-confirmed:
    backgroundColor: "{colors.confirmed-fill}"
    textColor: "{colors.confirmed}"
    rounded: "{rounded.tag}"
    padding: "0.25rem 0.5rem"
  paper-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "1rem"
  evidence:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.ink}"
    rounded: "{rounded.evidence}"
    padding: "17px 20px"
  sample-step-control:
    textColor: "{colors.primary}"
    rounded: "{rounded.circle}"
    width: "44px"
    height: "44px"
  state-mark:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.primary}"
    rounded: "{rounded.avatar}"
---

# Design System: AIDaddy

## Overview

**Creative North Star: "The family reading table"**

AIDaddy puts useful words and their evidence within reach, with the feeling of a family reading together. Ivory paper, cranberry annotations and literary headings make official material approachable. The product's own words, conversations, plans and quoted sentences supply the picture material.

The world is warm, readable and expressive. Space gives a sentence room; rules and paper tones organize the work. Motion follows a meaningful change: ink draws attention to a thought, a new answer arrives, a source opens, or a replay advances under the reader's control. The person can always pause, inspect and decide.

**Key Characteristics:**
- Open reading surfaces with a clear heading and one immediate next action.
- Literary display type, generous prose and precise sans-serif controls.
- Cranberry ink beside the words or evidence it helps explain.
- Real HTML text, checked-source links and visible uncertainty.
- Replayable motion with a complete static reading state.

This documents the accepted Impeccable world as implemented on 15 November 2026. It supersedes the earlier terracotta-and-orb system. The implementation authorities are `src/components/site/site.css`, `src/components/home/warm.css` and `src/components/landing/fonts.ts`; task, listening and replay styles specialize them. The original `/reading` composition is preserved as a separate page. Product capabilities remain in `PRODUCT.md` and its source documents.

## Colors

One cranberry accent sits on a family of warm paper tones. The frontmatter owns the reusable values; the sidecar extends them with tonal previews, motion and component examples.

### Primary

**Cranberry** marks primary actions, links, selected examples, source references and ink annotations. **Deep cranberry** is the filled-button hover. **Rose** supports quotations and selected states; **rose ink** keeps text legible on that tint.

### Secondary

**Garden green** indicates a confirmed or completed state; its pale fill supports a short status or source chip. **Warm ochre** signals a waiting state or a person's next move. These are semantic colors, not alternate brand accents. **Error red** belongs with a concrete failure message.

### Neutral

**Ivory paper** is the page ground. **Paper panel** distinguishes forms and working containers. **Warm ink** carries primary text and **muted ink** supporting text. **Inset paper** holds family messages, secondary regions and row feedback. **Paper rule** and its softer partner separate content; **field edge** makes editable boundaries visible. **Selection rose** is the selected-text highlight.

**The Evidence Rule.** Give a statement and its supporting sentence a visible relationship. Use placement, a source number and words alongside color.

## Typography

**Display Font:** Chiron Sung HK, with a serif fallback. **Body Font:** Lora, with a serif fallback. **Control Font:** Inter, with a sans-serif fallback. **Annotation Font:** Kalam, with a cursive fallback.

The homepage promise and section headings use the regular display face; task-page headings and compact titles use its bold weight. Lora carries prose introductions and quotations, including the italic role sentence on the homepage. Inter carries functional copy, dates, navigation, fields, status and tabular figures. Kalam is a brief marginal note or scene number, never a paragraph or a control label.

The frontmatter records representative roles, not a single modular scale. Homepage quotations use smaller prose sizes (14–15px), and factual captions are compact. Task introductions read to at most 66ch; working notes to 72ch. Headings balance their lines. Controls and labels use sentence case.

Fonts are supplied through `next/font/google` in `src/components/landing/fonts.ts`, using Latin subsets and `display: swap`. Preserve these imports and their source provenance when adjusting type. Geist Mono remains available for code-like material; it is not the interface's label voice.

**The Four Voices Rule.** Use display type for the thought, prose type for reading, sans-serif for operating the product, and handwriting for a short human annotation.

## Layout

Every current product route uses `SiteShell` except the preserved `/reading` page. The shell supplies paper texture, skip link, navigation and footer. New task pages use the shared shell and page heading; links into access-controlled flows use `SiteLink` so their access code travels with them.

The homepage is an open reading composition. Its promise sits directly on paper beside a contained illustrative family conversation; the quote inside that conversation comes from the real five-step sample. Below it, rules, a paper document, linked rows and the scorecard move from life event to plan to official sentence to the person's decision. This composition belongs to the homepage; it does not prescribe a two-column hero for every route.

The home content spans at most 1200px, with a two-column hero and an 88px gap on wide screens. At 1100px the gap contracts; at 760px the story stacks in reading order with 20px side margins, reduced to 16px below 359px. Task forms and chat occupy a column up to 760px; case files reach 860px. Shared setup, replay and scorecard content uses the 1120px shell width. The mobile shell keeps 16px side margins.

Working layouts use 12–32px internal spacing and larger section gaps. Shared split layouts add an aside at 900px; phone replay pages put the phone beside their heading at that breakpoint and below it on narrow screens. The header changes to a named Menu control at 700px. Tables keep their column semantics and scroll or fold supporting facts when space runs out.

## Elevation & Depth

Paper tone, fine rules and spacing establish depth. Homepage documents and ordinary task panels are flat; shared task cards have no shadow. The paper texture is a quiet repeating material, not an image of the interface. The exceptional lifted objects are the listening call dialog and the device depicted inside a replay; their exact shadows are in the sidecar.

**The Paper Rule.** Make a document readable through alignment, whitespace and tonal separation before adding a container. Reserve lifted depth for a dialog or a depicted device.

## Shapes

Controls and working panels have gently rounded corners, while the homepage plan reads as a square-edged sheet. The larger illustrative conversation has softer corners; the quoted excerpt inside it has a modest corner. Source chips are compact rectangles, and previous/next sample controls are circles with full touch targets. Fine rules define reading order without turning every paragraph into a card.

The existing paper and ink assets live in `assets/plates/` and are imported by `reading-plates.tsx`. Keep their embedded provenance and adjacent JSON records intact. They contain decorative material only; words, labels, controls and quotes remain HTML. Existing ink is reused as an underline, highlight or circle tied to nearby content.

## Components

### Buttons and fields

Primary buttons use cranberry with ivory text; secondary buttons use paper with a fine rule. Shared action buttons are at least 48px high; the homepage action and research submission are about 52px. The shared border, fill and text color respond quickly to hover. Disabled controls remain identifiable and use their actual disabled state.

Fields use panel paper, a visible field edge and Inter text. Labels remain above them. Text inputs and selectors in the research form have 44px height; the listening settings use 48px. Textareas grow vertically and keep comfortable line spacing. Error messages explain the failed action beside the relevant controls; a failed chat send preserves the draft.

The shared focus treatment is a cranberry outline (3px) offset from the target (4px; 5px within the homepage). Keep focus visible and avoid clipping it in scrolling regions. Maintain at least a 44px touch target for interactive controls. Check local legacy styles rather than assuming every surface inherits the shared rule.

### Navigation and page headings

The wordmark sets “AI” in cranberry and “Daddy” in ink, as live display text. Navigation uses Inter with an underline for hover/current state; the main action is filled. Mobile navigation has an explicit Menu button and an expanded state. A page opens with its title, optional real status and useful introduction. The current `PageHead` omits the old decorative label row.

### Panels, rows and tags

Working panels have a fine edge and a quiet title row. A source, heard sentence or research update can use an inset row with a single leading rule. Tags and source chips carry words or numbers; green means confirmed, ochre means waiting, and cranberry means selected or active. Status dots always accompany text.

### Evidence and disclosures

A plan line keeps its deadline, source number, quoted sentence and source link together. Lora distinguishes the quotation from factual labels. Native disclosures retain their keyboard behavior, reveal the evidence in place and indicate open state. In a case file, a source reference moves to the matching evidence and highlights the target. Scorecards retain recorded failures, unavailable links and the explanation of what a pass measures.

### The sample conversation and ink

The family conversation is explicitly labelled as an example. Previous/next controls browse the five real sample steps; each step changes its title, date, quoted sentence and official link together. Hidden answers are inert, and an updated answer is announced politely. Without JavaScript, the visible example links to the complete plan below.

The hero's ink reveals in three short strokes and can be replayed. Only the pigment is animated; all words and controls are present before motion runs. Font/image readiness, visibility and reduced-motion preference determine whether the entrance plays. Never delay readable content to complete an entrance.

### State marks and icons

The chat/voice avatar is a typographic “Ai” on a rose tile; the working-page `Core` is a letterpress “a.” with brief activity dots. Voice bars reflect actual playback level, and listening/thinking states have accessible names or adjacent status text. These are typographic state components, not a continuously animated orb.

The public app icon and replay avatar use the existing Lucide service-bell vector in cranberry on ivory (`src/app/icon.svg` and `public/aidaddy-avatar.svg`). Installed-app PNGs are rasterizations of that vector. Preserve their provenance. Interface icons are small vector drawings, with accessible labels on icon-only actions. A typographic state mark and a bell asset have different jobs; do not treat their filenames as a requirement to draw an orb.

### Replays and motion

Replay pages retain a page title, an explicit scripted-replay label, a capability/concept status, duration, caption and Pause/Resume/Replay controls. Chat, browser and calendar scenes depict another interface and keep that scene's own conventions. The kitchen-table phone depicts AIDaddy and uses the warm palette, compact sans-serif transcript, rounded phone silhouette and bell mark. Device framing is specific to replay content, not a general task-page container.

Most state transitions take 160–320ms with a quick settling curve; a task heading settles over 500ms. A new answer moves only a few pixels as it arrives. Timelines stop while paused, offscreen or in a hidden tab. Reduced motion removes decorative transitions and begins scripted replays in their completed reading state; an explicit Replay or table-loop request can start the timeline. Keep that distinction between a static default and user-requested playback. Durations and easing are recorded in the sidecar.

## Do's and Don'ts

### Do:

- Do keep the life event, next step and supporting sentence easy to read together.
- Do use the shared shell for new product pages and the focused reading column for task flows.
- Do use existing paper and ink assets with their provenance intact, and keep every word selectable HTML.
- Do label samples, recorded runs and concepts where the reader encounters them.
- Do let the reader pause a timeline, inspect evidence and recover from a failed action.
- Do verify direct loads, keyboard focus, narrow screens and reduced-motion states after visible changes.

### Don't:

- Don't restore the terracotta orb identity; use the reading palette and the existing typographic or bell marks in their proper contexts.
- Don't add decorative kickers, repeated category labels or text glyphs in place of the existing vector icon language.
- Don't make color or animation the only evidence of a status, selection or result.
- Don't convert the open homepage promise or every paragraph into a rounded panel.
- Don't stretch the homepage composition or a replay's device frame into a rule for every page.
- Don't hide text until an animation finishes or make continuous idle motion part of reading.
