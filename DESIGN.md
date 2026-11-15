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

This system applies only to the reading-table page, which moved from `/` to `/reading` on 14 November (see docs/DECISIONS.md, Sat 08:57). It is implemented in `src/app/reading/page.tsx` and `src/components/landing/`. Its five core color variables and four font variables live on the landing wrapper. This replaces the former station-sign landing system. The reading world uses ink marks, soft marker pigment and paper texture rather than transit signage.

Every other page shares one dark frame since 14 November (docs/DECISIONS.md, Sat 19:00): `SiteShell` in `src/components/site/` gives `/`, `/try`, `/c/[id]`, `/chat`, `/setup`, `/autopilot`, `/demo` and its replays the same header, footer and palette. The palette is the front page's control room, defined in `src/components/hud/hud.css`, described in docs/FRONT_PAGE_PLAN.md and handed to the shared Tailwind tokens inside `.site` by `src/components/site/site.css`. That frame is a separate system from this document: the paper, the four reading fonts and the cranberry palette below are still not extended to those pages, and the dark frame is not applied to `/reading`.

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

The scene uses a local poster and two video layers, revealing an incoming segment only after a decoded frame is available. Desk is one locked-off clip cut into short silent segments that begin and end in one of three resting poses: listening segments chain in varied order while it waits, and speaking segments play for as long as a separate ElevenLabs voice is heard. Joins are 240 ms opacity crossfades; the player prefers a next segment that starts in the pose the last one ended in. Pause and resume control picture and voice together; muting keeps the picture talking. A completed answer can be explicitly replayed. Stop returns to listening with a slightly longer fade; a stopped sentence must not remain frozen with raised hands.

Ari and Noor keep the illustrated shared-pose scheduler. There is no CSS crossfade between faces. Document hiding pauses playback; reduced motion retains the poster and explanatory text while speech remains available. The tiny active status dot breathes over 1.7s; the page disables CSS animations and transitions under reduced motion. Illustrated movement previews and Desk event diagnostics remain inside the secondary disclosure.

Desk uses solo stock footage from Pexels video 5941016; Ari and Noor are original illustrated alternatives. Keep its provenance with `public/avatar/desk/presence.json`, `scripts/avatar/desk-cuts.json` and `docs/AVATAR_DESK_ASSETS.md`. The voice is synthetic (ElevenLabs, voice Bill) and the performer's lips are not synchronised to it. Disclose that limit beside the picture and in the prototype information. Local lip-sync experiments are not a claim of finished visual quality; custom appearances and role-specific rooms are not generated by these settings.

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
