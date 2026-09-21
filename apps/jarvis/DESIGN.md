---
name: Jarvis
description: Readable home controls on flat, light surfaces.
colors:
  forest: "#315d47"
  forest-hover: "#254b38"
  canvas: "#f6f7f5"
  surface: "#ffffff"
  ink: "#232822"
  muted: "#626862"
  line: "#dfe3de"
  field-border: "#bcc5ba"
  button-border: "#cbd2ca"
  neutral-hover: "#edf1ec"
  selected-surface: "#e1e9e3"
  selected-ink: "#234e38"
  notice-surface: "#edf3eb"
  warning-surface: "#fbf4e9"
  warning-border: "#d0ba96"
  warning-ink: "#664515"
  error: "#9e392b"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-1px"
  room-title:
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.3
  device-title:
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "15px"
    lineHeight: 1.45
  button:
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontSize: "13px"
rounded:
  control: "8px"
  field: "7px"
  panel: "10px"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  section: "20px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.forest}"
    rounded: "{rounded.control}"
    padding: "10px 8px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  device-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px 24px 0"
---

# Design System: Jarvis

## Overview

**Creative North Star: "Everyday appliance controls"**

Jarvis uses the user-approved reference in `docs/design-reference.png`: light neutral surfaces, forest-green states, system sans typography and familiar labeled controls. Density serves quick reading and direct adjustment. Room and device names establish hierarchy without decorative imagery.

**Key Characteristics:**

- Flat white panels on a light neutral canvas.
- Visible device state and directly available appliance controls.
- Room groups that reflow into a single mobile column.

## Colors

The palette pairs near-neutral surfaces with a restrained forest accent. Frontmatter records shared colors; component snippets retain local state colors.

### Primary

Forest identifies primary actions, enabled switches, selected segments, range fill and keyboard focus. Forest hover deepens primary actions.

### Neutral

Canvas surrounds white surfaces. Ink carries labels; muted carries room names and supporting text. Line separates panels and control groups; stronger field and button borders identify interactive boundaries. Selected navigation uses a pale green surface and darker green text.

Warning surfaces, borders and text communicate unavailable or unverified device state. Error red identifies failed actions; pale green notices communicate feedback.

**The State Rule.** Pair color with labels, position or visible selection; preserve On/Off text beside power switches.

## Typography

The global font is the system sans stack in `body`. This is the explicitly approved reference direction. Headings use the same family; no separate decorative display face is introduced.

The hierarchy descends from page headline to room title, device title, body, controls and supporting captions. Mobile page headings reduce to 28px; room titles to 18px; device titles to 16px. Small range labels and mobile navigation use 12px. Numeric range outputs use tabular figures. Device and room names wrap rather than forcing panel overflow.

## Layout

The desktop shell has a fixed 210px sidebar and a main area with 32px top, 36px horizontal and 64px bottom padding. Main content is capped at 1570px. Room groups use a 30px gap; paired device columns use a 20px gap. Closed panels in a row stretch to share a baseline; opening More controls permits independent heights. An off-device panel spans the row in its compact state.

At 1190px and below the sidebar reduces to 180px and main padding to 28px. Device grids use one column from 761–1020px; at 1800px and above they can use three columns. At 760px and below, the sidebar becomes a compact header and labeled fixed bottom navigation, device and settings grids become one column, and main horizontal padding is 18px. Bottom clearance includes the safe-area inset. Device panels reduce to 18px padding and 16px gaps; at 360px and below outer padding is 12px and panel horizontal padding is 14px.

The sign-in surface uses the same palette and a centered form capped at 400px, with 48px controls.

## Elevation & Depth

Panels remain flat: white fill, a thin neutral border and no panel shadow. Switch and range thumbs use small shadows to make their movable parts legible. Modal dialogs use a larger shadow and a translucent dark backdrop without blur. Exact shadow and motion values live in the sidecar.

**The Flat Panel Rule.** Use borders and surface contrast for ordinary containers; reserve elevation for movable control parts and modal dialogs.

## Shapes

Panels use softly rounded corners; dashboard buttons, fields and segments use tighter corners. These are related shapes, not a single forced radius: shared dialog buttons use 10px, shared dialog inputs 9px and dialogs 12px. Switch tracks are capsules; knobs and light swatches are circles. Thin rules divide control groups.

## Components

- **Buttons:** Primary forest, bordered white secondary and transparent text actions. Dashboard controls have a minimum 44px height. Hover changes color; keyboard focus uses a 2px forest outline. Dashboard focus offset is 4px, fields 3px and global controls 5px. Disabled dashboard controls use 0.5 opacity; shared global buttons use 0.42.
- **Fields:** Visible labels, white fill and a stronger neutral border. Native selects and inputs retain their familiar behavior.
- **Navigation:** Desktop items pair line icons with text and use a pale selected background. Mobile items stack icons above labels. Room filters scroll horizontally and mark selection with a forest underline.
- **Device panels:** A device icon, wrapping name, room and labeled power switch precede primary controls. A divided More controls disclosure contains occasional actions. Power stays visible in the compact off state. Unavailable devices retain their readings and visibly explain why controls are disabled.
- **Switches and segments:** Forest marks enabled or selected states. Switch thumbs move 20px on desktop and 18px on mobile. Segmented choices expose their selected state through `aria-pressed`.
- **Ranges:** A visible label and numeric output sit above a 44px-high native input with a 12px track. White thumbs are 26px in WebKit and 24px in Firefox. Green fill indicates amount; the white-temperature track uses a warm-to-cool physical scale.
- **Badges and feedback:** Shared status badges use pale green fill and border. Warnings use warm neutral tones and readable explanatory text.

Switch motion lasts 140ms with ease-out; shared dialog buttons transition background color over 0.2s. Reduced-motion preferences disable transitions and animation.

## Do's and Don'ts

### Do:

- **Do** keep primary appliance controls and labeled power directly available.
- **Do** retain visible keyboard focus and at least 44px primary control targets.
- **Do** group devices by room and preserve the control order on mobile.
- **Do** show unverified or offline state alongside retained readings.

### Don't:

- **Don't** add decorative device renders, oversized greetings or dashboard metrics.
- **Don't** use atmospheric gradients; gradients belong to control fill or physical light temperature.
- **Don't** replace labeled navigation or control state with icons or color alone.
