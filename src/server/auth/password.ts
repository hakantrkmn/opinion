import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * better-auth's default password hashing (@noble/hashes scrypt) runs in
 * JavaScript on the event loop and blocks the whole server for ~1–3 s per
 * sign-in/sign-up. node:crypto's scrypt runs on the libuv thread pool.
 *
 * Parameters and the `salt:key` hex format are identical to better-auth's
 * (better-auth/dist/crypto/password.mjs), so existing hashes keep working.
 */
const PARAMS = { N: 16384, r: 16, p: 1 } as const;
const KEY_LEN = 64;
const OPTIONS: ScryptOptions = {
  ...PARAMS,
  maxmem: 128 * PARAMS.N * PARAMS.r * 2,
};

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const [salt, keyHex] = hash.split(":");
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_LEN) return false;
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
