
import type { RequestHandler } from "express";

const DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
];

function getTrustedOrigins(): Set<string> {
  const configured = process.env.TRUSTED_ORIGINS;

  if (configured !== undefined) {
    return new Set(
      configured
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
  }

  if (process.env.NODE_ENV === "production") {
    return new Set();
  }

  return new Set(DEVELOPMENT_ORIGINS);
}

export const requireTrustedOrigin: RequestHandler = (
  req,
  res,
  next,
) => {
  const origin = req.get("Origin");

  if (!origin || !getTrustedOrigins().has(origin)) {
    return res.status(403).json({
      error: {
        code: "UNTRUSTED_ORIGIN",
        message: "Request origin is not allowed.",
      },
    });
  }

  next();
};
