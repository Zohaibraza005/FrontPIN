-- DropForeignKey
ALTER TABLE `PayrollAuditLog` DROP FOREIGN KEY `PayrollAuditLog_payrollId_fkey`;

-- AddForeignKey
ALTER TABLE `PayrollAuditLog` ADD CONSTRAINT `PayrollAuditLog_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
