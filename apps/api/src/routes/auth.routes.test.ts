
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/password.service.js";
import { SESSION_COOKIE_NAME } from "../services/session.service.js";

const origin = "http://localhost:5173";
const email = `auth-test-${randomUUID()}@example.test`;
const password = "SkyOps-Integration-Test-2026!";

let userId: string;
let baseUrl: string;
let cookiePair = "";
let server: ReturnType<typeof app.listen>;

before(async () => {
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "PASSENGER",
    },
  });

  userId = user.id;

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

  if (userId) {
    await prisma.user.deleteMany({
      where: { id: userId },
    });
  }

  await prisma.$disconnect();
});

test("GET /auth/me rejects unauthenticated requests", async () => {
  const response = await fetch(`${baseUrl}/auth/me`);

  assert.equal(response.status, 401);
});

test("POST /auth/login rejects untrusted origins", async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://untrusted.example",
    },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 403);
});

test("POST /auth/login rejects incorrect passwords", async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({
      email,
      password: "Wrong-Password-2026!",
    }),
  });

  assert.equal(response.status, 401);
});

test("POST /auth/login creates a secure session", async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    user: {
      id: string;
      email: string;
      role: string;
    };
    expiresAt: string;
  };

  assert.equal(payload.user.id, userId);
  assert.equal(payload.user.email, email);
  assert.equal(payload.user.role, "PASSENGER");

  const setCookie = response.headers.get("set-cookie");

  assert.ok(setCookie);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\//i);

  const expectedCookiePrefix = `${SESSION_COOKIE_NAME}=`;

  assert.ok(setCookie.startsWith(expectedCookiePrefix));

  cookiePair = setCookie.split(";")[0]!;

  const rawToken = cookiePair.slice(expectedCookiePrefix.length);

  const tokenHash = createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  assert.ok(session);
  assert.equal(session.userId, userId);
  assert.notEqual(session.tokenHash, rawToken);
});

test("GET /auth/me returns the authenticated user", async () => {
  assert.ok(cookiePair, "Login test must run first.");

  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: {
      Cookie: cookiePair,
    },
  });

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    user: {
      id: string;
      email: string;
      role: string;
    };
  };

  assert.equal(payload.user.id, userId);
  assert.equal(payload.user.email, email);
});

test("POST /auth/logout revokes the session", async () => {
  assert.ok(cookiePair, "Login test must run first.");

  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookiePair,
    },
  });

  assert.equal(response.status, 204);

  const expiredResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: {
      Cookie: cookiePair,
    },
  });

  assert.equal(expiredResponse.status, 401);
});
