import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64, SCRYPT_OPTIONS)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = (await scryptAsync(password, salt, expected.length, SCRYPT_OPTIONS)) as Buffer;
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
