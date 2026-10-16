-- Schedule history: every schedule change is stored as a version that applies from `effectiveFrom`
-- (a "YYYY-MM-DD" date in the employee's local time) until the next version starts.
-- Attendance for a date is evaluated with the version valid on that date, so past days keep
-- the timing they had when they were worked.
CREATE TABLE IF NOT EXISTS `scheduleversion` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employeeId` INT NOT NULL,
  `effectiveFrom` VARCHAR(10) NOT NULL,
  `days` JSON NOT NULL,
  `startTime` VARCHAR(191) NOT NULL,
  `endTime` VARCHAR(191) NOT NULL,
  `companyId` INT NULL,
  `allowEarlyIn` BOOLEAN NOT NULL DEFAULT false,
  `earlyInMinutes` INT NULL,
  `allowEarlyOut` BOOLEAN NOT NULL DEFAULT false,
  `earlyOutMinutes` INT NULL,
  `overtimeAllowed` BOOLEAN NOT NULL DEFAULT false,
  `overtimeMinutes` INT NULL,
  `allowHalfDay` BOOLEAN NOT NULL DEFAULT false,
  `halfDayMinutes` INT NULL,
  `breaksAllowed` BOOLEAN NOT NULL DEFAULT false,
  `breakDurations` JSON NULL,
  `appliedAt` DATETIME(3) NULL,
  `changedById` INT NULL,
  `changedByName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `scheduleversion_employeeId_effectiveFrom_key` (`employeeId`, `effectiveFrom`),
  CONSTRAINT `scheduleversion_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Baseline: today's schedule of every employee becomes the version that covers all past dates,
-- so nothing about existing attendance changes when this feature is introduced.
INSERT IGNORE INTO `scheduleversion`
  (`employeeId`, `effectiveFrom`, `days`, `startTime`, `endTime`, `companyId`,
   `allowEarlyIn`, `earlyInMinutes`, `allowEarlyOut`, `earlyOutMinutes`,
   `overtimeAllowed`, `overtimeMinutes`, `allowHalfDay`, `halfDayMinutes`,
   `breaksAllowed`, `breakDurations`, `appliedAt`, `changedByName`)
SELECT s.`employeeId`, '1970-01-01', s.`days`, s.`startTime`, s.`endTime`, s.`companyId`,
       s.`allowEarlyIn`, s.`earlyInMinutes`, s.`allowEarlyOut`, s.`earlyOutMinutes`,
       s.`overtimeAllowed`, s.`overtimeMinutes`, s.`allowHalfDay`, s.`halfDayMinutes`,
       s.`breaksAllowed`, s.`breakDurations`, CURRENT_TIMESTAMP(3), 'Baseline'
FROM `schedule` s
JOIN (SELECT `employeeId`, MAX(`id`) AS `id` FROM `schedule` WHERE `deletedAt` IS NULL GROUP BY `employeeId`) latest
  ON latest.`id` = s.`id`;
