
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { requireRole } from "./require-role.middleware.js";
import type { AppRole } from "./require-role.middleware.js";

const app = express();

let baseUrl: string;
let server: ReturnType<typeof app.listen>;

const testRoles: AppRole[] = [
  "ADMIN",
  "STAFF",
  "PASSENGER",
];

// Test-only authentication context.
// This header simulation is never mounted in production.
app.use((req, _res, next) => {
  const role = req.get("x-test-role");

  if (role && testRoles.includes(role as AppRole)) {
    req.auth = {
      sessionId: "test-session",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: {
        id: "test-user",
        email: "test@example.test",
        role: role as AppRole,
        isActive: true,
        personnelId: null,
      },
    };
  }

  next();
});

app.get(
  "/admin",
  requireRole("ADMIN"),
  (_req, res) => {
    res.status(200).json({ success: true });
  },
);

app.get(
  "/staff",
  requireRole("ADMIN", "STAFF"),
  (_req, res) => {
    res.status(200).json({ success: true });
  },
);

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine test server address.");
  }

  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test("Unauthenticated users cannot access admin routes", async () => {
  const response = await fetch(`${baseUrl}/admin`);

  assert.equal(response.status, 401);
});

test("PASSENGER cannot access admin routes", async () => {
  const response = await fetch(`${baseUrl}/admin`, {
    headers: { "x-test-role": "PASSENGER" },
  });

  assert.equal(response.status, 403);
});

test("STAFF cannot access admin-only routes", async () => {
  const response = await fetch(`${baseUrl}/admin`, {
    headers: { "x-test-role": "STAFF" },
  });

  assert.equal(response.status, 403);
});

test("ADMIN can access admin routes", async () => {
  const response = await fetch(`${baseUrl}/admin`, {
    headers: { "x-test-role": "ADMIN" },
  });

  assert.equal(response.status, 200);
});

test("STAFF can access staff routes", async () => {
  const response = await fetch(`${baseUrl}/staff`, {
    headers: { "x-test-role": "STAFF" },
  });

  assert.equal(response.status, 200);
});

test("ADMIN can access staff routes", async () => {
  const response = await fetch(`${baseUrl}/staff`, {
    headers: { "x-test-role": "ADMIN" },
  });

  assert.equal(response.status, 200);
});

test("PASSENGER cannot access staff routes", async () => {
  const response = await fetch(`${baseUrl}/staff`, {
    headers: { "x-test-role": "PASSENGER" },
  });

  assert.equal(response.status, 403);
});
