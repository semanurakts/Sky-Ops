/*
  Warnings:

  - The primary key for the `Airline` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `countryId` on the `Airline` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `VarChar(10)`.
  - The primary key for the `Airport` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `city` on the `Airport` table. All the data in the column will be lost.
  - You are about to drop the column `countryId` on the `Airport` table. All the data in the column will be lost.
  - The primary key for the `Country` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Country` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `VarChar(10)`.
  - The primary key for the `Flight` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `scheduledDeparture` on the `Flight` table. All the data in the column will be lost.
  - The primary key for the `FlightCrewAssignment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Gender` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Gender` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `VarChar(10)`.
  - The primary key for the `Personnel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `genderId` on the `Personnel` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `VarChar(10)`.
  - You are about to alter the column `currentLocation` on the `Personnel` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(10)`.
  - The primary key for the `RouteDuration` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `cityId` to the `Airport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departureDate` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departureTime` to the `Flight` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Airline" DROP CONSTRAINT "Airline_countryId_fkey";

-- DropForeignKey
ALTER TABLE "Airport" DROP CONSTRAINT "Airport_countryId_fkey";

-- DropForeignKey
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_airlineId_fkey";

-- DropForeignKey
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_destinationAirportId_fkey";

-- DropForeignKey
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_originAirportId_fkey";

-- DropForeignKey
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_pilotId_fkey";

-- DropForeignKey
ALTER TABLE "FlightCrewAssignment" DROP CONSTRAINT "FlightCrewAssignment_flightId_fkey";

-- DropForeignKey
ALTER TABLE "FlightCrewAssignment" DROP CONSTRAINT "FlightCrewAssignment_personnelId_fkey";

-- DropForeignKey
ALTER TABLE "Personnel" DROP CONSTRAINT "Personnel_currentAirportId_fkey";

-- DropForeignKey
ALTER TABLE "Personnel" DROP CONSTRAINT "Personnel_genderId_fkey";

-- DropForeignKey
ALTER TABLE "RouteDuration" DROP CONSTRAINT "RouteDuration_destinationAirportId_fkey";

-- DropForeignKey
ALTER TABLE "RouteDuration" DROP CONSTRAINT "RouteDuration_originAirportId_fkey";

-- DropIndex
DROP INDEX "Country_name_key";

-- DropIndex
DROP INDEX "Flight_scheduledDeparture_idx";

-- AlterTable
ALTER TABLE "Airline" DROP CONSTRAINT "Airline_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "countryId" SET DATA TYPE VARCHAR(10),
ADD CONSTRAINT "Airline_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Airline_id_seq";

-- AlterTable
ALTER TABLE "Airport" DROP CONSTRAINT "Airport_pkey",
DROP COLUMN "city",
DROP COLUMN "countryId",
ADD COLUMN     "cityId" VARCHAR(50) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "Airport_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Airport_id_seq";

-- AlterTable
ALTER TABLE "Country" DROP CONSTRAINT "Country_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(10),
ADD CONSTRAINT "Country_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Country_id_seq";

-- AlterTable
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_pkey",
DROP COLUMN "scheduledDeparture",
ADD COLUMN     "departureDate" DATE NOT NULL,
ADD COLUMN     "departureTime" VARCHAR(5) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "airlineId" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "originAirportId" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "destinationAirportId" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "pilotId" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "Flight_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Flight_id_seq";

-- AlterTable
ALTER TABLE "FlightCrewAssignment" DROP CONSTRAINT "FlightCrewAssignment_pkey",
ALTER COLUMN "flightId" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "personnelId" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "FlightCrewAssignment_pkey" PRIMARY KEY ("flightId", "personnelId");

-- AlterTable
ALTER TABLE "Gender" DROP CONSTRAINT "Gender_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(10),
ADD CONSTRAINT "Gender_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Gender_id_seq";

-- AlterTable
ALTER TABLE "Personnel" DROP CONSTRAINT "Personnel_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "genderId" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "lastUpdate" SET DATA TYPE DATE,
ALTER COLUMN "status" SET DEFAULT 'AVAILABLE',
ALTER COLUMN "currentLocation" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "currentAirportId" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Personnel_id_seq";

-- AlterTable
ALTER TABLE "RouteDuration" DROP CONSTRAINT "RouteDuration_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "originAirportId" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "destinationAirportId" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "RouteDuration_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RouteDuration_id_seq";

-- CreateTable
CREATE TABLE "City" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "countryId" VARCHAR(10) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- CreateIndex
CREATE INDEX "Flight_departureDate_departureTime_idx" ON "Flight"("departureDate", "departureTime");

-- CreateIndex
CREATE INDEX "Personnel_status_idx" ON "Personnel"("status");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airline" ADD CONSTRAINT "Airline_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_genderId_fkey" FOREIGN KEY ("genderId") REFERENCES "Gender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_currentAirportId_fkey" FOREIGN KEY ("currentAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightCrewAssignment" ADD CONSTRAINT "FlightCrewAssignment_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightCrewAssignment" ADD CONSTRAINT "FlightCrewAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteDuration" ADD CONSTRAINT "RouteDuration_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteDuration" ADD CONSTRAINT "RouteDuration_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
