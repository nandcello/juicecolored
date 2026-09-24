Jarvis home controls now live in `apps/jarvis` and are served at `/jarvis`: [development and deployment](docs/jarvis.md).

## Production hosting

This repository uses **three required Vercel projects** under `alt164`, all connected
to `nandcello/juicecolored` with production branch `master`:

| Public path | Vercel project | Source                                 | Upstream                     |
| ----------- | -------------- | -------------------------------------- | ---------------------------- |
| `/`         | `juicecolored` | `apps/web` (root directory `apps/web`) | Main site                    |
| `/jarvis`   | `jarvis`       | `apps/jarvis`                          | `jarvis-pi-brown.vercel.app` |
| `/canceldt` | `canceldt`     | `apps/canceldt`                        | `canceldt.vercel.app`        |

The main site proxies the two app paths; its deployment does not build or host
those apps. Deleting either app project breaks its public path, even though the
source remains in this repository. Each project's production environment variables
and hostname must be retained. See [CANCELDT deployment](docs/canceldt.md#schema-and-deployment)
and [Jarvis deployment](docs/jarvis.md#production-deployments) for configuration.

Dependency versions, compatibility decisions, and validation notes: [September 2026 upgrade](docs/dependency-upgrade-2026-09.md).

Spam filtering endpoints, local setup, and migration notes: [Spam filter API](docs/spam-api.md).

## Main site

`apps/web` is a Next.js App Router app with React Compiler and Cache Components enabled,
like `apps/jarvis` and `apps/canceldt`. It serves the portfolio at `/` and the spam
filter API at `/api/*`, and rewrites `/jarvis` and `/canceldt` to their upstream apps.

```sh
vp run dev:web                    # https://juicecolored.localhost via portless
CANCELDT_ORIGIN=https://canceldt.vercel.app vp run build
vp run -F @personal/web test:e2e  # set WEB_TEST_ORIGIN to test a running server
```

The e2e suite needs a server started with `API_AUTH_TOKEN=e2e-test-token` and
`JARVIS_ORIGIN`/`CANCELDT_ORIGIN` pointing at `http://127.0.0.1:4390`, the echo
upstream it starts itself.
