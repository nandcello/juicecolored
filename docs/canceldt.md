# CANCELDT in the shared Next.js app

CANCELDT lives in [`packages/canceldt`](../packages/canceldt/README.md), with thin route entries in `apps/web` serving `/canceldt`. It retains its own stylesheet, fonts, components, owner authentication, tests and application logic.

Run `vp run dev` for all web pages. Next runtime settings now belong in `apps/web/.env.local`; use `apps/web/.env.example` and `node apps/web/scripts/migrate-local-env.mjs` to migrate existing local settings. The shared deployment still uses the same Convex database, signing keys, issuer and cookie scope.

For production, copy the existing CANCELDT runtime environment variables to the `juicecolored` Vercel project rooted at `apps/web`, preserving the production signing key, issuer and public origin. One web build now includes CANCELDT. `CANCELDT_ORIGIN`, a dedicated frontend project and upstream rewrites are no longer required by the new code. Keep existing standalone deployments until the combined production rollout has been verified.

See the [package guide](../packages/canceldt/README.md), [consolidation verification](next-consolidation-verification.md), and [historical implementation and deployment record](../packages/canceldt/docs/canceldt.md).
