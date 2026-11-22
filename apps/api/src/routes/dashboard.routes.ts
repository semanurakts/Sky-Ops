
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

const ARCHIVE_DAYS = 30;
const GATE_CAPACITY = 20;
const DENSITY_DIVISOR = 10;
const DENSITY_MAX = 10;
const RISKY_FATIGUE_THRESHOLD = 80;

const TERMINAL_FLIGHT_STATUSES = ["ARRIVED", "CANCELLED"];

function getArchiveCutoff(): Date {
  const cutoff = new Date();

  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - ARCHIVE_DAYS);

  return cutoff;
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

// GET /dashboard/overview
router.get("/overview", async (_req, res) => {
  const archiveCutoff = getArchiveCutoff();

  const [flights, personnel] = await Promise.all([
    prisma.flight.findMany({
      where: {
        OR: [
          {
            status: {
              notIn: TERMINAL_FLIGHT_STATUSES,
            },
          },
          {
            departureDate: {
              gte: archiveCutoff,
            },
          },
        ],
      },
      select: {
        id: true,
        flightNo: true,
        route: true,
        departureDate: true,
        departureTime: true,
        gate: true,
        status: true,

        airline: {
          select: {
            name: true,
          },
        },

        pilot: {
          select: {
            id: true,
            name: true,
            role: true,
            gender: {
              select: {
                icon: true,
              },
            },
          },
        },

        _count: {
          select: {
            crewAssignments: true,
          },
        },
      },
      orderBy: [
        { departureDate: "desc" },
        { departureTime: "desc" },
      ],
    }),

    prisma.personnel.findMany({
      select: {
        fatiguePoint: true,
      },
    }),
  ]);

  const activeFlights = flights.filter(
    (flight) => !TERMINAL_FLIGHT_STATUSES.includes(flight.status),
  );

  const delayedFlights = flights.filter(
    (flight) =>
      flight.status === "DELAYED" ||
      flight.status === "CANCELLED",
  );

  const riskyPersonnel = personnel.filter(
    (person) => person.fatiguePoint > RISKY_FATIGUE_THRESHOLD,
  );

  const occupiedGateCodes = new Set(
    activeFlights
      .map((flight) => flight.gate?.trim())
      .filter((gate): gate is string => Boolean(gate)),
  );

  const occupiedGates = occupiedGateCodes.size;

  const gateOccupancyPercent = Math.round(
    (occupiedGates / GATE_CAPACITY) * 100,
  );

  const densityScore = Math.min(
    DENSITY_MAX,
    Number((activeFlights.length / DENSITY_DIVISOR).toFixed(1)),
  );

  const recentFlights = flights.slice(0, 10).map((flight) => ({
    id: flight.id,
    flightNo: flight.flightNo,
    route: flight.route,
    departureDate: flight.departureDate.toISOString().slice(0, 10),
    departureTime: flight.departureTime,
    gate: flight.gate,
    status: flight.status,
    airlineName: flight.airline?.name ?? null,

    pilot: flight.pilot
      ? {
          id: flight.pilot.id,
          name: flight.pilot.name,
          role: flight.pilot.role,
          genderIcon: flight.pilot.gender?.icon ?? null,
        }
      : null,

    crewCount: flight._count.crewAssignments,
  }));

  res.status(200).json({
    generatedAt: new Date().toISOString(),

    metrics: {
      totalFlights: flights.length,
      delayedFlights: delayedFlights.length,
      riskyPersonnel: riskyPersonnel.length,
      occupiedGates,
      gateCapacity: GATE_CAPACITY,
      gateOccupancyPercent,
      activeFlights: activeFlights.length,
      densityScore,
      densityMax: DENSITY_MAX,
    },

    recentFlights,
  });
});

// GET /dashboard/traffic?period=today&date=2026-11-23
// GET /dashboard/traffic?period=week&date=2026-11-23
router.get("/traffic", async (req, res) => {
  const periodValue =
    typeof req.query.period === "string"
      ? req.query.period
      : "today";

  if (periodValue !== "today" && periodValue !== "week") {
    res.status(400).json({
      error: {
        code: "INVALID_PERIOD",
        message: "Period must be either 'today' or 'week'.",
      },
    });
    return;
  }

  const dateValue =
    typeof req.query.date === "string"
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

  const targetDate = parseDateOnly(dateValue);

  if (!targetDate) {
    res.status(400).json({
      error: {
        code: "INVALID_DATE",
        message: "Date must use the YYYY-MM-DD format.",
      },
    });
    return;
  }

  const startDate = new Date(targetDate);

  if (periodValue === "week") {
    startDate.setUTCDate(startDate.getUTCDate() - 6);
  }

  const endDate = new Date(targetDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const flights = await prisma.flight.findMany({
    where: {
      departureDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      departureDate: true,
      departureTime: true,
    },
  });

  if (periodValue === "today") {
    const hourlyCounts = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count: 0,
    }));

    for (const flight of flights) {
      const hour = Number(flight.departureTime.slice(0, 2));

      if (
        Number.isInteger(hour) &&
        hour >= 0 &&
        hour < 24
      ) {
        hourlyCounts[hour].count += 1;
      }
    }

    res.status(200).json({
      period: "today",
      date: dateValue,
      data: hourlyCounts,
    });

    return;
  }

  const dailyCounts = new Map<string, number>();

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + index);

    dailyCounts.set(date.toISOString().slice(0, 10), 0);
  }

  for (const flight of flights) {
    const dateKey = flight.departureDate.toISOString().slice(0, 10);

    dailyCounts.set(
      dateKey,
      (dailyCounts.get(dateKey) ?? 0) + 1,
    );
  }

  res.status(200).json({
    period: "week",
    date: dateValue,
    data: Array.from(dailyCounts.entries()).map(
      ([date, count]) => ({
        date,
        count,
      }),
    ),
  });
});

// GET /dashboard/flights/:flightId/crew
router.get("/flights/:flightId/crew", async (req, res) => {
  const flight = await prisma.flight.findUnique({
    where: {
      id: req.params.flightId,
    },
    select: {
      id: true,
      flightNo: true,

      pilot: {
        select: {
          id: true,
          name: true,
          role: true,
          fatiguePoint: true,
          status: true,
          gender: {
            select: {
              name: true,
              icon: true,
            },
          },
        },
      },

      crewAssignments: {
        orderBy: {
          assignedAt: "asc",
        },
        select: {
          personnel: {
            select: {
              id: true,
              name: true,
              role: true,
              fatiguePoint: true,
              status: true,
              gender: {
                select: {
                  name: true,
                  icon: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!flight) {
    res.status(404).json({
      error: {
        code: "FLIGHT_NOT_FOUND",
        message: "Flight not found.",
      },
    });
    return;
  }

  const crew = flight.crewAssignments.map(({ personnel }) => ({
    id: personnel.id,
    name: personnel.name,
    role: personnel.role,
    fatiguePoint: personnel.fatiguePoint,
    status: personnel.status,
    gender: personnel.gender
      ? {
          name: personnel.gender.name,
          icon: personnel.gender.icon,
        }
      : null,
  }));

  const pilot = flight.pilot
    ? {
        id: flight.pilot.id,
        name: flight.pilot.name,
        role: flight.pilot.role,
        fatiguePoint: flight.pilot.fatiguePoint,
        status: flight.pilot.status,
        gender: flight.pilot.gender
          ? {
              name: flight.pilot.gender.name,
              icon: flight.pilot.gender.icon,
            }
          : null,
      }
    : null;

  res.status(200).json({
    flightId: flight.id,
    flightNo: flight.flightNo,
    pilot,
    crew,
  });
});

export default router;
