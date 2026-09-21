import "server-only";
import { cookies } from "next/headers";
import { SignJWT, importPKCS8, jwtVerify, createLocalJWKSet, errors } from "jose";
import { fetchQuery } from "./convex-read";
import { api } from "@personal/convex";
import { convexOptions } from "./data";
export const COOKIE = "canceldt_session";
export function authConfigured() {
  return !!(
    process.env.CANCELDT_AUTH_PRIVATE_KEY &&
    process.env.CANCELDT_AUTH_ISSUER &&
    process.env.CANCELDT_AUTH_PUBLIC_JWKS &&
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.CANCELDT_LOGIN_SECRET
  );
}
export async function issueSession() {
  if (!authConfigured()) throw new Error("Owner sign-in is not configured.");
  const key = await importPKCS8(
    process.env.CANCELDT_AUTH_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    "ES256",
  );
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1", typ: "JWT" })
    .setSubject("canceldt-owner")
    .setIssuer(process.env.CANCELDT_AUTH_ISSUER!)
    .setAudience("canceldt")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}
export class AdminSessionError extends Error {
  constructor() {
    super(
      "Your session has expired or is invalid. Sign in again in a separate tab, then retry here. Your entered values are kept.",
    );
    this.name = "AdminSessionError";
  }
}
export async function requireAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) throw new AdminSessionError();
  if (!authConfigured()) throw new Error("Owner sign-in is not configured.");
  try {
    await jwtVerify(token, createLocalJWKSet(JSON.parse(process.env.CANCELDT_AUTH_PUBLIC_JWKS!)), {
      algorithms: ["ES256"],
      issuer: process.env.CANCELDT_AUTH_ISSUER,
      audience: "canceldt",
      subject: "canceldt-owner",
    });
  } catch (error) {
    if (error instanceof errors.JOSEError) throw new AdminSessionError();
    throw error;
  }
  await fetchQuery(api.canceldt.admin.permission, {}, { ...convexOptions(), token });
  return token;
}
export const cookieOptions = () => ({
  httpOnly: true,
  secure: (process.env.CANCELDT_PUBLIC_ORIGIN ?? "https://juicecolored.com").startsWith("https:"),
  sameSite: "strict" as const,
  path: "/canceldt",
  maxAge: 3600,
});
