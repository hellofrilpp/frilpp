import crypto from "node:crypto";

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");

  const key = raw.includes("=") || raw.includes("/") || raw.includes("+")
    ? Buffer.from(raw, "base64")
    : Buffer.from(raw, "utf8");

  if (key.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be at least 32 bytes (or base64-encoded)");
  }
  return key.subarray(0, 32);
}

export function encryptSecret(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string) {
  const [version, ivB64, tagB64, ctB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !ctB64) {
    throw new Error("Invalid secret payload");
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

