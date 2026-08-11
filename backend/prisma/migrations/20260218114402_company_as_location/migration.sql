/*
  Warnings:

  - You are about to drop the column `geofenceRadius` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Location` DROP FOREIGN KEY `Location_organizationId_fkey`;

-- AlterTable
ALTER TABLE `Company` DROP COLUMN `geofenceRadius`,
    DROP COLUMN `location`,
    ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `capacity` INTEGER NULL,
    ADD COLUMN `enableGeofence` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `radius` DOUBLE NULL,
    ADD COLUMN `type` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Location`;
