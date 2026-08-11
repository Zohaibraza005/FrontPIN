/*
  Warnings:

  - A unique constraint covering the columns `[employeeId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `canLogin` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `employeeId` VARCHAR(191) NULL,
    ADD COLUMN `nationalId` VARCHAR(191) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL,
    MODIFY `password` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_employeeId_key` ON `Employee`(`employeeId`);
