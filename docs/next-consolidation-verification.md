# Next.js consolidation verification

This migration is intended to retain the portfolio, Jarvis, and CANCELDT appearance and behavior while serving them from one Next.js application.

## Before-change evidence

Baseline screenshots were captured before removing the original application roots:

- Portfolio: all seven spreads at 1440×900 and 390×844 (14 images).
- Jarvis: home, scenes, settings, activity, help, connection dialog, fan and light advanced controls, device settings, and sign-in, including mobile equivalents (20 images).
- CANCELDT: latest list, exact/partial/no-match search, invalid query, detail and missing detail, report, login, protected searches, authenticated dashboard, new/edit subject, report queue, drafts, and search history at desktop/mobile sizes (32 images).

The 66 baseline PNG files and capture scripts are stored outside application source at `/tmp/next-consolidation-qa`. Live portfolio music and food regions are masked to make visual comparison meaningful. CANCELDT baseline captures read the development backend without altering its editorial data. No captured page had horizontal overflow.

The original Jarvis fixture suite passed all 13 tests before migration. It exercised device controls, scenes, room/name changes, fan direction calibration and drag/keyboard/cancellation, failures and pending controls, offline/unverified state, hiding/restoring devices, empty/discovery, sign-in errors, and responsive layouts from 320 to 1920 pixels. Device operations use fixtures and never actuate live home hardware.

The direct-IP CANCELDT report baseline returned Cloudflare Turnstile hostname error 110200. Final report verification must use the configured local HTTPS hostname. Screenshot-time hydration warnings caused by caret hiding before hydration are harness noise; final behavioral checks must separately observe runtime errors after hydration.

## Required post-change coverage

- Portfolio: metadata/assets, SSR/live data, all seven spreads, keyboard/button/contents navigation, desktop/mobile visual comparison, app links, and API health/auth/validation behavior.
- Jarvis: entire fixture suite in a temporary copy of the unified host, all views and dialogs, responsive screenshots, real local sign-in/session cookie scope/reload/origin rejection/logout with no device commands.
- CANCELDT: search and URL/back-forward/no-JavaScript behavior, sources and details, native share/clipboard/error fallback, public metadata/OG images, query validation, report submission and moderation/correction/rejection, owner sign-in/out, draft/create/edit/publish/archive/restore, source field motion/focus, search activity/history/pagination, and invalid-session/backend-failure behavior.
- Isolation: cross-app navigation must retain each app's fonts, colors, component styles, metadata, public asset paths, mounted routes, and cookie boundaries. Original app servers must remain stopped while testing the unified host.
- Cleanup: development-only fictional fixtures must be archived; credentials and cookies must not be printed or recorded in traces.

## Post-change results

The optimized unified build was tested with the original standalone servers stopped. The evidence below is saved under `/tmp/next-consolidation-qa`.

| Area                                            | Evidence                                                                                                                       | Result                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio appearance                            | All seven spreads, desktop and mobile                                                                                          | All 14 comparisons have zero changed pixels after allowing lazy food images to settle.                                                         |
| Jarvis appearance                               | 20 desktop/mobile views, dialogs, controls, and welcome screens                                                                | Zero changed pixels in all 20 comparisons; no page errors or horizontal overflow.                                                              |
| Portfolio additional interactions               | Cover CTA, studio jump, every live meal photo, modal dismissals, blocked book keys while a dialog is open, contact and restart | Passed on desktop and mobile, including all five live photos.                                                                                  |
| CANCELDT backend error behavior                 | Isolated optimized server with the existing test-only fetch fault preload                                                      | All 12 assertions passed; the fictional development subject was archived afterward.                                                            |
| CANCELDT appearance and full application suites | Public/admin/report comparisons plus browser suites                                                                            | All 32 desktop/mobile states have zero changed pixels after settling dynamic data; the CANCELDT agent reports all 21 application cases passed. |

The 12 fault assertions verify truthful sign-in service errors and retry intervals, an admin backend outage without a false logout, retry with the same session, create/update failures preserving input and record identity, successful retries committing the intended revision, cache invalidation, a failed public lookup without a false verdict, retry, and authenticated revalidation.

The original first capture of desktop portfolio spread six raced lazy image loading. The gallery's changing intrinsic height also moves its adjacent text, so masking only the images is insufficient. Re-capturing the original Git version and unified version after all five images decoded produced identical geometry and zero changed pixels. The comparable images are `baseline/portfolio-desktop-6-settled.png` and `after/portfolio-desktop-6-settled.png`.

The additional portfolio and fault flows are recorded in `portfolio-flow-results.json` and `fault-results.json`. No credentials or session values are present in these reports.

Final visual comparison selected the settled capture where needed: `parity-final.json` records **82/82 identical image pairs** (66 original application states, eight portfolio/Jarvis unknown-route screens across desktop/mobile and light/dark modes, two CANCELDT unknown-route screens, and six no-JavaScript error screens across all three apps). This is an exact RGB comparison, not a percentage tolerance. All captured app layouts fit their desktop/mobile viewport widths.

For CANCELDT, the original baseline's admin edit capture preceded navigation completion, and its report capture preceded CAPTCHA rendering. Those states were re-captured from the original Git version with the correct heading visible. Admin counters, queues, drafts, and search history were compared with the same current development data after fixture cleanup. The report shell used an identical deterministic 150×140 CAPTCHA placeholder in both browsers; the separate report E2E run tested submission, approval, correction, rejection, and archival with development CAPTCHA credentials, restored the original CAPTCHA configuration, and verified a fresh dummy token was rejected afterward.

The unknown Jarvis route now preserves the original `Jarvis · Home control` document title, 404 status, and default error message. Final verification against the original optimized app confirms exact desktop/mobile pixels in both light mode (white background) and dark mode (black background), recorded in `jarvis404-final-results.json`. The initial title difference has been corrected.

All baseline-only servers and dedicated browser sessions created by this QA agent were stopped after capture. Temporary copied environment files were removed. The failure-flow subject was archived. The CANCELDT agent confirmed zero suite-owned published subjects and zero suite-owned pending reports after the final run, leaving the two existing published subjects and one unrelated pending report untouched. Its original three development CAPTCHA settings were restored and read-back verified; a fresh dummy token was rejected. The temporary report server and private configuration snapshot were removed. `canceldt-final-post-sync-summary.json` records the final 21 unique scenarios and cleanup; the relocated backend retained the same schema and 43 function registrations.

## Final build and development checks

The parent verified the complete root check, package typechecks, **133 unit tests in 25 suites**, and the optimized production build. The final browser coverage passed **62 unique cases: 24 portfolio/API/routing cases, 16 Jarvis fixture cases, one real Jarvis authentication case, and 21 CANCELDT cases**. The CANCELDT agent reran all 20 ordinary cases after the final error-page integration; the isolated report case had already passed after backend relocation, with no report or backend changes afterward. `canceldt-final-global404-summary.json` records the final ordinary run and confirms fixture cleanup.

An independent desktop/mobile check of `https://juicecolored.local/` confirmed working Next-spread buttons, Home/End keys, contents navigation, the studio-project shortcut, and controls after reload. There were no runtime errors, console errors, failed requests, or websocket errors. Both HMR and Convex websocket connections received frames. Evidence is recorded in `dev-hydration-final-results.json`; the proxy was left untouched.

The spam provider positive-path probe reached the configured upstream, which returned HTTP 403; the application returned its expected HTTP 502 response. Successful provider classification therefore remains unverified with the current upstream configuration. No production deployment was performed.

## Trailing-slash compatibility

The original host disabled Next.js trailing-slash redirects. Its rewrites normalized mounted upstream paths internally, so the public host served `/jarvis/` and `/canceldt/` directly even though the old standalone upstreams redirected those URLs. The unified host preserves that behavior with `skipTrailingSlashRedirect: true` and no additional redirects for the mounted areas.

All nine final request checks match the original status and content type, with no `Location` header: health JSON (200), unknown spam GET (404), unauthenticated spam POST (401), unknown page (404), favicon (200 and identical SHA-256), Jarvis/CANCELDT roots (200), unknown Jarvis page (404), and CANCELDT admin (200). JSON bodies match exactly. Evidence is recorded in `trailing-slashes-final-results.json`; HTML metadata is additionally verified in the browser to account for Next.js streaming and duplicate title-tag ordering.

The final optimized portfolio unknown page preserves the original browser title `404: This page could not be found.`, 404 status, and exact light/dark desktop/mobile pixels. Portfolio crawler description, Open Graph/Twitter metadata, manifest, and icon links match the original. The Jarvis generated SVG icon route returns 200 and matches the package-owned source bytes exactly. Evidence is recorded in `portfolio404-final-results.json` and `final-metadata-results.json`.

The no-JavaScript error-page regression was corrected using a request-scoped global error document. Final verification confirms true 404 responses, complete server-rendered text, original document titles, and zero changed pixels for all three apps at desktop/mobile sizes without JavaScript. The CANCELDT error page also matches the original with JavaScript enabled; its links retain their original destinations, and the Back link returns to the list in both modes. Its CSS is scoped to its own error document. Evidence is recorded in `nojs404-results.json`, `nojs404/`, and `canceldt404-final-results.json`.
