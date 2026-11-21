import express, { type ErrorRequestHandler } from "express";
import healthRouter from "./routes/health.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

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