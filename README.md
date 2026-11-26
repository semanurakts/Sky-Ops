# SkyOps

SkyOps is an aviation operations management project being migrated from a legacy prototype to a modern, modular web application.

The current v2 foundation focuses on authenticated access, role-based authorization, the operations dashboard, flight dashboard endpoints, and administrator-managed user accounts. Additional operational and passenger workflows are being migrated incrementally from the legacy application.

> **Project status:** Active development. The v2 application is not yet a complete replacement for every legacy workflow.

## Current v2 capabilities

- React-based web application with login and authenticated application state.
- Operations dashboard interface and protected dashboard API routes.
- Session-based authentication with HTTP-only cookies.
- Role-based access for `ADMIN`, `STAFF`, and `PASSENGER` users.
- Administrator user management, including staff account creation, role changes, and account activation/deactivation.
- Session revocation when account access or permissions change.
- Password hashing with Argon2id.
- Request validation and security controls including rate limiting, trusted-origin checks, and Helmet security headers.
- OpenAPI specification and Swagger UI for API exploration.
- PostgreSQL persistence managed through Prisma migrations.
- GitHub Actions checks for backend tests/build and frontend lint/build.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Chart.js |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL 18 |
| ORM and migrations | Prisma 7 |
| Authentication | HTTP-only session cookies, Argon2id |
| API documentation | OpenAPI, Swagger UI |
| Local database environment | Docker Compose |
| CI | GitHub Actions |

## Repository structure

```text
SkyOps-v2/
├── apps/
│   ├── api/                  # Express API, Prisma schema, migrations, tests
│   │   ├── prisma/
│   │   └── src/
│   └── web/                  # React + Vite frontend
│       └── src/
├── docs/
│   └── ERD.md                # Database entity-relationship diagram
├── .github/workflows/
│   └── ci.yml                # Backend and frontend CI workflows
├── compose.yaml              # Local PostgreSQL service
├── .env.example              # Environment variable template
└── README.md
```

The repository root also contains files from the original HTML/JavaScript and JSON Server prototype. Those files are retained as **legacy reference material** while their workflows are migrated to v2. They are not the source of the current React/Express application.

## Prerequisites

Install the following tools:

- Node.js 22.x and npm
- Docker Desktop with Docker Compose
- Git

## Local setup

Run the following commands from the repository root in Windows Command Prompt or a terminal.

### 1. Configure environment variables

Create your local environment file from the provided template:

```cmd
copy .env.example .env
```

Set the values in `.env` for the local PostgreSQL user, password, database, and `DATABASE_URL`. The PostgreSQL credentials used by the Compose service and the credentials in `DATABASE_URL` must match. Keep `.env` private; do not commit it or paste its contents into issues or chat messages.

### 2. Start PostgreSQL

From the repository root:

```cmd
docker compose up -d db
docker compose ps
```

The database is exposed on `127.0.0.1:5432` for local development. Docker Compose stores database data in the named volume `skyops_postgres_data`.

### 3. Install backend dependencies and prepare the database

```cmd
cd apps\api
npm ci
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
```

`migrate deploy` applies the migrations already committed to `apps/api/prisma/migrations`. It does not create a new migration.

### 4. Start the backend API

In the `apps\api` directory:

```cmd
npm run dev
```

The API listens on `http://localhost:4000` by default. The port can be changed with the `PORT` environment variable.

Useful endpoints:

- Health check: `http://localhost:4000/health`
- Swagger UI: `http://localhost:4000/api-docs`
- OpenAPI JSON: `http://localhost:4000/api-docs.json`

In production mode, API documentation routes require an authenticated administrator session.

### 5. Install and start the frontend

Open a second terminal at the repository root:

```cmd
cd apps\web
npm ci
npm run dev
```

Vite prints the local frontend URL in the terminal; its default development URL is `http://localhost:5173`.

## Tests and quality checks

Run backend commands from `apps/api`:

```cmd
npm test
npm run test:integration
npm run test:authorization
npm run test:dashboard-auth
npm run test:admin-users
npm run typecheck
npm run build
```

Run frontend commands from `apps/web`:

```cmd
npm run lint
npm run build
```

The admin user-management integration tests use a database. Point `DATABASE_URL` to a dedicated disposable test database before running database-backed tests locally. Do not run test cleanup against a database containing development or production data.

GitHub Actions runs backend tests, type-checking and build, plus frontend lint and build on pushes to the configured branches and pull requests targeting `main`.

## Database documentation

The Prisma schema is located at `apps/api/prisma/schema.prisma`; migration history is stored in `apps/api/prisma/migrations`.

See [docs/ERD.md](docs/ERD.md) for the entity-relationship diagram and relationship notes.

## API overview

The API currently groups routes under the following prefixes:

| Prefix | Purpose | Access |
|---|---|---|
| `/health` | Service health check | Public |
| `/auth` | Login, current-session lookup, logout | Public entry points; session required where applicable |
| `/dashboard` | Operations dashboard data | `ADMIN`, `STAFF` |
| `/dashboard/flights` | Dashboard flight data | `ADMIN`, `STAFF` |
| `/admin/users` | User and staff-account administration | `ADMIN` |
| `/api-docs` | Swagger UI | Development: open; production: `ADMIN` |

Consult the OpenAPI document at `/api-docs` for the current request and response contracts.

## Security notes

- Passwords are stored as Argon2id hashes; plaintext passwords are not stored.
- Authentication uses server-side sessions and HTTP-only cookies.
- Session tokens are stored as hashes in the database.
- Role and account-status changes revoke affected sessions.
- Administrator operations protect against self-demotion, self-deactivation, and removal of the last active administrator.
- Production deployment must use HTTPS and the production cookie/security configuration. Local development settings are not a production deployment guide.
- Never commit `.env`, database credentials, session tokens, or generated secrets.

## Development roadmap

The following legacy or planned workflows are intended to be migrated or expanded in separate increments; they should not be interpreted as fully implemented v2 capabilities yet:

- Full flight management and scheduling
- Personnel management and crew planning
- Fatigue calculation and monitoring workflows
- Operational reports and flight archive
- Passenger flight search, booking, seat selection, and ticketing
- Additional account recovery and production security features

## Legacy prototype

The original HTML/JavaScript and JSON Server prototype remains in the repository root for reference. Its root `package.json` belongs to that legacy prototype and is separate from the v2 packages under `apps/api` and `apps/web`.
