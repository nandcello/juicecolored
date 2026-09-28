# Jarvis

Jarvis owns the home-control feature inside the single Next.js application at `apps/web`. All Jarvis UI components, StyleX and CSS Modules styles, server HTTP handlers, session code, Convex functions, and tests live in this package. The web app registers `/jarvis` and `/jarvis/api/jarvis` with thin route wrappers and a separate root layout so Jarvis keeps its own styles.

## Run

From the repository root, run `vp install`, then `vp run dev`. Open **https://juicecolored.localhost/jarvis**. When changing backend code, run `vp run dev:jarvis:convex` in another terminal. Jarvis has its own Convex deployment, but no separate Next.js process or frontend deployment.

Frontend settings belong in `apps/web/.env.local`:

- `JARVIS_CONVEX_URL`: Jarvis's Convex URL, kept separate from the other features' backend URL.
- `JARVIS_GATEWAY_SECRET`: matches the secret in the Jarvis Convex deployment.
- `JARVIS_SESSION_SECRET`: session signing secret.
- `JARVIS_PUBLIC_ORIGIN`: `https://juicecolored.localhost` locally, or `https://juicecolored.com` in production.

Convex deployment configuration belongs in this package's `.env.local`. Run package commands from `packages/jarvis`. For a new backend, run `vp exec convex dev --configure new`, then `node scripts/setup-secrets.mjs --convex`. The setup script reuses existing private `.env.credentials.local` values, configures the backend when requested, and places the two frontend secrets in the shared web app's local env file without printing them. Set `JARVIS_CONVEX_URL` separately.

The owner passphrase is the `JARVIS_OWNER_PASSPHRASE` entry in `.env.credentials.local`. Sign in, choose **Add device → Connect with Xiaomi Home**, select the Xiaomi account region, and approve the QR code in Xiaomi Home.

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

## Structure

- `src/app/`: page, root layout, and authenticated HTTP route implementation.
- `src/components/`: Jarvis-only UI components, CSS Modules and StyleX component styles.
- `src/globals.css`: Jarvis reset, imported only by its root layout.
- `domain.ts`: shared frontend/backend types. `src/lib/domain.ts` contains the integration catalog and built-in scenes.
- `src/lib/`: browser requests, signed owner sessions and HTTP origin validation.
- `convex/`: Xiaomi protocol adapters, commands, stored state and authorization.
- `tests/`: unit tests, backend tests, and Playwright coverage.

The cached integration catalog uses `use cache`; cookies and observed device state stay outside that cache. Same-origin JSON requests and the signed, seven-day HttpOnly, Secure (HTTPS), SameSite=Strict owner cookie remain scoped to `/jarvis`. Browser snapshots exclude credentials and upstream device identifiers. Commands are serialized per Xiaomi account and never automatically retried.

## Deploy

Deploy the Convex backend from this package with `vp run convex:deploy`, then deploy the shared `apps/web` Vercel application. Configure the frontend variables listed above on that shared project, with the production Jarvis Convex URL. The existing secrets and backend data continue to work. There is no separate Jarvis Vercel frontend to deploy.

`node scripts/configure-vercel.mjs` explicitly targets the shared web project's Vercel directory and uploads its two Jarvis server secrets from this package's credential file. It requires the web project to be linked and should run only when that production secret upload is intended.

The shared web build runs `scripts/prepare-web-assets.mjs` before Next.js. When `VERCEL=1`, it replaces the two host icon symlinks with identical regular files because Vercel's output packager cannot copy these cross-workspace links. The source remains `src/assets/icon.svg`; ordinary local builds leave the tracked symlinks unchanged. Both icon URLs and their bytes are preserved.

## Verify

From this package:

```sh
vp run typecheck
vp run lint
vp run test
vp run test:e2e
vp run test:e2e:auth
```

The UI suite copies the unified Next app into a temporary workspace and uses fixture devices; it never sends physical commands. It exercises home controls, scenes, activity, settings, connection dialogs, command errors, direction calibration and responsive layouts. The auth suite targets the running shared application and verifies owner login, session scope, reload, origin rejection and logout using the private local passphrase. It does not send device commands.

The protocol and backend tests verify authentication, credential isolation, encryption, acknowledgments, failure without retry, metadata preservation, disconnect, rate limits and leases. These simulated RPC tests do not establish physical-device connectivity.

See [protocol provenance](THIRD_PARTY.md) and [architecture decisions](docs/architecture.md).
