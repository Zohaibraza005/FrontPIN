-- CreateTable
CREATE TABLE `Remark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `content` VARCHAR(191) NOT NULL,
    `taskId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Remark_taskId_idx`(`taskId`),
    INDEX `Remark_createdById_idx`(`createdById`),
    INDEX `Remark_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RemarkAttachment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `remarkId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RemarkAttachment_remarkId_idx`(`remarkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Remark` ADD CONSTRAINT `Remark_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Remark` ADD CONSTRAINT `Remark_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RemarkAttachment` ADD CONSTRAINT `RemarkAttachment_remarkId_fkey` FOREIGN KEY (`remarkId`) REFERENCES `Remark`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
