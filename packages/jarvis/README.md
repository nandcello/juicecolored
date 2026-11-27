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
- **Fan direction** offers a draggable, keyboard-accessible 140° arc. Turn off oscillation and child lock, then choose **Calibrate direction**. If a travel measurement is saved, one tap automatically finds the left limit. The original browser measurement is reused and saved on the backend; other browsers can then use it too.
- With no measurement yet, **Calibrate direction** automatically moves left. When it appears to stop, choose **Check left end**: Jarvis pauses six seconds, sends two attempts at least six seconds apart, then asks whether either moved the head. **Neither attempt moved it** starts the automatic rightward sweep; repeat the check at the right end to save the estimate. **It moved — keep going** resumes the sweep with a longer settling interval (3 → 5 → 7 seconds). There are no per-step buttons or manual counters. **Measure travel again** repeats this setup.
- The two confirmed no-movement checks are excluded from travel, along with one attempt that prompted the end check. Other missed movements or delayed observations cannot be reconstructed from command acknowledgements, so the saved travel and intermediate aiming remain estimates. A separate conservative command count is retained for future homing. This is observation-assisted setup, not automatic movement detection. First setup needs the owner to watch the fan; unanswered checks expire without saving a new calibration.
- Automatic calibration and aiming run on the backend, so leaving the controls, hiding the page, or reloading does not interrupt them. Progress appears when you return. **Stop after this step** cancels remaining movement and clears the position estimate. Interrupted or unconfirmed commands are never retried automatically.
- Direction remains an **estimate**, not a device reading. Automatic homing depends on this fan safely ignoring extra left nudges at its limit (confirmed by the owner). Jarvis retains the estimate across visits, but power/oscillation/lock/angle changes, offline reads, and manual direction commands invalidate it. Recalibrate after movement in Xiaomi Home or by hand; those movements cannot always be detected.
- Movement is serialized across tabs for the whole sequence. Background movement commands wait at least three seconds after acknowledgement before the next attempt; setup can increase that interval when the fan starts moving again after an apparent stall. Background sequences read physical state before movement, every five nudges, after the final nudge, and before each endpoint probe. A successful acknowledgement confirms command acceptance, not physical movement. Ambiguous failures are never retried; the deliberately requested endpoint probes are separate commands. Each setup sweep is bounded to 70 attempts and never declares success merely because that limit was reached. Fully unattended travel measurement still requires motion feedback.
- **Device settings → Hide device** removes a device from the dashboard and scene targets. **Settings → Hidden devices → Restore** brings it back. Visibility persists through rediscovery and does not change the physical device.
- Power, brightness, 1700–6500K white temperature and RGB colors.
- Adjustable transitions, four built-in scenes and saved scenes.
- Breathe / sunset effects, stop effect, bulb-native off timers and power-on default.
- Confirmed command history and explicit error reporting.
- Selected device refreshes every minute while the dashboard is visible; **Refresh** reads immediately. The browser checks the stored snapshot every 15 seconds, every 1.5 seconds during background movement, and when returning to the page. Physical background refreshes pause during movement.

Commands are serialized per Xiaomi account. Predictable controls update immediately and show “Applying… Waiting for device confirmation” while awaiting the command and server snapshot. They settle to the reported state on completion, including rollback and an explanation on failure. Lost responses trigger a snapshot read, never a repeated command.

Fan status reads explicitly request fresh device values. After a fan command, Jarvis checks the changed setting with at most three reads, waiting 500 ms and then 1500 ms if needed. If it does not converge, the last reported state and a confirmation warning are saved; the warning survives reloads. Direction nudges cannot confirm a physical position. Previously reported state is retained and labeled offline on read failure. Optimistic display state itself is temporary and is discarded on reload; backend confirmation continues independently.

Device controls become available after an actual property read, not just cloud discovery. Scene commands can turn an off light on. Other appearance controls require power on. Firmware, Wi-Fi provisioning, account sharing, music sync and recurring automations remain in Xiaomi Home.

## Structure

### Persistent local control

The production bulb and fan use a bridge on Bathala through the Apple TV's
Tailscale subnet route. Device tokens are stored only in Bathala's private
`~/.config/jarvis-bridge/devices.json`; they are not sent to the browser or stored
in the command queue. `JARVIS_LOCAL_DEVICE_IDS` selects the paired device IDs in
Convex, and `JARVIS_BRIDGE_SECRET` authenticates only the bridge endpoints.

`bridge/worker.py` subscribes outbound to Convex over TLS and sends authenticated
miIO requests over the home subnet. It uses async subscriptions so idle waits
do not block its heartbeat or address discovery. It rediscovers configured
device IDs after DHCP changes. Requests expire after 12 seconds, are claimed
once, and are never replayed after a timeout, lost acknowledgement, or worker
restart. Paired devices do not fall back to Xiaomi cloud commands.

On Bathala, `jarvis-bridge.service` is an enabled user service with lingering and
automatic restart. The virtual environment and worker are under
`~/.local/share/jarvis-bridge/`; `bridge/requirements.txt` pins direct dependencies.
Restart only this service with `systemctl --user restart jarvis-bridge`.
Keep the Apple TV powered and configured as an Apple Home hub so it stays
network-connected during sleep. Device resets can invalidate local tokens.

The local-control backend and Bathala worker are deployed independently of the
shared website. The frontend keeps local controls available after cloud sign-in
expires and offers reconnection for cloud devices. Frontend changes ship through
the shared website's Git deployment from `master`.

### Package layout

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
