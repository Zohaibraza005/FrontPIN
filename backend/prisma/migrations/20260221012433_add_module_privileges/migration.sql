/*
  Warnings:

  - You are about to drop the column `privilege` on the `EmployeePrivilege` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId,module]` on the table `EmployeePrivilege` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `module` to the `EmployeePrivilege` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `EmployeePrivilege` DROP COLUMN `privilege`,
    ADD COLUMN `canCreate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canDelete` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canRead` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canUpdate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `module` ENUM('EMPLOYEE', 'ATTENDANCE', 'LEAVE', 'PROJECT', 'TASK', 'INVOICE', 'REPORT', 'OVERTIME') NOT NULL,
    ADD COLUMN `ownTeamOnly` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `EmployeePrivilege_employeeId_module_key` ON `EmployeePrivilege`(`employeeId`, `module`);
