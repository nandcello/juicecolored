---
name: Cuppy (concept)
description: Internal pitch concept for Cuppy Ice Cream. A floating 3D soft-serve cup set inside an extra-wide, ink-on-lavender headline.
colors:
  lavender-ground: "#C397C4"
  ink: "#17131A"
  cream: "#F2E6D2"
  chocolate-field: "#58362E"
  caramel-field: "#D59D58"
  plum-shadow: "#3A2240"
typography:
  display-word:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "calc((100vw - 2 * clamp(1rem, 3.2vw, 2.75rem)) / 8.36)"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "-0.02em"
    fontVariation: '"wdth" 125'
  display-lead:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 5.4vw, 5.25rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.02em"
    fontVariation: '"wdth" 125'
  headline:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 8.4vw, 7.5rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "-0.03em"
    fontVariation: '"wdth" 125'
  headline-close:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 5.6vw, 5.25rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.025em"
    fontVariation: '"wdth" 125'
  title:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 3.6vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.015em"
    fontVariation: '"wdth" 112'
  wordmark:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: '"wdth" 125'
  body-lead:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(1.125rem, 1.7vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: '"wdth" 100'
  label:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.1em"
    fontVariation: '"wdth" 118'
  button:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 800
    letterSpacing: "0.04em"
    fontVariation: '"wdth" 118'
  fine-print:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  focus: "6px"
  chip-focus: "12px"
  pill: "999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1.5rem"
  page-gutter: "clamp(1rem, 3.2vw, 2.75rem)"
  column-gap: "clamp(2rem, 5vw, 5rem)"
  section-y: "clamp(4rem, 9vw, 7.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem 0 1.6rem"
    height: "3.25rem"
  button-cream:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem 0 1.6rem"
    height: "3.25rem"
  concept-tag:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.7rem"
  cup-chip-vanilla:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    width: "clamp(9.5rem, 13vw, 11.5rem)"
  cup-chip-chocolate:
    backgroundColor: "{colors.chocolate-field}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    width: "clamp(9.5rem, 13vw, 11.5rem)"
  cup-chip-caramel:
    backgroundColor: "{colors.caramel-field}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    width: "clamp(9.5rem, 13vw, 11.5rem)"
  flavor-band-vanilla:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    padding: "clamp(4rem, 9vw, 7.5rem) clamp(1rem, 3.2vw, 2.75rem)"
  flavor-band-chocolate:
    backgroundColor: "{colors.chocolate-field}"
    textColor: "{colors.cream}"
    padding: "clamp(4rem, 9vw, 7.5rem) clamp(1rem, 3.2vw, 2.75rem)"
  flavor-band-caramel:
    backgroundColor: "{colors.caramel-field}"
    textColor: "{colors.ink}"
    padding: "clamp(4rem, 9vw, 7.5rem) clamp(1rem, 3.2vw, 2.75rem)"
  close-section:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    padding: "clamp(4.5rem, 10vw, 8rem) clamp(1rem, 3.2vw, 2.75rem) clamp(3rem, 6vw, 5rem)"
---

# Design System: Cuppy (concept)

> Scope and rights. This system covers only the `/cuppy` route (`apps/web/src/app/(cuppy)/`), which has its own root layout. It does not describe the JuiceColored portfolio and must not be applied to it. The Cuppy name, mascot cues, palette and site copy are owned by Cuppy Ice Cream; **publication permission is pending**. Provenance, sources and rights status live in [README.md](./README.md); the measured palette is in [brand-palette.json](./brand-palette.json). Token extensions (motion, shadows, 3D material and lighting, component snippets) are in [design.json](./design.json).

## Overview

**Creative North Star: "The Product Is the Headline"**

A drenched lavender ground carries ink type so wide and heavy that it reads as a printed cup band. The product does not sit beside the copy; a real 3D soft-serve cup floats inside the sentence, between the lead line and a full-bleed pedestal word, and its soft plum contact shadow lands on the letters below it. Everything else (pitch, CTA, flavor chips) is small, quiet, and pinned to the edges so the cup and the word own the first viewport.

Density is low and the voice is loud only at display size. Color is the brand's own: lavender as the field, ink for type, outlines and buttons, cream only where it can be read (on ink or chocolate). Chocolate and caramel are not accents; they are whole fields: the flavor panel and the chips take them when a flavor is picked. Ink four-point sparkles are the world's ornament and appear on the page, the chips, the ritual list and the printed cup label.

Motion is soft and physical, and the signature moment is the pull, driven by the page's own scroll: a spoon drops in, lifts the real top of the swirl, and stays where it was in the document while the cup travels down with the reader, so a continuous ribbon of cream stretches the whole length of the page and reassembles when scrolling back. Around it: a slow bob and pointer tilt at rest, a cubic ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) on every UI transition, and the swirl and ribbon re-tinting with a damped squash-wobble on a flavor change. Reduced motion gets one composed 3D still (spoon lifting the top, a short neck of cream) and no scroll scene; the in-page pause stops idle motion but leaves the reader in control of the scroll-driven pull.

**Key Characteristics:**

- Lavender field, ink type, cream only on dark fields.
- Archivo at 125% width, weight 900, uppercase, tight negative tracking for display.
- The 3D cup sits in the headline, not beside it.
- Cup-silhouette flavor chips with ink outlines.
- Ink four-point sparkles as the only ornament.
- Flavor choice re-tints the object and floods the next section.

## Colors

The site's exact palette, used as fields rather than accents: one drenched ground, one ink, one cream, and two flavor fields.

### Primary

- **Cuppy Lavender** (lavender-ground): the hero ground, the `html` background and the `theme-color`. Also the accent span ("Stay for the pull.") on the ink close section, where it reads at about 7.5:1.

### Secondary

- **Chocolate Field** (chocolate-field): the Chocolate chip fill and the flavor band when Chocolate is selected; text on it is cream.
- **Caramel Field** (caramel-field): the Salted Caramel chip fill and band; text on it is ink.

### Neutral

- **Cuppy Ink** (ink): all type on lavender, cream and caramel; chip outlines; sparkles; primary buttons; the close section and footer ground; focus rings; text selection.
- **Cup Cream** (cream): the Vanilla field and chip, the cup paper, text on ink and chocolate, the cream button on ink. Footer text uses it at 74% alpha and the footer rule at 18%.
- **Plum Shadow** (plum-shadow): tint for soft drop shadows under the cup chips (`rgb(58 34 64 / 0.22–0.32)`) so shadows read as lavender-dark, never grey.

### Named Rules

**The Cream Stays Off Lavender Rule.** Cream text on lavender measures about 2:1 and is never used. Cream type appears only on ink or chocolate; on lavender, cream, and caramel the text is ink.

**The Flavor Is a Field Rule.** Flavor colors arrive as full-width fields and chip fills, each paired with its contrast ink (vanilla: ink, chocolate: cream, caramel: ink). They are not sprinkled as accents on the lavender hero.

## Typography

**Display Font:** Archivo variable, width axis at 125% (with Arial Narrow, Arial fallback)
**Body Font:** Archivo at 100% width
**Label Font:** Archivo at 112–118% width, weight 800, tracked uppercase

**Character:** One family stretched across its width axis does all the work. Display is extra-wide, black and uppercase, a stand-in for the brand's unlicensed display face; body is the same family at normal width so the voice never changes, only the stance.

### Hierarchy

- **Display word** (900, 125% width, sized so "STRETCHES." spans the full content width, line-height 0.82): the single pedestal word at the hero's foot. Its size is computed from the measured advance (8.27em) so it never wraps.
- **Display lead** (900, 125%, clamp 1.75–5.25rem, 0.86): the opening phrase above the cup. On narrow screens it grows to clamp(1.75rem, 9.6vw, 4rem).
- **Headline** (900, 125%, clamp 2.75–7.5rem, 0.88, -0.03em): the flavor name in the flavor band.
- **Headline close** (900, 125%, clamp 2.25–5.25rem, 0.92): the closing statement on ink.
- **Title** (800, 112%, clamp 1.75–3.25rem, 1.05): the three-step ritual list, stepped in by 1.1em per line with sparkles.
- **Wordmark** (900, 125%, 1.375rem; 1.125rem narrow): masthead name; its "Ice Cream" suffix is 0.55em, 700, tracked 0.12em.
- **Body lead** (400, clamp 1.125–1.5rem, 1.4, max 30ch): the flavor line.
- **Body** (400, 1.0625rem, 1.5): pitch copy (clamp 1–1.1875rem), close copy (1.125rem, max 28ch).
- **Label** (800, 118%, 0.8125rem, 0.1em, uppercase): fieldset legend; chip names use the same face at 0.04em.
- **Fine print** (400, 0.8125rem, 1.55, max 72ch): footer disclosure in cream at 74%.

### Named Rules

**The Width Is the Voice Rule.** Hierarchy is carried by the width axis and weight, not by switching families: 125% for display, 112–118% for labels and buttons, 100% for reading text. Uppercase is reserved for widened text; body copy is never uppercase.

**The Tight Display Rule.** Display sizes always take negative tracking (-0.01em to -0.03em) and line-height under 0.92; tracked-out uppercase is for small labels only.

## Layout

The page is one long pull: the lavender hero, the lavender pull section (the ritual chapters and the flavor panel), and the ink close with its footer. A single fixed, viewport-sized WebGL layer sits above all of it (pointer events off), so the cup can live in viewport space while the spoon lives in document space. Horizontal padding is a single fluid gutter, `clamp(1rem, 3.2vw, 2.75rem)`, used everywhere.

The hero is a column: a 4.5rem masthead (wordmark left; concept tag and motion control right), the lead line top-left, a flexible gap, and the pedestal word at the bottom. Its height stops at `100svh − 4.5rem` (minimum 38rem) so a lip of the flavor band shows above the fold. The 3D stage is absolutely centered over the gap and overlaps the word, width `min(46vw, 74svh, 44rem)`, with the ground line placed so the shadow falls on the letters. Pitch (left, max 23rem) and flavor chips (right) float at the same baseline above the word.

The pull, close and footer share one grid: `1fr | lane | 1fr`, where the lane (`clamp(17rem, 27vw, 27rem)`) is kept clear for the cup and the ribbon. Chapters alternate sides, one per row: "Dig in." (left, close under the hero), "Lift slow." (right), the flavor panel (right), "Let it stretch." and "Still going." (left), each 0.8 to 1 viewport tall so the ribbon visibly grows between them. The close puts the headline left and the action right; the footer note sits left.

Below 960px the grid becomes `1fr | 36vw`: all copy runs in the left column and the cup, after the scoop, recedes into the right-hand lane. The hero's gap becomes a fixed `clamp(18rem, 50svh, 32rem)` window for a full-width cup (max 34rem); under the word sits a `62lvh` "spoon room" that stays empty so the scoop never covers copy, then the pitch, CTA and a vertical stack of chips in the left column. With reduced motion or without WebGL, nothing travels down the lane, so the spoon room and the chapter heights collapse to normal reading rhythm. Below 421px the motion control goes icon-only (its label stays for assistive tech) and the wordmark suffix drops.

## Elevation & Depth

Depth comes from the 3D object and soft, tinted shadows; the UI itself is flat. The page has no cards and no layered surfaces. The only shadows are diffuse and plum- or ink-tinted: under the primary button, under the cup chips, and the cup's own contact shadow (two stacked radial-gradient planes, `rgba(20,10,26,…)`, that shrink and fade as the cup bobs up). Full values are in the sidecar.

### Shadow Vocabulary

- **Button rest** (`box-shadow: 0 10px 24px -14px rgb(23 19 26 / 0.7)`): ink button on lavender only.
- **Button hover** (`box-shadow: 0 16px 28px -16px rgb(23 19 26 / 0.8)`): paired with a 2px lift.
- **Chip rest** (`filter: drop-shadow(0 8px 10px rgb(58 34 64 / 0.22))`): follows the cup silhouette.
- **Chip selected** (`filter: drop-shadow(0 14px 14px rgb(58 34 64 / 0.32))`).

### Named Rules

**The Soft Tint Rule.** Shadows are blurred, offset downward, and tinted ink or plum. The cream button on ink takes no shadow.

## Shapes

Two forms carry the world. Controls are full pills (999px): the CTA buttons and the outlined concept tag. The flavor chips are cup silhouettes, a tapered paper cup drawn in SVG (168×112 viewBox) with a rounded base and an elliptical rim, filled with the flavor and outlined in ink at 3px (4.5px when selected, round joins). The four-point sparkle (concave star, 24-unit path) is the recurring ornament. Focus rounds to 6px generally and 12px around a chip.

## Components

### Buttons

Heavy, pill-shaped, and quietly lifted.

- **Shape:** full pill (999px), minimum height 3.25rem, padding `0 1.4rem 0 1.6rem`, trailing up-right arrow at 1.15rem.
- **Primary:** ink fill, cream text, 800 weight at 118% width, uppercase, 0.04em tracking, soft ink shadow.
- **Hover / Active:** lifts 2px with a deeper shadow, the arrow nudges 2px up-right; active returns to rest. 0.25s on the house ease-out.
- **Cream variant:** cream fill and ink text for use on the ink close section; no shadow; its focus ring switches to cream.
- **Focus:** 3px ink outline, 4px offset, 6px radius (global rule).

### Chips

The cup chips are the flavor selector: native radio inputs stretched invisibly over a cup-shaped label.

- **Style:** cup silhouette filled with the flavor field, ink outline, name centered on the cup body in its contrast ink; width `clamp(9.5rem, 13vw, 11.5rem)`, stacked with a 0.5rem gap under an uppercase legend.
- **Hover:** lifts 3px.
- **Selected:** shifts 0.6rem toward the cup and scales to 1.04 (on mobile it rises 0.4rem instead), thickens the outline to 4.5px, deepens the shadow, and an ink sparkle pops in at the top-right corner.
- **Focus:** 3px ink outline, 5px offset, 12px radius around the whole chip.

### Concept Tag

A 2px ink-outlined pill reading "Internal concept" (label face at 112%, 0.75rem). It is a standing disclosure that the page is not Cuppy-operated, not a decorative badge; it stays visible at every width.

### Navigation

There is no navigation. The masthead holds the wordmark, the concept tag, and an underlined text button that pauses or plays motion (2px underline at 0.3em offset that disappears on hover; 44px minimum hit area; hidden when the OS already requests reduced motion).

### Floating Cup (signature)

An original procedural three.js model: a lathed paper cup with a rolled rim, a printed label (pixel sunglasses, "CUPPY", an "ICE CREAM" band with sparkles, all in ink on paper cream), a piped soft-serve swirl with star-nozzle ridges and a curled tip, and three drips. Lit by a warm key from the upper left, a lavender rim from behind right, and a cream-to-lavender hemisphere fill, under neutral tone mapping. It bobs and turns slowly, tilts toward the pointer, and on a flavor change cross-fades its cream and sheen colors over 0.5s while the swirl squashes and wobbles for 1.1s. A WebP still of the same model and camera stands in until WebGL is live and whenever it is unavailable or lost. Exact materials, lights and motion constants are in the sidecar.

### The Pull (signature)

Scroll-driven and fully reversible; positions are a pure function of scroll and layout (`choreography.ts`). Over the first 0.64 viewport heights the spoon (procedural glossy ink plastic, egg-shaped bowl, rising handle) drops in from above, digs into the side of the curl, sinks level under it and lifts the actual top of the swirl, which is split from the base with domed cut faces. A lift integral eases the spoon from riding with the cup to riding with the page, so it settles into the document without a jolt and then scrolls away upward. The cup keeps its spot on screen and then settles low (desktop: centre lane; narrow: receding in depth into the right lane), staying whole above the visible bottom edge to the end of the page. The ribbon (`strand.ts`) is a fluted tube rebuilt in place each frame: it leaves the swirl's cut and the dollop's underside with flared fillets, necks down as it lengthens (volume-conserving, floor radius 0.12 units so it always reads as cream), and carries lumps and flutes on the material so they drift up and lengthen as it stretches. A scroll-velocity spring bows it and lets it wobble on stop; fast pulls tug the cup up a touch.

### Flavor Panel

In the pull, a cup-chip-styled panel (3px ink outline, 28px radius) takes the selected flavor's field and ink, cross-fading over 0.6s: flavor name (sized to the panel with container units), a one-line description, and a second, compact picker ("Pull another flavor") bound to the same state as the hero chips, so the flavor can change mid-stretch.

## Do's and Don'ts

### Do:

- **Do** set every display line in Archivo at 125% width, weight 900, uppercase, with negative tracking.
- **Do** pair each flavor field with its measured contrast ink: cream on chocolate, ink on vanilla and caramel.
- **Do** keep the product inside the headline composition, with its contact shadow landing on the type.
- **Do** use the ink four-point sparkle as the ornament, in ink or `currentColor`.
- **Do** run every UI transition on `cubic-bezier(0.16, 1, 0.3, 1)` and drop it under `prefers-reduced-motion`; give the 3D object a composed still pose, not a frozen frame.
- **Do** keep a still render of the same model behind the live canvas so the object never disappears.
- **Do** keep the "Internal concept" tag and the footer disclosure on any page in this world until publication permission is granted.

### Don't:

- **Don't** set cream text on lavender (about 2:1).
- **Don't** split the hero into copy left and product right with a badge row; the cup lives in the sentence.
- **Don't** use grey or neutral black shadows; tint them ink or plum.
- **Don't** apply these tokens to the JuiceColored portfolio routes.
- **Don't** use Cuppy's logo or mascot artwork, or the site's display face, in the build; they are reference only.
