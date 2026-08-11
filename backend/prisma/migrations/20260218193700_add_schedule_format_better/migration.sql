-- CreateTable
CREATE TABLE `Schedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `days` JSON NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `companyId` INTEGER NULL,
    `allowEarlyIn` BOOLEAN NOT NULL DEFAULT false,
    `earlyInMinutes` INTEGER NULL,
    `allowEarlyOut` BOOLEAN NOT NULL DEFAULT false,
    `earlyOutMinutes` INTEGER NULL,
    `overtimeAllowed` BOOLEAN NOT NULL DEFAULT false,
    `overtimeMinutes` INTEGER NULL,
    `breaksAllowed` BOOLEAN NOT NULL DEFAULT false,
    `breakDurations` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Schedule_employeeId_idx`(`employeeId`),
    INDEX `Schedule_companyId_idx`(`companyId`),
    INDEX `Schedule_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
