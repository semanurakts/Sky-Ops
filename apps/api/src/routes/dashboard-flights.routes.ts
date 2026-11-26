
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

const ARCHIVE_DAYS = 30;
const TERMINAL_FLIGHT_STATUSES = ["ARRIVED", "CANCELLED"];

function getArchiveCutoff(): Date {
  const cutoff = new Date();

  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - ARCHIVE_DAYS);

  return cutoff;
}

router.get("/", async (req, res, next) => {
  try {
    const pageValue =
      typeof req.query.page === "string" ? req.query.page : "1";

    const pageSizeValue =
      typeof req.query.pageSize === "string"
        ? req.query.pageSize
        : "10";

    const page = Number(pageValue);
    const pageSize = Number(pageSizeValue);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      res.status(400).json({
        error: {
          code: "INVALID_PAGINATION",
          message: "Page must be positive and pageSize must be between 1 and 50.",
        },
      });
      return;
    }

    const includeArchived = req.query.includeArchived === "true";

    const where = includeArchived
      ? undefined
      : {
          OR: [
            {
              status: {
                notIn: TERMINAL_FLIGHT_STATUSES,
              },
            },
            {
              departureDate: {
                gte: getArchiveCutoff(),
              },
            },
          ],
        };

    const skip = (page - 1) * pageSize;

    const [total, flights] = await Promise.all([
      prisma.flight.count({ where }),

      prisma.flight.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { departureDate: "desc" },
          { departureTime: "desc" },
        ],
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
      }),
    ]);

    res.status(200).json({
      flights: flights.map((flight) => ({
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
    next(error);
  }
});

export default router;
