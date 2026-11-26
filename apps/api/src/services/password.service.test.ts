
import test from "node:test";
import assert from "node:assert/strict";

import {
  hashPassword,
  verifyPassword,
  passwordNeedsRehash,
} from "./password.service.js";

test("password is stored as an Argon2id hash", async () => {
  const password = "SkyOps-Test-Password-2026!";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.match(hash, /^\$argon2id\$/);
});

test("correct password is verified", async () => {
  const password = "SkyOps-Test-Password-2026!";
  const hash = await hashPassword(password);

  assert.equal(await verifyPassword(password, hash), true);
});

test("incorrect password is rejected", async () => {
  const hash = await hashPassword("Correct-Password-2026!");

  assert.equal(
    await verifyPassword("Incorrect-Password-2026!", hash),
    false,
  );
});

test("empty password is rejected", async () => {
  await assert.rejects(() => hashPassword(""));
});

test("current Argon2id hash does not require rehashing", async () => {
  const hash = await hashPassword("SkyOps-Test-Password-2026!");

  assert.equal(passwordNeedsRehash(hash), false);
});
