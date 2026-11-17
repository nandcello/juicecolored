# Fan status readback investigation

Live reproduction on `https://juicecolored.com/jarvis`, October 8, 2026.
Times below are Asia/Manila (UTC+08:00).

## Confirmed live behavior

The owner confirmed the fan was initially not oscillating. Jarvis showed Off.

1. At 13:52:17, the browser sent `control / oscillation / { on: true }`.
   The server returned HTTP 200 with `{ ok: true }`. The owner confirmed the fan
   started turning side to side.
2. The immediately following snapshot returned `oscillating: false`,
   `online: true`, a new `updatedAt`, and a successful “Oscillation changed”
   activity entry. The switch was still Off at 13:52:25.
3. A later background refresh updated the stored state at 13:52:33 to On.
   By the next page load at 13:52:50, both the API and switch showed On.
4. At 13:53:17, the browser sent `control / oscillation / { on: false }` to
   restore the starting setting. Again, HTTP 200 and `{ ok: true }` were returned.
   The owner confirmed physical oscillation stopped.
5. The following snapshot still returned `oscillating: true`. A full page
   navigation followed by a new API read at 13:53:25 retained that value, and
   the switch still showed On. This establishes persistence across reloads.
6. The fan's explicit Refresh control was used at 13:54:07. By 13:54:08, the
   stored state and UI showed Off, matching the restored physical setting.

Only oscillation was commanded. Power, speed, mode, angle, timer, indicator,
sound and child lock retained their starting reported values. Oscillation
invalidated the direction position estimate through existing application
behavior; the saved 22-step travel measurement remained. No recalibration or
aiming command was sent.

## Confirmed application failure

- `convex/gateway.ts` sends the command, immediately calls `refresh`, then
  records success. It does not compare the observed field with the requested
  value. A valid but stale response therefore counts as successful refresh.
- `convex/store.ts:updateState` persists the entire reported state and stamps
  it with the current time, even when the observation is stale.
- The page loader and 15-second browser poll read `store.snapshot`. They
  retrieve the persisted value rather than querying the physical device.
- The dashboard requests one upstream device refresh per minute, rotating
  through visible devices. With the two visible devices in this reproduction,
  each device gets a background refresh approximately every two minutes while
  the page stays visible and idle. Reloading restarts the timer and rotation.

These facts explain both the wrong switch position and why reloading retains
it. The UI reflects the backend value correctly.

## Likely upstream trigger and remaining uncertainty

`convex/adapters/fan.ts:readFan` calls `/miotspec/prop/get` with `{ params }`,
omitting `datasource`. Xiaomi's own SDK documentation distinguishes cached
reads from `datasource: 2`, which requests a device RPC read:

https://github.com/MiEcosystem/miot-plugin-sdk/wiki/04-miot_spec#ispecgetpropertiesvalueparams-datasource--promisejson

Cached upstream state combined with immediate readback is the leading
explanation. The live browser evidence proves stale persisted status, but does
not isolate Xiaomi caching from device propagation delay. An A/B comparison
of default reads and `datasource: 2` was not performed: automatic approval review
rejected extracting and decrypting the production Xiaomi session for use
outside the app. No production code was deployed or modified for the test.

## Fix options

1. **Fresh fan reads (smallest targeted change).** Pass `datasource: 2` in
   `readFan`, especially for command confirmation, explicit refresh and motion
   preconditions. Validate the behavior and latency on this exact fan model.
   A single fresh read can still precede the device applying the change.
2. **Bounded command confirmation (recommended with option 1).** Compare the
   requested property with fresh readback, allowing a small bounded number of
   delayed reads. Never resend the command automatically. If the value does not
   converge, return an explicit “accepted, state not confirmed” result rather
   than treating a mismatching read as confirmed success. Preserve the existing
   account serialization while confirming; background work must respect newer
   commands if confirmation is moved into scheduled jobs.
3. **Persistent pending state and UI feedback (larger improvement).** Store
   desired and observed states separately, together with confirmation status.
   Display pending/unconfirmed feedback across reloads and prioritize refresh
   of the affected device. Simply forcing the switch to the desired value would
   conceal failed commands and would not establish actual state.

Do not assume the fan-specific `datasource` change also fixes lights: lights
use a different `get_prop` RPC path. They share the immediate-readback and
confirmation weakness, but no light setting was changed during this test.

## Initial implementation follow-up

The subsequent implementation adds React `useOptimistic` within a Transition,
following the [Next.js guidance](https://nextjs.org/docs/app/guides/forms#optimistic-updates)
and [React hook contract](https://react.dev/reference/react/useOptimistic).
Predictable controls, including fan switches and light power/scenes, immediately
project the requested value over the last server snapshot. Controls remain
serialized and show “Confirming device change…” until the command and snapshot
read finish. Errors recover the server snapshot without resending the command;
the optimistic projection then ends and the reported state takes precedence.

[Convex optimistic updates](https://docs.convex.dev/client/react/optimistic-updates)
are tied to `useMutation` and the reactive client query cache. Jarvis currently
uses an authenticated Next.js Route Handler and `ConvexHttpClient` to call a
Convex action. React's hook fits that boundary without changing authentication
or moving the server gateway secret into the browser. External device calls
remain in actions, consistent with the
[Convex actions guidance](https://docs.convex.dev/functions/actions).

Fan reads now use `datasource: 2`. Command readback checks the changed property
with at most three fresh reads, separated by 500 ms and 1500 ms when needed.
Only the final observed state is saved. Persistent disagreement returns a
warning and saves it on the device, visible across reloads. The command is sent
once. Write-only direction nudges are still acknowledgements, not measured
positions. Lights receive optimistic UI behavior but retain their existing
readback protocol.

The optimistic projection is temporary browser state. Reloading during an
in-flight action discards that projection; the backend continues confirming
and the normal snapshot poll picks up its result. Persisting a desired state
and in-flight command status across reloads remains a separate improvement.

`convex/fanReadback.test.ts` was converted from a bug characterization into
regression coverage for delayed convergence in both directions, bounded
non-convergence, persistent warnings, immediate confirmation, and ambiguous
write failure without retry. `tests/e2e/optimistic-controls.spec.ts` holds
responses open to prove the UI updates before acknowledgement, then exercises
success, rollback, reloads and lost-response recovery.

Validation: `vp check`, `vp test run` (155 passing tests), Jarvis lint/typecheck,
the full `vp run check`, the production `vp run build`, and all 23 fixture
browser tests passed. The development Convex deployment was updated and its
authenticated snapshot was smoke-tested successfully. Convex's CLI looked for
a compiler inside the package rather than the hoisted workspace installation;
the exact `convex/tsconfig.json` passed the workspace TypeScript compiler
separately before pushing with the CLI's duplicate typecheck disabled.

The development backend has no connected devices. These checks do not establish
physical device behavior for the changed backend. Production has not been
updated; the original live reproduction above used the previous production code.

## Production integration — November 17, 2026

The local-control work was reconciled with current master, which already supplies
optimistic command projections, confirmation indicators, fresh reads on entry,
and pull-to-refresh. That implementation supersedes the earlier useOptimistic
prototype described above. The bounded fan readback and persistent mismatch
warning remain; the unused prototype helper was removed. Existing and additional
fixture tests cover optimistic switches, failures, and lost responses without
replaying writes.

The production backend and Bathala bridge now use authenticated local miIO for
the paired fan and bulb. Both returned fresh readings with Apple TV asleep, and
reapplying their existing brightness/speed confirmed command delivery and readback.
The original diagnosis and validation records above describe their respective
earlier checkpoints, not the current production deployment.
