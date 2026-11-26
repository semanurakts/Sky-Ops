import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/password.service.js";
import { requireTrustedOrigin } from "../middleware/origin.middleware.js";

const router = Router();

const USER_ROLES = ["ADMIN", "STAFF", "PASSENGER"] as const;
type UserRole = (typeof USER_ROLES)[number];

// Never expose passwordHash through user management endpoints.
const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  personnelId: true,
  createdAt: true,
  updatedAt: true,
  personnel: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" &&
    USER_ROLES.includes(value as UserRole);
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function isTransactionConflict(error: unknown): boolean {
  if (hasPrismaCode(error, "P2034")) {
    return true;
  }

  if (
    typeof error !== "object" ||
    error === null ||
    !("cause" in error)
  ) {
    return false;
  }

  const cause = error.cause;

  if (typeof cause !== "object" || cause === null) {
    return false;
  }

  return (
    ("originalCode" in cause && cause.originalCode === "40001") ||
    ("kind" in cause &&
      cause.kind === "TransactionWriteConflict")
  );
}



function getSingleRouteParam(
  value: string | string[] | undefined,
): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;

  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}

// GET /admin/users
// List user accounts. ADMIN access is enforced in app.ts.
router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
});

// GET /admin/users/personnel-options
// List personnel records that are not linked to a user account.
router.get("/personnel-options", async (_req, res, next) => {
  try {
    const personnel = await prisma.personnel.findMany({
      where: {
        user: {
          is: null,
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({ personnel });
  } catch (error) {
    next(error);
  }
});

// POST /admin/users
// Create a STAFF account linked to an existing Personnel record.
router.post("/", requireTrustedOrigin, async (req, res, next) => {
  try {
    const body = isRecord(req.body) ? req.body : {};

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const personnelId =
      typeof body.personnelId === "string"
        ? body.personnelId.trim()
        : "";

    const validEmail =
      email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!validEmail || password.length < 14 || password.length > 1024 || !personnelId) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message:
            "A valid email, a password of at least 14 characters, and a personnel ID are required.",
        },
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(
      async (tx) => {
        const personnel = await tx.personnel.findUnique({
          where: { id: personnelId },
          select: {
            id: true,
            user: {
              select: { id: true },
            },
          },
        });

        if (!personnel) {
          return { kind: "PERSONNEL_NOT_FOUND" } as const;
        }

        if (personnel.user) {
          return { kind: "PERSONNEL_ALREADY_LINKED" } as const;
        }

        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: "STAFF",
            personnelId,
          },
          select: USER_SELECT,
        });

        return { kind: "CREATED", user } as const;
      },
      { isolationLevel: "Serializable" },
    );

    if (result.kind === "PERSONNEL_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "PERSONNEL_NOT_FOUND",
          message: "The selected personnel record does not exist.",
        },
      });
    }

    if (result.kind === "PERSONNEL_ALREADY_LINKED") {
      return res.status(409).json({
        error: {
          code: "PERSONNEL_ALREADY_LINKED",
          message: "This personnel record already has a user account.",
        },
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(201).json({ user: result.user });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_ACCOUNT",
          message: "The email or personnel record is already in use.",
        },
      });
    }

    if (isTransactionConflict(error)) {
      return res.status(409).json({
        error: {
          code: "TRANSACTION_CONFLICT",
          message: "The operation conflicted with another change. Please retry.",
        },
      });
    }

    next(error);
  }
});

// PATCH /admin/users/:id/role
// Change an account's application role.
router.patch("/:id/role", requireTrustedOrigin, async (req, res, next) => {
  try {
const userId = getSingleRouteParam(req.params.id);

if (!userId) {
  return res.status(400).json({
    error: {
      code: "INVALID_USER_ID",
      message: "A valid user ID is required.",
    },
  });
}
    const actorId = req.auth?.user.id;
    const body = isRecord(req.body) ? req.body : {};
    const nextRole = body.role;

    if (!actorId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

    if (!isValidRole(nextRole)) {
      return res.status(400).json({
        error: {
          code: "INVALID_ROLE",
          message: "A valid user role is required.",
        },
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            isActive: true,
            personnelId: true,
          },
        });

        if (!target) {
          return { kind: "NOT_FOUND" } as const;
        }

        if (target.id === actorId && nextRole !== "ADMIN") {
          return { kind: "SELF_ROLE_CHANGE" } as const;
        }

        if (
          target.role === "ADMIN" &&
          target.isActive &&
          nextRole !== "ADMIN"
        ) {
          const activeAdmins = await tx.user.count({
            where: {
              role: "ADMIN",
              isActive: true,
            },
          });

          if (activeAdmins <= 1) {
            return { kind: "LAST_ACTIVE_ADMIN" } as const;
          }
        }

        let personnelId = target.personnelId;

        if (nextRole === "STAFF") {
          const requestedPersonnelId =
            typeof body.personnelId === "string" &&
            body.personnelId.trim()
              ? body.personnelId.trim()
              : target.personnelId;

          if (!requestedPersonnelId) {
            return { kind: "PERSONNEL_REQUIRED" } as const;
          }

          const personnel = await tx.personnel.findUnique({
            where: { id: requestedPersonnelId },
            select: {
              id: true,
              user: {
                select: { id: true },
              },
            },
          });

          if (!personnel) {
            return { kind: "PERSONNEL_NOT_FOUND" } as const;
          }

          if (personnel.user && personnel.user.id !== target.id) {
            return { kind: "PERSONNEL_ALREADY_LINKED" } as const;
          }

          personnelId = requestedPersonnelId;
        }

        if (nextRole === "PASSENGER") {
          personnelId = null;
        }

        const user = await tx.user.update({
          where: { id: userId },
          data: {
            role: nextRole,
            personnelId,
          },
          select: USER_SELECT,
        });

        if (target.role !== nextRole) {
          await tx.session.updateMany({
            where: {
              userId,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }

        return { kind: "UPDATED", user } as const;
      },
      { isolationLevel: "Serializable" },
    );

    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User account not found.",
        },
      });
    }

    if (result.kind === "SELF_ROLE_CHANGE") {
      return res.status(403).json({
        error: {
          code: "SELF_ROLE_CHANGE_FORBIDDEN",
          message: "You cannot remove your own administrator role.",
        },
      });
    }

    if (result.kind === "LAST_ACTIVE_ADMIN") {
      return res.status(409).json({
        error: {
          code: "LAST_ACTIVE_ADMIN",
          message: "The last active administrator cannot be demoted.",
        },
      });
    }

    if (result.kind === "PERSONNEL_REQUIRED") {
      return res.status(400).json({
        error: {
          code: "PERSONNEL_REQUIRED",
          message: "A personnel record is required for a STAFF account.",
        },
      });
    }

    if (result.kind === "PERSONNEL_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "PERSONNEL_NOT_FOUND",
          message: "The selected personnel record does not exist.",
        },
      });
    }

    if (result.kind === "PERSONNEL_ALREADY_LINKED") {
      return res.status(409).json({
        error: {
          code: "PERSONNEL_ALREADY_LINKED",
          message: "This personnel record belongs to another user account.",
        },
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({ user: result.user });
  } catch (error) {
    if (isTransactionConflict(error)) {
      return res.status(409).json({
        error: {
          code: "TRANSACTION_CONFLICT",
          message: "The operation conflicted with another change. Please retry.",
        },
      });
    }

    next(error);
  }
});

// PATCH /admin/users/:id/status
// Activate or deactivate an account.
router.patch("/:id/status", requireTrustedOrigin, async (req, res, next) => {
  try {
const userId = getSingleRouteParam(req.params.id);

if (!userId) {
  return res.status(400).json({
    error: {
      code: "INVALID_USER_ID",
      message: "A valid user ID is required.",
    },
  });
}
    const actorId = req.auth?.user.id;
    const body = isRecord(req.body) ? req.body : {};

    if (!actorId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

const isActive = body.isActive;

if (typeof isActive !== "boolean") {
  return res.status(400).json({
    error: {
      code: "INVALID_STATUS",
      message: "The isActive field must be a boolean.",
    },
  });
}

    const result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        });

        if (!target) {
          return { kind: "NOT_FOUND" } as const;
        }

        if (target.id === actorId && isActive === false) {
          return { kind: "SELF_DEACTIVATION" } as const;
        }

        if (
          target.role === "ADMIN" &&
          target.isActive &&
          isActive === false
        ) {
          const activeAdmins = await tx.user.count({
            where: {
              role: "ADMIN",
              isActive: true,
            },
          });

          if (activeAdmins <= 1) {
            return { kind: "LAST_ACTIVE_ADMIN" } as const;
          }
        }

        const user = await tx.user.update({
          where: { id: userId },
          data: {
            isActive,
          },
          select: USER_SELECT,
        });

        if (!isActive) {
          await tx.session.updateMany({
            where: {
              userId,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }

        return { kind: "UPDATED", user } as const;
      },
      { isolationLevel: "Serializable" },
    );

    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User account not found.",
        },
      });
    }

    if (result.kind === "SELF_DEACTIVATION") {
      return res.status(403).json({
        error: {
          code: "SELF_DEACTIVATION_FORBIDDEN",
          message: "You cannot deactivate your own account.",
        },
      });
    }

    if (result.kind === "LAST_ACTIVE_ADMIN") {
      return res.status(409).json({
        error: {
          code: "LAST_ACTIVE_ADMIN",
          message: "The last active administrator cannot be deactivated.",
        },
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({ user: result.user });
  } catch (error) {
    if (isTransactionConflict(error)) {
      return res.status(409).json({
        error: {
          code: "TRANSACTION_CONFLICT",
          message: "The operation conflicted with another change. Please retry.",
        },
      });
    }

    next(error);
  }
});

export default router;