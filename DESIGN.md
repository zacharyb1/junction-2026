---
name: AIDaddy — Family reading table
description: An annotated ivory reading surface for a family plan and its official evidence.
colors:
  cranberry: '#98112c'
  cranberry-hover: '#740b22'
  paper: '#fffaf1'
  ink: '#211b1d'
  muted: '#65544e'
  rule: '#dfcdb8'
  specimen: '#f5ecdd'
  selection: '#f5c7cd'
  source-rule: '#e4d0b6'
  qr-white: '#fff'
typography:
  display:
    fontFamily: Chiron Sung HK, serif
    fontSize: 9.62cqw
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.035em
  display-wide:
    fontFamily: Chiron Sung HK, serif
    fontSize: clamp(48px, 4.8vw, 60px)
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.035em
  headline:
    fontFamily: Chiron Sung HK, serif
    fontSize: clamp(2rem, 5vw, 3.5rem)
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.035em
  title:
    fontFamily: Chiron Sung HK, serif
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  body:
    fontFamily: Lora, serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: Lora, serif
    fontSize: 1.05rem
    fontWeight: 400
    lineHeight: 1.8
  statement:
    fontFamily: Chiron Sung HK, serif
    fontSize: clamp(1.5rem, 2.4vw, 2rem)
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: -0.02em
  evidence-figure:
    fontFamily: Chiron Sung HK, serif
    fontSize: clamp(2rem, 3.4vw, 2.75rem)
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  hint:
    fontFamily: Lora, serif
    fontSize: 1.05rem
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: Inter, sans-serif
    fontSize: .8rem
    fontWeight: 400
    lineHeight: 1.7
  navigation:
    fontFamily: Inter, sans-serif
    fontSize: .875rem
    fontWeight: 500
    lineHeight: 1.5
  note:
    fontFamily: Kalam, cursive
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: Chiron Sung HK, serif
    fontSize: 1.2rem
    fontWeight: 700
    lineHeight: 1.3
  plan-title:
    fontFamily: Chiron Sung HK, serif
    fontSize: 1.1rem
    fontWeight: 700
    lineHeight: 1.35
  quote:
    fontFamily: Lora, serif
    fontSize: 1.05rem
    fontWeight: 400
    lineHeight: 1.7
rounded:
  specimen: 4px
  action: 14px
  hero-action: 4cqw
  hero-action-wide: 16px
spacing:
  compact: .75rem
  base: 1rem
  inset: 1.25rem
  room: 1.5rem
  group: 2rem
  chapter-head: 2.5rem
  reading-gap: 3.5rem
  spread-gap: 4rem
  section: 4.5rem
  section-wide: 5rem
components:
  button-primary:
    backgroundColor: '{colors.cranberry}'
    textColor: '{colors.paper}'
    typography: '{typography.action}'
    rounded: '{rounded.action}'
    padding: .65rem 1.25rem
  button-secondary:
    backgroundColor: transparent
    textColor: '{colors.cranberry}'
    typography: '{typography.action}'
    rounded: '{rounded.action}'
    padding: .65rem 1.25rem
  button-hover:
    backgroundColor: '{colors.cranberry-hover}'
    textColor: '{colors.paper}'
  annotation-replay:
    backgroundColor: transparent
    textColor: '{colors.cranberry}'
    padding: .4rem 0 .4rem .5rem
  hero-primary:
    backgroundColor: '{colors.cranberry}'
    textColor: '{colors.paper}'
    rounded: '{rounded.hero-action}'
    width: 100%
    height: 100%
  hero-secondary:
    backgroundColor: transparent
    textColor: '{colors.cranberry}'
    rounded: '{rounded.hero-action}'
    width: 100%
    height: 100%
  navigation:
    textColor: '{colors.cranberry}'
    typography: '{typography.navigation}'
    padding: 2.5rem 0 1rem
  decision-chip:
    textColor: '{colors.cranberry}'
  specimen:
    backgroundColor: '{colors.specimen}'
    textColor: '{colors.ink}'
    rounded: '{rounded.specimen}'
    padding: 1.5rem
  source-disclosure:
    textColor: '{colors.ink}'
    typography: '{typography.plan-title}'
    padding: 1.1rem 0
  source-quote:
    backgroundColor: '{colors.specimen}'
    textColor: '{colors.ink}'
    typography: '{typography.quote}'
    padding: 1rem 1.25rem
---

# Design System: AIDaddy

## Overview

**Creative North Star: "Family reading table"**

Family reading table is a warm, literary surface: substantial book serif, italic prose, plain factual labels and cranberry handwritten annotations. The plan and its official sentence share the page, like a document a family has read and marked together. The emphasis belongs to useful words and evidence.

This system applies only to the landing route `/`, implemented in `src/app/page.tsx` and `src/components/landing/`. Its five core color variables and four font variables live on the landing wrapper. `/try` and `/c/[id]` retain their existing shared application design; this document does not authorize restyling them. This replaces the former station-sign landing system. The reading world uses ink marks, soft marker pigment and paper texture rather than transit signage.

**Key Characteristics:**
- One continuous ivory reading surface with calm rules and occasional inset specimens.
- Dark literary headings, readable prose, sans factual metadata and handwritten marginal notes.
- A plan and its exact source sentence remain visibly paired.
- An ink sequence follows the headline, case, plan and source; the words remain immediately readable.
- Real local paper and ink plates; all words, controls and table data are semantic HTML.

## Colors

Warm neutrals carry the reading; cranberry supplies the purposeful emphasis and interaction.

### Primary
- **Cranberry ink** (`cranberry`): actions, source links, annotations, process titles, open plan titles and quote rules, status symbols, scorecard figures and focus outlines. **Deep cranberry** (`cranberry-hover`) fills hovered primary and secondary actions.

### Neutral
- **Ivory paper** (`paper`): the continuous page ground and reversed action text; the browser theme color follows it. The raster paper texture adds material variation.
- **Book ink** (`ink`): primary text. **Warm secondary ink** (`muted`): captions, factual metadata and hints.
- **Paper rule** (`rule`): chapter, plan-row and table dividers. **Source rule** (`source-rule`): the hero's warm vertical rule.
- **Inset paper** (`specimen`): opened source quotes, factual examples in the trust section and a table row under hover or case-link focus, without a raised card effect.
- **Selection pink** (`selection`): selected text. Pink and cream marker plates also carry their own pigment; these raster colors are not interchangeable solid-fill UI tokens.
- **QR white** (`qr-white`): the small QR backing only.

### Named Rules
**The Evidence Pair Rule.** A plan statement and its supporting sentence belong to the same reading sequence; a colored mark never substitutes for a source label or link.

## Typography

**Display Font:** Chiron Sung HK, serif fallback. **Body Font:** Lora, serif fallback. **Factual Font:** Inter, sans-serif fallback. **Annotation Font:** Kalam, cursive fallback.

The four fonts load through `next/font/google` in `fonts.ts` and are applied only by the landing wrapper. Chiron loads weights 400 and 700; Lora loads normal and italic styles; Kalam loads 400. Inter supplies the compact factual voice. These are actual text fonts, never rasterized lettering.

### Hierarchy
- **Display:** the portrait hero uses the `display` token relative to its query container. The desktop spread switches to `display-wide`. Wordmark, case title and next-chapter title share its weight and tight tracking, at different optical sizes.
- **Headline / title:** lower chapter headings use the fluid `headline` token and balanced wrapping; subsection titles use `title`. The closing statement grows from 2.5rem to 4.5rem, capped at 17ch, using the same display voice and headline line height.
- **Body / statement / lead / hint:** the base reading voice uses `body`; the audience sentence uses the stronger `statement` token, followed by opening paragraphs in `lead`. Running paragraphs often expand to line-height 1.8, while `hint` supplies the softer section introduction. Main reading copy is capped at 68ch.
- **Label / navigation / evidence figure:** Inter sets captions, sources, dates, navigation and tabular evidence. Captions use `label`; navigation uses `navigation`. The verified-quotes total uses `evidence-figure`, while the other totals remain 1.65rem. Totals use lining and tabular numerals; table figures use tabular numerals.
- **Note:** short marginal or conversational notes use `note`. Hero annotations scale in container units and rotate slightly, while the role line uses Lora italic.
- **Action / plan / quote:** `action` sets lower-page actions; `plan-title` and `quote` keep the expandable evidence readable. Hero actions and quotes use Chiron and a separate container-scaled treatment.

### Named Rules
**The Four Voices Rule.** Use Chiron Sung HK for display and substantial actions, Lora for reading and italic role copy, Inter for facts, and Kalam for short annotations. Keep handwriting out of long prose and table data.

## Layout

The hero is an annotated portrait with positions derived from an 852 × 1846 reference frame in `reading-layout.css`. Its frame keeps that aspect ratio, is centered and is at most 852px wide. Type uses container units so words and physical marks scale together. This coordinate system belongs to the hero; it is not a reusable layout grid for other pages.

Between 600px and 999px viewport width, when the viewport aspect ratio is at least 1:2, the hero width is the smaller of the viewport width and `100svh * 852 / 1846`, fitting the portrait sequence to the available height. Taller portrait viewports retain the original width-based frame, including the 852 × 1846 reference. At 1000px and above, it becomes a two-page reading spread, at most 1240px wide and 900px tall: promise and actions on the left, plan and source on the right. The desktop headline marker's vertical position and height are derived from the actual headline size and line height in CSS, rather than a fixed percentage alone. Changes to fonts or wording still require visual verification.

Below 360px, action height, source-link size, marginal labels and the next chapter are adjusted to keep the portrait usable. The lower-page wrapper uses a 1rem side inset at these widths; otherwise it uses 1.5rem and caps at 1160px. Main reading copy is limited to 68ch. Chapters have 4.5rem vertical space, increasing to 5rem from 768px. Rules divide chapters; groups use the extracted spacing steps rather than uniform card tiles.

At 768px, the conversation and plan become an `.8fr / 1.2fr` split; process and trust content become two columns, the bot section places its QR beside the text, and privacy becomes three columns. Gaps range from 2.5rem to 4rem. Scorecard totals change from two columns to four. Below 768px, country, quote count and time fold beneath the scenario name; the table retains result, scenario and case-link columns. Navigation wraps in normal document flow.

At 1000px, the opening audience statement and its supporting paragraphs form an `.8fr / 1.2fr` spread with a 4rem gap. Each lower chapter also pairs its heading on the left with its introduction on the right using that split. Smaller widths retain the reading sequence in one column; the hero geometry and primary-action placement stay unchanged.

## Elevation & Depth

The surface has no panel shadows. Depth comes from the tiled paper grain, translucent pigment in local raster marks and the warmer specimen inset. Hairline rules organize text without enclosing each item. Text stays sharp during source opening; there is no glass or blur effect.

The paper asset is a clean 55 × 150 sample from the approved composition, mirror-tiled 4 × 4 into a 220 × 600 texture. Fourteen separate transparent ink/marker assets provide the wordmark underline, headline/plan/source highlights, intro and case underlines, sample circle, proof bracket, bracket underline, two arrows, publisher highlight, divider and next-chapter underline. `reading-plates.tsx` imports them from `assets/plates/`; the paper is the wrapper background and the remaining plates are decorative images. Each of the fifteen PNGs contains its exact provenance in the `impeccable:prompt` text chunk; some also have JSON sidecars. Preserve the embedded record rather than inferring origin from filenames or treating a missing sidecar as missing provenance.

### Named Rules
**The Paper Rule.** Keep depth in paper, pigment and tonal insets. Do not add floating panel shadows to this reading surface.

## Shapes

The reading surface and rules are square and open. Trust specimens have the small `specimen` radius. Lower actions have the `action` radius; hero actions use a container-relative radius in portrait and `hero-action-wide` in the spread. The soft circle, bracket and arrows are physical artwork with irregular edges, not generic geometric decoration. Source numerals are plain cranberry text, not checkbox states.

Interface icons use Lucide SVG geometry: navigation arrows, replay, calendar, location, check, cross and attention. Source rows use a simple two-stroke SVG expansion sign, with its vertical stroke collapsing in the open state. Lower-page icon strokes are 1.75 units; hero location and calendar strokes are 2. These icons support adjacent words and are hidden from assistive technology when decorative.

## Components

### Buttons
Substantial serif links with softened corners.
- **Primary:** cranberry fill and paper text. **Secondary:** transparent paper ground, cranberry text and a cranberry border. Lower actions use the frontmatter padding and a minimum height of 48px; hero actions fill their positioned region with a minimum height of 44px.
- **Hover:** both variants use deep cranberry with paper text. With no reduced-motion preference, colors transition over 160ms; action arrows move 3px toward their destination over 180ms using `cubic-bezier(.16,1,.3,1)` on hover or keyboard focus. The hero source-link arrow shares that movement. Reduced motion keeps the color feedback immediate and the arrows still. The controls themselves do not move.
- **Focus:** links, buttons and summaries receive a 3px cranberry outline with a 5px offset. Preserve this visible state on both action variants.
- **Routing:** browser actions use `TryLink`, preserving an incoming access-code query value. With no configured sample route, the secondary hero action links to the on-page sample plan and names that destination truthfully.

**Replay annotations** is a quiet, underlined Inter button at .75rem and weight 500 beside the wordmark, with a 44px minimum target and a 15px replay icon. It appears only after the required browser APIs, fonts and five hero plates are ready, and only without a reduced-motion preference. Clicking restarts the annotation sequence from the beginning; repeated clicks cancel the previous run safely. Its icon rotates -45 degrees over 250ms on hover or keyboard focus, while its text and target stay still.

### Navigation
Underlined cranberry links in Inter sit after the conversation. Their flex row wraps, with 1.5rem gaps and 44px minimum link height. There is no fixed or overlay navigation. Ordinary source links also stay underlined; hover increases underline thickness. External links announce a new tab in accessible text.

### Chips
The decision chip is a quiet cranberry text label in Inter at .8rem and weight 500. It has no filled pill or enclosing border. Handwritten “Example” and “Illustrative example” labels mark the nature of material; they are not navigational badges.

### Cards / Containers
Trust specimens use inset paper, small corners and 1.5rem padding. An opened source quote uses the same paper inset, square corners and the `source-quote` padding. Conversations, plan rows and the scorecard remain open documents on the main paper, divided by rules. They do not inherit a generic card shadow or padded dashboard shell.

### Source disclosures
A plan row is a native `details`/`summary`, with the plan text and timing on the left and source number plus expansion sign on the right. The shared disclosure name allows one open row; source 5 starts open. Hover underlines the plan in cranberry. An open row keeps its title cranberry and its source numeral at weight 700. The opened quote has an inset paper ground and a 1px cranberry rule, its publisher and host, and a link to the exact source. The hero's source-5 quote is always visible rather than an expandable control.

With no reduced-motion preference, browsers supporting `interpolate-size:allow-keywords` and `details::details-content` expand and collapse the native content block over 320ms using `cubic-bezier(.16,1,.3,1)`. Other browsers retain a sharp 240ms opening reveal, settling from a -2px vertical offset while its lower 14% is briefly clipped. The SVG expansion sign's vertical stroke collapses over 280ms, and the plan title's color changes over 180ms. Reduced motion makes these state changes immediate while keeping the open-state color and inset. Expansion signs are supplemental affordances; native semantics carry the open state and work without JavaScript.

The hero has one progressive decorative sequence in `ReadingMotion`: the headline highlight draws across (0–500ms), the sample-case circle follows (350–850ms), then the plan highlight (750–1150ms), the supporting bracket downward (1000–1500ms) and the quote highlight (1350–1800ms). Its overlapping strokes use `cubic-bezier(.16,1,.3,1)`. Automatic playback happens once when at least 45% of the quote is visible and the relevant plates and fonts are ready; a 1500ms readiness limit from the first eligible view skips late automatic playback. The explicit replay button remains available after slow assets finish loading. Text and controls never wait on this sequence. The server-rendered marks are complete by default; missing browser APIs, failed assets, no JavaScript and reduced motion all preserve that static view. Leaving the hero, hiding the document or enabling reduced motion cancels playback and restores the finished marks. There is no loop or scroll scrubbing.

The next-chapter underline and the underline beneath the closing word “check.” each use `InkReveal`: a single 650ms stroke across when at least 45% of the mark reaches the reading area, inset 64px from the viewport bottom. They reuse the existing underline plate without changing its geometry. Each requires ready artwork and fonts within the same 1500ms limit; it cancels on leaving the reading area, document hiding or reduced motion. Completed marks stay visible and do not replay on scrolling back.

### Conversation and evidence table
The conversation is readable prose with named speakers, a handwritten stage direction and a cranberry bot reply. Its caption explicitly identifies an example. The plan and quotes come from `src/data/sample-case.json`; decorative marks do not change their meaning.

The scorecard is a real table with scoped headers, a screen-reader caption, full scenario rows, explicit Pass/Fail words and accompanying SVG symbols. Both results use cranberry; meaning never depends on green/red recognition. Run provenance and time sit above the totals. The adjacent hint states that a pass checks source grounding rather than completeness. Keep failures, error text and missing-case states visible. Data comes from `src/data/scorecard.json`; do not turn table examples in the sidecar into production metrics.

The verified-quotes total leads by type size and a darker, stronger label; all four totals keep their original labels, order and values. Hovering a table row or focusing its case link applies the inset-paper ground to help track that row without adding a panel or changing its result.

### Configuration and limits
The Telegram section shows a working action and QR only when configured; otherwise it explains availability and offers the browser demo. Privacy and limits remain readable paragraphs on the same paper. The landing has no input-field design to inherit; `/try` retains its own form system.

## Do's and Don'ts

### Do:
- **Do** keep paper and ink assets local, retaining their embedded provenance when replacing or optimizing them.
- **Do** keep every quote, label, date, action and scorecard value as accessible text.
- **Do** pair source numbers with actual evidence; the hero numeral identifies a source, not a completed family task.
- **Do** preserve visible focus, keyboard disclosure behavior and reduced-motion access to all content.
- **Do** use the same source data for the illustrated plan and its links, and the complete recorded run for the scorecard.
- **Do** verify the portrait, short tablet and desktop spread when changing hero text or material positioning.

### Don't:
- **Don't** extend the landing fonts, paper or palette to /try or /c/[id] without a separate design decision.
- **Don't** replace the page or a functional section with a screenshot.
- **Don't** substitute CSS-drawn imitation marks for the approved physical ink and marker plates.
- **Don't** turn every paragraph into a card, or introduce a dark departure-board field.
- **Don't** use an annotation, color or decorative icon as the only label for meaning or status.
- **Don't** present sample evidence as a live check, illustrative figures as measured results, or a scorecard pass as completeness.
