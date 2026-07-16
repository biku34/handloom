import crypto from "crypto";

export function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function hmacSha256(key: string, data: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

export function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** 96-bit base58 public passport id (SRS §6.3) */
export function generatePassportId(): string {
  const buf = crypto.randomBytes(12);
  let n = BigInt("0x" + buf.toString("hex"));
  let out = "";
  while (n > 0n) {
    out = BASE58[Number(n % 58n)] + out;
    n /= 58n;
  }
  return out.padStart(16, "1").slice(0, 16);
}

/** 8-char human-friendly claim secret (no ambiguous chars) */
export function generateTagSecret(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return s;
}

export function hashTagSecret(secret: string): string {
  const key = process.env.TAG_HMAC_KEY || "dev-key";
  return hmacSha256(key, secret.toUpperCase());
}

/** Deterministic hash of any JSON payload (sorted keys).
 *  Normalizes through JSON first so Mongoose documents/subdocuments (which
 *  carry internal circular references) collapse to plain data before hashing. */
export function canonicalHash(payload: unknown): string {
  const plain = payload === undefined ? null : JSON.parse(JSON.stringify(payload));
  return sha256(canonicalJson(plain));
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}
