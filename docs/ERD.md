# SkyOps Database Entity-Relationship Diagram

This diagram documents the database models currently defined in `apps/api/prisma/schema.prisma`.

```mermaid
erDiagram
    Country {
        string id PK
        string name
    }

    City {
        string id PK
        string name
        string countryId FK
    }

    Gender {
        string id PK
        string name UK
        string icon
    }

    Airline {
        string id PK
        string code UK
        string name
        string countryId FK
    }

    Airport {
        string id PK
        string code UK
        string name
        string cityId FK
    }

    Personnel {
        string id PK
        string name
        string role
        string genderId FK "nullable"
        date lastUpdate
        float flightHours
        float dailyFlightHours
        float fatiguePoint
        string status
        string risk
        string currentLocation
        string currentAirportId FK "nullable"
        datetime lastDecayTime
        datetime createdAt
        datetime updatedAt
    }

    Flight {
        string id PK
        string flightNo
        string route
        date departureDate
        string departureTime
        string gate
        string status
        string airlineId FK "nullable"
        string originAirportId FK "nullable"
        string destinationAirportId FK "nullable"
        string pilotId FK "nullable"
        datetime createdAt
        datetime updatedAt
    }

    FlightCrewAssignment {
        string flightId PK, FK
        string personnelId PK, FK
        datetime assignedAt
    }

    RouteDuration {
        string id PK
        string originAirportId FK
        string destinationAirportId FK
        int durationMinutes
    }

    User {
        uuid id PK
        string email UK
        string passwordHash
        UserRole role
        boolean isActive
        string personnelId FK "nullable, unique"
        datetime createdAt
        datetime updatedAt
    }

    Session {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        datetime expiresAt
        datetime createdAt
        datetime lastSeenAt
        datetime revokedAt
    }

    Country ||--o{ City : contains
    Country ||--o{ Airline : registers
    City ||--o{ Airport : contains
    Gender o|--o{ Personnel : classifies
    Airport o|--o{ Personnel : current_location
    Airline o|--o{ Flight : operates
    Airport o|--o{ Flight : origin
    Airport o|--o{ Flight : destination
    Personnel o|--o{ Flight : pilots
    Flight ||--o{ FlightCrewAssignment : has_crew
    Personnel ||--o{ FlightCrewAssignment : assigned_to
    Airport ||--o{ RouteDuration : route_origin
    Airport ||--o{ RouteDuration : route_destination
    Personnel o|--o| User : linked_account
    User ||--o{ Session : owns
```

## Relationship notes

- **Country–City:** A country can contain multiple cities; each city belongs to one country.
- **Country–Airline:** A country can be associated with multiple airlines; each airline references one country.
- **City–Airport:** A city can contain multiple airports; each airport references one city.
- **Gender–Personnel:** A personnel record may optionally reference a gender record.
- **Airport–Personnel:** A personnel record may optionally reference its current airport.
- **Airline–Flight:** A flight may optionally reference an airline.
- **Airport–Flight:** A flight may optionally reference an origin airport and a destination airport. These are two separate relationships to `Airport`.
- **Personnel–Flight (pilot):** A flight may optionally reference a pilot. A personnel record can be referenced as pilot for multiple flights.
- **Flight–Personnel (crew):** This many-to-many relationship is represented by `FlightCrewAssignment`. Its composite primary key is `(flightId, personnelId)`; deleting a flight or personnel record cascades to its assignment rows.
- **Airport–RouteDuration:** Each route-duration record references an origin airport and a destination airport. The origin/destination pair is unique.
- **Personnel–User:** A user account may optionally be linked to one personnel record. `User.personnelId` is nullable and unique, so a personnel record can have at most one linked user account.
- **User–Session:** A user can have multiple sessions. Deleting a user cascades to its sessions.

## Enumerations and implementation details

- `UserRole`: `ADMIN`, `STAFF`, `PASSENGER`.
- `FlightCrewAssignment` uses a composite primary key rather than a separate ID.
- Nullable foreign keys are marked as optional in the diagram.
- `createdAt`, `updatedAt`, and session timestamps are managed by the application/Prisma schema as defined in the model.
- The diagram reflects the current Prisma schema. It does not imply that every domain workflow using these tables is already exposed through the v2 API.
