
import { randomBytes } from "node:crypto";
import { Router, type NextFunction, type Response } from "express";
import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { requireTrustedOrigin } from "../middleware/origin.middleware.js";

const router = Router();

const TERMINAL_STATUSES = ["ARRIVED", "CANCELLED"];
const EDITABLE_STATUSES = ["SCHEDULED", "DELAYED"];
const VALID_STATUSES = [
  "SCHEDULED",
  "BOARDING",
  "DEPARTED",
  "ARRIVED",
  "DELAYED",
  "CANCELLED",
];

const MAX_PAGE_SIZE = 50;
const CREW_MIN = 2;
const CREW_MAX = 8;
const TURNAROUND_MINUTES = 60;
const GATE_BUFFER_MINUTES = 45;

class FlightApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FlightApiError";
  }
}

interface FlightInput {
  airlineId: string;
  flightNumber: string;
  originAirportId: string;
  destinationAirportId: string;
  departureDate: Date;
  departureTime: string;
  gate: string;
  pilotId: string;
  crewIds: string[];
}

function getSingleRouteParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) && value.length === 1
    ? value[0]
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  body: Record<string, unknown>,
  field: string,
): string {
  return typeof body[field] === "string" ? body[field].trim() : "";
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function departureTimestamp(date: Date, time: string): number {
  const dateOnly = date.toISOString().slice(0, 10);
  return new Date(`${dateOnly}T${time}:00.000Z`).getTime();
}

function isEditable(flight: {
  status: string;
  departureDate: Date;
  departureTime: string;
}): boolean {
  return (
    EDITABLE_STATUSES.includes(flight.status) &&
    departureTimestamp(flight.departureDate, flight.departureTime) > Date.now()
  );
}

function parseFlightInput(value: unknown): FlightInput {
  if (!isRecord(value)) {
    throw new FlightApiError(400, "INVALID_BODY", "A valid JSON object is required.");
  }

  const airlineId = readString(value, "airlineId");
  const flightNumber = readString(value, "flightNumber");
  const originAirportId = readString(value, "originAirportId");
  const destinationAirportId = readString(value, "destinationAirportId");
  const departureDateValue = readString(value, "departureDate");
  const departureTime = readString(value, "departureTime");
  const gate = readString(value, "gate").toUpperCase();
  const pilotId = readString(value, "pilotId");
  const crewIdsValue = value.crewIds;

  if (
    !airlineId ||
    !originAirportId ||
    !destinationAirportId ||
    !pilotId ||
    !gate ||
    !flightNumber ||
    !departureDateValue ||
    !departureTime
  ) {
    throw new FlightApiError(
      400,
      "MISSING_FIELDS",
      "All required flight fields must be provided.",
    );
  }

  if (
    airlineId.length > 20 ||
    originAirportId.length > 20 ||
    destinationAirportId.length > 20 ||
    pilotId.length > 20 ||
    gate.length > 20
  ) {
    throw new FlightApiError(400, "INVALID_FIELDS", "One or more fields are too long.");
  }

  if (!/^\d{1,4}$/.test(flightNumber)) {
    throw new FlightApiError(
      400,
      "INVALID_FLIGHT_NUMBER",
      "Flight number must contain between 1 and 4 digits.",
    );
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) {
    throw new FlightApiError(
      400,
      "INVALID_DEPARTURE_TIME",
      "Departure time must use HH:MM format.",
    );
  }

  const departureDate = parseDateOnly(departureDateValue);

  if (!departureDate) {
    throw new FlightApiError(
      400,
      "INVALID_DEPARTURE_DATE",
      "Departure date must be a valid YYYY-MM-DD date.",
    );
  }

  if (departureTimestamp(departureDate, departureTime) <= Date.now()) {
    throw new FlightApiError(
      400,
      "DEPARTURE_IN_PAST",
      "A new or edited flight must have a future departure time.",
    );
  }

  if (originAirportId === destinationAirportId) {
    throw new FlightApiError(
      400,
      "INVALID_ROUTE",
      "Origin and destination airports must be different.",
    );
  }

  if (!Array.isArray(crewIdsValue) || !crewIdsValue.every(
    (id) => typeof id === "string" && id.trim().length > 0 && id.length <= 20,
  )) {
    throw new FlightApiError(
      400,
      "INVALID_CREW",
      "Crew IDs must be an array of valid personnel IDs.",
    );
  }

  const crewIds = crewIdsValue.map((id) => id.trim());

  if (crewIds.length < CREW_MIN || crewIds.length > CREW_MAX) {
    throw new FlightApiError(
      400,
      "INVALID_CREW_COUNT",
      `A flight must have between ${CREW_MIN} and ${CREW_MAX} cabin crew members.`,
    );
  }

  if (new Set(crewIds).size !== crewIds.length || crewIds.includes(pilotId)) {
    throw new FlightApiError(
      400,
      "DUPLICATE_PERSONNEL",
      "Personnel assignments must be unique and the pilot cannot be cabin crew.",
    );
  }

  return {
    airlineId,
    flightNumber,
    originAirportId,
    destinationAirportId,
    departureDate,
    departureTime,
    gate,
    pilotId,
    crewIds,
  };
}

function serializeFlight(flight: {
  id: string;
  flightNo: string;
  route: string;
  departureDate: Date;
  departureTime: string;
  gate: string | null;
  status: string;
}) {
  return {
    ...flight,
    departureDate: flight.departureDate.toISOString().slice(0, 10),
  };
}

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof FlightApiError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  if (isPrismaCode(error, "P2034")) {
    res.status(409).json({
      error: {
        code: "CONCURRENT_FLIGHT_MODIFICATION",
        message: "Another flight operation conflicted with this request. Please retry.",
      },
    });
    return;
  }

  if (isPrismaCode(error, "P2003")) {
    res.status(422).json({
      error: {
        code: "INVALID_REFERENCE",
        message: "A referenced airline, airport or personnel record does not exist.",
      },
    });
    return;
  }

  next(error);
}

async function saveFlight(
  input: FlightInput,
  flightId?: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const currentFlight = flightId
        ? await tx.flight.findUnique({ where: { id: flightId } })
        : null;

      if (flightId && !currentFlight) {
        throw new FlightApiError(404, "FLIGHT_NOT_FOUND", "Flight not found.");
      }

      if (currentFlight && !isEditable(currentFlight)) {
        throw new FlightApiError(
          409,
          "FLIGHT_LOCKED",
          "This flight can no longer be edited.",
        );
      }

      const airline = await tx.airline.findUnique({
  where: { id: input.airlineId },
});

const origin = await tx.airport.findUnique({
  where: { id: input.originAirportId },
});

const destination = await tx.airport.findUnique({
  where: { id: input.destinationAirportId },
});

const personnel = await tx.personnel.findMany({
  where: {
    id: {
      in: [input.pilotId, ...input.crewIds],
    },
  },
});

      if (!airline || !origin || !destination) {
        throw new FlightApiError(
          422,
          "INVALID_REFERENCE",
          "The selected airline or airport does not exist.",
        );
      }

      if (origin.id === destination.id) {
        throw new FlightApiError(400, "INVALID_ROUTE", "Invalid flight route.");
      }

      const pilot = personnel.find((person) => person.id === input.pilotId);
      const crew = input.crewIds.map((id) =>
        personnel.find((person) => person.id === id),
      );

      if (!pilot || pilot.role !== "Pilot" || crew.some(
        (person) => !person || person.role !== "Kabin Memuru",
      )) {
        throw new FlightApiError(
          422,
          "INVALID_PERSONNEL_ROLE",
          "The selected pilot and cabin crew must have the correct personnel roles.",
        );
      }

      for (const person of [pilot, ...crew]) {
        if (
          person &&
          (
            (person.currentAirportId && person.currentAirportId !== origin.id) ||
            (person.currentLocation && person.currentLocation !== origin.code)
          )
        ) {
          throw new FlightApiError(
            409,
            "PERSONNEL_LOCATION_CONFLICT",
            `${person.name} is not currently assigned to the origin airport.`,
          );
        }
      }

      const routeDuration = await tx.routeDuration.findUnique({
        where: {
          originAirportId_destinationAirportId: {
            originAirportId: origin.id,
            destinationAirportId: destination.id,
          },
        },
      });

      if (!routeDuration) {
        throw new FlightApiError(
          422,
          "ROUTE_NOT_CONFIGURED",
          "No route duration is configured for the selected airport pair.",
        );
      }

      const flightNo = `${airline.code}-${input.flightNumber.padStart(4, "0")}`;
      const excludedId = flightId ? { id: { not: flightId } } : {};

      const duplicateFlight = await tx.flight.findFirst({
        where: {
          flightNo: {
            equals: flightNo,
            mode: "insensitive",
          },
          status: { notIn: TERMINAL_STATUSES },
          ...excludedId,
        },
      });

      if (duplicateFlight) {
        throw new FlightApiError(
          409,
          "DUPLICATE_FLIGHT_NUMBER",
          "An active flight with this flight number already exists.",
        );
      }

      const gateFlights = await tx.flight.findMany({
        where: {
          departureDate: input.departureDate,
          originAirportId: origin.id,
          gate: {
            equals: input.gate,
            mode: "insensitive",
          },
          status: { notIn: TERMINAL_STATUSES },
          ...excludedId,
        },
        select: {
          id: true,
          departureTime: true,
        },
      });

      const candidateStart = departureTimestamp(
        input.departureDate,
        input.departureTime,
      );

      for (const existing of gateFlights) {
        const existingStart = departureTimestamp(
          input.departureDate,
          existing.departureTime,
        );

        const difference = Math.abs(candidateStart - existingStart) / 60000;

        if (difference < GATE_BUFFER_MINUTES) {
          throw new FlightApiError(
            409,
            "GATE_CONFLICT",
            "The selected gate is already assigned to a nearby departure.",
          );
        }
      }

      const assignedIds = [input.pilotId, ...input.crewIds];

      const personnelFlights = await tx.flight.findMany({
        where: {
          departureDate: input.departureDate,
          status: { notIn: TERMINAL_STATUSES },
          ...excludedId,
          OR: [
            { pilotId: { in: assignedIds } },
            {
              crewAssignments: {
                some: {
                  personnelId: { in: assignedIds },
                },
              },
            },
          ],
        },
        select: {
          departureTime: true,
          originAirportId: true,
          destinationAirportId: true,
        },
      });

      const durations = await tx.routeDuration.findMany({
        select: {
          originAirportId: true,
          destinationAirportId: true,
          durationMinutes: true,
        },
      });

      const durationMap = new Map(
        durations.map((item) => [
          `${item.originAirportId}|${item.destinationAirportId}`,
          item.durationMinutes,
        ]),
      );

      const candidateEnd =
        candidateStart +
        (routeDuration.durationMinutes + TURNAROUND_MINUTES) * 60000;

      for (const existing of personnelFlights) {
        const existingStart = departureTimestamp(
          input.departureDate,
          existing.departureTime,
        );

        const existingDuration =
          durationMap.get(
            `${existing.originAirportId}|${existing.destinationAirportId}`,
          ) ?? 120;

        const existingEnd =
          existingStart +
          (existingDuration + TURNAROUND_MINUTES) * 60000;

        if (candidateStart < existingEnd && existingStart < candidateEnd) {
          throw new FlightApiError(
            409,
            "PERSONNEL_SCHEDULE_CONFLICT",
            "One or more selected personnel members are assigned to another flight during this period.",
          );
        }
      }

      const data = {
        flightNo,
        route: `${origin.code} > ${destination.code}`,
        departureDate: input.departureDate,
        departureTime: input.departureTime,
        gate: input.gate,
        airlineId: airline.id,
        originAirportId: origin.id,
        destinationAirportId: destination.id,
        pilotId: pilot.id,
      };

      let savedFlight;

      if (currentFlight) {
        await tx.flightCrewAssignment.deleteMany({
          where: { flightId: currentFlight.id },
        });

        savedFlight = await tx.flight.update({
          where: { id: currentFlight.id },
          data,
        });
      } else {
        savedFlight = await tx.flight.create({
          data: {
            id: randomBytes(10).toString("hex"),
            ...data,
            status: "SCHEDULED",
          },
        });
      }

      await tx.flightCrewAssignment.createMany({
        data: input.crewIds.map((personnelId) => ({
          flightId: savedFlight.id,
          personnelId,
        })),
      });

      return savedFlight;
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

// GET /flights
router.get("/", async (req, res, next) => {
  try {
    const pageValue = typeof req.query.page === "string" ? req.query.page : "1";
    const pageSizeValue =
      typeof req.query.pageSize === "string" ? req.query.pageSize : "10";

    const page = Number(pageValue);
    const pageSize = Number(pageSizeValue);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_PAGE_SIZE
    ) {
      res.status(400).json({
        error: {
          code: "INVALID_PAGINATION",
          message: "Page must be positive and pageSize must be between 1 and 50.",
        },
      });
      return;
    }

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : "";

    const operation =
  typeof req.query.operation === "string"
    ? req.query.operation
    : "all";

if (!["all", "active", "completed"].includes(operation)) {
  res.status(400).json({
    error: {
      code: "INVALID_OPERATION",
      message: "Operation must be all, active or completed.",
    },
  });
  return;
}

    if (status && !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        error: {
          code: "INVALID_STATUS",
          message: "The requested flight status is not supported.",
        },
      });
      return;
    }

    const filters: Prisma.FlightWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          { flightNo: { contains: search, mode: "insensitive" } },
          { route: { contains: search, mode: "insensitive" } },
          {
            airline: {
              is: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        ],
      });
    }

    if (status) {
      filters.push({ status });
    }

    const dateFrom =
      typeof req.query.dateFrom === "string"
        ? parseDateOnly(req.query.dateFrom)
        : null;

    const dateTo =
      typeof req.query.dateTo === "string"
        ? parseDateOnly(req.query.dateTo)
        : null;

    if (req.query.dateFrom && !dateFrom) {
      res.status(400).json({
        error: {
          code: "INVALID_DATE_FROM",
          message: "dateFrom must use YYYY-MM-DD format.",
        },
      });
      return;
    }

    if (req.query.dateTo && !dateTo) {
      res.status(400).json({
        error: {
          code: "INVALID_DATE_TO",
          message: "dateTo must use YYYY-MM-DD format.",
        },
      });
      return;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      res.status(400).json({
        error: {
          code: "INVALID_DATE_RANGE",
          message: "dateFrom must not be later than dateTo.",
        },
      });
      return;
    }

    if (dateFrom || dateTo) {
      filters.push({
        departureDate: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      });
    }

    if (operation === "active") {
  filters.push({
    status: { notIn: TERMINAL_STATUSES },
  });
} else if (operation === "completed") {
  filters.push({
    status: { in: TERMINAL_STATUSES },
  });
}

    const where: Prisma.FlightWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const skip = (page - 1) * pageSize;

    const [total, flights] = await Promise.all([
      prisma.flight.count({ where }),
      prisma.flight.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { departureDate: "asc" },
          { departureTime: "asc" },
        ],
        include: {
          airline: { select: { name: true, code: true } },
          originAirport: { select: { code: true, name: true } },
          destinationAirport: { select: { code: true, name: true } },
          pilot: { select: { id: true, name: true } },
          _count: { select: { crewAssignments: true } },
        },
      }),
    ]);

    res.status(200).json({
      flights: flights.map((flight) => ({
        ...serializeFlight(flight),
        airlineName: flight.airline?.name ?? null,
        airlineCode: flight.airline?.code ?? null,
        originAirport: flight.originAirport,
        destinationAirport: flight.destinationAirport,
        pilot: flight.pilot,
        crewCount: flight._count.crewAssignments,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

// GET /flights/options
router.get("/options", async (_req, res, next) => {
  try {
    const [airlines, airports, pilots, cabinCrew, routeDurations] =
      await Promise.all([
        prisma.airline.findMany({
          orderBy: { name: "asc" },
          select: { id: true, code: true, name: true },
        }),

        prisma.airport.findMany({
          orderBy: { code: "asc" },
          select: {
            id: true,
            code: true,
            name: true,
            city: { select: { name: true } },
          },
        }),

        prisma.personnel.findMany({
          where: { role: "Pilot" },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
            status: true,
            fatiguePoint: true,
            currentAirportId: true,
            currentLocation: true,
            currentAirport: { select: { code: true, name: true } },
          },
        }),

        prisma.personnel.findMany({
          where: { role: "Kabin Memuru" },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
            status: true,
            fatiguePoint: true,
            currentAirportId: true,
            currentLocation: true,
            currentAirport: { select: { code: true, name: true } },
          },
        }),

        prisma.routeDuration.findMany({
          orderBy: { durationMinutes: "asc" },
          select: {
            originAirportId: true,
            destinationAirportId: true,
            durationMinutes: true,
          },
        }),
      ]);

    res.status(200).json({
      airlines,
      airports,
      pilots,
      cabinCrew,
      routeDurations,
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

// GET /flights/:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = getSingleRouteParam(req.params.id);

    const flight = await prisma.flight.findUnique({
      where: { id },
      include: {
        airline: { select: { id: true, code: true, name: true } },
        originAirport: { select: { id: true, code: true, name: true } },
        destinationAirport: { select: { id: true, code: true, name: true } },
        pilot: { select: { id: true, name: true, role: true } },
        crewAssignments: {
          orderBy: { assignedAt: "asc" },
          include: {
            personnel: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!flight) {
      res.status(404).json({
        error: { code: "FLIGHT_NOT_FOUND", message: "Flight not found." },
      });
      return;
    }

    res.status(200).json({
      ...serializeFlight(flight),
      airline: flight.airline,
      originAirport: flight.originAirport,
      destinationAirport: flight.destinationAirport,
      pilot: flight.pilot,
      crew: flight.crewAssignments.map((item) => item.personnel),
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

// POST /flights
router.post("/", requireTrustedOrigin, async (req, res, next) => {
  try {
    const input = parseFlightInput(req.body);
    const flight = await saveFlight(input);

    res.status(201).json({
      flight: serializeFlight(flight),
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

// PUT /flights/:id
router.put("/:id", requireTrustedOrigin, async (req, res, next) => {
  try {
    const id = getSingleRouteParam(req.params.id);

    if (!id || id.length > 20) {
      throw new FlightApiError(400, "INVALID_FLIGHT_ID", "Invalid flight ID.");
    }

    const input = parseFlightInput(req.body);
    const flight = await saveFlight(input, id);

    res.status(200).json({
      flight: serializeFlight(flight),
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

// PATCH /flights/:id/status
router.patch("/:id/status", requireTrustedOrigin, async (req, res, next) => {
  try {
    const id = getSingleRouteParam(req.params.id);
    const status = isRecord(req.body) && typeof req.body.status === "string"
      ? req.body.status
      : "";

    if (!id || id.length > 20 || !VALID_STATUSES.includes(status)) {
      throw new FlightApiError(
        400,
        "INVALID_STATUS",
        "A valid flight ID and status are required.",
      );
    }

    const flight = await prisma.flight.findUnique({ where: { id } });

    if (!flight) {
      throw new FlightApiError(404, "FLIGHT_NOT_FOUND", "Flight not found.");
    }

    const transitions: Record<string, string[]> = {
      SCHEDULED: ["DELAYED", "BOARDING", "CANCELLED"],
      DELAYED: ["SCHEDULED", "BOARDING", "CANCELLED"],
      BOARDING: ["DEPARTED"],
      DEPARTED: ["ARRIVED"],
    };

    if (!(transitions[flight.status] ?? []).includes(status)) {
      throw new FlightApiError(
        409,
        "INVALID_STATUS_TRANSITION",
        `Flight status cannot change from ${flight.status} to ${status}.`,
      );
    }

    const updated = await prisma.flight.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({
      flight: serializeFlight(updated),
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

export default router;
