-- CreateTable
CREATE TABLE `Payroll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `organizationId` INTEGER NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `payoutType` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `workingDays` INTEGER NOT NULL,
    `presentDays` INTEGER NOT NULL,
    `absentDays` INTEGER NOT NULL,
    `leaveDays` INTEGER NOT NULL,
    `lateDays` INTEGER NOT NULL,
    `overtimeHours` DOUBLE NOT NULL DEFAULT 0,
    `overtimeAmount` DOUBLE NOT NULL DEFAULT 0,
    `bonus` DOUBLE NOT NULL DEFAULT 0,
    `deductions` DOUBLE NOT NULL DEFAULT 0,
    `grossSalary` DOUBLE NOT NULL,
    `netSalary` DOUBLE NOT NULL,
    `status` ENUM('DRAFT', 'GENERATED', 'PAID') NOT NULL DEFAULT 'GENERATED',
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payroll_employeeId_idx`(`employeeId`),
    INDEX `Payroll_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Payroll` ADD CONSTRAINT `Payroll_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payroll` ADD CONSTRAINT `Payroll_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payroll` ADD CONSTRAINT `Payroll_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
