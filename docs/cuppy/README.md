# Cuppy concept: reference and provenance

Internal design concept for **Cuppy Ice Cream**, built as the `/cuppy` route of the JuiceColored web app (`apps/web/src/app/(cuppy)/`). It is not a Cuppy-operated page, is `noindex`, and must not be published without the owner's permission.

## Rights status

| Item                                         | Owner                                                                 | Status                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Cuppy name, logo, mascot, palette, site copy | Cuppy Ice Cream                                                       | Owner-owned. Reference only; **publication permission pending**                                                     |
| `references/reference-board.jpg`             | Board compiled during research; contains Cuppy artwork                | Internal reference only                                                                                             |
| `references/official-flavor-picker.png`      | Screenshot of cuppyicecream.com                                       | Internal reference only                                                                                             |
| 3D cup, swirl and printed label              | Original procedural model in `apps/web/src/components/cuppy/scene.ts` | Original work; the pixel-sunglasses print is an approved nod to the mascot and still falls under Cuppy brand rights |
| `apps/web/public/cuppy/poster-*.webp`        | Still renders of that model (see each `.webp.json` sidecar)           | Original renders, same caveat as above                                                                              |
| Archivo typeface                             | Omnibus-Type, SIL Open Font License 1.1                               | Self-hosted through `next/font/google`                                                                              |

Not in this repo on purpose: the raw source HTML (it embeds the site's display font, declared as `Monument`, whose license was not verified), the official logo/mascot PNGs, the competitor screenshots, and the full research archive. They remain in the source pack below.

## Sources

- Research pack: `/home/t3dev/artifacts/cuppy-source-pack/cuppy-source-pack.zip` (34 files, SHA-256 `1f792edd56f65cfa7e649082778a0ab3bd8dadac08f9bfa40845e833080b9c5f`), retrieved 2026-11-22.
- https://cuppyicecream.com/ — the only fully rendered primary source. Supplied the palette (exact CSS values), the mascot and logo art, and the three flavors shown on the picker: Vanilla, Chocolate, Salted Caramel.
- https://www.instagram.com/cuppyicecream/ — the verified profile, used as the page's outbound CTA. Direct browsing returned HTTP 429, so **the feed was not reviewed**.
- Little Moons (texture storytelling), Jeni's (appetite and product clarity), Van Leeuwen (pastel discipline) — principles only; no competitor assets are used.

## Palette (from the site's CSS)

`brand-palette.json` holds the measured values.

| Token     | Hex       | Use on the page                                         |
| --------- | --------- | ------------------------------------------------------- |
| Purple    | `#C397C4` | Drenched hero ground                                    |
| Cream     | `#F2E6D2` | Vanilla field, cup paper, text on ink or chocolate only |
| Ink       | `#17131A` | Type, outlines, buttons, closing section                |
| Chocolate | `#58362E` | Chocolate field and chip                                |
| Caramel   | `#D59D58` | Salted caramel field and chip                           |
| Coral     | `#F15D65` | Reserved; unused in this first concept                  |

Contrast: ink on purple ≈ 7.47:1. Cream on purple ≈ 1.99:1 fails at every text size, so cream text appears only on ink (≈ 14.9:1) or chocolate (≈ 8.6:1).

## Content rules followed

- Copy is new concept copy. Flavor lines are descriptive, not ingredient, nutrition or allergen claims.
- Not reproduced: the site's dated campaign (Oct 23), free-taste and cash-prize challenge, 10% voucher, booth location, phone number, or its misspelled contact address.
- No checkout, ordering, newsletter, store locator, reviews or metrics. The only action is the Instagram link.
- "First-ever" positioning is not claimed.

## Build notes

- `three` is dynamically imported by `cuppy-stage.tsx` only after a WebGL probe passes, so the route's initial bundle carries no 3D code.
- The scoop-and-stretch sequence plays from native scroll (no wheel hijacking or scroll locks) in one fixed, viewport-sized canvas. `choreography.ts` maps scroll and layout to the cup, spoon and camera as a pure function, so it reverses exactly and survives fast scrolling, resizes and mobile toolbar changes (the visible height is eased; the canvas is `100lvh` so it never resizes with the toolbar). `strand.ts` rewrites preallocated ribbon buffers in place, so a long pull allocates nothing.
- Pixel ratio is capped at 1.5 and about 3.4 megapixels for the full-viewport scene (1.75 for the small reduced-motion still). Frames render only on scroll, idle motion, springs or color blends, and stop while the tab is hidden. The Pause control stops idle motion; the reader still drives the scroll scene. All geometry, materials, textures and the context are disposed on unmount. Context loss falls back to the poster and retries twice.
- Reduced motion renders a single composed still in the hero slot (spoon lifting the top) instead of the scroll scene. Without WebGL the matching poster still is shown and the chapters close up; the hero slot keeps its accessible name in every state.
- Unit tests (`choreography.test.ts`) cover the cup staying whole on screen at every scroll position, the spoon staying fixed to the document after the lift, a pull that only grows, step continuity and reversal; `tests/e2e/cuppy.spec.ts` drives the real page.

## Open items for the owner

1. Publication rights for the name, palette and mascot cues, and whether the cup may carry the sunglasses print.
2. A vector logo and the licensed display face, if the page should move closer to the live brand.
3. Current flavors, locations, hours and the preferred CTA destination.
4. Product photography or stretch video, to check the procedural stretch against the real product.
