"use node";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Session } from "./adapters/yeelight";
function key() {
  const key = Buffer.from(process.env.XIAOMI_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("Xiaomi encryption is not configured.");
  return key;
}
export function seal(session: Session, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(session)), cipher.final()]);
  return [iv, cipher.getAuthTag(), bytes].map((b) => b.toString("base64")).join(".");
}
export function unseal(value: string, context: string): Session {
  const [iv, tag, bytes] = value.split(".").map((v) => Buffer.from(v, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(bytes), cipher.final()]).toString());
}
export function verifyPassword(password: string) {
  if (password.length > 256) return false;
  const [salt, hash] = (process.env.JARVIS_PASSWORD_HASH ?? "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex"),
    actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
