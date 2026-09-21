# Jarvis

Jarvis lives in the personal monorepo at `apps/jarvis` and is served at `https://juicecolored.com/jarvis`. Its `/jarvis` base path, proxied API, owner cookies and origin checks are integration invariants.

Jarvis is a private, single-owner home-control app for Yeelight lights and the Xiaomi Mi Smart Standing Fan 2. Devices, rooms, capabilities, state and command history come from the existing authenticated Convex/Xiaomi integration.

People open Jarvis to turn a device on or off, adjust fan speed and oscillation, or change light brightness. These actions belong directly on Home. Users should not have to understand device models or open a settings screen to perform them.

The approved direction is the desktop/mobile concept in `docs/design-reference.png`, approved for implementation on September 20, 2026. Use light neutral surfaces, dark text, forest-green active controls and familiar labeled navigation. Group devices by room. Reflow two desktop columns into one mobile column. Power remains visible even when a device is off; secondary controls live under More controls.

Preserve scenes, color and white temperature, transitions, effects, timers, direction and angle controls, indicator/sound/child lock, naming, room assignment, hide/restore, connection management, activity and owner authentication. Unsupported capabilities should not be presented as actionable controls.

No decorative device renders, oversized greetings, summary metrics, gradients unrelated to physical light temperature, or atmospheric panels. The primary audience wants obvious appliance controls, readable labels and large touch targets.

A reported device state is not a guaranteed current physical state. Display unverified/offline conditions, retain last known readings, disable unavailable controls and surface failures. Never retry physical commands automatically. Simulated fixtures belong only in the isolated test preview, not production routes.
