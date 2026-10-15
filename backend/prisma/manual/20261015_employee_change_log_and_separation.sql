-- Employee change history + separation details (additive; safe to run once)
CREATE TABLE IF NOT EXISTS `employeechangelog` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employeeId` INT NOT NULL,
  `field` VARCHAR(64) NOT NULL,
  `oldValue` VARCHAR(255) NULL,
  `newValue` VARCHAR(255) NULL,
  `note` TEXT NULL,
  `changedById` INT NULL,
  `changedByName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `employeechangelog_employeeId_idx` (`employeeId`),
  CONSTRAINT `employeechangelog_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `employeejob`
  ADD COLUMN IF NOT EXISTS `separationType` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `separationReason` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `separationDate` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `clearanceDate` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `separationComments` TEXT NULL;
