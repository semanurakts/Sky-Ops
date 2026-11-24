
import argon2 from "argon2";

/**
 * Hashes a password using Argon2id.
 * The library's secure default parameters are used.
 * Plain-text passwords are never stored in the database.
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("A valid password is required.");
  }

  return argon2.hash(password);
}

/**
 * Verifies a password against its stored Argon2 hash.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    password.length === 0 ||
    typeof passwordHash !== "string" ||
    passwordHash.length === 0
  ) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Checks whether an existing hash needs to be upgraded
 * to the library's current default Argon2 parameters.
 */
export function passwordNeedsRehash(passwordHash: string): boolean {
  if (typeof passwordHash !== "string" || passwordHash.length === 0) {
    return true;
  }

  try {
    return argon2.needsRehash(passwordHash);
  } catch {
    return true;
  }
}
