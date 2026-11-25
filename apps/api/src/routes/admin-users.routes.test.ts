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

const trustedOrigin = "http://localhost:5173";
const newAccountEmail = `admin-users-${randomUUID()}@example.test`;

let baseUrl: string;
let server: ReturnType<typeof app.listen> | undefined;

let adminId = "";
let adminCookie = "";
let staffCookie = "";
let passengerCookie = "";
let roleTargetId = "";
let roleTargetCookie = "";
let createdAccountId = "";

let creationPersonnelId = "";
let rolePersonnelId = "";

const createdUserIds: string[] = [];
const createdPersonnelIds: string[] = [];

async function createTestUser(
  role: "ADMIN" | "STAFF" | "PASSENGER",
): Promise<{ id: string; cookie: string }> {
  const user = await prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${randomUUID()}@example.test`,
      passwordHash: "integration-test-unused",
      role,
    },
  });

  createdUserIds.push(user.id);

  const session = await createSession(user.id);

  return {
    id: user.id,
    cookie: `${SESSION_COOKIE_NAME}=${session.token}`,
  };
}

async function createTestPersonnel(): Promise<string> {
  const id = `TST${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  await prisma.personnel.create({
    data: {
      id,
      name: "SkyOps Integration Test Personnel",
      role: "TEST ROLE",
    },
  });

  createdPersonnelIds.push(id);

  return id;
}

async function requestAdmin(
  path: string,
  options: {
    method?: string;
    cookie?: string;
    body?: unknown;
    origin?: string;
  } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  if (options.origin) {
    headers.Origin = options.origin;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });
}

before(async () => {
  const admin = await createTestUser("ADMIN");
  adminId = admin.id;
  adminCookie = admin.cookie;

  const staff = await createTestUser("STAFF");
  staffCookie = staff.cookie;

  const passenger = await createTestUser("PASSENGER");
  passengerCookie = passenger.cookie;

  const roleTarget = await createTestUser("PASSENGER");
  roleTargetId = roleTarget.id;
  roleTargetCookie = roleTarget.cookie;

  creationPersonnelId = await createTestPersonnel();
  rolePersonnelId = await createTestPersonnel();

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
      server!.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  // Remove only records created by this test.
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { in: createdUserIds } },
        { email: newAccountEmail },
      ],
    },
  });

  if (createdPersonnelIds.length > 0) {
    await prisma.personnel.deleteMany({
      where: {
        id: { in: createdPersonnelIds },
      },
    });
  }

  await prisma.$disconnect();
});

// --------------------------------------------------
// Access control
// --------------------------------------------------

test("Unauthenticated users cannot list admin users", async () => {
  const response = await requestAdmin("/admin/users");

  assert.equal(response.status, 401);
});

test("STAFF cannot list admin users", async () => {
  const response = await requestAdmin("/admin/users", {
    cookie: staffCookie,
  });

  assert.equal(response.status, 403);
});

test("PASSENGER cannot list admin users", async () => {
  const response = await requestAdmin("/admin/users", {
    cookie: passengerCookie,
  });

  assert.equal(response.status, 403);
});

test("ADMIN can list users without exposing password hashes", async () => {
  const response = await requestAdmin("/admin/users", {
    cookie: adminCookie,
  });

  assert.equal(response.status, 200);

  const result = (await response.json()) as {
    users: Record<string, unknown>[];
  };

  assert.ok(Array.isArray(result.users));
  assert.ok(result.users.length > 0);

  for (const user of result.users) {
    assert.equal("passwordHash" in user, false);
  }
});

test("ADMIN can list unlinked personnel options", async () => {
  const response = await requestAdmin(
    "/admin/users/personnel-options",
    {
      cookie: adminCookie,
    },
  );

  assert.equal(response.status, 200);

  const result = (await response.json()) as {
    personnel: { id: string }[];
  };

  assert.ok(
    result.personnel.some(
      (personnel) => personnel.id === creationPersonnelId,
    ),
  );
});

test("PASSENGER cannot access personnel options", async () => {
  const response = await requestAdmin(
    "/admin/users/personnel-options",
    {
      cookie: passengerCookie,
    },
  );

  assert.equal(response.status, 403);
});

// --------------------------------------------------
// Account creation
// --------------------------------------------------

test("ADMIN creation requests reject untrusted origins", async () => {
  const response = await requestAdmin("/admin/users", {
    method: "POST",
    cookie: adminCookie,
    body: {
      email: newAccountEmail,
      password: "TestPassword#2026!",
      personnelId: creationPersonnelId,
    },
  });

  assert.equal(response.status, 403);
});

test("STAFF cannot create user accounts", async () => {
  const response = await requestAdmin("/admin/users", {
    method: "POST",
    cookie: staffCookie,
    origin: trustedOrigin,
    body: {
      email: newAccountEmail,
      password: "TestPassword#2026!",
      personnelId: creationPersonnelId,
    },
  });

  assert.equal(response.status, 403);
});

test("ADMIN can create a STAFF account with a linked personnel record", async () => {
  const response = await requestAdmin("/admin/users", {
    method: "POST",
    cookie: adminCookie,
    origin: trustedOrigin,
    body: {
      email: newAccountEmail,
      password: "TestPassword#2026!",
      personnelId: creationPersonnelId,
    },
  });

  assert.equal(response.status, 201);

  const result = (await response.json()) as {
    user: {
      id: string;
      email: string;
      role: string;
      personnelId: string;
    };
  };

  createdAccountId = result.user.id;

  assert.equal(result.user.email, newAccountEmail);
  assert.equal(result.user.role, "STAFF");
  assert.equal(result.user.personnelId, creationPersonnelId);

  const storedUser = await prisma.user.findUnique({
    where: { id: createdAccountId },
    select: {
      passwordHash: true,
    },
  });

  assert.ok(storedUser);
  assert.ok(storedUser.passwordHash.startsWith("$argon2id$"));
  assert.notEqual(storedUser.passwordHash, "TestPassword#2026!");
});

test("A personnel record cannot be linked to a second account", async () => {
  const response = await requestAdmin("/admin/users", {
    method: "POST",
    cookie: adminCookie,
    origin: trustedOrigin,
    body: {
      email: `duplicate-${randomUUID()}@example.test`,
      password: "AnotherTestPassword#2026!",
      personnelId: creationPersonnelId,
    },
  });

  assert.equal(response.status, 409);
});

// --------------------------------------------------
// Role management
// --------------------------------------------------

test("ADMIN can promote a PASSENGER account to STAFF", async () => {
  const response = await requestAdmin(
    `/admin/users/${roleTargetId}/role`,
    {
      method: "PATCH",
      cookie: adminCookie,
      origin: trustedOrigin,
      body: {
        role: "STAFF",
        personnelId: rolePersonnelId,
      },
    },
  );

  assert.equal(response.status, 200);

  const result = (await response.json()) as {
    user: {
      role: string;
      personnelId: string;
    };
  };

  assert.equal(result.user.role, "STAFF");
  assert.equal(result.user.personnelId, rolePersonnelId);
});

test("Changing a user's role revokes their existing session", async () => {
  const response = await requestAdmin("/auth/me", {
    cookie: roleTargetCookie,
  });

  assert.equal(response.status, 401);
});

test("ADMIN cannot remove their own administrator role", async () => {
  const response = await requestAdmin(
    `/admin/users/${adminId}/role`,
    {
      method: "PATCH",
      cookie: adminCookie,
      origin: trustedOrigin,
      body: {
        role: "STAFF",
        personnelId: rolePersonnelId,
      },
    },
  );

  assert.equal(response.status, 403);
});

// --------------------------------------------------
// Account status management
// --------------------------------------------------

test("ADMIN can deactivate a user account and revoke its sessions", async () => {
  assert.ok(createdAccountId);

  const session = await createSession(createdAccountId);
  const targetCookie = `${SESSION_COOKIE_NAME}=${session.token}`;

  const response = await requestAdmin(
    `/admin/users/${createdAccountId}/status`,
    {
      method: "PATCH",
      cookie: adminCookie,
      origin: trustedOrigin,
      body: {
        isActive: false,
      },
    },
  );

  assert.equal(response.status, 200);

  const result = (await response.json()) as {
    user: {
      isActive: boolean;
    };
  };

  assert.equal(result.user.isActive, false);

  const meResponse = await requestAdmin("/auth/me", {
    cookie: targetCookie,
  });

  assert.equal(meResponse.status, 401);
});

test("ADMIN cannot deactivate their own account", async () => {
  const response = await requestAdmin(
    `/admin/users/${adminId}/status`,
    {
      method: "PATCH",
      cookie: adminCookie,
      origin: trustedOrigin,
      body: {
        isActive: false,
      },
    },
  );

  assert.equal(response.status, 403);
});

test("Invalid account status values are rejected", async () => {
  const response = await requestAdmin(
    `/admin/users/${roleTargetId}/status`,
    {
      method: "PATCH",
      cookie: adminCookie,
      origin: trustedOrigin,
      body: {
        isActive: "false",
      },
    },
  );

  assert.equal(response.status, 400);
});