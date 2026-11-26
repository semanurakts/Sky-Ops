
const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "SkyOps API",
    version: "1.0.0",
    description:
      "SkyOps airline operations API. Authentication uses server-managed HTTP-only session cookies.",
  },
  servers: [
    {
      url: "/",
      description: "Current SkyOps API host",
    },
  ],
tags: [
  { name: "Health", description: "API and database health checks" },
  { name: "Authentication", description: "Login, logout and current user" },
  {
    name: "Admin",
    description: "Administrative user and personnel account management",
  },
  {
    name: "Dashboard",
    description:
      "Operations dashboard data. Requires an authenticated ADMIN or STAFF session.",
  },
],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "skyops_session",
        description:
          "Development session cookie. Production uses the __Host-skyops_session cookie name.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      UserRole: {
        type: "string",
        enum: ["ADMIN", "STAFF", "PASSENGER"],
      },
      LoginUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/UserRole" },
          personnelId: {
            type: "string",
            nullable: true,
          },
        },
        required: ["id", "email", "role", "personnelId"],
      },
      CurrentUser: {
        allOf: [
          { $ref: "#/components/schemas/LoginUser" },
          {
            type: "object",
            properties: {
              isActive: { type: "boolean" },
            },
            required: ["isActive"],
          },
        ],
      },
      LoginRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            maxLength: 254,
          },
          password: {
            type: "string",
            minLength: 1,
            maxLength: 1024,
          },
        },
        required: ["email", "password"],
      },
      LoginResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/LoginUser" },
          expiresAt: { type: "string", format: "date-time" },
        },
        required: ["user", "expiresAt"],
      },
      MeResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/CurrentUser" },
          expiresAt: { type: "string", format: "date-time" },
        },
        required: ["user", "expiresAt"],
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          service: { type: "string", example: "skyops-api" },
        },
        required: ["status", "service"],
      },
      DatabaseHealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          database: { type: "string", example: "connected" },
        },
        required: ["status", "database"],
      },
      PilotSummary: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          genderIcon: { type: "string", nullable: true },
        },
        required: ["id", "name", "role", "genderIcon"],
      },
      FlightSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          flightNo: { type: "string" },
          route: { type: "string" },
          departureDate: { type: "string", format: "date" },
          departureTime: { type: "string", example: "14:30" },
          gate: { type: "string", nullable: true },
          status: { type: "string" },
          airlineName: { type: "string", nullable: true },
          pilot: { $ref: "#/components/schemas/PilotSummary" },
          crewCount: { type: "integer" },
        },
        required: [
          "id",
          "flightNo",
          "route",
          "departureDate",
          "departureTime",
          "gate",
          "status",
          "airlineName",
          "pilot",
          "crewCount",
        ],
      },
      DashboardOverviewResponse: {
        type: "object",
        properties: {
          generatedAt: { type: "string", format: "date-time" },
          metrics: {
            type: "object",
            properties: {
              totalFlights: { type: "integer" },
              delayedFlights: { type: "integer" },
              riskyPersonnel: { type: "integer" },
              occupiedGates: { type: "integer" },
              gateCapacity: { type: "integer" },
              gateOccupancyPercent: { type: "integer" },
              activeFlights: { type: "integer" },
              densityScore: { type: "number" },
              densityMax: { type: "number" },
            },
          },
          recentFlights: {
            type: "array",
            items: { $ref: "#/components/schemas/FlightSummary" },
          },
        },
        required: ["generatedAt", "metrics", "recentFlights"],
      },
      HourlyTrafficPoint: {
        type: "object",
        properties: {
          hour: { type: "integer", minimum: 0, maximum: 23 },
          label: { type: "string", example: "14:00" },
          count: { type: "integer", minimum: 0 },
        },
        required: ["hour", "label", "count"],
      },
      DailyTrafficPoint: {
        type: "object",
        properties: {
          date: { type: "string", format: "date" },
          count: { type: "integer", minimum: 0 },
        },
        required: ["date", "count"],
      },
      TrafficResponse: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "week"],
          },
          date: { type: "string", format: "date" },
          data: {
            type: "array",
            items: {
              oneOf: [
                { $ref: "#/components/schemas/HourlyTrafficPoint" },
                { $ref: "#/components/schemas/DailyTrafficPoint" },
              ],
            },
          },
        },
        required: ["period", "date", "data"],
      },
      FlightListResponse: {
        type: "object",
        properties: {
          flights: {
            type: "array",
            items: { $ref: "#/components/schemas/FlightSummary" },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              pageSize: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
              hasNext: { type: "boolean" },
              hasPrevious: { type: "boolean" },
            },
            required: [
              "page",
              "pageSize",
              "total",
              "totalPages",
              "hasNext",
              "hasPrevious",
            ],
          },
        },
        required: ["flights", "pagination"],
      },
      CrewMember: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          fatiguePoint: { type: "number" },
          status: { type: "string" },
          gender: {
            type: "object",
            nullable: true,
            properties: {
              name: { type: "string" },
              icon: { type: "string", nullable: true },
            },
          },
        },
        required: ["id", "name", "role", "fatiguePoint", "status", "gender"],
      },
            AdminUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/UserRole" },
          isActive: { type: "boolean" },
          personnelId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          personnel: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              role: { type: "string" },
            },
            required: ["id", "name", "role"],
          },
        },
        required: [
          "id",
          "email",
          "role",
          "isActive",
          "personnelId",
          "createdAt",
          "updatedAt",
          "personnel",
        ],
      },
      AdminUsersResponse: {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminUser" },
          },
        },
        required: ["users"],
      },
      PersonnelOption: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          status: { type: "string" },
        },
        required: ["id", "name", "role", "status"],
      },
      PersonnelOptionsResponse: {
        type: "object",
        properties: {
          personnel: {
            type: "array",
            items: { $ref: "#/components/schemas/PersonnelOption" },
          },
        },
        required: ["personnel"],
      },
      CreateStaffAccountRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            maxLength: 254,
          },
          password: {
            type: "string",
            minLength: 14,
            maxLength: 1024,
          },
          personnelId: { type: "string" },
        },
        required: ["email", "password", "personnelId"],
      },
      UpdateUserRoleRequest: {
        type: "object",
        properties: {
          role: {
            type: "string",
            enum: ["ADMIN", "STAFF", "PASSENGER"],
          },
          personnelId: { type: "string" },
        },
        required: ["role"],
      },
      UpdateUserStatusRequest: {
        type: "object",
        properties: {
          isActive: { type: "boolean" },
        },
        required: ["isActive"],
      },
      CrewResponse: {
        type: "object",
        properties: {
          flightId: { type: "string" },
          flightNo: { type: "string" },
          pilot: { $ref: "#/components/schemas/CrewMember" },
          crew: {
            type: "array",
            items: { $ref: "#/components/schemas/CrewMember" },
          },
        },
        required: ["flightId", "flightNo", "pilot", "crew"],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: {
          "200": {
            description: "API is running",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/health/db": {
      get: {
        tags: ["Health"],
        summary: "Check database connectivity",
        responses: {
          "200": {
            description: "Database connection is healthy",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DatabaseHealthResponse",
                },
              },
            },
          },
          "503": {
            description: "Database is unavailable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in and create a session",
        description:
          "Requires a trusted Origin header. Login attempts are rate limited. The session token is returned only as an HTTP-only cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            headers: {
              "Set-Cookie": {
                description: "HTTP-only session cookie",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "400": { description: "Invalid request" },
          "401": { description: "Invalid email or password" },
          "403": { description: "Untrusted request origin" },
          "429": { description: "Too many login attempts" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get the current authenticated user",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Authenticated user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MeResponse" },
              },
            },
          },
          "401": { description: "Missing, expired or invalid session" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Revoke the current session",
        description: "Requires a trusted Origin header and an active session.",
        security: [{ sessionCookie: [] }],
        responses: {
          "204": { description: "Session revoked and cookie cleared" },
          "401": { description: "Missing, expired or invalid session" },
          "403": { description: "Untrusted request origin" },
        },
      },
    },
        "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List user accounts",
        description: "ADMIN access required. Password hashes are never returned.",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "User accounts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminUsersResponse" },
              },
            },
          },
          "401": { description: "Authentication required" },
          "403": { description: "ADMIN role required" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a staff account",
        description:
          "Creates a STAFF account linked to an existing unlinked Personnel record. Requires a trusted Origin.",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateStaffAccountRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Staff account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/AdminUser" },
                  },
                  required: ["user"],
                },
              },
            },
          },
          "400": { description: "Invalid request" },
          "401": { description: "Authentication required" },
          "403": { description: "ADMIN role or trusted Origin required" },
          "404": { description: "Personnel record not found" },
          "409": { description: "Duplicate account or personnel link" },
        },
      },
    },
    "/admin/users/personnel-options": {
      get: {
        tags: ["Admin"],
        summary: "List personnel available for account linking",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Unlinked personnel records",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PersonnelOptionsResponse",
                },
              },
            },
          },
          "401": { description: "Authentication required" },
          "403": { description: "ADMIN role required" },
        },
      },
    },
    "/admin/users/{id}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Update a user role",
        description:
          "ADMIN access required. Existing sessions are revoked when the role changes. The last active administrator cannot be demoted.",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateUserRoleRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User role updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/AdminUser" },
                  },
                  required: ["user"],
                },
              },
            },
          },
          "400": { description: "Invalid role or personnel assignment" },
          "401": { description: "Authentication required" },
          "403": { description: "ADMIN role required or self-demotion blocked" },
          "404": { description: "User or personnel not found" },
          "409": { description: "Last administrator or personnel conflict" },
        },
      },
    },
    "/admin/users/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Activate or deactivate a user account",
        description:
          "ADMIN access required. Deactivation revokes active sessions. The last active administrator cannot be deactivated.",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateUserStatusRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Account status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/AdminUser" },
                  },
                  required: ["user"],
                },
              },
            },
          },
          "400": { description: "Invalid status value" },
          "401": { description: "Authentication required" },
          "403": { description: "ADMIN role required or self-deactivation blocked" },
          "404": { description: "User not found" },
          "409": { description: "Last active administrator cannot be deactivated" },
        },
      },
    },
    "/dashboard/overview": {
  get: {
    tags: ["Dashboard"],
    summary: "Get dashboard overview metrics",
    description:
      "Available to authenticated ADMIN and STAFF users only.",
    security: [{ sessionCookie: [] }],
    responses: {
      "200": {
        description: "Dashboard overview",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/DashboardOverviewResponse",
            },
          },
        },
      },
      "401": {
        description: "Missing, expired or invalid session",
      },
      "403": {
        description:
          "Authenticated user does not have ADMIN or STAFF role",
      },
    },
  },
},
    "/dashboard/traffic": {
  get: {
    tags: ["Dashboard"],
    summary: "Get flight traffic data",
    description:
      "Available to authenticated ADMIN and STAFF users only.",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "period",
        in: "query",
        required: false,
        schema: {
          type: "string",
          enum: ["today", "week"],
          default: "today",
        },
      },
      {
        name: "date",
        in: "query",
        required: false,
        schema: {
          type: "string",
          format: "date",
        },
        description: "Date in YYYY-MM-DD format; defaults to current UTC date.",
      },
    ],
    responses: {
      "200": {
        description: "Hourly or daily traffic data",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TrafficResponse" },
          },
        },
      },
      "400": { description: "Invalid period or date" },
      "401": {
        description: "Missing, expired or invalid session",
      },
      "403": {
        description:
          "Authenticated user does not have ADMIN or STAFF role",
      },
    },
  },
},
    "/dashboard/flights": {
  get: {
    tags: ["Dashboard"],
    summary: "Get paginated flights",
    description:
      "Available to authenticated ADMIN and STAFF users only.",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      {
        name: "pageSize",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
      },
      {
        name: "includeArchived",
        in: "query",
        schema: { type: "boolean", default: false },
      },
    ],
    responses: {
      "200": {
        description: "Paginated flight list",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FlightListResponse" },
          },
        },
      },
      "400": { description: "Invalid pagination parameters" },
      "401": {
        description: "Missing, expired or invalid session",
      },
      "403": {
        description:
          "Authenticated user does not have ADMIN or STAFF role",
      },
    },
  },
},
    "/dashboard/flights/{flightId}/crew": {
  get: {
    tags: ["Dashboard"],
    summary: "Get crew details for a flight",
    description:
      "Available to authenticated ADMIN and STAFF users only.",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "flightId",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
    ],
    responses: {
      "200": {
        description: "Flight and crew details",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CrewResponse" },
          },
        },
      },
      "401": {
        description: "Missing, expired or invalid session",
      },
      "403": {
        description:
          "Authenticated user does not have ADMIN or STAFF role",
      },
      "404": { description: "Flight not found" },
    },
  },
},
  },
};

export default openApiDocument;
