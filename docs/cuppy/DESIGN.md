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
  close-section:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    padding: "clamp(4.5rem, 10vw, 8rem) clamp(1rem, 3.2vw, 2.75rem) clamp(3rem, 6vw, 5rem)"
---

# Design System: Cuppy (concept)

> Scope and rights. This system covers only the `/concepts/cuppy` route (`apps/web/src/app/(cuppy)/`), which has its own root layout. It does not describe the JuiceColored portfolio and must not be applied to it. The Cuppy name, mascot cues, palette and site copy are owned by Cuppy Ice Cream; **publication permission is pending**. Provenance, sources and rights status live in [README.md](./README.md); the measured palette is in [brand-palette.json](./brand-palette.json). Token extensions (motion, shadows, 3D material and lighting, component snippets) are in [design.json](./design.json).

## Overview

**Creative North Star: "The Product Is the Headline"**

A drenched lavender ground carries ink type so wide and heavy that it reads as a printed cup band. The product does not sit beside the copy; a real 3D soft-serve cup floats inside the sentence, between the lead line and a full-bleed pedestal word, and its soft plum contact shadow lands on the letters below it. Everything else (the pitch and its CTA) is small, quiet, and pinned to the edge so the cup and the word own the first viewport. There is one art-directed product, the vanilla swirl, and no flavor choice.

Density is low and the voice is loud only at display size. Color is the brand's own: lavender as the field, ink for type, outlines and buttons, cream only where it can be read (on ink or chocolate). Chocolate and caramel stay in the measured palette but are not used on the page since the flavor selector was removed. Ink four-point sparkles are the world's ornament and appear on the page, the ritual list and the printed cup label.

Motion is soft and physical, and the signature moment is the pull, driven by the page's own scroll: a spoon drops in, lifts the real top of the swirl, and stays where it was in the document while the cup travels down with the reader, so a continuous ribbon of cream stretches the whole length of the page, drawing the cream left in the cup down as it goes, and reassembles when scrolling back. The cup reacts like a delighted kid watching a trick: Cuppy's printed face goes from cool behind the shades, to round eyes popping over tipped glasses at spoon contact, to one eyebrow climbing as the strand keeps going, and lands on a bright, proud "look what I did!" smile that holds completely still at the bottom of the page. Around it: a slow bob and pointer tilt at rest and a cubic ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) on every UI transition. The visitor's own `prefers-reduced-motion` setting is the only motion switch: there is no in-page control and nothing is stored. Reduced motion gets one composed 3D still (spoon lifting the top, a short neck of cream), no scroll scene and a short reading layout, from the first paint and whenever the setting changes while the page is open.

**Key Characteristics:**

- Lavender field, ink type, cream only on dark fields.
- Archivo at 125% width, weight 900, uppercase, tight negative tracking for display.
- The 3D cup sits in the headline, not beside it.
- Ink four-point sparkles as the only ornament.
- The cream in the cup drains into the strand as the page scrolls.
- The cup has a face: an original rubber-hose character whose expression is driven by the scroll.

## Colors

The site's exact palette, used as fields rather than accents: one drenched ground, one ink, one cream, and two flavor fields kept in reserve.

### Primary

- **Cuppy Lavender** (lavender-ground): the hero ground, the `html` background and the `theme-color`. Also the accent span ("Stay for the pull.") on the ink close section, where it reads at about 7.5:1.

### Secondary

- **Chocolate Field** (chocolate-field): measured from the brand; unused on the page since the flavor selector was removed. Text on it would be cream.
- **Caramel Field** (caramel-field): measured from the brand; unused on the page. Text on it would be ink.

### Neutral

- **Cuppy Ink** (ink): all type on lavender and cream; sparkles; primary buttons; the close section and footer ground; focus rings; text selection.
- **Cup Cream** (cream): the cup paper, text on ink and chocolate, the cream button on ink. Footer text uses it at 74% alpha and the footer rule at 18%.
- **Plum Shadow** (plum-shadow): tint for the cup's contact shadow (`rgb(40 20 48)` at up to 0.44) so shadows read as lavender-dark, never grey.

### Named Rules

**The Cream Stays Off Lavender Rule.** Cream text on lavender measures about 2:1 and is never used. Cream type appears only on ink or chocolate; on lavender, cream, and caramel the text is ink.

**The Flavor Is a Field Rule.** If flavor colors return, they arrive as full-width fields, each paired with its contrast ink (vanilla: ink, chocolate: cream, caramel: ink), never sprinkled as accents on the lavender hero.

## Typography

**Display Font:** Archivo variable, width axis at 125% (with Arial Narrow, Arial fallback)
**Body Font:** Archivo at 100% width
**Label Font:** Archivo at 112–118% width, weight 800, tracked uppercase

**Character:** One family stretched across its width axis does all the work. Display is extra-wide, black and uppercase, a stand-in for the brand's unlicensed display face; body is the same family at normal width so the voice never changes, only the stance.

### Hierarchy

- **Display word** (900, 125% width, sized so "STRETCHES." spans the full content width, line-height 0.82): the single pedestal word at the hero's foot. Its size is computed from the measured advance (8.27em) so it never wraps.
- **Display lead** (900, 125%, clamp 1.75–5.25rem, 0.86): the opening phrase above the cup. On narrow screens it grows to clamp(1.75rem, 9.6vw, 4rem).
- **Headline** (900, 125%, clamp 2.75–7.5rem, 0.88, -0.03em): reserved display step; the flavor band that used it was removed.
- **Headline close** (900, 125%, clamp 2.25–5.25rem, 0.92): the closing statement on ink.
- **Title** (800, 112%, clamp 1.75–3.25rem, 1.05): the three-step ritual list, stepped in by 1.1em per line with sparkles.
- **Wordmark** (900, 125%, 1.375rem; 1.125rem narrow): masthead name; its "Ice Cream" suffix is 0.55em, 700, tracked 0.12em.
- **Body lead** (400, clamp 1.125–1.5rem, 1.4, max 30ch): reserved lead step; the flavor line that used it was removed.
- **Body** (400, 1.0625rem, 1.5): pitch copy (clamp 1–1.1875rem), close copy (1.125rem, max 28ch).
- **Label** (800, 118%, 0.8125rem, 0.1em, uppercase): small uppercase labels such as the concept tag (at 112%).
- **Fine print** (400, 0.8125rem, 1.55, max 72ch): footer disclosure in cream at 74%.

### Named Rules

**The Width Is the Voice Rule.** Hierarchy is carried by the width axis and weight, not by switching families: 125% for display, 112–118% for labels and buttons, 100% for reading text. Uppercase is reserved for widened text; body copy is never uppercase.

**The Tight Display Rule.** Display sizes always take negative tracking (-0.01em to -0.03em) and line-height under 0.92; tracked-out uppercase is for small labels only.

## Layout

The page is one long pull: the lavender hero, the lavender pull section (the ritual chapters), and the ink close with its footer. A single fixed, viewport-sized WebGL layer sits above all of it (pointer events off), so the cup can live in viewport space while the spoon lives in document space. Horizontal padding is a single fluid gutter, `clamp(1rem, 3.2vw, 2.75rem)`, used everywhere.

The hero is a column: a 4.5rem masthead (wordmark left; concept tag right), the lead line top-left, a flexible gap, and the pedestal word at the bottom. Its height stops at `100svh − 4.5rem` (minimum 38rem) so the first chapter peeks in above the fold. The 3D stage is absolutely centered over the gap and overlaps the word, width `min(46vw, 74svh, 44rem)`, with the ground line placed so the shadow falls on the letters. The pitch and CTA (left, max 23rem) float above the word; the right side is left open around the cup and its sparkles.

The pull, close and footer share one grid: `1fr | lane | 1fr`, where the lane (`clamp(17rem, 27vw, 27rem)`) is kept clear for the cup and the ribbon. Chapters alternate sides, one per row: "Dig in." (left, close under the hero), "Lift slow." (right), "Let it stretch." (left), "Still going." (left), each 0.8 to 1 viewport tall so the ribbon visibly grows between them. The close puts the headline left and the action right; the footer note sits left.

Below 960px the grid becomes `1fr | 36vw`: all copy runs in the left column and the cup, after the scoop, recedes into the right-hand lane. The hero's gap becomes a `clamp(18rem, 50svh, 32rem)` window for a full-width cup (max 34rem), plus a ground lift: the stage's ground line, and with it the contact shadow, sits `clamp(1.5rem, 6.5vw, 2.25rem)` above the word's cap height instead of in the letters, and the gap grows by the same amount so the cup keeps its place under the lead and the word moves down. Because it is layout, the poster, the live scene and the reduced-motion still all have the room from the first paint. While the cup holds still and the word scrolls up under it during the scoop, the scene eases the cast shadow out (over about 24px) as the word enters the shadow's band and back in once it has passed (`wordClearanceFade`), so the shadow never sits on the letters; under the word sits an `80lvh` "spoon room" that stays empty so the scoop never covers copy, then the pitch and CTA in the left column. With reduced motion, without script or without WebGL, nothing travels down the lane, so the spoon room and the chapter heights collapse to normal reading rhythm and the copy stops narrating the pull. Reduced motion and missing script are read from media queries (`prefers-reduced-motion`, `scripting`), so the first paint is already right; a failed WebGL start comes in later through `data-scene="fallback"`. Below 421px the wordmark suffix drops.

## Elevation & Depth

Depth comes from the 3D object and soft, tinted shadows; the UI itself is flat. The page has no cards and no layered surfaces. The only shadows are diffuse and plum- or ink-tinted: under the primary button, and the cup's own contact shadow: two stacked plum planes with a Gaussian falloff (a soft pool 2.5 units across, a little wider than the rim, and a 1.25-unit core about the foot), lifted 0.16 units off the ground line so they sit close under the floating cup, nudged right and back away from the key light, and fading slightly as the cup bobs up. Sized to the cup, not the swirl, so on a phone the shadow stays inside the cup's lane and never reads as a separate dark disc. Full values are in the sidecar.

### Shadow Vocabulary

- **Button rest** (`box-shadow: 0 10px 24px -14px rgb(23 19 26 / 0.7)`): ink button on lavender only.
- **Button hover** (`box-shadow: 0 16px 28px -16px rgb(23 19 26 / 0.8)`): paired with a 2px lift.

### Named Rules

**The Soft Tint Rule.** Shadows are blurred, offset downward, and tinted ink or plum. The cream button on ink takes no shadow.

## Shapes

Two forms carry the world. Controls are full pills (999px): the CTA buttons and the outlined concept tag. The four-point sparkle (concave star, 24-unit path) is the recurring ornament. Focus rounds to 6px.

## Components

### Buttons

Heavy, pill-shaped, and quietly lifted.

- **Shape:** full pill (999px), minimum height 3.25rem, padding `0 1.4rem 0 1.6rem`, trailing up-right arrow at 1.15rem.
- **Primary:** ink fill, cream text, 800 weight at 118% width, uppercase, 0.04em tracking, soft ink shadow.
- **Hover / Active:** lifts 2px with a deeper shadow, the arrow nudges 2px up-right; active returns to rest. 0.25s on the house ease-out.
- **Cream variant:** cream fill and ink text for use on the ink close section; no shadow; its focus ring switches to cream.
- **Focus:** 3px ink outline, 4px offset, 6px radius (global rule).

### Concept Tag

A 2px ink-outlined pill reading "Internal concept" (label face at 112%, 0.75rem). It is a standing disclosure that the page is not Cuppy-operated, not a decorative badge; it stays visible at every width.

### Navigation

There is no navigation and no in-page control. The masthead holds the wordmark and the concept tag; the only focus stops on the page are the two Instagram links. Motion follows the visitor's system setting, not a page toggle.

### Floating Cup (signature)

An original procedural three.js model: a lathed paper cup with a rolled rim, a printed label (sparkles flanking the face, "CUPPY" at the front of an "ICE CREAM" band and on the back, all in ink on paper cream) with Cuppy's face printed on its front (see Cuppy's Face), a piped soft-serve swirl with star-nozzle ridges and a curled tip, and three drips. Lit by a warm key from the upper left, a lavender rim from behind right, and a cream-to-lavender hemisphere fill, under neutral tone mapping. It bobs and turns slowly (at most about 0.3 rad, so the face keeps reading) and tilts toward the pointer. The cream is a single art-directed vanilla (`#F4E4C4`, sheen `#FFF7E8`). Two WebP stills of the same model stand in until WebGL is live and whenever script or WebGL is unavailable or lost: `poster-rest.webp` (the scroll scene's first frame, face at rest) and `poster-still.webp` (the reduced-motion pose, face looking up at the spoon). A `<picture>` source on `prefers-reduced-motion` picks between them, so even the first paint matches the visitor's setting. Exact materials, lights and motion constants are in the sidecar.

### The Pull (signature)

Scroll-driven and fully reversible; positions are a pure function of scroll and layout (`choreography.ts`). Over the first 0.64 viewport heights the spoon (procedural glossy ink plastic, egg-shaped bowl, rising handle) drops in from above, digs into the side of the curl, sinks level under it and lifts the actual top of the swirl, which is split from the base with domed cut faces. A lift integral eases the spoon from riding with the cup to riding with the page, so it settles into the document without a jolt and then scrolls away upward. The cup keeps its spot on screen and then settles low (desktop: centre lane; narrow: receding in depth into the right lane), staying whole above the visible bottom edge to the end of the page. The ribbon (`strand.ts`) is a fluted tube rebuilt in place each frame: it leaves the swirl's cut and the dollop's underside with flared fillets, necks down as it lengthens (volume-conserving, floor radius 0.12 units so it always reads as cream), and carries lumps and flutes on the material so they drift up and lengthen as it stretches. A scroll-velocity spring bows it and lets it wobble on stop; fast pulls tug the cup up a touch. The cream left in the cup feeds the strand: from the moment the spoon takes the top, `creamDrawn` eases from 0 to 1 over the rest of the page and `creamLeft` sinks the remaining swirl into the cup, slumps its coils and draws it in from the wall (never through the paper). About half of it shows above the rim at mid-scroll and a thin layer at the end; it refills exactly on the way back up. The cup, the scene scale and the cream's opacity never change.

### Cuppy's Face (signature)

An original 1930s rubber-hose cartoon face, drawn procedurally (`face.ts`) in a 1000 x 600 design space onto an 800 x 480 canvas and printed on a lathe band over the cup's front (±0.8 rad, 0.27 to 1.10 units up the wall) with the label's own paper material, so it is lit, shadowed and turned like the print. Ink `#17131A` outlines (15 units), eye whites `#FFFAF1`, lids and cheeks in the paper `#F2E6D2`, and mouth interior `#3B2026` (only in the final smile). Pie-cut pupils, tapered brush brows, a button nose, and the approved pixel sunglasses, which now live on this layer so they can slide, tip (foreshorten) and tilt. Eyes find the spoon on screen (projected positions, so the gaze is right on every layout), travelling only 0.6 of the way up so a far spoon never reads as eyes rolling back; at rest they follow the pointer.

The expression is a pure function of scroll (pose-to-pose keys, no springs), so it reverses exactly and survives jumps and resizes. The tone is wholesome, curious-to-proud cartoon delight; gaze, brows and glasses do the acting, never an open mouth, grimace, sweat or shaking: **rest** (shades on, eyes squinted behind them, right brow cocked, smirk) → **anticipate** at the hover beat (eyes peek over the shades at the spoon, smirk softens) → **contact** at the dig beat (glasses slip down the nose, round eyes pop up onto the spoon, a small closed U-smile) → **scoop** at the cradle (the glasses perk up and tilt the other way, once) → **lift** at the anchor (glasses settle) → **curious** at 30% of the pull (one brow goes up) → **impressed** at 62% and 88% (that brow climbs as high as it goes while the other settles, the closed smile widens) → **final** at the bottom (eyes back on the viewer with a catch-light, both brows up and arched, glasses perked back up at a jaunty tilt, a bright smile that opens just enough to show the top teeth). From contact to the landing the eyes stay round and open with full-size pupils on the spoon and the mouth stays closed. Acting beats ease in and out so each pose reads; the pull keeps growing between its keys. Idle life sits on top: a blink about every 4 s, a resting brow flash, the glasses lagging the float while the cream squashes with it, and the cream drawing up a little with the pull and settling at the final. All idle life (float, turn, pointer tilt, ripple, scroll springs, blink) fades out over the last 12% of the pull and is exactly zero within 2px of the bottom, where the frame loop stops: the final reaction holds still indefinitely and resumes naturally on the way back up. Reduced motion shows the still pose's face (glasses perking at the scoop, eyes on the spoon, small smile) with no loop; posters carry the rest and still faces.

## Do's and Don'ts

### Do:

- **Do** set every display line in Archivo at 125% width, weight 900, uppercase, with negative tracking.
- **Do** keep the product inside the headline composition. On wide screens its contact shadow may land on the type; below 960px the cup and its shadow get their own room, with open lavender between the shadow and the word.
- **Do** use the ink four-point sparkle as the ornament, in ink or `currentColor`.
- **Do** run every UI transition on `cubic-bezier(0.16, 1, 0.3, 1)` and drop it under `prefers-reduced-motion`; give the 3D object a composed still pose, not a frozen frame.
- **Do** keep a still render of the same model behind the live canvas so the object never disappears.
- **Do** keep Cuppy's face legible at the smallest phone cup: bold ink shapes, no hairlines, and keep the cup's turn small.
- **Do** drive every expression from the scroll and let idle life only decorate it; nothing may move at the bottom of the page.
- **Do** keep the "Internal concept" tag and the footer disclosure on any page in this world until publication permission is granted.

### Don't:

- **Don't** set cream text on lavender (about 2:1).
- **Don't** split the hero into copy left and product right with a badge row; the cup lives in the sentence.
- **Don't** use grey or neutral black shadows; tint them ink or plum.
- **Don't** apply these tokens to the JuiceColored portfolio routes.
- **Don't** use Cuppy's logo or mascot artwork, or the site's display face, in the build; they are reference only.
- **Don't** paste game or cartoon artwork, or use emoji, for the face; it is drawn here, in the cup's own ink and paper.
- **Don't** let the face strain, grimace, sweat, gape or shake; escalate through gaze, brows and glasses, and keep the mouth a small closed smile until the final.
