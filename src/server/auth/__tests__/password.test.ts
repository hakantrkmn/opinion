import { describe, expect, it } from "vitest";
import {
  hashPassword as betterAuthHash,
  verifyPassword as betterAuthVerify,
} from "better-auth/crypto";
import { hashPassword, verifyPassword } from "../password";

describe("native scrypt password hashing", () => {
  it("verifies hashes produced by better-auth's default hasher", async () => {
    const hash = await betterAuthHash("password1234");
    await expect(verifyPassword({ hash, password: "password1234" })).resolves.toBe(true);
    await expect(verifyPassword({ hash, password: "wrong-pass" })).resolves.toBe(false);
  });

  it("produces hashes better-auth's default verifier accepts", async () => {
    const hash = await hashPassword("pässwörd-ﬁ");
    expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    await expect(betterAuthVerify({ hash, password: "pässwörd-ﬁ" })).resolves.toBe(true);
  });

  it("rejects malformed hashes without throwing", async () => {
    await expect(verifyPassword({ hash: "nope", password: "x" })).resolves.toBe(false);
    await expect(verifyPassword({ hash: "ab:cd", password: "x" })).resolves.toBe(false);
  });

  it("does not block the event loop while hashing", async () => {
    let ticks = 0;
    const timer = setInterval(() => ticks++, 5);
    await Promise.all([hashPassword("a-password"), hashPassword("b-password")]);
    clearInterval(timer);
    expect(ticks).toBeGreaterThan(0);
  });
});
