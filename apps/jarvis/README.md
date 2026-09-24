# Jarvis

A personal device-control dashboard for Yeelight lights and Mi Smart Standing Fan 2 through Xiaomi Home. Inspired by the Glow dashboard in `shenanigans/yeelight-dashboard`.

## Stack

- Next.js **16.3.5** App Router, Cache Components and React Compiler **1.0.0**.
- React / React DOM **19.2.3** (aligned with the monorepo).
- TypeScript **7.0.2** (`vp run typecheck`), with Microsoft's TypeScript 6 API compatibility package for ESLint and tools that still need the JavaScript compiler API.
- StyleX **0.19.0**, using its documented Babel + PostCSS pipeline.
- Convex **1.46.0** for business logic, external API calls, database queries and mutations.
- Vercel for the Next.js application. Convex is provisioned directly, without Marketplace.

The development and production commands use Webpack because Turbopack's Babel workers require a local port unavailable in the agent's execution environment. React Compiler and Cache Components remain enabled.

## Run

```sh
# From the monorepo root:
vp install
vp run dev
# In another terminal, only when changing Jarvis backend code:
vp run dev:jarvis:convex
```

Open **https://juicecolored.localhost/jarvis**. If the portfolio server is already running, start just Jarvis with `vp run dev:jarvis`. Jarvis listens on `127.0.0.1:3001` and uses Next.js `basePath: "/jarvis"`. See [monorepo routing and deployment](../../docs/jarvis.md).

Jarvis uses Vercel `alt164/jarvis` and Convex `alt164/jarvis`. `apps/jarvis/.env.local` selects the development backend. Keep its settings separate from the root `.env.local`. Production is a separate Convex deployment.

Run Jarvis-specific commands below from `apps/jarvis`. For a new installation, configure Convex with `vp exec convex dev --configure new`, then run `node scripts/setup-secrets.mjs --convex` to create and install development secrets. This script reuses existing secrets on subsequent runs. It does not print values.

The generated owner passphrase is the `JARVIS_OWNER_PASSPHRASE` entry in `.env.credentials.local`. This file is ignored by Git and excluded from Vercel uploads. Keep it private. Sign in using that passphrase, then choose **Connect a device → Connect with Xiaomi Home**. For a Philippine Xiaomi account, choose **Singapore / Philippines**, scan the QR with Xiaomi Home's **+ → Scan**, approve, and click **I've scanned the code**.

## Controls

- Yeelight lights and Mi Smart Standing Fan 2 (`dmaker.fan.p18`), selection, rooms and per-device labels.
- Fan power, 1–100 speed, straight/natural wind, oscillation and angle, left/right adjustment, off timer, indicator, sound and child lock.
- **Fan direction** offers a draggable, keyboard-accessible 140° arc. Turn off oscillation and child lock, then choose **Calibrate direction**. Step to the left limit, confirm it, and count rightward steps until the right limit. Jarvis saves the travel measurement in this browser; later calibrations only need alignment at the left limit. **Measure travel again** replaces that measurement.
- Direction is an **estimate**, not a device reading: this model only accepts left/right nudges. Release the arc to send a bounded sequence of acknowledged steps, spaced by at least 1.5 seconds. All dashboard controls stay busy during the sequence. **Stop after this step**, leaving the controls, backgrounding the page, or a failed command cancels the remaining steps without retrying. Oscillation, power/lock/online changes and manual direction commands clear the estimate. Recalibrate after movement in Xiaomi Home, another browser or by hand. Position is never restored from browser storage.
- **Device settings → Hide device** removes a device from the dashboard and scene targets. **Settings → Hidden devices → Restore** brings it back. Visibility persists through rediscovery and does not change the physical device.
- Power, brightness, 1700–6500K white temperature and RGB colors.
- Adjustable transitions, four built-in scenes and saved scenes.
- Breathe / sunset effects, stop effect, bulb-native off timers and power-on default.
- Confirmed command history and explicit error reporting.
- Selected device refreshes every minute while the dashboard is visible; **Refresh** reads immediately. The browser checks the stored snapshot every 15 seconds.

Commands are serialized per Xiaomi account. A command is never automatically retried: a timeout can occur after a successful physical change. A confirmed command followed by a failed state read is reported separately. Previously reported state is retained and labeled offline on read failure.

Device controls become available after an actual property read, not just cloud discovery. Scene commands can turn an off light on. Other appearance controls require power on. Firmware, Wi-Fi provisioning, account sharing, music sync and recurring automations remain in Xiaomi Home.

## Architecture

```text
Browser → Next.js authenticated HTTP boundary → Convex functions → Xiaomi cloud → lights / fans
                                                ↕
                                           Convex database
```

- `src/lib/domain.ts`: shared device, capability, state, scene and activity contracts.
- `convex/adapters/fan.ts`: validates and maps Standing Fan 2 MIoT properties and acknowledgments.
- `convex/adapters/yeelight.ts`: normalizes Xiaomi/Yeelight responses and validates commands.
- `convex/adapters/vendor/`: isolated protocol implementation carried forward from Glow.
- `convex/gateway.ts`: actions for Xiaomi authorization, discovery, reads and commands.
- `convex/store.ts`: authenticated snapshot query and internal data mutations.
- `src/app/api/jarvis/route.ts`: same-origin request checks, HttpOnly session cookies and transport to Convex. Device business logic runs in Convex.

The cached integration catalog uses `use cache`, `cacheLife('days')` and a cache tag. Cookies and live device state sit behind Suspense and are never placed in that shared cache. API responses use `Cache-Control: no-store`.

### Adding a device integration

Implement a new adapter that validates supported actions and returns normalized state. Extend the provider and device-kind validators, add the adapter's gateway dispatch, then render controls based on that device's capabilities. Keep credentials in a provider-specific integration record and all physical commands in server actions. The current implementation supports one owner and one Xiaomi account; it is not a multi-tenant product.

### Security

A salted scrypt passphrase hash is stored in Convex environment variables. Vercel issues a signed, seven-day HttpOnly, Secure (HTTPS), SameSite=Strict owner cookie scoped to `/jarvis`. `JARVIS_PUBLIC_ORIGIN` specifies the browser origin for request validation and secure cookies behind the portfolio proxy. The Convex public query/actions require a separate server secret that never reaches the browser. Other database functions are internal. All browser writes require matching Origin and JSON content type.

Xiaomi account and temporary QR sessions use AES-256-GCM with distinct authenticated contexts. Only an allowlist of Xiaomi HTTPS hosts can be requested by the sign-in protocol. Browser snapshots exclude tokens, encrypted sessions and upstream device IDs. Stored credentials are removed on disconnect. Owner login attempts are limited to 10 per five minutes. Rotate `JARVIS_SESSION_SECRET` to invalidate all dashboard sessions.

## Production deployment

Use the existing Jarvis Vercel project with Root Directory `apps/jarvis` and access to files outside that directory. Deployment and cutover order are documented in [the migration guide](../../docs/jarvis.md).

1. Run `vp exec convex deploy` to provision/publish production functions.
2. Configure production Convex secrets with `node scripts/setup-secrets.mjs --convex --prod`.
3. Configure Vercel production variables:
   - `JARVIS_PUBLIC_ORIGIN`: `https://juicecolored.com` (no trailing slash).
   - `NEXT_PUBLIC_CONVEX_URL`: the production `.convex.cloud` URL.
   - `JARVIS_GATEWAY_SECRET`: matches the Convex production value.
   - `JARVIS_SESSION_SECRET`: dashboard cookie signing key.
4. Deploy the Jarvis project from the monorepo, then deploy the portfolio project.

After approving the upload of the two Jarvis server secrets, `node scripts/configure-vercel.mjs` can perform step 3 for `JARVIS_GATEWAY_SECRET` and `JARVIS_SESSION_SECRET`. It sends values through stdin and does not print them.

The default Vercel build runs `bun run build`, which invokes the workspace Vite+ scripts. Publish backend changes with `vp exec convex deploy` before deploying the frontend. For automated combined deployments, create a dedicated production deploy key with `vp exec convex deployment token create vercel --prod --save-env .env.convex-production.local`, add its `CONVEX_DEPLOY_KEY` to the production Vercel environment, and set the build command to `vp exec convex deploy --cmd 'vp run build'`. Preview builds should use a distinct dev/preview backend and secrets; do not connect untrusted previews to the production home.

## Verification

```sh
vp run typecheck
vp run lint
vp run test
vp run build
# With the portfolio proxy and Jarvis running locally:
vp run start
vp run test:e2e
```

The protocol/Convex tests exercise authentication, credential isolation, encryption tampering, command acknowledgment, failure without retry, device-name preservation, disconnect, rate limits and command leases. Simulated RPC tests do not establish physical bulb connectivity; that needs Xiaomi authorization and a real-device read.

See [protocol provenance](THIRD_PARTY.md) and [architecture decisions](docs/architecture.md).
