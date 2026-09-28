# CANCELDT

This package owns CANCELDT's pages, route handlers, Server Actions, components, styles, fonts, Convex implementations, schema tables, authentication configuration, tests and supporting scripts. The single Next.js application in `apps/web` mounts it at `/canceldt` through thin route files.

Backend implementations live in `convex/`. The existing shared Convex deployment is composed from `packages/convex`: its thin `convex/canceldt` reexports preserve every deployed function name, its schema includes this package's tables, and its authentication config forwards this package's provider configuration. Continue running backend development and deployment commands from `packages/convex`. No database or deployed function addresses change.

`src/app/layout.tsx` is CANCELDT's root document. It imports only CANCELDT's stylesheet and fonts, so its design and UI components can evolve independently from the portfolio and Jarvis. Keep shared site code out of this package unless CANCELDT uses it. Every browser navigation includes the `/canceldt` prefix; there is no Next.js `basePath` or proxy deployment.

Run the site with `vp run dev:web`. All runtime environment variables are loaded by `apps/web`, including the existing `CANCELDT_*` settings and `NEXT_PUBLIC_CONVEX_URL`. `vp run -F @personal/canceldt setup:local` adds fresh CANCELDT settings to `apps/web/.env.local` while preserving other application configuration. It refuses to rotate existing CANCELDT keys. Development credentials and Convex setup values are written alongside that file and never printed.

Validation:

- `vp run -F @personal/canceldt typecheck`
- `vp run -F @personal/canceldt test`
- `CANCELDT_TEST_ORIGIN=https://juicecolored.local vp run -F @personal/canceldt test:e2e`

Browser tests load development credentials from `apps/web/.env.local`. Owner login additionally reads `apps/web/.env.credentials.local` or `CANCELDT_TEST_OWNER_PASSWORD`; credential traces are disabled. Report submission tests require the explicit `CANCELDT_TEST_REPORTS=1` flag and an isolated local server backed by the development CAPTCHA test configuration. Restore the real development CAPTCHA configuration after testing. No test should use production credentials or publish real subjects.

The historical implementation and verification records are retained under `docs/`; references to separate apps and deployments there describe the earlier architecture.
