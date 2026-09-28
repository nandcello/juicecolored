# JuiceColored

The portfolio, Jarvis and CANCELDT are served by **one Next.js application**, `apps/web`.

| Public path      | Implementation      | Styling                             |
| ---------------- | ------------------- | ----------------------------------- |
| `/` and `/api/*` | `apps/web`          | Tailwind and portfolio CSS          |
| `/jarvis`        | `packages/jarvis`   | StyleX and CSS Modules              |
| `/canceldt`      | `packages/canceldt` | CANCELDT stylesheet and local fonts |

Jarvis and CANCELDT keep their exclusive components, styles, application logic, assets,
documentation and tests in their own packages. The Next app contains thin route entry
points. Each area owns a separate root layout, so its global styles, metadata and
providers stay isolated. Moving between areas loads a new document; navigation within
an area keeps Next.js client routing.

## Development

```sh
vp install
node apps/web/scripts/migrate-local-env.mjs # once, when upgrading an existing checkout
vp run dev                               # one server; prints its Portless address
```

Use `portless list` to confirm the local address (currently `https://juicecolored.local`).
Match `JARVIS_PUBLIC_ORIGIN` and `CANCELDT_PUBLIC_ORIGIN` to that address. Next runtime configuration lives in
`apps/web/.env.local`; see `apps/web/.env.example`. `NEXT_PUBLIC_CONVEX_URL` connects the
portfolio and CANCELDT to the shared backend. Server-only `JARVIS_CONVEX_URL` connects
Jarvis to its existing independent backend. The local migration script preserves
existing web settings and copies only the required development settings; it never
reads production files.

Backend development remains separate:

```sh
vp run dev:convex         # shared deployment: portfolio plus CANCELDT package functions
vp run dev:jarvis:convex  # packages/jarvis/convex: home controls
```

## Validation

```sh
vp run check
vp test run
vp run build
vp run -F @personal/web test:e2e
vp run -F @personal/jarvis test:e2e
vp run -F @personal/jarvis test:e2e:auth
vp run -F @personal/canceldt test:e2e
```

Browser tests expect the unified server specified by `WEB_TEST_ORIGIN`, `JARVIS_TEST_URL`
and `CANCELDT_TEST_ORIGIN`. The web API suite uses `API_AUTH_TOKEN=e2e-test-token` unless
overridden. Jarvis device tests launch an isolated copy of the unified app with fixture
devices; owner authentication runs separately against the development backend.

## Production hosting

The new frontend deployment uses the `juicecolored` Vercel project rooted at `apps/web`.
It builds all three areas; there are no Jarvis or CANCELDT upstream rewrites. Before
rolling out this change, configure that project with the existing production runtime
settings from all three former frontend projects, renaming Jarvis's
`NEXT_PUBLIC_CONVEX_URL` to `JARVIS_CONVEX_URL`. Keep the existing secrets, public origins,
signing keys and backend deployments. `JARVIS_ORIGIN` and `CANCELDT_ORIGIN` are obsolete.

The shared Convex build hook in `apps/web/vercel.json` remains. Jarvis's Convex deployment
remains independent and only needs deploying when its backend changes. Existing
standalone frontend deployments can stay available until the combined deployment has
passed production verification.

See [consolidation and verification](docs/next-consolidation.md),
[Jarvis](docs/jarvis.md), [CANCELDT](docs/canceldt.md), and
[spam filter API](docs/spam-api.md).
