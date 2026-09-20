import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import type { FunctionArgs } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { backend, configured } from "@/lib/backend";
import { COOKIE_NAME, issueSession, validSession } from "@/lib/session";
import { acceptsWrite, sessionCookieOptions } from "@/lib/http";
export const maxDuration = 60;
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function GET() {
  if (!configured()) return json({ error: "Backend setup is pending." }, 503);
  if (!(await validSession((await cookies()).get(COOKIE_NAME)?.value)))
    return json({ error: "Sign in to Jarvis." }, 401);
  try {
    const { client, secret } = backend();
    return json(await client.query(api.store.snapshot, { secret }));
  } catch {
    return json({ error: "Unable to reach the backend. Try again shortly." }, 502);
  }
}
export async function POST(request: NextRequest) {
  // Same-origin JSON + SameSite cookie prevents cross-site control requests.
  if (!acceptsWrite(request)) return json({ error: "Request origin rejected." }, 403);
  if (!configured()) return json({ error: "Backend setup is pending." }, 503);
  let input: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 16384) return json({ error: "Request too large." }, 413);
    input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  try {
    const { client, secret } = backend();
    if (input.type === "login") {
      if (typeof input.password !== "string" || input.password.length > 256)
        return json({ error: "Enter your passphrase." }, 400);
      if (
        !(await client.action(api.gateway.login, {
          secret,
          password: input.password,
        }))
      )
        return json({ error: "Incorrect passphrase." }, 401);
      const response = json({ ok: true });
      response.cookies.set(COOKIE_NAME, await issueSession(), {
        ...sessionCookieOptions(request),
        maxAge: 604800,
      });
      return response;
    }
    if (!(await validSession((await cookies()).get(COOKIE_NAME)?.value)))
      return json({ error: "Sign in to Jarvis." }, 401);
    if (input.type === "logout") {
      const response = json({ ok: true });
      response.cookies.set(COOKIE_NAME, "", {
        ...sessionCookieOptions(request),
        maxAge: 0,
      });
      return response;
    }
    const result = await client.action(api.gateway.execute, {
      secret,
      operation: input as FunctionArgs<typeof api.gateway.execute>["operation"],
    });
    return json(result);
  } catch (error) {
    if (error instanceof ConvexError && typeof error.data === "string")
      return json({ error: error.data }, 400);
    return json(
      {
        error: "The request could not be completed. Refresh before trying again.",
      },
      502,
    );
  }
}
