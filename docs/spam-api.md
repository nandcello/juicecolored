# Spam filter API

The Hinto spam filter now runs inside the web app through a Next.js route handler (`apps/web/src/app/api/[[...path]]/route.ts`). Its Effect classifier calls `typesafe-ai/jev` through Vercel AI Gateway, with no dependency on the old Cloudflare Worker. The Gateway SDK represents TypeSafe's Noul probability as a `boolean` evaluation question; the integration and verdict semantics are unchanged.

Source: `nandcello/hinto` at `437bf1617ebb8cd7a28c93bd5af14560f5676989`.

## Routes

| Method | Path              | Purpose                                                                 |
| ------ | ----------------- | ----------------------------------------------------------------------- |
| GET    | `/api/health`     | Configuration/liveness check; no provider call or bearer token required |
| POST   | `/api/spam`       | Classify one email                                                      |
| POST   | `/api/spam/batch` | Classify 1–20 emails                                                    |

Both POST routes require `Authorization: Bearer <API_AUTH_TOKEN>` and `Content-Type: application/json`, including in local development. Missing or invalid server configuration returns HTTP 503 with `CONFIGURATION_ERROR`. Responses use `Cache-Control: no-store`. Unknown API routes or unsupported methods return JSON 404.

## Local configuration

Set these server-only variables in `apps/web/.env.local` (ignored by Git). Next.js loads this file.

| Variable             | Purpose                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `AI_GATEWAY_API_KEY` | Required Vercel AI Gateway credential                                          |
| `API_AUTH_TOKEN`     | Required shared bearer token for API callers                                   |
| `JEV_TIMEOUT_MS`     | Per-email deadline, including one SDK retry; defaults to 10000, range 1–120000 |

The existing Hinto credentials can be reused. Do not prefix secrets with `NEXT_PUBLIC_`. Start the app with `vp run dev`; the current local base URL is `https://juicecolored.localhost`. Use `portless list` to confirm the address and restart the dev server after changing secrets.

After exporting `API_AUTH_TOKEN` in your shell:

```sh
curl https://juicecolored.localhost/api/spam \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Meeting tomorrow","sender":"colleague@example.com","body":"See you at 3 PM."}'

curl https://juicecolored.localhost/api/spam/batch \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"emails":[{"subject":"Meeting","sender":"colleague@example.com","content":"See you at 3."},{"subject":"Claim your prize","sender":"prizes@example.com","body":"Send a fee to claim."}]}'
```

## Contract

Each email requires `subject` (at most 998 characters), nonblank `sender` (at most 512 characters), and exactly one of `body` or `content` (at most 100000 characters). Subject and content cannot both be blank. Extra fields are rejected. HTML is passed as text; links and attachments are never fetched. Sender identity is not verified.

The entire JSON upload, including streamed uploads, is limited to 512 KiB. A single response is `{ "isSpam": true, "confidence": 0.98 }`. Spam means the model's probability is at least 0.5; confidence is the probability of the selected verdict (p for spam, 1 − p otherwise). This is not a measured accuracy guarantee or TypeSafe's separate confidence statistic.

Batches return `{ "results": [{ "index": 0, "isSpam": false, "confidence": 0.98 }] }` in input order. The entire request is validated before provider calls begin, with at most four calls in progress. Each item's deadline starts when processing begins, so 20 emails may need five deadlines. A valid batch returns HTTP 200 even when individual items fail; inspect each result for `{ "index": 0, "error": { "code": "CLASSIFICATION_TIMEOUT", "message": "..." } }`. Provider failures never become non-spam verdicts.

| HTTP | Error codes                                                         |
| ---- | ------------------------------------------------------------------- |
| 400  | `INVALID_JSON`, `INVALID_REQUEST`, `INVALID_EMAIL`, `INVALID_BATCH` |
| 401  | `UNAUTHORIZED`                                                      |
| 404  | `NOT_FOUND`                                                         |
| 413  | `PAYLOAD_TOO_LARGE`                                                 |
| 415  | `UNSUPPORTED_MEDIA_TYPE`                                            |
| 502  | `CLASSIFICATION_FAILED`, `GATEWAY_VERIFICATION_REQUIRED`            |
| 503  | `CONFIGURATION_ERROR`                                               |
| 504  | `CLASSIFICATION_TIMEOUT`                                            |

No email data is stored in Convex. Application warnings contain sanitized failure categories and statuses, never email content, credentials, or provider error bodies. Email fields are sent to Vercel AI Gateway and TypeSafe for inference.

## Verification and deployment

Run `vp check`, `vp test run`, and `vp run build`. The migrated tests use an injected mock provider to verify the real SDK adapter, authentication, validation, streamed size limits, probability boundaries, upstream cancellation, batch ordering and concurrency, and per-item failures.

For deployment, configure the two secrets on the existing Vercel project and set `JEV_TIMEOUT_MS=10000`. The route handler sets a 60-second `maxDuration` to cover five evaluation deadlines plus overhead. Higher deadlines require increasing the function duration and a compatible hosting plan. Test authenticated single and batch requests after deployment; health alone does not verify inference availability.

The production paths are `https://juicecolored.com/api/spam` and `https://juicecolored.com/api/spam/batch`. Deployment uses the existing Vercel project and the build command in `vercel.json`, which also deploys the Convex backend. The existing service at `spam.juicecolored.com` remains available. Switch callers to the new paths after production verification, then retire the Worker separately.
