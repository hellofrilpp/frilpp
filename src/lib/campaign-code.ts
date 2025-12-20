import crypto from "node:crypto";

export function generateCampaignCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 6;
  const bytes = crypto.randomBytes(length);
  let out = "FRILP-";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
