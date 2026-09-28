# Architecture decisions

## Direct Convex project

Convex is provisioned directly with its CLI in the existing `alt164` team. Vercel Marketplace was not installed. Next.js deployment configuration points to the separate production Convex URL.

## Cloud transport first

Glow already supports Xiaomi cloud authorization. That allows an internet-hosted app to reach the Yeelight without a persistent LAN relay. A future LAN adapter would need an outbound authenticated bridge running inside the home; Vercel cannot directly dial a private bulb address.

## Single-owner authentication boundary

This personal app uses a generated owner passphrase and a signed HttpOnly cookie. A small Next.js route checks the cookie and forwards calls with a server-only secret. Convex owns device actions and storage. This avoids introducing a third-party identity provider and keeps Xiaomi tokens out of the browser. Adding multiple owners requires identity-aware authorization and owner indexes throughout the schema; do not reuse this single-owner secret design as a tenant boundary.

## State reflects evidence

Cloud discovery alone does not mean the device has responded. `updatedAt=0` means no property read has succeeded. Failed reads retain previous values and mark the device offline. Commands are absolute (on/off), require a successful acknowledgment, and are never retried automatically. Refreshes are safe to repeat. Command leases prevent overlapping writes across tabs, and token-checked release prevents an expired owner from releasing a later request's lease.

## Cache only shareable content

The integration catalog is cached in Next.js. Authentication and current bulb state are evaluated per request under Suspense. No owner data enters the shared Next cache. Polling is intentionally modest for a single-home dashboard. Direct Convex subscriptions can replace the HTTP snapshot polling if the app adopts a JWT-compatible identity provider.

## Latest TypeScript with API compatibility

The project checks with the native TypeScript 7 `tsc`. Microsoft's officially recommended aliases also provide the TypeScript 6 JavaScript API under `typescript`, allowing current ESLint and framework tooling to work. The typecheck script explicitly invokes the native TypeScript 7 compiler so a compatibility dependency cannot shadow its executable.

## Device kinds and visibility

The shared device contract is a discriminated union of light and fan state. The gateway dispatches to the adapter for that kind; scenes are restricted to lights. Fan support is explicitly allowlisted to `dmaker.fan.p18`, whose property map has been verified against the published spec and an actual device read. New models need their own verified mapping.

Hidden is optional in the database for compatibility with existing records and defaults to false in snapshots. It is a presentation preference: it survives rediscovery, excludes devices from dashboard counts, room lists and scene selection, and remains reversible in Settings. Hiding never sends a physical command or disconnects the account.
