# CANCELDT

CANCELDT is an isolated Next.js App Router workspace in `apps/canceldt`, mounted through the existing TanStack/Nitro main site. It uses the existing shared Convex project. It does not replace the homepage or change Jarvis authentication, UI, or its deployment.

## Routes

- `/canceldt`: latest five published subjects, by first publication time.
- `/canceldt?q=…`: server-rendered search, first `q` wins when repeated. Native GET uses the complete-HTML `/canceldt/lookup` fallback without JavaScript (with a canonical link to `/canceldt?q=…`); enhancement uses one history entry per submitted search. Empty/whitespace means latest.
- `/canceldt/subject/<slug>`: published details only; optional `q` preserves return navigation.
- `/canceldt/report?subject=…`: private report/correction form.
- `/canceldt/admin`: owner sign-in, Subjects and Reports.
- `/calceldt/admin`: 308 redirect to the canonical administrator route.
- `/canceldt/api/revalidate`: authenticated POST for external maintenance invalidation.

Next Link/router paths are relative to Next's configured `/canceldt` basePath. Native form actions and server redirects include the mount explicitly. The header links only to CANCELDT; the landing-page backlink has been removed. The web Vite proxy and Nitro route rules preserve paths, query strings, Server Actions and `_next` assets. The typo redirect is handled by the main app in development and production.

## Versions and implementation

Registry checked during implementation: Next stable **16.3.5**, React stable **19.3.0**. CANCELDT pins these; existing applications retain their existing manifest versions. React Compiler **1.0.0** is installed, `reactCompiler: true` and `cacheComponents: true` remain enabled. Node 22 is the deployment runtime. Existing Nitro prerelease is preserved. Barlow Condensed 800 Latin is bundled locally; body text uses the system Arial/Helvetica stack. No runtime font service is required.

Major files:

- `apps/canceldt/src/app`: public routes, protected admin and Server Actions.
- `apps/canceldt/src/components`: search enhancement, dynamic source fields, owner/editor/report forms, Turnstile widget and public freshness handling.
- `apps/canceldt/src/lib`: authorized sessions, cached public reads and form parsing.
- `packages/convex/convex/canceldt`: validators, public queries, privileged queries/mutations, private report storage and spam verification.
- `packages/convex/convex/schema.ts`: additive CANCELDT tables/indexes.
- `packages/convex/convex/auth.config.ts`: Convex-supported ES256 custom JWT verification.
- `apps/web/vite.config.ts`: main-domain mount and typo redirect.

## Local setup

Run `vp install`. `vp run -F @personal/canceldt setup:local` creates an ignored, mode-0600 `.env.local` using the existing shared Convex URL and an independent login credential. It generates an independent ES256 signing key and refuses to overwrite an existing file. It never prints private keys or changes Jarvis files.

Configure the shared development Convex deployment with the issuer, public JWKS and allowlist described below, then run `vp run dev:convex` (or `bun --env-file=../../.env.local x convex dev --once` from `packages/convex`). Run `vp run dev:canceldt` and the existing `vp run dev:web`. Root `vp run dev` also includes CANCELDT.

The active Portless address found during implementation is `https://juicecolored.localhost`, not the older documented `.local:1355` address. Both hosts are allowed by Next's development/action configuration. For a different development host, update the explicit allowed origins and local public-origin environment.

## Owner authentication

CANCELDT verifies its own admin passphrase through `canceldt/login:verify` on the shared Convex backend. The action requires an independent server-only gateway credential, compares a salted scrypt hash in constant time, and enforces an atomic limit of 10 attempts per five minutes. It never calls Jarvis or accepts the home-controls passphrase. Development and production use different passwords and signing keys.

After a successful credential check, CANCELDT signs an ES256 JWT, verifies membership with Convex, then sets a one-hour, HttpOnly, SameSite=Strict cookie scoped to `/canceldt`. HTTPS cookies are Secure. Every privileged Next action validates the signature, issuer/audience/subject and current Convex permission. Temporary backend failures show a retryable service error and keep the cookie. Expired sessions preserve editor values and offer a separate-tab sign-in link. Backend rate-limit errors preserve the actual retry interval. Every privileged Convex function independently verifies the authenticated issuer and `tokenIdentifier` allowlist. Removing the identity from the allowlist revokes access even before the cookie expires. Missing configuration denies access.

Next deployment variables (see `apps/canceldt/.env.example`):

| Variable                                                                     | Purpose                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL`                                                     | Shared Convex deployment URL                                             |
| `CANCELDT_PUBLIC_ORIGIN`                                                     | Canonical browser origin, production `https://juicecolored.com`          |
| `CANCELDT_AUTH_ISSUER`                                                       | Stable issuer, production `https://juicecolored.com/canceldt`            |
| `CANCELDT_AUTH_PRIVATE_KEY`                                                  | PKCS8 ES256 private key; literal `\n` escapes supported; server-only     |
| `CANCELDT_AUTH_PUBLIC_JWKS`                                                  | JSON public JWKS with `kid: canceldt-owner-1`, `alg: ES256`              |
| `CANCELDT_LOGIN_SECRET`                                                      | Independent server-only credential shared with the CANCELDT login action |
| `CANCELDT_REVALIDATE_SECRET`                                                 | Independent random secret, at least 32 characters                        |
| `CANCELDT_TURNSTILE_SITE_KEY` (or `NEXT_PUBLIC_CANCELDT_TURNSTILE_SITE_KEY`) | Real Turnstile site key authorized for the browser hostname              |

Shared Convex deployment variables:

| Variable                    | Purpose                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `CANCELDT_AUTH_ISSUER`      | Exactly the same issuer as Next                                                                          |
| `CANCELDT_AUTH_JWKS`        | `data:application/json;base64,<base64 of public JWKS JSON>`                                              |
| `CANCELDT_ADMIN_IDENTITIES` | Comma-separated full token identifiers; owner is `<issuer>\|canceldt-owner` (literal pipe, no backslash) |
| `CANCELDT_LOGIN_SECRET`     | Same independent login gateway credential as Next                                                        |
| `CANCELDT_PASSPHRASE_HASH`  | Salted scrypt hash, stored only in Convex                                                                |
| `CANCELDT_TURNSTILE_SECRET` | Matching Turnstile secret; Convex-only                                                                   |
| `CANCELDT_REPORT_HOSTNAMES` | Comma-separated exact authorized hostnames, e.g. `juicecolored.com`                                      |

Never copy development signing keys, test CAPTCHA keys or development allowlists into production. Generate a fresh ES256 key pair for production. No ordinary email/user-ID input can grant privileges. `robots: noindex` is metadata only and has no authorization role.

## Reports and limits

Reports are separate from subjects and always begin pending. The public action enforces all input validation, honeypot, Turnstile verification (including hostname and `canceldt-report` action), and an atomic global limit of 100 verification attempts/hour. Direct Convex calls cannot bypass these controls; report writes and limiter functions are internal. The global limit bounds abuse/cost but can temporarily throttle legitimate reporters under attack; tune it deliberately as traffic grows.

No IP address, email, user agent or raw CAPTCHA token is retained. A SHA-256 submission/content fingerprint supports retry idempotency, including after the CAPTCHA token expires. Inputs: subject 160 characters, reason 240, description 12,000, up to 12 sources, each URL 2,048 and optional title 160. Sources accept only HTTP(S), reject embedded credentials, and are never fetched for previews. Content is rendered as text. A fresh Turnstile check is offered after failures. The compact widget fits 320px phones. `CANCELDT_REPORT_ACTION` defaults to `canceldt-report`; only an isolated automated-testing setup should override it to match the official dummy verification response. Restore/remove this override after testing.

Approval edits and publishes content transactionally and records the approved subject ID. Repeating an approval returns the existing result. Corrections target the existing subject and require its reviewed revision; stale edits fail rather than overwrite. Rejection changes only the report. Subject writes enforce normalized identity and slug uniqueness. Slugs stay stable after renames. Archiving is reversible and confirmed; first publication time survives all later edits/restores.

Search identity uses NFC Unicode, collapsed whitespace and case normalization, preserving accents and punctuation. Indexed Convex full-text discovery searches subject names only (words and final-token prefixes, not arbitrary substring matching). Discovery returns at most 20 candidates and never makes a verdict for an approximate match. Exact lookups are separate. Admin queues paginate 20 at a time.

## Schema and deployment

New tables: `canceldtSubjects`, `canceldtReports`, `canceldtLimits`. Added indexes cover publication state/time, normalized identity, slug, subject-name text search filtered by publication state, moderation state, report fingerprint and limiter key. Existing rows need no migration or backfill. No automatic seed data exists. Test fixtures are explicitly fictional; E2E fixtures use development only and are archived afterward.

Production rollout order:

1. Configure production keys, allowlist and Turnstile environment. The Convex CLI requires auth-config environment variables to be set before it can deploy the new provider.
2. Deploy the shared Convex functions/schema with the repository's production deployment procedure and regenerate types.
3. Create a Vercel project rooted at `apps/canceldt`, use Node 22 and its included `vercel.json`, and set the Next environment variables. Deploy CANCELDT.
4. Set `CANCELDT_ORIGIN` on the **main web project's build environment** to the resulting Next origin (origin only, no `/canceldt` suffix). Build and deploy the main site. The main build deliberately rejects a missing origin rather than shipping a localhost production proxy.
5. Verify sign-in, report submission, moderation, cache invalidation and the canonical domain routes with real production credentials.

This implementation does not deploy the user's unrelated in-progress Jarvis changes. Production was deployed on September 21, 2026 with independent credentials, fresh signing keys, an app-specific allowlist and a real production Turnstile widget. Development entries are not automatically copied into production.

## Caching and freshness

`latest()` and `detail(slug)` use explicit `"use cache"` boundaries around server-side Convex reads. The local `fetchQuery` adapter uses ConvexHttpClient with an eight-second request timeout and one retry for transient read failures; writes and password checks are never retried automatically. Both tag results, including missing details, with `canceldt:public`. Policy: browser stale 0, server revalidate 30 seconds, hard expire 60 seconds. Arbitrary searches are fresh uncached reads. Authentication, private reports and administration never enter public caches.

Every successful subject write and report moderation follows: authenticated Server Action → independently authorized Convex mutation → committed result → `updateTag("canceldt:public")` → display the committed ID, revision and publication state. A single shared tag also expires old/new identity results and cached missing detail results. Errors do not announce success. Existing open public pages refresh every 30 seconds while visible, plus on visibility/pageshow; offline browsers cannot receive removals until reconnected. Next's browser back/forward restoration can briefly show an earlier snapshot until this refresh finishes (up to 30 seconds plus request latency). There is no public Convex subscription.

**External maintenance writes must invalidate after committing:** POST `/canceldt/api/revalidate` with `Authorization: Bearer <CANCELDT_REVALIDATE_SECRET>`. It uses `revalidateTag(tag, { expire: 0 })` and rejects missing/wrong credentials. Never use stale-while-revalidate (`"max"`) to remove an accusation. Without this external hook, cached server results may remain until the documented 60-second hard expiry. Multi-instance self-hosting requires a shared Next cache/tag invalidation backend; Vercel handles the deployment cache.

## Verification

Results and measured production-build performance are recorded below after the final test pass. Browser tests use the actual development Convex deployment with the optimized Next production build. They do not represent deployed Vercel/CDN or mobile-network measurements.

References checked: [Next Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents), [React Compiler configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler), [updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag), [Convex custom JWT](https://docs.convex.dev/auth/advanced/custom-jwt), [Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). McMaster-Carr was used only as the requested low-friction interaction reference; no performance equivalence is claimed.

### Final verification — 21 September 2026 (Asia/Manila)

Passed:

- `vp install` and `vp install --frozen-lockfile`.
- `vp env doctor` (healthy; existing nvm environment warning only).
- `vp check`: formatting, lint and type-aware checks clean.
- `vp test run`: **109 tests, 19 suites**, including CANCELDT backend, Server Action/cache, session classification and cross-module error tests.
- `vp run -F @personal/canceldt typecheck` and explicit shared Convex `tsc --noEmit --incremental false`.
- `bun --env-file=../../.env.local x convex dev --once`: actual development schema/index/function push succeeded.
- `vp run -F @personal/canceldt build`: optimized production build, Cache Components and React Compiler enabled.
- `CANCELDT_ORIGIN=http://127.0.0.1:3002 vp run -F @personal/web build`: main-site production proxy build succeeded; existing TanStack dependency directive warnings remain.
- `vp run test:e2e` from `apps/canceldt`: **9 browser tests passed** through the main-site HTTPS proxy. Includes native no-JS GET search, accented URLs, direct links/history/clear, input validation, safe text, detail affordances, unpublished exclusion, dynamic sources, saved edits, cache invalidation including cached misses, pending-verdict suppression, unauthorized access, redirect alias, keyboard interaction, 320px overflow checks, and independent CANCELDT admin sign-in/sign-out with a secure HttpOnly path-scoped cookie.
- Desktop and mobile screenshots inspected. Fictional browser/performance fixtures were archived after testing; the public development list was returned to empty.

Measured via `node scripts/measure.mjs`: optimized **production** Next server over loopback on macOS arm64, Chromium 1440×1000, no CPU/network throttling, actual remote development Convex. No Vite/dev-server timings are used. Cold sample is a new browser context / first public page after a server restart (the authenticated invalidation endpoint was called first); warm measurements use five runs. These are not deployed Vercel cold-start, CDN or mobile-network numbers.

| Measurement                                       | Result                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Cold browser TTFB                                 | 14.7 ms                                                       |
| Cold FCP / LCP                                    | 92 / 92 ms (wordmark, not a claim about result readiness)     |
| Cold published-list ready                         | 383 ms                                                        |
| Warm full-page list, median                       | 330 ms (30–335 ms)                                            |
| Committed search, median                          | 319 ms (313–343 ms)                                           |
| First uncached detail navigation                  | 818 ms                                                        |
| Warm detail navigation, median of subsequent four | 56 ms (55–57 ms)                                              |
| Initial public JS                                 | 138,673 bytes compressed; 460,570 decoded; 8 script resources |

Raw samples: `docs/canceldt-performance.json`. Admin/editor/report links do not prefetch their dependencies into the public route; likely subject detail links retain framework prefetching.

**Follow-up browser audit:** see [canceldt-verification.md](canceldt-verification.md) for the full agent-browser create/edit/session/report/moderation and failure-path checks. Reporting was exercised through real Server Actions and the development Convex database using Cloudflare's official automated-testing keys. The real local widget configuration was restored and verified to reject dummy tokens afterward. Production-domain deployment, production owner setup, human completion of the real widget, CDN/multi-instance cache propagation, and throttled mobile performance remain outside this local verification. The performance numbers above are the earlier implementation baseline, not a new benchmark of the follow-up fixes.

## Independent admin credentials

The generated development password is in ignored `apps/canceldt/.env.credentials.local`; production is in ignored `apps/canceldt/.env.credentials.production.local`. Both files have owner-only permissions. The production deployment configuration is stored locally in ignored `.env.deployment.production.local`, a name Next does not load automatically. Never deploy a development env file.

Admin defaults to Published. After saving or publishing, “Create another subject” navigates to a fresh form, clearing the previous record ID and fields.

## Production rollout — September 21, 2026

- Public app: https://juicecolored.com/canceldt
- Admin: https://juicecolored.com/canceldt/admin
- Dedicated Vercel project: `canceldt`, origin `https://canceldt.vercel.app`, Node 22.
- CANCELDT deployment: `dpl_FT3GNG6BiprgRkhnXZ8ceSaNSGVM`.
- Main-site routing deployment: `dpl_B6PsSopHrKVZ5NtxN3XqELnVS8Zh`.
- Shared production Convex: `valuable-cuttlefish-696`. Deployment added CANCELDT tables/indexes without deleting existing indexes.
- Source was deployed from an isolated snapshot containing the CANCELDT work and main-site routing. Unfinished Jarvis UI changes were excluded.
- Production passphrase: ignored, mode-0600 `apps/canceldt/.env.credentials.production.local`. Jarvis credentials were not changed.
- Production runtime error-log queries returned no errors for either deployment after the initial browser checks.

Production agent-browser checks passed: independent sign-in, rejection of the home-controls passphrase, private draft creation, consecutive editing, Create another producing a distinct ID, exclusion of drafts from public search, archiving, logout/re-login, and the report/main/Jarvis sign-in pages. Fictional production fixtures remained private and were archived. The real production CAPTCHA was configured; no automated human CAPTCHA success is claimed. Results are in `docs/canceldt-production-verification.json`.
