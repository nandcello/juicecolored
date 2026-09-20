import "server-only";
import { SignJWT, jwtVerify } from "jose";
export const COOKIE_NAME = "jarvis_session";
const key = () => {
  const value = process.env.JARVIS_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Session secret is not configured.");
  return new TextEncoder().encode(value);
};
export async function issueSession() {
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("jarvis-owner")
    .setIssuer("jarvis")
    .setAudience("jarvis-dashboard")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}
export async function validSession(token?: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      issuer: "jarvis",
      audience: "jarvis-dashboard",
    });
    return payload.sub === "jarvis-owner" && payload.role === "owner";
  } catch {
    return false;
  }
}
