# Jarvis in the monorepo

Jarvis is the `@personal/jarvis` workspace in `apps/jarvis`. The portfolio remains
`@personal/web` in `apps/web`. Jarvis keeps Next.js, StyleX, its owner authentication,
and its own Convex deployment and data. It is not part of the portfolio's React bundle.

The source was imported from the sibling `jarvis` repository without removing that
checkout. Its package lock is replaced by the root `bun.lock`. Protocol attribution
and existing tests are retained. React and Convex versions align with the workspace.

## Local development

```sh
vp install
vp run dev
```

This starts the portfolio through Portless and Jarvis on `127.0.0.1:3001`.
Open `https://juicecolored.localhost/jarvis`.
If the portfolio is already running, use `vp run dev:jarvis` instead.
Run `vp run dev:jarvis:convex` separately when developing Jarvis's backend.

Jarvis reads `apps/jarvis/.env.local`; the portfolio reads the root `.env.local`.
Set `JARVIS_PUBLIC_ORIGIN=https://juicecolored.localhost` in Jarvis's environment.
Use `apps/jarvis/.env.example` for new checkouts. Existing private local development
configuration was copied into the ignored Jarvis environment files during migration.

`apps/web/vite.config.ts` proxies `/jarvis` and descendants, including Next.js assets,
API requests, and development WebSockets. Next.js uses `basePath: "/jarvis"`.
The browser API endpoint is `/jarvis/api/jarvis`; the portfolio's `/api/*` routes
remain available. Use normal anchors for navigation between the apps.

To change the upstream, set `JARVIS_ORIGIN` in the portfolio build environment or
root `.env.local`. The default is `http://127.0.0.1:3001` for development and
`https://jarvis-pi-brown.vercel.app` for production. This is an upstream origin,
without `/jarvis`; `JARVIS_PUBLIC_ORIGIN` is the origin the browser visits.

## Production deployments

The existing `alt164/jarvis` Vercel project uses Root Directory `apps/jarvis`,
Next.js, Node.js 22, and workspace files outside the root directory. Its production
Convex URL, gateway secret, and session secret remain in that project.
`JARVIS_PUBLIC_ORIGIN=https://juicecolored.com` validates browser writes and makes
session cookies secure behind the portfolio proxy.

Deploy from the monorepo root, in this order:

```sh
vercel deploy --project jarvis --scope alt164 --prod --local-config apps/jarvis/vercel.json
vercel deploy --project juicecolored --scope alt164 --prod
```

The explicit Jarvis configuration prevents the portfolio's root `vercel.json` from
being used for its build. The Jarvis install command runs Bun from the workspace root
to bootstrap the locked dependencies, then `bun run build` invokes the Vite+ scripts.
Local environment and credential files are excluded from the source upload; production
values are supplied by Vercel. Preview deployments need their own browser origin and
separate development backend.

Deploy Jarvis first and verify `/jarvis` and `/jarvis/api/jarvis` on its stable
`jarvis-pi-brown.vercel.app` alias. Sign-in is intended through the configured browser
origin; direct upstream writes are rejected. The portfolio's Nitro build emits external
rewrites for `/jarvis` and `/jarvis/(.*)` before its catch-all route. After deploying
the portfolio, verify sign-in, reload, and sign-out at `https://juicecolored.com/jarvis`.

The two Vercel projects build independently. The root build continues to build the
portfolio; `vp run build:jarvis` builds Jarvis. This move does not require publishing
Jarvis's Convex functions or moving database records. The portfolio deployment retains
its existing Convex deployment build command. The previous standalone Jarvis root URL
is replaced by `/jarvis`.

## Verification

```sh
vp check
vp test
vp run check
vp run build:jarvis
NITRO_PRESET=vercel vp run build
vp run -F @personal/jarvis test:e2e
vp run -F @personal/jarvis test:e2e:auth
```

Root unit tests include Jarvis's backend, protocol, fan, and HTTP boundary suites.
The default Playwright suite launches an isolated `/jarvis` preview with fixture devices
and intercepted commands. It covers direct power, light and fan controls, secondary
settings, failure states, and screen widths from 320px to 1920px without loading credentials.
The separate `test:e2e:auth` suite runs through the portfolio proxy using existing ignored
owner credentials. It checks sign-in, reload, origin rejection, and sign-out without
controlling devices. Set `JARVIS_TEST_URL=https://juicecolored.com` to verify production.
Session cookies are HttpOnly, SameSite=Strict, scoped to `/jarvis`, and Secure for HTTPS
browser origins; logout expires the cookie at the same path.

The dashboard prioritizes power, brightness, fan speed, and oscillation, with secondary
actions under More controls. Design context and the approved reference live in
`apps/jarvis/PRODUCT.md`, `apps/jarvis/DESIGN.md`, and `apps/jarvis/docs/design-contract.md`.
