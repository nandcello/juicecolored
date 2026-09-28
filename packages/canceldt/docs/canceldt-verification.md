# CANCELDT follow-up verification — 21 September 2026

The original handoff missed the real owner sign-in → create → repeat-edit sequence. This audit reproduced additional bugs and ran the browser flows against the optimized local Next server and actual development Convex database.

## Fixed

- Backend permission-query failures were caught as authentication failures and rendered the login page. Only missing, invalid, or expired sessions now show login; backend outages retain the cookie and provide working Retry controls.
- Backend requests now time out after eight seconds. Transient reads retry once; writes and password checks do not automatically retry.
- Two sibling components used the same React key, duplicating editor fields after a new save. The editor keeps one set of fields.
- React's automatic form reset reverted publication selection. The editor preserves entered values and selected state through failed validation, then shows the committed state after saving.
- A failed edit could lose its saved record ID/revision. Those remain intact, and a successful create no longer depends on a second network read to report success.
- Convex error classes loaded through different module paths failed `instanceof` checks. The stable Convex marker now preserves useful duplicate, conflict, CAPTCHA, and rate-limit messages without exposing arbitrary server errors.
- The normal spam widget overflowed narrow screens. The compact widget fits the 320px report form.

## Agent-browser flows passed

| Flow                     | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner and records        | Incorrect passphrase; real owner login; empty and whitespace validation; create draft; publish; repeated edits to the same ID; unsafe source rejection; preserved input; publication selection; duplicate rejection; archive confirmation; immediate archive/restore visibility; logout and successful login with the same passphrase after all writes.                                                                                                               |
| Reporting and moderation | Report prefill; missing spam token rejected; preserved input; submit into actual Convex; pending privacy; same submission retried without a duplicate; deliberate edited approval; correction targets the existing record; rejection leaves public state unchanged.                                                                                                                                                                                                   |
| Failure recovery         | Isolated backend outage renders service error rather than login; Retry keeps the same session; failed create retries successfully; expired/tampered session keeps unsaved content and offers separate-tab login; restored session saves the original record; two-editor revision conflict prevents overwrites; public failure never renders a false verdict.                                                                                                          |
| Sign-in failures         | Simulated unavailable owner service and a simulated real Convex rate-limit response reach the login UI as distinct, actionable messages. The simulation does not consume actual owner sign-in attempts.                                                                                                                                                                                                                                                               |
| Public browsing          | Latest five and publication ordering; Unicode exact match; direct URL and refresh; partial discovery beyond latest five; Back/Forward; clearing; whitespace; repeated query parameter; escaped special characters; long-query rejection; subject-only search; description-only/source-only/reason-only affordances; draft and nonexistent details; dynamic source add/remove and twelve-source limit; 320px long-name/report layouts; script-free native GET results. |
| Additional checks        | Pending search hides the previous verdict; administrator pagination advances; host homepage still renders. Public native-result and report main regions had zero axe accessibility violations.                                                                                                                                                                                                                                                                        |

Machine-readable checkpoints are in [canceldt-verification.json](canceldt-verification.json). All test data was clearly fictional; published fixtures from failed and successful runs were archived, and leftover pending audit reports were rejected.

## Commands and environments

- `vp check`: formatting, lint and type-aware checks.
- `vp test run`: 109 tests in 19 suites.
- `vp run -F @personal/canceldt build`: production build with Cache Components and React Compiler enabled.
- `vp run -F @personal/canceldt test:e2e`: all 9 existing Playwright tests passed, including truly JavaScript-disabled GET search, pending-state suppression, mounted redirects, secure cookie attributes and real owner login.
- Shared development Convex functions were pushed successfully after the report configuration change.
- Agent-browser scripts are under `apps/canceldt/tests/browser/`: `full-flow.mjs`, `public.mjs`, `reports.mjs`, `failures.mjs`, and `auth-errors.mjs`. Credentials are loaded from ignored local environment files and are not recorded in reports.

The main app remains at `https://juicecolored.localhost/canceldt`. Failure simulations used a separate production-server process on port 3003, preloaded with `tests/browser/fault-preload.cjs`. That hook is only in the test directory and is never loaded by the application start command. It reads `/tmp/canceldt-fault-mode.json`; a selected Convex function can fail or delay while other requests go to the actual backend. The QA server used `CANCELDT_PUBLIC_ORIGIN=http://127.0.0.1:3003`.

Report automation used Cloudflare's official passing test site/secret keys on the development backend, with the hostname/action matched to the actual test verification response. Next's server-side `CANCELDT_TURNSTILE_SITE_KEY` override selects the QA widget without rebuilding public environment constants. The real local widget secret, authorized local hostnames, and default `canceldt-report` action were restored afterward; a direct dummy-token submission was verified to fail. Never enable testing keys or override the expected action on production. The real widget correctly challenged the automated browser, so a human-completed real challenge is not claimed as tested.

This is local production-build verification, not a production-domain deployment or a new performance benchmark. The earlier performance baseline remains separately documented in `canceldt.md`.
