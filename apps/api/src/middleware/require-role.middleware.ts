
import type { RequestHandler } from "express";

export type AppRole = "ADMIN" | "STAFF" | "PASSENGER";

export function requireRole(
  ...allowedRoles: AppRole[]
): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

    if (!allowedRoles.includes(req.auth.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource.",
        },
      });
    }

    next();
  };
}
