-- AlterTable
ALTER TABLE `PayrollComponent` ADD COLUMN `createdById` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `PayrollComponent` ADD CONSTRAINT `PayrollComponent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
