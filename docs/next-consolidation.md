# One Next.js application

## Goal (updated scope)

Consolidate the portfolio, Jarvis and CANCELDT into one Next.js application in `apps/web`, while retaining separate `packages/jarvis` and `packages/canceldt` workspace packages containing everything exclusively used by each project, including UI components, styling, application logic, backend implementations, assets, scripts, documentation and tests. Preserve every public URL, UI and functionality. Verify the full functionality and UI end to end across every page and complete user flow before handing the work back.

## Structure

- `src/app/(portfolio)` owns the portfolio document, Tailwind styles and Convex provider.
- `src/app/(jarvis)` owns the Jarvis document, StyleX and CSS Modules. Its routes live under `jarvis/`.
- `src/app/(canceldt)` owns the CANCELDT document, its stylesheet and fonts. Its routes live under `canceldt/`.
- `packages/jarvis` and `packages/canceldt` own their exclusive components, styles, application logic, assets and tests; the Next app contains thin route entry points that compose these packages.
- `packages/canceldt/convex` owns CANCELDT backend implementations, tables and auth configuration.
- `packages/convex` remains the shared deployment, composing CANCELDT tables and exposing thin registration modules with unchanged function IDs.
- `packages/jarvis/convex` remains the independent home-controls backend.

There is no common root layout: each route group owns its `<html>` and `<body>`. Next.js performs a document navigation between these roots, matching the former separate-app navigation and preventing retained global CSS or providers from affecting another area. Navigation within an area remains client-side. CSS chunk merging is disabled to keep independent resets out of unrelated pages.

Unknown URLs use Next.js's router-level `global-not-found` convention. A small request-header proxy identifies the area from the URL prefix; it does not forward requests to another app or maintain a list of valid routes. Each project owns a complete error document with scoped styles, preserving its original 404 UI, title and usable HTML without JavaScript. Normal routes retain their independent root stylesheets. The Jarvis SVG stays in its package, with thin metadata/public-file registrations in the host.

## Completion checklist

- [x] Capture original desktop/mobile page baselines and functional coverage.
- [x] Consolidate routes, public assets, feature code, configuration and scripts.
- [x] Preserve separate backend connections, credentials and scoped cookies.
- [x] Remove obsolete frontend projects and rewrite deployment/setup documentation.
- [x] Pass formatting, lint, type checks, unit tests and production build.
- [x] Verify full portfolio, Jarvis and CANCELDT browser flows against the unified app.
- [x] Compare desktop/mobile screenshots and verify styling isolation through navigation.
- [x] Record final evidence and any external verification limits.

The [verification report](./next-consolidation-verification.md) records 62 passing browser cases, 133 passing unit tests, 12 passing failure/recovery assertions and 82 exact screenshot comparisons. The configured external spam-classification service returns HTTP 403, so successful live classification remains unverified; its error handling is preserved. No production deployment was performed.
