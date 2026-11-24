
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-skyops_session"
    : "skyops_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS,
};

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  if (!userId) {
    throw new Error("A valid user ID is required.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  // Return the raw token only once, so it can be
  // placed in the user's HttpOnly cookie.
  return {
    token,
    expiresAt,
  };
}

export async function findActiveSession(token: string) {
  if (typeof token !== "string" || token.length > 256) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          personnelId: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const now = new Date();

  if (
    session.revokedAt !== null ||
    session.expiresAt <= now ||
    !session.user.isActive
  ) {
    return null;
  }

  // Update activity at most once every five minutes.
  if (now.getTime() - session.lastSeenAt.getTime() >= 5 * 60 * 1000) {
    await prisma.session.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        lastSeenAt: now,
      },
    });
  }

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    user: session.user,
  };
}

export async function revokeSession(token: string): Promise<void> {
  if (typeof token !== "string" || token.length > 256) {
    return;
  }

  const tokenHash = hashSessionToken(token);

  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
