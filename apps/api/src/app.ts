
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";

import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import openApiDocument from "./docs/openapi.js";

import healthRouter from "./routes/health.routes.js";
import authRouter from "./routes/auth.routes.js";
import adminUsersRouter from "./routes/admin-users.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import dashboardFlightsRouter from "./routes/dashboard-flights.routes.js";
import flightsRouter from "./routes/flights.routes.js";

import { requireSession } from "./middleware/session.middleware.js";
import { requireRole } from "./middleware/require-role.middleware.js";

const app = express();

app.disable("x-powered-by");

// HTTP security headers.
app.use(helmet());

// Parse cookies before authentication middleware.
app.use(cookieParser());

// Limit JSON request body size.
app.use(express.json({ limit: "1mb" }));

// In production, only authenticated Admin users can access API docs.
// In development, docs are available without authentication.
const docsAccess: RequestHandler[] =
  process.env.NODE_ENV === "production"
    ? [requireSession, requireRole("ADMIN")]
    : [];

// Swagger UI requires inline initialization scripts and styles.
// This relaxed CSP applies only to the documentation routes.
const swaggerUiCsp: RequestHandler = (_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );

  next();
};

// OpenAPI JSON document.
app.get("/api-docs.json", ...docsAccess, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(openApiDocument);
});

// Interactive Swagger UI.
app.use(
  "/api-docs",
  ...docsAccess,
  swaggerUiCsp,
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument),
);

// Public endpoints
app.use("/health", healthRouter);
app.use("/auth", authRouter);

// Admin user management: authenticated Admin users only.
app.use(
  "/admin/users",
  requireSession,
  requireRole("ADMIN"),
  adminUsersRouter,
);

// Flight management: authenticated Staff and Admin only.
app.use(
  "/flights",
  requireSession,
  requireRole("ADMIN", "STAFF"),
  flightsRouter,
);

// Dashboard: authenticated Staff and Admin only
app.use(
  "/dashboard/flights",
  requireSession,
  requireRole("ADMIN", "STAFF"),
  dashboardFlightsRouter,
);

app.use(
  "/dashboard",
  requireSession,
  requireRole("ADMIN", "STAFF"),
  dashboardRouter,
);

// Not found handler.
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// Global error handler.
const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  console.error(error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};

app.use(errorHandler);

export default app;