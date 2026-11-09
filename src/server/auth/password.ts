import crypto from "node:crypto";

const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: crypto.ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export type PasswordHashParts = {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
};

export function parsePasswordHash(value: string): PasswordHashParts {
  const parts = value.trim().split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    throw new Error("Invalid scrypt password hash format.");
  }
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N < 16_384 ||
    N > 131_072 ||
    r < 1 ||
    r > 32 ||
    p < 1 ||
    p > 16
  ) {
    throw new Error("Invalid scrypt parameters.");
  }
  const salt = Buffer.from(parts[4], "base64url");
  const key = Buffer.from(parts[5], "base64url");
  if (salt.length < 16 || key.length < 32) {
    throw new Error("Invalid scrypt salt or key length.");
  }
  return { N, r, p, salt, key };
}

export function isValidPasswordHash(value: string | undefined): boolean {
  if (!value) return false;
  try {
    parsePasswordHash(value);
    return true;
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) {
    throw new Error("Password must contain between 12 and 1024 characters.");
  }
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  });
  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  try {
    const parsed = parsePasswordHash(encodedHash);
    const candidate = await deriveKey(password, parsed.salt, parsed.key.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: MAX_MEMORY,
    });
    return (
      candidate.length === parsed.key.length &&
      crypto.timingSafeEqual(candidate, parsed.key)
    );
  } catch {
    return false;
  }
}
