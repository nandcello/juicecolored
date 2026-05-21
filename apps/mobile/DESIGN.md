---
name: JuiceColored Dash
description: Personal food verdict and cutout logger — utilitarian, native calm
colors:
  accent: "#d97706"
  on-accent: "#ffffff"
  background-light: "#f7f2ea"
  field-light: "#ffffff"
  text-light: "#1c1917"
  muted-light: "#57534e"
  label-light: "#78716c"
  placeholder-light: "#a8a29e"
  disabled-light: "#e7e5e4"
  background-dark: "#11100f"
  field-dark: "#26211d"
  text-dark: "#fafaf9"
  muted-dark: "#d6d3d1"
  label-dark: "#a8a29e"
  placeholder-dark: "#78716c"
  disabled-dark: "#292524"
typography:
  display:
    fontFamily: "Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 800
    fontSize: "30px"
    lineHeight: 1.125
  headline:
    fontFamily: "Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    fontSize: "20px"
    lineHeight: 1.4
  title:
    fontFamily: "Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    fontSize: "22px"
    lineHeight: 1.3
  body:
    fontFamily: "Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "15px"
    lineHeight: 1.4
  label:
    fontFamily: "Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    fontSize: "12px"
    letterSpacing: "1.3px"
rounded:
  field: "18px"
  card: "22px"
  container: "24px"
  hero: "32px"
  pill: "9999px"
spacing:
  screen: "20px"
  card: "16px"
  section: "20px"
  stack-sm: "8px"
  stack-md: "12px"
components:
  button-primary:
    backgroundColor: "{colors.text-light}"
    textColor: "{colors.background-light}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "56px"
  button-primary-disabled:
    backgroundColor: "{colors.disabled-light}"
    textColor: "{colors.label-light}"
    rounded: "{rounded.pill}"
    height: "56px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    size: "56px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-light}"
    rounded: "{rounded.pill}"
    height: "56px"
  field-input:
    backgroundColor: "{colors.field-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "58px"
  card-surface:
    backgroundColor: "{colors.field-light}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
---

# Design System: JuiceColored Dash

## Overview

**Creative North Star: "The Pocket Verdict"**

JuiceColored Dash is a field notebook that lives in your pocket: warm stone surfaces, one amber accent, and iOS-native structure borrowed from Apple Notes. The visual system serves capture speed, not brand theater. Personality stays on juicecolored.com; here, design gets out of the way so you can log a place, pick a verdict, or snap a cutout before the moment passes.

Surfaces are layered tonally, not theatrically. Background (`#f7f2ea` light / `#11100f` dark) holds the screen; field white (`#ffffff` / `#26211d`) carries cards, inputs, and the floating tab bar. Continuous corner curves (`borderCurve: "continuous"`) on every rounded element signal native iOS craft without decorative chrome.

This system explicitly rejects Yelp-style social review UI, calorie-tracker dashboards, dark SaaS productivity chrome, and any portfolio theatrics (glass, gradients, hero metrics) that would slow down in-the-moment capture.

**Key Characteristics:**

- Warm stone neutrals with a single amber accent used for selection and FAB only
- Large iOS titles, uppercase tracked labels, bold input text for quick scanning
- Continuous rounded corners at 18–32px; full pills for primary actions
- Tonal depth via background/field contrast; shadows reserved for floating chrome (tab bar, FAB)
- Direct, utilitarian copy tone reflected in restrained visual hierarchy

## Colors

A restrained warm-stone palette with one committed accent. Light mode is the primary scene: cream background, white fields, stone text hierarchy. Dark mode inverts surfaces while keeping the same amber accent.

### Primary

- **Harvest Amber** (`#d97706`): Selection states (active tab, chosen rating, connected review), FAB background, activity indicators, text input selection color. The only saturated hue on screen; its scarcity marks importance.

### Neutral

- **Warm Cream** (`#f7f2ea` light background): Screen canvas. The ambient surface everything sits on.
- **Field White** (`#ffffff` light / `#26211d` dark): Cards, inputs, autocomplete lists, empty states, floating tab bar. Elevated from background by tone alone.
- **Ink Stone** (`#1c1917` light / `#fafaf9` dark): Primary text, primary button fill (inverted: text color becomes button background).
- **Muted Stone** (`#57534e` light / `#d6d3d1` dark): Secondary body copy, inactive tab labels, supporting metadata.
- **Label Stone** (`#78716c` light / `#a8a29e` dark): Uppercase field labels, timestamps, disabled button text.
- **Placeholder Ash** (`#a8a29e` light / `#78716c` dark): Input placeholder text only.
- **Disabled Fill** (`#e7e5e4` light / `#292524` dark): Disabled primary buttons and subtle dividers.

### Named Rules

**The One Accent Rule.** Amber appears only on active/selected states and the FAB. If more than ~10% of a screen reads amber, you've over-applied it.

**The Inverted Primary Rule.** Primary CTAs use ink-stone fill with cream text, not amber. Amber is for selection; ink is for action.

## Typography

**Display Font:** Spline Sans (with Inter, system-ui fallbacks)
**Body Font:** Spline Sans (same stack throughout; no serif pairing)
**Label Font:** Spline Sans, uppercase with tracked letter-spacing

**Character:** Bold and scannable. Large input text (22px) for restaurant names you type quickly. Uppercase labels with wide tracking (1.3–1.8px) for field grouping. No decorative type; hierarchy is weight and size, not font switching.

### Hierarchy

- **Display** (800, 30px / 36px line-height): Screen intros ("Add a photo of food.", "Cutout saved!"). One per screen section.
- **Headline** (700, 20px): Card titles (restaurant names), empty-state headings.
- **Title** (700, 22px): TextInput value text; the largest interactive text on form screens.
- **Body** (400–600, 15px / 21px line-height): Supporting copy, autocomplete addresses, error messages.
- **Label** (700, 12–13px, uppercase, tracking 1.3–1.8px): Field labels ("Restaurant", "Rating", "Quick capture").
- **Micro** (800, 10px, uppercase, tracking wide): Bottom tab labels.

### Named Rules

**The Bold Input Rule.** Form inputs render at 22px bold. Users are typing place names in a hurry; small body text is wrong here.

**The Tracked Label Rule.** Section labels are always uppercase with letter-spacing ≥1.3px. Sentence-case labels read as body copy and break scan rhythm.

## Elevation

Flat-by-default with tonal layering. Depth comes from background vs. field surface contrast, not stacked shadows. The only structural shadows appear on floating chrome: the bottom tab pill and the FAB (`shadow-lg`). Cards, inputs, and list items have no shadow at rest.

### Shadow Vocabulary

- **Floating chrome** (`shadow-lg`): Bottom tab bar and FAB only. Signals persistent navigation above scroll content.

### Named Rules

**The Tonal Layer Rule.** Never add box-shadow to cards or inputs. If something needs to feel raised, use the field surface color on a background canvas.

## Components

### Buttons

- **Shape:** Full pill (`rounded-full`), 56px min height (`min-h-14`), continuous border curve.
- **Primary:** Ink stone background, cream text, 17px extrabold. Used for "Save verdict", "Add review", "Allow camera".
- **Primary disabled:** Disabled fill background, label stone text, 70% opacity.
- **Accent FAB:** 56×56px circle, amber fill, white icon (26px). Contextual: add review or open camera.
- **Secondary / Ghost:** Transparent with 1px ink stone border, ink text. Used for "Choose from camera roll".

### Cards / Containers

- **Corner Style:** 22px continuous (`rounded-[22px]`) for list cards; 24px for empty states; 32px for photo preview containers.
- **Background:** Field white on background cream.
- **Shadow Strategy:** None on cards. Tonal contrast only.
- **Border:** Transparent default; 1px accent border when selected (review connection).
- **Internal Padding:** 16px standard (`p-4`); 24px for empty states (`p-6`).

### Inputs / Fields

- **Style:** Field white fill, 18px continuous radius, 58px min height, 16px horizontal padding.
- **Typography:** 22px bold value text; placeholder in placeholder ash.
- **Focus:** Native selection color set to accent amber.
- **Autocomplete list:** Same field surface, 18px radius, items separated by 1px disabled-color dividers.

### Rating Selector

- **Style:** Segmented control inside a field container (18px outer radius, 14px inner option radius, 6px padding).
- **Selected:** Amber fill and border, white text.
- **Unselected:** Transparent, ink text.

### Navigation

- **Header:** iOS large title enabled, no header shadow, background matches screen canvas.
- **Bottom tab pill:** Floating field-white bar, 64px height, full pill shape, subtle disabled-color border (10% opacity), `shadow-lg`. Icon + micro uppercase label per tab. Active tab: amber icon and label; inactive: muted stone.
- **FAB:** Absolute positioned above tab bar (bottom: 104px, right: 24px), amber circle, contextual icon.

### Review Card

- **Style:** Swipeable field-white card with restaurant name (headline), optional address (label), verdict (body, capitalized), date stamp (uppercase micro label).
- **Delete action:** Red-500 pill revealed on swipe left; not part of the core palette.

### Food Photo Grid

- **Style:** Two-column grid, 1:1 aspect ratio images with `contentFit: contain`, 10px semibold caption below when linked to a review.

## Do's and Don'ts

Concrete guardrails derived from PRODUCT.md anti-references and the extracted system.

### Do:

- **Do** use warm cream background + field white cards for every screen; tonal layering is the default depth model.
- **Do** apply continuous border curves (`borderCurve: "continuous"`) on all rounded React Native views.
- **Do** keep amber for selection states and the FAB only; use ink-stone inverted buttons for primary actions.
- **Do** write uppercase tracked labels for field grouping and direct verdict language ("Save verdict", not "Submit review").
- **Do** honor system light/dark mode via `useColorScheme` and the shared `getAppColors` token map.

### Don't:

- **Don't** use star ratings, likes, follower counts, or any Yelp/Beli/Google Maps social review patterns.
- **Don't** add calorie counts, macro rings, diet framing, or health-dashboard chrome from calorie tracker apps.
- **Don't** ship dark SaaS dashboards, purple gradients, or generic productivity UI chrome.
- **Don't** import web portfolio theatrics: glass cards, gradient text, hero metrics, decorative blur.
- **Don't** add box-shadow to cards or inputs; shadows are for floating tab bar and FAB only.
- **Don't** use side-stripe colored borders on list items or cards.
