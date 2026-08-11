-- CreateTable
CREATE TABLE `Attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `checkInTime` DATETIME(3) NULL,
    `checkInLat` DOUBLE NULL,
    `checkInLong` DOUBLE NULL,
    `checkInIP` VARCHAR(191) NULL,
    `checkInMethod` VARCHAR(191) NULL,
    `checkInDevice` VARCHAR(191) NULL,
    `checkOutTime` DATETIME(3) NULL,
    `checkOutLat` DOUBLE NULL,
    `checkOutLong` DOUBLE NULL,
    `checkOutIP` VARCHAR(191) NULL,
    `checkOutMethod` VARCHAR(191) NULL,
    `checkOutDevice` VARCHAR(191) NULL,
    `isLate` BOOLEAN NOT NULL DEFAULT false,
    `lateMinutes` INTEGER NOT NULL DEFAULT 0,
    `isEarlyOut` BOOLEAN NOT NULL DEFAULT false,
    `earlyOutMinutes` INTEGER NOT NULL DEFAULT 0,
    `overtimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `totalWorkedMinutes` INTEGER NOT NULL DEFAULT 0,
    `totalBreakMinutes` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL,
    `autoClockedOut` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Attendance_employeeId_idx`(`employeeId`),
    UNIQUE INDEX `Attendance_employeeId_date_key`(`employeeId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendancePunch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attendanceId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `punchTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `ip` VARCHAR(191) NULL,
    `device` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttendancePunch_employeeId_idx`(`employeeId`),
    INDEX `AttendancePunch_attendanceId_idx`(`attendanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attendanceId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `taskId` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `autoStopped` BOOLEAN NOT NULL DEFAULT false,
    `idleDetected` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_employeeId_idx`(`employeeId`),
    INDEX `ActivityLog_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceAuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attendanceId` INTEGER NOT NULL,
    `editedById` INTEGER NOT NULL,
    `fieldChanged` VARCHAR(191) NOT NULL,
    `oldValue` VARCHAR(191) NULL,
    `newValue` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePunch` ADD CONSTRAINT `AttendancePunch_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePunch` ADD CONSTRAINT `AttendancePunch_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceAuditLog` ADD CONSTRAINT `AttendanceAuditLog_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceAuditLog` ADD CONSTRAINT `AttendanceAuditLog_editedById_fkey` FOREIGN KEY (`editedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
