/*
  Warnings:

  - Made the column `method` on table `AttendancePunch` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `AttendancePunch` MODIFY `method` VARCHAR(191) NOT NULL;
