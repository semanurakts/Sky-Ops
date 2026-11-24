
import type { RequestHandler, Response } from "express";

import {
  findActiveSession,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../services/session.service.js";

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
    secure: SESSION_COOKIE_OPTIONS.secure,
    sameSite: SESSION_COOKIE_OPTIONS.sameSite,
    path: SESSION_COOKIE_OPTIONS.path,
  });
}

export const requireSession: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];

    if (typeof token !== "string" || token.length === 0) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

    const session = await findActiveSession(token);

    if (!session) {
      clearSessionCookie(res);

      return res.status(401).json({
        error: {
          code: "INVALID_SESSION",
          message: "Your session is invalid or has expired.",
        },
      });
    }

    req.auth = {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      user: session.user,
    };

    next();
  } catch (error) {
    next(error);
  }
};
