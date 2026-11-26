import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma.js";

interface LegacyCountry {
  id: string;
  name: string;
}

interface LegacyGender {
  id: string;
  name: string;
  icon?: string | null;
}

interface LegacyAirline {
  id: string;
  code: string;
  name: string;
  countryId: string;
}

interface LegacyAirport {
  id: string;
  code: string;
  name: string;
  countryId: string;
  cityId: string;
  city: string;
  country: string;
}

interface LegacyPersonnel {
  id: string;
  name: string;
  role: string;
  genderId: string;
  lastUpdate?: string | null;
  flightHours: number;
  dailyFlightHours: number;
  fatiguePoint: number;
  status: string;
  risk: string | null;
  currentLocation: string | null;
  lastDecayTime?: string | null;
}

interface LegacyFlight {
  id: string;
  flightNo: string;
  route: string;
  date: string;
  time: string;
  gate?: string | null;
  pilot: string;
  cabinCrew: string[];
  status: string;
}

interface LegacyRouteDuration {
  id: string;
  duration: number;
}

interface LegacyDatabase {
  countries: LegacyCountry[];
  genders: LegacyGender[];
  airlines: LegacyAirline[];
  airports: LegacyAirport[];
  personnel: LegacyPersonnel[];
  flights: LegacyFlight[];
  routes_duration: LegacyRouteDuration[];
}

interface CityRecord {
  id: string;
  name: string;
  countryId: string;
}

function assertUnique<T>(
  items: T[],
  getKey: (item: T) => string,
  label: string,
): void {
  const seen = new Set<string>();

  for (const item of items) {
    const key = getKey(item);

    if (!key || seen.has(key)) {
      throw new Error(`Duplicate or empty ${label}: ${key}`);
    }

    seen.add(key);
  }
}

function requireReference<T>(
  map: Map<string, T>,
  key: string,
  label: string,
): T {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Missing ${label} reference: ${key}`);
  }

  return value;
}

function parseDateOnly(
  value: string | null | undefined,
  label: string,
): Date | null {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date for ${label}: ${value}`);
  }

  const result = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(result.getTime()) ||
      result.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date for ${label}: ${value}`);
  }

  return result;
}

function parseTimestamp(
  value: string | null | undefined,
  label: string,
): Date | null {
  if (!value) return null;

  const result = new Date(value);

  if (Number.isNaN(result.getTime())) {
    throw new Error(`Invalid timestamp for ${label}: ${value}`);
  }

  return result;
}

function mapFlightStatus(value: string): string {
  const statuses: Record<string, string> = {
    "İndi": "ARRIVED",
    "İptal": "CANCELLED",
  };

  const result = statuses[value];

  if (!result) {
    throw new Error(`Unknown flight status: ${value}`);
  }

  return result;
}

function mapPersonnelStatus(value: string): string {
  const statuses: Record<string, string> = {
    "Müsait": "AVAILABLE",
  };

  const result = statuses[value];

  if (!result) {
    throw new Error(`Unknown personnel status: ${value}`);
  }

  return result;
}

function mapRisk(value: string | null): string | null {
  if (!value) return null;

  const risks: Record<string, string> = {
    "Düşük": "LOW",
    "Orta": "MEDIUM",
    "Yüksek": "HIGH",
  };

  const result = risks[value];

  if (!result) {
    throw new Error(`Unknown personnel risk: ${value}`);
  }

  return result;
}

function validateCollections(db: LegacyDatabase): void {
  const collections = [
    "countries",
    "genders",
    "airlines",
    "airports",
    "personnel",
    "flights",
    "routes_duration",
  ] as const;

  for (const name of collections) {
    if (!Array.isArray(db[name])) {
      throw new Error(`Invalid collection: ${name}`);
    }
  }
}

async function main(): Promise<void> {
  const sourcePath = process.env.LEGACY_DB_PATH;

  if (!sourcePath) {
    throw new Error("LEGACY_DB_PATH environment variable is required.");
  }

  const absolutePath = resolve(sourcePath);

  console.log("Reading legacy database:", absolutePath);

  const db = JSON.parse(
    readFileSync(absolutePath, "utf8"),
  ) as LegacyDatabase;

  validateCollections(db);

  // Check duplicate IDs and unique codes.

  assertUnique(db.countries, x => x.id, "country ID");
  assertUnique(db.genders, x => x.id, "gender ID");
  assertUnique(db.airlines, x => x.id, "airline ID");
  assertUnique(db.airports, x => x.id, "airport ID");
  assertUnique(db.airports, x => x.code, "airport code");
  assertUnique(db.airlines, x => x.code, "airline code");
  assertUnique(db.personnel, x => x.id, "personnel ID");
  assertUnique(db.flights, x => x.id, "flight ID");
  assertUnique(db.routes_duration, x => x.id, "route ID");

  const countryIds = new Set(db.countries.map(x => x.id));
  const genderIds = new Set(db.genders.map(x => x.id));
  const personnelById = new Map(db.personnel.map(x => [x.id, x]));
  const airportByCode = new Map(db.airports.map(x => [x.code, x]));
  const airlineByCode = new Map(db.airlines.map(x => [x.code, x]));

  // Derive cities from airport records.

  const cityMap = new Map<string, CityRecord>();

  for (const airport of db.airports) {
    if (!countryIds.has(airport.countryId)) {
      throw new Error(`Unknown country: ${airport.countryId}`);
    }

    const city: CityRecord = {
      id: airport.cityId,
      name: airport.city,
      countryId: airport.countryId,
    };

    const existing = cityMap.get(city.id);

    if (
      existing &&
      (existing.name !== city.name ||
       existing.countryId !== city.countryId)
    ) {
      throw new Error(`Inconsistent city data: ${city.id}`);
    }

    cityMap.set(city.id, city);
  }

  // Validate airline and city relationships.

  for (const airline of db.airlines) {
    if (!countryIds.has(airline.countryId)) {
      throw new Error(`Unknown country for airline: ${airline.id}`);
    }
  }

  const cityRows = [...cityMap.values()];

  const cityIds = new Set(cityRows.map(x => x.id));

  for (const airport of db.airports) {
    if (!cityIds.has(airport.cityId)) {
      throw new Error(`Unknown city: ${airport.cityId}`);
    }
  }

  // Validate personnel relationships.

  for (const person of db.personnel) {
    if (person.genderId && !genderIds.has(person.genderId)) {
      throw new Error(`Unknown gender for personnel: ${person.id}`);
    }

    if (person.currentLocation) {
      requireReference(
        airportByCode,
        person.currentLocation,
        `personnel location for ${person.id}`,
      );
    }

    mapPersonnelStatus(person.status);
    mapRisk(person.risk);

    parseDateOnly(person.lastUpdate, `personnel ${person.id}`);
    parseTimestamp(person.lastDecayTime, `personnel ${person.id}`);
  }

  // Prepare airport and airline records.

  const countryRows = db.countries.map(x => ({
    id: x.id,
    name: x.name,
  }));

  const genderRows = db.genders.map(x => ({
    id: x.id,
    name: x.name,
    icon: x.icon ?? null,
  }));

  const airlineRows = db.airlines.map(x => ({
    id: x.id,
    code: x.code,
    name: x.name,
    countryId: x.countryId,
  }));

  const airportRows = db.airports.map(x => ({
    id: x.id,
    code: x.code,
    name: x.name,
    cityId: x.cityId,
  }));

  // Prepare personnel records.

  const personnelRows = db.personnel.map(x => {
    const airport = x.currentLocation
      ? requireReference(
          airportByCode,
          x.currentLocation,
          `personnel ${x.id}`,
        )
      : null;

    return {
      id: x.id,
      name: x.name,
      role: x.role,
      genderId: x.genderId || null,
      lastUpdate: parseDateOnly(x.lastUpdate, x.id),
      flightHours: Number(x.flightHours),
      dailyFlightHours: Number(x.dailyFlightHours),
      fatiguePoint: Number(x.fatiguePoint),
      status: mapPersonnelStatus(x.status),
      risk: mapRisk(x.risk),
      currentLocation: x.currentLocation || null,
      currentAirportId: airport?.id ?? null,
      lastDecayTime: parseTimestamp(x.lastDecayTime, x.id),
    };
  });

  // Prepare flights and crew assignments.

  const flightRows = db.flights.map(flight => {
    const routeParts = flight.route.split(">").map(x => x.trim());

    if (routeParts.length !== 2) {
      throw new Error(`Invalid flight route: ${flight.route}`);
    }

    const origin = requireReference(
      airportByCode,
      routeParts[0],
      `flight origin ${flight.id}`,
    );

    const destination = requireReference(
      airportByCode,
      routeParts[1],
      `flight destination ${flight.id}`,
    );

    const airlineCode = flight.flightNo.split("-")[0];

    const airline = requireReference(
      airlineByCode,
      airlineCode,
      `flight airline ${flight.id}`,
    );

    requireReference(
      personnelById,
      flight.pilot,
      `flight pilot ${flight.id}`,
    );

    const departureDate = parseDateOnly(
      flight.date,
      `flight ${flight.id}`,
    );

    if (!departureDate) {
      throw new Error(`Missing date for flight ${flight.id}`);
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(flight.time)) {
      throw new Error(`Invalid departure time: ${flight.time}`);
    }

    if (!Array.isArray(flight.cabinCrew)) {
      throw new Error(`Invalid cabin crew list: ${flight.id}`);
    }

    assertUnique(
      flight.cabinCrew,
      x => x,
      `crew assignment in flight ${flight.id}`,
    );

    for (const crewId of flight.cabinCrew) {
      requireReference(
        personnelById,
        crewId,
        `cabin crew in flight ${flight.id}`,
      );
    }

    return {
      data: {
        id: flight.id,
        flightNo: flight.flightNo,
        route: flight.route,
        departureDate,
        departureTime: flight.time,
        gate: flight.gate || null,
        status: mapFlightStatus(flight.status),
        airlineId: airline.id,
        originAirportId: origin.id,
        destinationAirportId: destination.id,
        pilotId: flight.pilot,
      },
      crew: flight.cabinCrew.map(personnelId => ({
        flightId: flight.id,
        personnelId,
      })),
    };
  });

  const crewRows = flightRows.flatMap(x => x.crew);

  // Convert decimal hours into integer minutes.

  const routeRows = db.routes_duration.map(route => {
    const parts = route.id.split("-");

    if (parts.length !== 2) {
      throw new Error(`Invalid route duration ID: ${route.id}`);
    }

    const origin = requireReference(
      airportByCode,
      parts[0],
      `route origin ${route.id}`,
    );

    const destination = requireReference(
      airportByCode,
      parts[1],
      `route destination ${route.id}`,
    );

    const hours = Number(route.duration);

    if (!Number.isFinite(hours) || hours <= 0) {
      throw new Error(`Invalid duration: ${route.id}`);
    }

    const rawMinutes = hours * 60;
    const durationMinutes = Math.round(rawMinutes);

    if (Math.abs(rawMinutes - durationMinutes) > 1e-8) {
      throw new Error(`Duration cannot be converted to whole minutes: ${route.id}`);
    }

    return {
      id: route.id,
      originAirportId: origin.id,
      destinationAirportId: destination.id,
      durationMinutes,
    };
  });

  const durationIds = new Set(db.routes_duration.map(x => x.id));

  const unmatchedRoutes = [
    ...new Set(
      flightRows
        .map(x => x.data.route.replace(/\s*>\s*/g, "-"))
        .filter(route => !durationIds.has(route)),
    ),
  ];

  const expected = [
    db.countries.length,
    db.genders.length,
    cityRows.length,
    airlineRows.length,
    airportRows.length,
    personnelRows.length,
    flightRows.length,
    crewRows.length,
    routeRows.length,
  ];

  const dryRun = process.argv.includes("--dry-run");

  const getCounts = async (client: typeof prisma) =>
    Promise.all([
      client.country.count(),
      client.gender.count(),
      client.city.count(),
      client.airline.count(),
      client.airport.count(),
      client.personnel.count(),
      client.flight.count(),
      client.flightCrewAssignment.count(),
      client.routeDuration.count(),
    ]);

  const counts = await getCounts(prisma);

  if (counts.some(count => count !== 0)) {
    throw new Error(
      "Target database is not empty. Import cancelled to prevent duplicates.",
    );
  }

  console.log("\nImport validation successful.");
  console.log("Expected record counts:", expected);
  console.log("Crew assignments:", crewRows.length);
  console.log("Unmatched flight routes:", unmatchedRoutes);
  console.log("Dry-run mode:", dryRun);

  if (dryRun) {
    console.log("\nDRY RUN COMPLETE. No records were written.");
    return;
  }

  // Import all records in one database transaction.

  await prisma.$transaction(async tx => {
    const currentCounts = await Promise.all([
      tx.country.count(),
      tx.gender.count(),
      tx.city.count(),
      tx.airline.count(),
      tx.airport.count(),
      tx.personnel.count(),
      tx.flight.count(),
      tx.flightCrewAssignment.count(),
      tx.routeDuration.count(),
    ]);

    if (currentCounts.some(count => count !== 0)) {
      throw new Error("Database changed before import. Import cancelled.");
    }

    await tx.country.createMany({ data: countryRows });
    await tx.gender.createMany({ data: genderRows });
    await tx.city.createMany({ data: cityRows });
    await tx.airline.createMany({ data: airlineRows });
    await tx.airport.createMany({ data: airportRows });
    await tx.personnel.createMany({ data: personnelRows });
    await tx.flight.createMany({ data: flightRows.map(x => x.data) });
    await tx.flightCrewAssignment.createMany({ data: crewRows });
    await tx.routeDuration.createMany({ data: routeRows });

    const actualCounts = await Promise.all([
      tx.country.count(),
      tx.gender.count(),
      tx.city.count(),
      tx.airline.count(),
      tx.airport.count(),
      tx.personnel.count(),
      tx.flight.count(),
      tx.flightCrewAssignment.count(),
      tx.routeDuration.count(),
    ]);

    if (actualCounts.some((count, index) => count !== expected[index])) {
      throw new Error("Post-import count mismatch. Transaction will roll back.");
    }
  });

  console.log("\nIMPORT COMPLETED SUCCESSFULLY.");
  console.log("Imported record counts:", expected);
}

main()
  .catch((error: unknown) => {
    console.error("\nIMPORT FAILED:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });