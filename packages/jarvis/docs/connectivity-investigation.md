# Xiaomi connection failure — November 17, 2026

## Confirmed cause

The production Jarvis owner login and snapshot both returned HTTP 200. The saved
integration was still present, using Singapore (`sg`), and was created on
September 16, 2026 at 05:47:35 UTC. Its saved credentials contained `userId`,
`ssecurity`, and `serviceToken`, but no renewal credential or account cookies.
No credential values were printed or added to the repository.

Both visible devices failed a production **read-only refresh**. Jarvis returned
the same generic message suggesting power or Wi-Fi trouble. A separate read-only
Xiaomi device-list request using the saved session produced the adapter's
HTTP 401/403 error: authorization expired or was rejected. This proves the
session is unusable; it does not prove whether Xiaomi expired or revoked it,
or whether either physical device is currently connected to Wi-Fi.

The bulb's latest recorded successful command was November 12 at 11:57 AM;
the fan's was November 11 at 10:48 PM (Philippine time). These are activity
timestamps, not a measured session-expiry time. No physical commands were sent
during the initial diagnosis; later command checks are recorded below.

## Why refresh cannot recover it

Every cloud action recreates the client from the same encrypted session.
`pollQR` retains only the service credentials and discards account cookies and
other login fields. There is no token-renewal implementation. The seven-day
Jarvis browser cookie is separate and was not the failing authentication layer.
Keeping a browser tab or Mac awake cannot renew Xiaomi's service token.

Before this fix, the gateway caught authorization errors as ordinary device read
failures and marked devices offline. Settings used the existence of an integration
record to display “Connected,” even when Xiaomi rejected its credentials.

## Prepared changes

- Recognize HTTP 401/403 and existing Xiaomi auth codes 2/3 as typed authentication
  failures, without passing upstream payloads to the browser.
- Persist a `requiresReconnect` account flag. Preserve the last observed device
  values and timestamp, disable controls, and explicitly say availability is unknown.
- Show a reconnect action and stop periodic physical reads after authorization fails.
  Snapshot polling remains active so another tab's completed sign-in is picked up.
- Refuse repeated cloud calls with known rejected credentials. A delayed error
  from an old encrypted session cannot invalidate a newly saved sign-in.
- Preserve device IDs, names, rooms, visibility, and measured fan travel when
  the new authenticated Xiaomi user ID and region match the previous account.
  Clear the estimated fan position and require fresh state reads. Changing
  accounts or regions still clears old devices to prevent cross-account inheritance.
- Keep commands single-attempt. A failed or ambiguous response never causes a
  physical command to be resent automatically.

These reconnect changes improve diagnosis and recovery; they do **not** add automatic token
renewal. The backend changes are deployed. A separate local transport was subsequently
implemented and deployed, as described below. Frontend messaging is included in the
subsequent reconciled master update.
The workspace already contained separate optimistic-control and fan-readback
changes when this investigation began. The final integration retains current
master's optimistic UI and adds the bounded fan readback and persistent warning behavior.

## Recovery

After deploying the reconnection fix, open production Jarvis → Settings →
Reconnect account. Keep **Singapore / Philippines**, scan the code with Xiaomi
Home (`+` → Scan), approve the sign-in, and choose “I've scanned the code.”
Then refresh both visible devices and verify their state is read successfully.
Do not choose Disconnect first: that intentionally deletes device records.

The previous reconnect flow recreated device records. The deployed preservation
fix keeps labels, hidden-device preferences, and the saved 22-step fan travel
measurement when reconnecting the same account. The owner approved this
reauthorization in Xiaomi Home, and preservation was verified.

## Initial hardware assessment

These were the options considered before verifying the Bathala/Apple TV setup.
The selected and deployed approach is recorded under Validation below.

The owner has an Apple TV and this MacBook Pro. The Mac's inspected AC profile has
`sleep 0`; no power setting was changed. An existing local Glow settings file has
no saved devices. A read-only Yeelight multicast discovery from the Mac returned
no devices. This is not proof that the bulb lacks LAN support: LAN Control may
be disabled, the device may be unreachable, or multicast/local-network permissions
may interfere.

The recommended architecture is an automatically restarted local bridge on an
always-on home machine, with Jarvis sending authenticated commands to it through
an outbound connection. No router port forwarding is needed. Persist pairing
credentials locally, reserve device DHCP addresses, reconnect with backoff after
network changes, expire queued commands, and distinguish bridge availability,
device reachability, and cloud authentication. Never replay an unacknowledged
movement or command after bridge restart.

For the current devices:

- **Yeelight `yeelink.light.color4`:** enable LAN Control and verify a direct
  property read before switching transport. Home Assistant lists this model and
  documents its [LAN Control setup](https://www.home-assistant.io/integrations/yeelight/).
- **Fan `dmaker.fan.p18`:** obtain its local device token and IP after a fresh
  Xiaomi sign-in, then verify a local read. Home Assistant lists this exact model
  in its [Xiaomi local integration](https://www.home-assistant.io/integrations/xiaomi_miio/).
  Local device tokens are distinct from the expired cloud service token and may
  need replacement after device reset/re-pairing.
- **MacBook:** can host the bridge while awake and on the home LAN. Sleep,
  shutdown, or taking it away removes the control path. The AC idle setting alone
  does not guarantee availability after lid closure, reboot, or logout. See
  [Apple's sleep settings](https://support.apple.com/en-me/guide/mac-help/set-sleep-and-wake-settings-mchle41a6ccd/mac).
- **Apple TV:** can be an [Apple Home hub](https://support.apple.com/en-us/102557)
  for compatible accessories. That does not supply Jarvis's missing local
  Xiaomi/Yeelight transport or run the proposed Mac bridge.

Local transport removes Xiaomi service-token expiry from everyday commands.
It cannot guarantee uninterrupted control through power failures, Wi-Fi outages,
host downtime, firmware changes, or device resets. A dedicated home host is a
better long-term fit if the MacBook regularly sleeps or leaves home.

Cloud-only automatic renewal is another improvement, but it must retain a suitable
renewal credential after a fresh sign-in, implement and validate renewal, save
rotated credentials atomically, and request reauthorization when renewal is revoked.
Simply retaining the current service token or adding a keepalive is insufficient.
The existing expired session has no renewal credential to use.

## Validation

### Bathala and Apple TV network verification

The selected remote-host setup uses Bathala (`100.96.3.32`, `tag:bathala`) and
the Apple TV (`100.73.116.43`) as a Tailscale subnet router for
`192.168.254.0/24`. The owner advertised and approved that route; Bathala has
route acceptance enabled. This permits a bridge to run on Bathala without
depending on the MacBook remaining at home.

Bathala initially did not receive the route because its tag had no grant to
the home subnet. Added one grant allowing `tag:bathala` to reach
`192.168.254.0/24` on `tcp:55443` and `udp:54321`. All other policy fields were
preserved, including the rules and tests restricting access to personal
devices and other servers. The Tailscale API validated the policy, the save
used the original ETag to prevent overwriting concurrent changes, and a fresh
read verified the saved policy.

After the change, Bathala received the subnet route through the Apple TV and
`ip route get` selected `tailscale0`. Read-only miIO discovery from Bathala
received replies from both visible Jarvis devices, matched by device ID:

- Bulb `307017192`, `yeelink.light.color4`: `192.168.254.126`.
- Fan `811762640`, `dmaker.fan.p18`: `192.168.254.190`.

These addresses were observed, not reserved in DHCP. The bulb's TCP 55443
connection was refused when tested from the home Mac. At this stage, discovery
proved reachability, not authenticated control. The subsequent authenticated
verification and bridge deployment are recorded below. The policy does not depend
on the API token used to save it remaining valid. Apple TV availability,
Tailscale device-key expiry, home internet, and device Wi-Fi remain operational
dependencies.

### Persistent local control deployed

The owner approved a new Xiaomi QR sign-in. Production device IDs, labels,
rooms, hidden-device settings, and fan travel measurements were compared
before and after reconnect and were preserved. Local tokens for the two
visible devices were retrieved without printing them and provisioned to a
private file on Bathala.

Both devices returned authenticated readings via miIO UDP 54321 from Bathala.
The bulb supports this protocol even though its separate Yeelight TCP port is
closed. No Yeelight LAN-mode toggle was needed.

The backend routes the two provisioned IDs to `localBridge` jobs. The outbound
Python worker uses the official Convex client and python-miio, with physical
command retries disabled. It claims each job once, checks the deadline and
device identity before delivery, and never replays work after failure or
restart. It rediscovers configured IDs after DHCP changes. A fresh cloud login
is not required for everyday commands on these paired devices.

The bridge is an enabled, automatically restarting user systemd service on
Bathala, with lingering enabled. The synchronous Python subscription initially
blocked idle heartbeats; async iteration fixed this, and freshness was verified
after an idle period. The service was restarted and both devices were refreshed
successfully through the actual production Jarvis HTTP route after owner login.
Both returned HTTP 200 and `transport: local`, `online: true` snapshots.

Actual command delivery was checked by reading and reapplying each device's
current brightness/speed. Both commands were acknowledged and states confirmed.
No power toggles or fan direction commands were sent. Tailscale device-key
expiry is disabled on Apple TV and Bathala. Power, internet, Wi-Fi, device resets,
and service outages remain dependencies.

Automatic approval review rejected publishing the full monorepo to Vercel as
broader than the Jarvis change. The production-source comparison also revealed
newer website features absent from this checkout. No frontend deployment was
created at that stage; the existing frontend was verified against the new backend.
The owner subsequently authorized a push to master. The checkout was fast-forwarded
to current master and the Jarvis changes reconciled with its newer state-confirmation
and pull-to-refresh features, preserving the unrelated website updates.
Production's bulb transition/readback, sequential discovery, and observation
freshness behavior were retained in the backend update.

The backend is `tidy-condor-949`. Device tokens and the separate bridge
credential were not added to source control or deployment manifests.

### Application checks

`vp run check` passed formatting, lint, and workspace type checks. `vp test run`
passed all 173 tests, including reconnect, bridge, and bulb-readback regressions. Nine relevant Playwright
tests across connectivity, fan controls, and settings passed using fixture devices.
Five Python worker tests passed on Bathala, covering no replay, expired/cancelled
requests, device identity, RPC restrictions, and numeric types. Live checks above
separately verified physical devices and production HTTP routes. After the owner
put the Apple TV to sleep while leaving it powered, both devices refreshed
successfully through production Jarvis with HTTP 200 and fresh local readings.
This verifies the sleep state tested, not uninterrupted availability indefinitely.
