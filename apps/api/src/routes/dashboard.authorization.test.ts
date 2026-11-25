
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../services/session.service.js";

let baseUrl: string;
let server: ReturnType<typeof app.listen>;

const createdUserIds: string[] = [];
const cookies: Record<string, string> = {};

async function createTestUser(
  role: "ADMIN" | "STAFF" | "PASSENGER",
): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${randomUUID()}@example.test`,
      passwordHash: "integration-test-unused",
      role,
    },
  });

  createdUserIds.push(user.id);

  const session = await createSession(user.id);

  return `${SESSION_COOKIE_NAME}=${session.token}`;
}

before(async () => {
  cookies.ADMIN = await createTestUser("ADMIN");
  cookies.STAFF = await createTestUser("STAFF");
  cookies.PASSENGER = await createTestUser("PASSENGER");

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

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: { in: createdUserIds },
      },
    });
  }

  await prisma.$disconnect();
});

async function requestDashboard(
  path: string,
  cookie?: string,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
}

test("Unauthenticated users cannot access dashboard overview", async () => {
  const response = await requestDashboard("/dashboard/overview");
  assert.equal(response.status, 401);
});

test("PASSENGER cannot access dashboard overview", async () => {
  const response = await requestDashboard(
    "/dashboard/overview",
    cookies.PASSENGER,
  );
  assert.equal(response.status, 403);
});

test("STAFF can access dashboard overview", async () => {
  const response = await requestDashboard(
    "/dashboard/overview",
    cookies.STAFF,
  );
  assert.equal(response.status, 200);
});

test("ADMIN can access dashboard overview", async () => {
  const response = await requestDashboard(
    "/dashboard/overview",
    cookies.ADMIN,
  );
  assert.equal(response.status, 200);
});

test("Unauthenticated users cannot access flight list", async () => {
  const response = await requestDashboard("/dashboard/flights");
  assert.equal(response.status, 401);
});

test("PASSENGER cannot access flight list", async () => {
  const response = await requestDashboard(
    "/dashboard/flights",
    cookies.PASSENGER,
  );
  assert.equal(response.status, 403);
});

test("STAFF can access flight list", async () => {
  const response = await requestDashboard(
    "/dashboard/flights",
    cookies.STAFF,
  );
  assert.equal(response.status, 200);
});

test("ADMIN can access flight list", async () => {
  const response = await requestDashboard(
    "/dashboard/flights",
    cookies.ADMIN,
  );
  assert.equal(response.status, 200);
});
