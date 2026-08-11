/*
  Warnings:

  - You are about to drop the column `status` on the `Employee` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Employee_deletedAt_idx` ON `Employee`;

-- AlterTable
ALTER TABLE `Employee` DROP COLUMN `status`,
    ADD COLUMN `departmentId` INTEGER NULL,
    ADD COLUMN `profileImage` VARCHAR(191) NULL,
    ADD COLUMN `supervisorId` INTEGER NULL;

-- CreateTable
CREATE TABLE `EmployeeJob` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `employmentStatus` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `hiringDate` DATETIME(3) NULL,
    `workMode` VARCHAR(191) NULL,
    `allowExtraHours` BOOLEAN NOT NULL DEFAULT false,
    `maxExtraHours` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmployeeJob_employeeId_key`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeePayroll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `payoutType` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `cycleDate` INTEGER NOT NULL,
    `overtimeRate` DOUBLE NULL,
    `annualLeaves` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmployeePayroll_employeeId_key`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeIncrement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `previousSalary` DOUBLE NOT NULL,
    `newSalary` DOUBLE NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmployeeIncrement_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeePrivilege` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `privilege` VARCHAR(191) NOT NULL,

    INDEX `EmployeePrivilege_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Employee_departmentId_idx` ON `Employee`(`departmentId`);

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeJob` ADD CONSTRAINT `EmployeeJob_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeePayroll` ADD CONSTRAINT `EmployeePayroll_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeIncrement` ADD CONSTRAINT `EmployeeIncrement_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeePrivilege` ADD CONSTRAINT `EmployeePrivilege_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
