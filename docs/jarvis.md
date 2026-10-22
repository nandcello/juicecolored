# Jarvis in the shared Next.js app

`packages/jarvis` owns Jarvis's UI, StyleX/CSS Modules, owner authentication, domain
contracts, tests and independent Convex backend. Thin route entries in
`apps/web/src/app/(jarvis)` serve `/jarvis` and `/jarvis/api/jarvis` in the same Next.js
process as the portfolio and CANCELDT. Its root layout owns the document and styles.

## Local development

```sh
vp install
node apps/web/scripts/migrate-local-env.mjs # once for an existing checkout
vp run dev
```

Open `/jarvis` on the address shown by `portless list` (currently `https://juicecolored.local`). Run `vp run dev:jarvis:convex` separately
when developing the backend. `packages/jarvis/.env.local` selects that Convex deployment;
Next reads its runtime configuration from `apps/web/.env.local`:

- `JARVIS_CONVEX_URL`: Jarvis's existing Convex URL, separate from the portfolio's public URL.
- `JARVIS_GATEWAY_SECRET`: existing gateway credential.
- `JARVIS_SESSION_SECRET`: existing session signing secret.
- `JARVIS_PUBLIC_ORIGIN`: browser origin; match the address shown by `portless list`.

Session cookies retain their name and seven-day lifetime. They are HttpOnly,
SameSite=Strict, scoped to `/jarvis`, and Secure on HTTPS. Existing sessions remain valid
when their signing secret is preserved. The API still checks write origins separately.

## Deployment

Deploy the frontend once, using the `juicecolored` project rooted at `apps/web`. Copy the
existing production Jarvis runtime values into that project before deploying. Rename
its former `NEXT_PUBLIC_CONVEX_URL` to `JARVIS_CONVEX_URL`; retain
`JARVIS_PUBLIC_ORIGIN=https://juicecolored.com` and the existing secrets. No upstream
origin, frontend proxy or separate Jarvis Next build is required.

The backend stays in the same Convex deployment with the same data. Its files now live
at `packages/jarvis/convex`; deploy backend changes from that package using
`vp run -F @personal/jarvis convex:deploy`. Never substitute development credentials in
production. Keep the former standalone frontend deployment until the combined rollout
has been verified.

## Verification

```sh
vp run check
vp test run
vp run build
vp run -F @personal/jarvis test:e2e
vp run -F @personal/jarvis test:e2e:auth
```

The UI suite copies the combined Next app into a temporary test workspace and replaces
only its Jarvis page/API with fixture data. It exercises controls, scenes, settings,
authentication UI, failures and responsive layouts without sending commands to devices.
The authentication suite uses ignored owner credentials and the real development
backend to check sign-in, reload, origin rejection and sign-out without device control.
Set `JARVIS_TEST_URL` to the unified development origin.

Design references and protocol attribution remain in `packages/jarvis/PRODUCT.md`,
`packages/jarvis/DESIGN.md`, `packages/jarvis/docs/design-contract.md`, and
`packages/jarvis/THIRD_PARTY.md`.

## Device state

The snapshot API reads saved observations, not the appliances. The dashboard separately
checks visible devices on mount (including pull-to-refresh reloads), on resume, and
roughly every 30 seconds while visible. Reads share the command lock and pause during
fan calibration or movement. Fan reads use MIoT `datasource: 2` to bypass Xiaomi's
cloud cache; lights use device RPC. A failed read preserves the last successful
reading's timestamp and appears as unavailable. A database poll alone cannot clear a
failed device check. Cards show when they were checked and label old readings as last
known. Power commands verify the reported power, with bounded read-only retries;
unconfirmed commands are never resent automatically.

After deployment, verify against connected hardware: change power using the physical
button or Xiaomi Home, pull to refresh, and confirm both the displayed power and the
reading time change. Disconnect an appliance and confirm it becomes unavailable rather
than displaying a fresh on/off reading. The isolated UI suite simulates these cases;
an empty local backend cannot establish that real hardware responds correctly.

Device actions show the requested values immediately with a spinning “Applying…
Waiting for device confirmation” status. This optimistic overlay never changes
the saved reading or its timestamp. It remains until the command and resulting
snapshot complete; failures remove it and show the last reported state with an
error. Uncertain transport failures also mark that reading unavailable.
The backend compares the changed properties (including modes, speed, brightness,
effects and timers) against device reads, allowing for selected bulb transitions.
Only reads are retried; writes are never replayed automatically. Direction nudges
and saving power-on defaults have no directly readable target property.
