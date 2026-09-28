# Development schema reconciliation

On September 29, 2026 (Asia/Manila), migration verification updated the existing Jarvis development deployment, `scintillating-okapi-827`. Convex reported removal of `cameraJobs.by_status` and `cameraBridge.by_key`. A read-only investigation checked whether this indicated lost functionality.

The earlier task **Remove camera access controls** recorded the user's explicit removal of camera controls and their backend. That removal had been deployed to production on September 20, while development retained the older camera definitions. Reintroducing them would reverse that earlier decision.

The live development audit event at `2026-09-28T16:10:47.775Z` confirms:

- The only removed module was `camera.js`.
- The only removed schema definitions were `cameraBridge` and `cameraJobs`, including their two indexes.
- All seven retained table definitions were unchanged: `activity`, `devices`, `integrations`, `leases`, `limits`, `logins`, and `scenes`.
- There were no authentication-provider or cron changes.
- The Convex UDF version changed from `1.45.0` to `1.46.0`.

The active remote schema matches `convex/schema.ts` exactly after accounting for Convex's automatic `_creationTime` index suffix and absent/null staged document fields. All 19 deployed function registrations match the local `gateway.ts` and `store.ts` registrations. No other function registrations are missing or unexpected.

The audit investigation used authenticated read-only system queries for the active schema, latest deployment event, deployment history, and module metadata. It performed no remote writes. The prior full schema was recoverable from the latest deployment event, but restoration is unnecessary because the removed definitions belong to the intentionally retired camera feature. Removing a schema definition or index does not itself delete table documents.
