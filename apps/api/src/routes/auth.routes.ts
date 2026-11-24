
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { prisma } from "../lib/prisma.js";

import {
  hashPassword,
  verifyPassword,
  passwordNeedsRehash,
} from "../services/password.service.js";

import {
  createSession,
  revokeSession,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../services/session.service.js";

import {
  requireSession,
  clearSessionCookie,
} from "../middleware/session.middleware.js";

import { requireTrustedOrigin } from "../middleware/origin.middleware.js";

const router = Router();

// A random dummy hash keeps unknown-account login attempts
// from skipping the expensive Argon2 verification step.
const dummyPasswordHashPromise = hashPassword(
  randomBytes(32).toString("hex"),
);

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts. Please try again later.",
    },
  },
});

// POST /auth/login
router.post(
  "/login",
  loginRateLimiter,
  requireTrustedOrigin,
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown> | null;

      const email =
        typeof body?.email === "string"
          ? body.email.trim().toLowerCase()
          : "";

      const password =
        typeof body?.password === "string"
          ? body.password
          : "";

      if (
        !email ||
        email.length > 254 ||
        !password ||
        password.length > 1024
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "A valid email and password are required.",
          },
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          role: true,
          isActive: true,
          personnelId: true,
        },
      });

      const storedHash =
        user?.passwordHash ?? (await dummyPasswordHashPromise);

      const passwordValid = await verifyPassword(
        password,
        storedHash,
      );

      if (!user || !user.isActive || !passwordValid) {
        return res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email or password is incorrect.",
          },
        });
      }

      // Upgrade older password hashes when necessary.
      if (passwordNeedsRehash(user.passwordHash)) {
        const newHash = await hashPassword(password);

        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
      }

      const session = await createSession(user.id);

      res.cookie(
        SESSION_COOKIE_NAME,
        session.token,
        SESSION_COOKIE_OPTIONS,
      );

      res.setHeader("Cache-Control", "no-store");

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          personnelId: user.personnelId,
        },
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /auth/me
router.get("/me", requireSession, (req, res) => {
  if (!req.auth) {
    return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      },
    });
  }

  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    user: req.auth.user,
    expiresAt: req.auth.expiresAt,
  });
});

// POST /auth/logout
router.post(
  "/logout",
  requireTrustedOrigin,
  requireSession,
  async (req, res, next) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME];

      if (typeof token === "string") {
        await revokeSession(token);
      }

      clearSessionCookie(res);

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
