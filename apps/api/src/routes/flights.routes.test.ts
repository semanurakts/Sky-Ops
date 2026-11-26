
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../services/session.service.js";

const trustedOrigin = "http://localhost:5173";

type TestRole = "ADMIN" | "STAFF" | "PASSENGER";

const createdUserIds: string[] = [];
const createdFlightIds: string[] = [];
const createdPersonnelIds: string[] = [];
const cookies: Partial<Record<TestRole, string>> = {};

let baseUrl = "";
let server: ReturnType<typeof app.listen>;

let countryId = "";
let cityId = "";
let airlineId = "";
let originAirportId = "";
let destinationAirportId = "";
let routeDurationId = "";
let pilotId = "";
let crewIds: string[] = [];
let airlineCode = "";
let departureDate = "";

function dateInDays(days: number): string {
  const date = new Date();

  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

async function createTestUser(role: TestRole): Promise<void> {
  const user = await prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${randomUUID()}@example.test`,
      passwordHash: "integration-test-unused",
      role,
    },
  });

  createdUserIds.push(user.id);

  const session = await createSession(user.id);

  cookies[role] = `${SESSION_COOKIE_NAME}=${session.token}`;
}

async function request(
  path: string,
  options: {
    role?: TestRole;
    method?: string;
    origin?: string;
    body?: unknown;
  } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (options.role) {
    const cookie = cookies[options.role];

    if (cookie) {
      headers.Cookie = cookie;
    }
  }

  if (options.origin) {
    headers.Origin = options.origin;
  }

  let body: string | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });
}

function makeFlightInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    airlineId,
    flightNumber: "0001",
    originAirportId,
    destinationAirportId,
    departureDate,
    departureTime: "12:00",
    gate: "A-01",
    pilotId,
    crewIds: [...crewIds],
    ...overrides,
  };
}

async function readError(response: Response): Promise<string | undefined> {
  const payload = await response.json() as {
    error?: { code?: string };
  };

  return payload.error?.code;
}

before(async () => {
  const tag = randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase();

  countryId = `T${tag}`;
  cityId = `city-${tag}`;
  airlineId = `air-${tag}`;
  originAirportId = `org-${tag}`;
  destinationAirportId = `dst-${tag}`;
  routeDurationId = `rd-${tag}`;
  airlineCode = `T${tag}`;

  const originCode = `O${tag}`;
  const destinationCode = `D${tag}`;

  await prisma.country.create({
    data: {
      id: countryId,
      name: `Test Country ${tag}`,
    },
  });

  await prisma.city.create({
    data: {
      id: cityId,
      name: `Test City ${tag}`,
      countryId,
    },
  });

  await prisma.airline.create({
    data: {
      id: airlineId,
      code: airlineCode,
      name: `Test Airline ${tag}`,
      countryId,
    },
  });

  await prisma.airport.createMany({
    data: [
      {
        id: originAirportId,
        code: originCode,
        name: `Test Origin ${tag}`,
        cityId,
      },
      {
        id: destinationAirportId,
        code: destinationCode,
        name: `Test Destination ${tag}`,
        cityId,
      },
    ],
  });

  await prisma.routeDuration.create({
    data: {
      id: routeDurationId,
      originAirportId,
      destinationAirportId,
      durationMinutes: 90,
    },
  });

  pilotId = `pilot-${tag}`;
  crewIds = [`crew1-${tag}`, `crew2-${tag}`];

  await prisma.personnel.createMany({
    data: [
      {
        id: pilotId,
        name: `Test Pilot ${tag}`,
        role: "Pilot",
        status: "AVAILABLE",
        currentLocation: originCode,
        currentAirportId: originAirportId,
      },
      {
        id: crewIds[0],
        name: `Test Crew One ${tag}`,
        role: "Kabin Memuru",
        status: "AVAILABLE",
        currentLocation: originCode,
        currentAirportId: originAirportId,
      },
      {
        id: crewIds[1],
        name: `Test Crew Two ${tag}`,
        role: "Kabin Memuru",
        status: "AVAILABLE",
        currentLocation: originCode,
        currentAirportId: originAirportId,
      },
    ],
  });

  createdPersonnelIds.push(pilotId, ...crewIds);

  await createTestUser("ADMIN");
  await createTestUser("STAFF");
  await createTestUser("PASSENGER");

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine test server address.");
  }

  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;

  departureDate = dateInDays(5);
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

  if (createdFlightIds.length > 0) {
    await prisma.flight.deleteMany({
      where: { id: { in: createdFlightIds } },
    });
  }

  if (createdPersonnelIds.length > 0) {
    await prisma.personnel.deleteMany({
      where: { id: { in: createdPersonnelIds } },
    });
  }

  if (routeDurationId) {
    await prisma.routeDuration.deleteMany({
      where: { id: routeDurationId },
    });
  }

  if (originAirportId && destinationAirportId) {
    await prisma.airport.deleteMany({
      where: {
        id: {
          in: [originAirportId, destinationAirportId],
        },
      },
    });
  }

  if (airlineId) {
    await prisma.airline.deleteMany({
      where: { id: airlineId },
    });
  }

  if (cityId) {
    await prisma.city.deleteMany({
      where: { id: cityId },
    });
  }

  if (countryId) {
    await prisma.country.deleteMany({
      where: { id: countryId },
    });
  }

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  }

  await prisma.$disconnect();
});

test("Unauthenticated users cannot list flights", async () => {
  const response = await request("/flights");

  assert.equal(response.status, 401);
});

test("PASSENGER cannot access flight management", async () => {
  const response = await request("/flights", {
    role: "PASSENGER",
  });

  assert.equal(response.status, 403);
});

test("STAFF can list flights", async () => {
  const response = await request("/flights", {
    role: "STAFF",
  });

  assert.equal(response.status, 200);
});

test("Flight options include the test airline and airports", async () => {
  const response = await request("/flights/options", {
    role: "STAFF",
  });

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    airlines: Array<{ id: string }>;
    airports: Array<{ id: string }>;
    pilots: Array<{ id: string }>;
    cabinCrew: Array<{ id: string }>;
  };

  assert.ok(payload.airlines.some((item) => item.id === airlineId));
  assert.ok(payload.airports.some((item) => item.id === originAirportId));
  assert.ok(payload.pilots.some((item) => item.id === pilotId));

  for (const crewId of crewIds) {
    assert.ok(payload.cabinCrew.some((item) => item.id === crewId));
  }
});

test("PASSENGER cannot create flights", async () => {
  const response = await request("/flights", {
    role: "PASSENGER",
    method: "POST",
    origin: trustedOrigin,
    body: makeFlightInput(),
  });

  assert.equal(response.status, 403);
});

test("Flight creation rejects requests without a trusted Origin", async () => {
  const response = await request("/flights", {
    role: "ADMIN",
    method: "POST",
    body: makeFlightInput(),
  });

  assert.equal(response.status, 403);
  assert.equal(await readError(response), "UNTRUSTED_ORIGIN");
});

test("Flight creation validates required fields", async () => {
  const response = await request("/flights", {
    role: "ADMIN",
    method: "POST",
    origin: trustedOrigin,
    body: {},
  });

  assert.equal(response.status, 400);
  assert.equal(await readError(response), "MISSING_FIELDS");
});

test("STAFF can create a valid flight", async () => {
  const response = await request("/flights", {
    role: "STAFF",
    method: "POST",
    origin: trustedOrigin,
    body: makeFlightInput(),
  });

  assert.equal(response.status, 201);

  const payload = await response.json() as {
    flight: {
      id: string;
      flightNo: string;
      status: string;
    };
  };

  createdFlightIds.push(payload.flight.id);

  assert.equal(payload.flight.flightNo, `${airlineCode}-0001`);
  assert.equal(payload.flight.status, "SCHEDULED");
});

test("Duplicate active flight numbers are rejected", async () => {
  const response = await request("/flights", {
    role: "ADMIN",
    method: "POST",
    origin: trustedOrigin,
    body: makeFlightInput({
      departureTime: "16:00",
      gate: "B-01",
    }),
  });

  assert.equal(response.status, 409);
  assert.equal(await readError(response), "DUPLICATE_FLIGHT_NUMBER");
});

test("Gate time conflicts are rejected", async () => {
  const response = await request("/flights", {
    role: "ADMIN",
    method: "POST",
    origin: trustedOrigin,
    body: makeFlightInput({
      flightNumber: "0002",
      departureTime: "12:30",
    }),
  });

  assert.equal(response.status, 409);
  assert.equal(await readError(response), "GATE_CONFLICT");
});

test("Personnel schedule conflicts are rejected", async () => {
  const response = await request("/flights", {
    role: "ADMIN",
    method: "POST",
    origin: trustedOrigin,
    body: makeFlightInput({
      flightNumber: "0003",
      departureTime: "13:00",
      gate: "B-02",
    }),
  });

  assert.equal(response.status, 409);
  assert.equal(await readError(response), "PERSONNEL_SCHEDULE_CONFLICT");
});

test("Flight details can be retrieved", async () => {
  assert.ok(createdFlightIds[0]);

  const response = await request(
    `/flights/${encodeURIComponent(createdFlightIds[0])}`,
    { role: "STAFF" },
  );

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    flightNo: string;
    crew: Array<{ id: string }>;
  };

  assert.equal(payload.flightNo, `${airlineCode}-0001`);
  assert.equal(payload.crew.length, 2);
});

test("STAFF can update a future scheduled flight", async () => {
  const response = await request(
    `/flights/${encodeURIComponent(createdFlightIds[0])}`,
    {
      role: "STAFF",
      method: "PUT",
      origin: trustedOrigin,
      body: makeFlightInput({
        departureTime: "18:00",
        gate: "C-01",
      }),
    },
  );

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    flight: { departureTime: string; gate: string | null };
  };

  assert.equal(payload.flight.departureTime, "18:00");
  assert.equal(payload.flight.gate, "C-01");
});

test("Invalid flight status transitions are rejected", async () => {
  const response = await request(
    `/flights/${encodeURIComponent(createdFlightIds[0])}/status`,
    {
      role: "ADMIN",
      method: "PATCH",
      origin: trustedOrigin,
      body: { status: "ARRIVED" },
    },
  );

  assert.equal(response.status, 409);
  assert.equal(await readError(response), "INVALID_STATUS_TRANSITION");
});

test("Valid flight status transitions are accepted", async () => {
  const flightId = createdFlightIds[0];

  for (const status of ["BOARDING", "DEPARTED", "ARRIVED"]) {
    const response = await request(
      `/flights/${encodeURIComponent(flightId)}/status`,
      {
        role: "ADMIN",
        method: "PATCH",
        origin: trustedOrigin,
        body: { status },
      },
    );

    assert.equal(response.status, 200);

    const payload = await response.json() as {
      flight: { status: string };
    };

    assert.equal(payload.flight.status, status);
  }
});

test("Arrived flights cannot be edited", async () => {
  const response = await request(
    `/flights/${encodeURIComponent(createdFlightIds[0])}`,
    {
      role: "ADMIN",
      method: "PUT",
      origin: trustedOrigin,
      body: makeFlightInput({
        departureTime: "19:00",
        gate: "C-02",
      }),
    },
  );

  assert.equal(response.status, 409);
  assert.equal(await readError(response), "FLIGHT_LOCKED");
});

test("Scheduled flights can be cancelled", async () => {
  const response = await request("/flights", {
    role: "ADMIN",
    method: "POST",
    origin: trustedOrigin,
    body: makeFlightInput({
      flightNumber: "0002",
      departureDate: dateInDays(6),
      gate: "A-02",
    }),
  });

  assert.equal(response.status, 201);

  const created = await response.json() as {
    flight: { id: string };
  };

  createdFlightIds.push(created.flight.id);

  const cancelResponse = await request(
    `/flights/${encodeURIComponent(created.flight.id)}/status`,
    {
      role: "ADMIN",
      method: "PATCH",
      origin: trustedOrigin,
      body: { status: "CANCELLED" },
    },
  );

  assert.equal(cancelResponse.status, 200);

  const cancelled = await cancelResponse.json() as {
    flight: { status: string };
  };

  assert.equal(cancelled.flight.status, "CANCELLED");
});

test("All operation includes active and completed flights", async () => {
  const response = await request("/flights", {
    role: "STAFF",
  });

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    flights: Array<{ id: string }>;
  };

  assert.ok(
    payload.flights.some(
      (flight) => flight.id === createdFlightIds[0],
    ),
  );

  assert.ok(
    payload.flights.some(
      (flight) => flight.id === createdFlightIds[1],
    ),
  );
});

test("Active operation excludes terminal flights", async () => {
  const response = await request("/flights?operation=active", {
    role: "STAFF",
  });

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    flights: Array<{ id: string }>;
  };

  assert.equal(
    payload.flights.some(
      (flight) => createdFlightIds.includes(flight.id),
    ),
    false,
  );
});

test("Completed operation returns terminal flights", async () => {
  const response = await request("/flights?operation=completed", {
    role: "STAFF",
  });

  assert.equal(response.status, 200);

  const payload = await response.json() as {
    flights: Array<{ id: string }>;
  };

  assert.ok(
    payload.flights.some(
      (flight) => flight.id === createdFlightIds[0],
    ),
  );

  assert.ok(
    payload.flights.some(
      (flight) => flight.id === createdFlightIds[1],
    ),
  );
});

test("Invalid operation filters are rejected", async () => {
  const response = await request("/flights?operation=unknown", {
    role: "STAFF",
  });

  assert.equal(response.status, 400);
  assert.equal(await readError(response), "INVALID_OPERATION");
});
