import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

// AES-256-GCM encryption for API keys stored at rest.
//
// The 32-byte secret comes from the KEY_VAULT_SECRET env var (hex or base64 or
// raw string, hashed to 32 bytes). In development, if the env var is unset, a
// random secret is generated once and stored in a gitignored `.key-vault-secret`
// file so the vault works with zero configuration. Set KEY_VAULT_SECRET in
// production.

const SECRET_FILE = path.join(process.cwd(), ".key-vault-secret");

let cachedKey: Buffer | null = null;

function loadSecret(): Buffer {
  if (cachedKey) return cachedKey;

  let raw = process.env.KEY_VAULT_SECRET;
  if (!raw) {
    if (existsSync(SECRET_FILE)) {
      raw = readFileSync(SECRET_FILE, "utf8").trim();
    } else {
      raw = randomBytes(32).toString("hex");
      writeFileSync(SECRET_FILE, raw, { mode: 0o600 });
    }
  }

  // Normalize any input to exactly 32 bytes.
  cachedKey = createHash("sha256").update(raw).digest();
  return cachedKey;
}

// Encrypts plaintext -> base64("v1" is implied): iv(12) | authTag(16) | ciphertext
export function encryptSecret(plaintext: string): string {
  const key = loadSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(packed: string): string {
  const key = loadSecret();
  const buf = Buffer.from(packed, "base64");
  if (buf.length < 12 + 16 + 1) throw new Error("Invalid ciphertext blob.");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
