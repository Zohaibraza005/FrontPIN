-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `gender` VARCHAR(191) NULL,
    ADD COLUMN `age` INTEGER NULL,
    ADD COLUMN `qualification` VARCHAR(191) NULL,
    ADD COLUMN `maritalStatus` VARCHAR(191) NULL,
    ADD COLUMN `religion` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `EmployeeJob` ADD COLUMN `joiningDate` DATETIME(3) NULL;
