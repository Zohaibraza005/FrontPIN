/*
  Warnings:

  - You are about to drop the column `bonus` on the `Payroll` table. All the data in the column will be lost.
  - You are about to drop the column `deductions` on the `Payroll` table. All the data in the column will be lost.
  - You are about to drop the column `overtimeAmount` on the `Payroll` table. All the data in the column will be lost.
  - You are about to drop the `PayrollAdjustment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `PayrollAdjustment` DROP FOREIGN KEY `PayrollAdjustment_payrollId_fkey`;

-- AlterTable
ALTER TABLE `Payroll` DROP COLUMN `bonus`,
    DROP COLUMN `deductions`,
    DROP COLUMN `overtimeAmount`,
    ADD COLUMN `isEditable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `locked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `runId` INTEGER NULL,
    ADD COLUMN `transactionRef` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `PayrollAdjustment`;

-- CreateTable
CREATE TABLE `PayrollRun` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    `totalEmployees` INTEGER NOT NULL DEFAULT 0,
    `totalGross` DOUBLE NOT NULL DEFAULT 0,
    `totalNet` DOUBLE NOT NULL DEFAULT 0,
    `lockedAt` DATETIME(3) NULL,
    `generatedById` INTEGER NOT NULL,
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PayrollRun_organizationId_month_year_key`(`organizationId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollComponent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payrollId` INTEGER NOT NULL,
    `type` ENUM('BASIC', 'ALLOWANCE', 'BONUS', 'COMMISSION', 'TAX', 'LOAN', 'DEDUCTION', 'OVERTIME') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `isTaxable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollAuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payrollId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `performedById` INTEGER NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Payroll` ADD CONSTRAINT `Payroll_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `PayrollRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRun` ADD CONSTRAINT `PayrollRun_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRun` ADD CONSTRAINT `PayrollRun_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRun` ADD CONSTRAINT `PayrollRun_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollComponent` ADD CONSTRAINT `PayrollComponent_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollAuditLog` ADD CONSTRAINT `PayrollAuditLog_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollAuditLog` ADD CONSTRAINT `PayrollAuditLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
