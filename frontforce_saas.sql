-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 10, 2026 at 04:02 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `frontforce_saas`
--

-- --------------------------------------------------------

--
-- Table structure for table `activitylog`
--

CREATE TABLE `activitylog` (
  `id` int(11) NOT NULL,
  `attendanceId` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `taskId` int(11) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `startTime` datetime(3) NOT NULL,
  `endTime` datetime(3) DEFAULT NULL,
  `durationMinutes` int(11) DEFAULT NULL,
  `autoStopped` tinyint(1) NOT NULL DEFAULT 0,
  `idleDetected` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activitylog`
--

INSERT INTO `activitylog` (`id`, `attendanceId`, `employeeId`, `taskId`, `type`, `startTime`, `endTime`, `durationMinutes`, `autoStopped`, `idleDetected`, `createdAt`) VALUES
(1, 1, 4, NULL, 'activity', '2026-08-05 13:14:36.438', '2026-08-05 13:15:38.006', 1, 0, 0, '2026-08-05 13:14:36.440'),
(2, 1, 4, 1, 'task', '2026-08-05 13:15:38.012', '2026-08-05 13:16:35.179', 0, 0, 0, '2026-08-05 13:15:38.013'),
(3, 1, 4, NULL, 'activity', '2026-08-05 13:16:35.184', NULL, NULL, 0, 0, '2026-08-05 13:16:35.185'),
(4, 1, 4, NULL, 'BREAK', '2026-08-05 13:17:18.641', '2026-08-05 13:17:20.365', 0, 0, 0, '2026-08-05 13:17:18.643'),
(5, 2, 2, NULL, 'activity', '2026-08-06 05:00:50.826', NULL, NULL, 0, 0, '2026-08-06 05:00:50.834'),
(6, 2, 2, NULL, 'BREAK', '2026-08-06 07:42:52.396', '2026-08-06 07:43:04.343', 0, 0, 0, '2026-08-06 07:42:52.398'),
(7, 2, 2, NULL, 'BREAK', '2026-08-06 07:43:14.149', '2026-08-06 09:26:49.299', 103, 0, 0, '2026-08-06 07:43:14.152'),
(8, 3, 4, NULL, 'activity', '2026-08-06 07:49:08.010', NULL, NULL, 0, 0, '2026-08-06 07:49:08.011'),
(9, 4, 3, NULL, 'activity', '2026-08-06 07:50:16.000', NULL, NULL, 0, 0, '2026-08-06 07:50:16.002'),
(10, 4, 3, NULL, 'BREAK', '2026-08-06 09:33:09.556', '2026-08-06 09:33:10.564', 0, 0, 0, '2026-08-06 09:33:09.559'),
(11, 5, 2, NULL, 'activity', '2026-08-07 04:27:05.624', NULL, NULL, 0, 0, '2026-08-07 04:27:05.627'),
(12, 6, 4, 2, 'task', '2026-08-07 04:28:38.480', NULL, NULL, 0, 0, '2026-08-07 04:28:38.481'),
(13, 14, 3, NULL, 'activity', '2026-08-10 08:00:35.501', NULL, NULL, 0, 0, '2026-08-10 08:00:35.503'),
(14, 14, 3, NULL, 'BREAK', '2026-08-10 08:01:22.133', '2026-08-10 08:56:39.225', 55, 0, 0, '2026-08-10 08:01:22.136'),
(15, 14, 3, NULL, 'BREAK', '2026-08-10 09:37:20.684', '2026-08-10 09:51:25.640', 14, 0, 0, '2026-08-10 09:37:20.685'),
(16, 14, 3, NULL, 'BREAK', '2026-08-10 09:51:28.299', '2026-08-10 09:58:11.359', 6, 0, 0, '2026-08-10 09:51:28.302'),
(17, 14, 3, NULL, 'BREAK', '2026-08-10 10:03:44.396', '2026-08-10 10:03:46.626', 0, 0, 0, '2026-08-10 10:03:44.397'),
(18, 14, 3, NULL, 'BREAK', '2026-08-10 10:05:33.363', '2026-08-10 10:05:43.835', 0, 0, 0, '2026-08-10 10:05:33.365'),
(19, 14, 3, NULL, 'BREAK', '2026-08-10 10:06:52.883', '2026-08-10 10:07:52.496', 0, 0, 0, '2026-08-10 10:06:52.886'),
(20, 14, 3, NULL, 'BREAK', '2026-08-10 10:08:31.538', '2026-08-10 10:08:40.983', 0, 0, 0, '2026-08-10 10:08:31.539'),
(21, 14, 3, NULL, 'BREAK', '2026-08-10 10:10:14.640', '2026-08-10 10:10:28.902', 0, 0, 0, '2026-08-10 10:10:14.641');

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `date` datetime(3) NOT NULL,
  `checkInTime` datetime(3) DEFAULT NULL,
  `checkInLat` double DEFAULT NULL,
  `checkInLong` double DEFAULT NULL,
  `checkInIP` varchar(191) DEFAULT NULL,
  `checkInMethod` varchar(191) DEFAULT NULL,
  `checkInDevice` varchar(191) DEFAULT NULL,
  `checkOutTime` datetime(3) DEFAULT NULL,
  `checkOutLat` double DEFAULT NULL,
  `checkOutLong` double DEFAULT NULL,
  `checkOutIP` varchar(191) DEFAULT NULL,
  `checkOutMethod` varchar(191) DEFAULT NULL,
  `checkOutDevice` varchar(191) DEFAULT NULL,
  `isLate` tinyint(1) NOT NULL DEFAULT 0,
  `lateMinutes` int(11) NOT NULL DEFAULT 0,
  `isEarlyOut` tinyint(1) NOT NULL DEFAULT 0,
  `earlyOutMinutes` int(11) NOT NULL DEFAULT 0,
  `overtimeMinutes` int(11) NOT NULL DEFAULT 0,
  `totalWorkedMinutes` int(11) NOT NULL DEFAULT 0,
  `totalBreakMinutes` int(11) NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL,
  `autoClockedOut` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `shiftEndTime` varchar(191) DEFAULT NULL,
  `shiftStartTime` varchar(191) DEFAULT NULL,
  `summary` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `employeeId`, `date`, `checkInTime`, `checkInLat`, `checkInLong`, `checkInIP`, `checkInMethod`, `checkInDevice`, `checkOutTime`, `checkOutLat`, `checkOutLong`, `checkOutIP`, `checkOutMethod`, `checkOutDevice`, `isLate`, `lateMinutes`, `isEarlyOut`, `earlyOutMinutes`, `overtimeMinutes`, `totalWorkedMinutes`, `totalBreakMinutes`, `status`, `autoClockedOut`, `createdAt`, `updatedAt`, `deletedAt`, `shiftEndTime`, `shiftStartTime`, `summary`) VALUES
(1, 4, '2026-08-05 00:00:00.000', NULL, 0, 0, '::1', 'PIN', NULL, NULL, 31.47107177153438, 74.27217610685908, '::1', 'PIN', NULL, 1, 254, 0, 0, 0, 0, 0, 'LEAVE', 0, '2026-08-05 13:14:36.427', '2026-08-07 13:42:02.991', NULL, '18:00', '09:00', 'done by shift end'),
(2, 2, '2026-08-06 00:00:00.000', '2026-08-06 05:00:50.817', 0, 0, '::1', 'PIN', NULL, '2026-08-06 14:50:00.000', 31.47102280522352, 74.27219112433964, '::1', 'PIN', NULL, 0, 0, 0, 0, 0, 0, 0, 'PRESENT', 0, '2026-08-06 05:00:50.826', '2026-08-07 11:32:21.476', NULL, '18:00', '09:00', 'no'),
(3, 4, '2026-08-06 00:00:00.000', '2026-08-06 02:50:00.000', 0, 0, '::1', 'PIN', NULL, '2026-08-06 13:40:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 650, 0, 'PRESENT', 0, '2026-08-06 07:49:07.994', '2026-08-07 13:40:36.351', NULL, '18:00', '09:00', NULL),
(4, 3, '2026-08-06 00:00:00.000', '2026-08-06 07:50:15.988', 0, 0, '::1', 'PIN', NULL, '2026-08-06 11:57:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 246, 0, 'PRESENT', 0, '2026-08-06 07:50:15.990', '2026-08-07 11:57:10.379', NULL, '18:00', '09:00', NULL),
(5, 2, '2026-08-07 00:00:00.000', '2026-08-07 04:27:05.618', 0, 0, '::1', 'PIN', NULL, '2026-08-07 14:06:36.007', 31.47101756521755, 74.2721881116787, '::1', 'PIN', NULL, 0, 0, 0, 0, 0, 0, 0, 'PRESENT', 0, '2026-08-07 04:27:05.620', '2026-08-07 14:06:36.009', NULL, '18:00', '09:00', 'nothing'),
(6, 4, '2026-08-07 00:00:00.000', '2026-08-07 04:28:38.461', 0, 0, '::1', 'PIN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 'PRESENT', 0, '2026-08-07 04:28:38.463', '2026-08-07 04:28:38.463', NULL, '18:00', '09:00', NULL),
(7, 3, '2026-08-06 19:00:00.000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 'ABSENT', 0, '2026-08-07 04:54:12.966', '2026-08-07 13:46:42.542', NULL, NULL, NULL, NULL),
(8, 2, '2026-08-04 19:00:00.000', '2026-08-05 04:00:00.000', NULL, NULL, NULL, NULL, NULL, '2026-08-05 12:00:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 480, 0, 'PRESENT', 0, '2026-08-07 11:20:28.539', '2026-08-07 13:46:04.638', NULL, NULL, NULL, NULL),
(9, 2, '2026-08-08 19:00:00.000', '2026-08-09 04:00:00.000', NULL, NULL, NULL, NULL, NULL, '2026-08-09 12:00:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 480, 0, 'PRESENT', 0, '2026-08-07 11:36:51.851', '2026-08-07 12:31:48.313', NULL, NULL, NULL, NULL),
(10, 2, '2026-08-03 19:00:00.000', '2026-08-04 05:00:00.000', NULL, NULL, NULL, NULL, NULL, '2026-08-04 12:00:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 420, 0, 'PRESENT', 0, '2026-08-07 11:54:26.284', '2026-08-07 11:54:26.284', NULL, NULL, NULL, NULL),
(11, 3, '2026-08-02 19:00:00.000', '2026-08-03 04:00:00.000', NULL, NULL, NULL, NULL, NULL, '2026-08-03 12:00:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 480, 0, 'PRESENT', 0, '2026-08-07 11:55:19.768', '2026-08-07 11:56:23.682', NULL, NULL, NULL, NULL),
(12, 3, '2026-08-03 19:00:00.000', '2026-08-04 04:00:00.000', NULL, NULL, NULL, NULL, NULL, '2026-08-04 12:00:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 480, 0, 'LATE', 0, '2026-08-07 11:56:33.505', '2026-08-07 13:44:28.103', NULL, NULL, NULL, NULL),
(13, 3, '2026-08-04 19:00:00.000', '2026-08-05 04:00:00.000', NULL, NULL, NULL, NULL, NULL, '2026-08-05 12:00:00.000', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 480, 0, 'PRESENT', 0, '2026-08-07 11:56:41.871', '2026-08-07 13:42:33.228', NULL, NULL, NULL, NULL),
(14, 3, '2026-08-10 00:00:00.000', '2026-08-10 08:00:35.493', 0, 0, '::1', 'PIN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 75, 'PRESENT', 0, '2026-08-10 08:00:35.495', '2026-08-10 10:10:28.933', NULL, '18:00', '09:00', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `attendanceauditlog`
--

CREATE TABLE `attendanceauditlog` (
  `id` int(11) NOT NULL,
  `attendanceId` int(11) NOT NULL,
  `editedById` int(11) NOT NULL,
  `fieldChanged` varchar(191) NOT NULL,
  `oldValue` varchar(191) DEFAULT NULL,
  `newValue` varchar(191) DEFAULT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendancepunch`
--

CREATE TABLE `attendancepunch` (
  `id` int(11) NOT NULL,
  `attendanceId` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `type` varchar(191) NOT NULL,
  `punchTime` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `ip` varchar(191) DEFAULT NULL,
  `device` varchar(191) DEFAULT NULL,
  `method` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendancepunch`
--

INSERT INTO `attendancepunch` (`id`, `attendanceId`, `employeeId`, `type`, `punchTime`, `lat`, `lng`, `ip`, `device`, `method`, `createdAt`) VALUES
(1, 1, 4, 'CHECK_IN', '2026-08-05 13:14:36.443', 0, 0, '::1', NULL, 'PIN', '2026-08-05 13:14:36.444'),
(2, 1, 4, 'CHECK_OUT', '2026-08-05 13:17:39.516', NULL, NULL, '::1', NULL, 'PIN', '2026-08-05 13:17:39.522'),
(3, 2, 2, 'CHECK_IN', '2026-08-06 05:00:50.833', 0, 0, '::1', NULL, 'PIN', '2026-08-06 05:00:50.842'),
(4, 3, 4, 'CHECK_IN', '2026-08-06 07:49:08.013', 0, 0, '::1', NULL, 'PIN', '2026-08-06 07:49:08.014'),
(5, 4, 3, 'CHECK_IN', '2026-08-06 07:50:16.009', 0, 0, '::1', NULL, 'PIN', '2026-08-06 07:50:16.011'),
(6, 2, 2, 'CHECK_OUT', '2026-08-06 10:49:50.753', NULL, NULL, '::1', NULL, 'PIN', '2026-08-06 10:49:50.768'),
(7, 5, 2, 'CHECK_IN', '2026-08-07 04:27:05.631', 0, 0, '::1', NULL, 'PIN', '2026-08-07 04:27:05.633'),
(8, 6, 4, 'CHECK_IN', '2026-08-07 04:28:38.483', 0, 0, '::1', NULL, 'PIN', '2026-08-07 04:28:38.484'),
(9, 5, 2, 'CHECK_OUT', '2026-08-07 14:06:36.007', NULL, NULL, '::1', NULL, 'PIN', '2026-08-07 14:06:36.019'),
(10, 14, 3, 'CHECK_IN', '2026-08-10 08:00:35.510', 0, 0, '::1', NULL, 'PIN', '2026-08-10 08:00:35.512');

-- --------------------------------------------------------

--
-- Table structure for table `candidate`
--

CREATE TABLE `candidate` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `cnic` varchar(191) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `qualification` varchar(191) DEFAULT NULL,
  `experience` int(11) DEFAULT NULL,
  `cvUrl` varchar(191) DEFAULT NULL,
  `status` enum('APPLIED','SHORTLISTED','INTERVIEW','OFFERED','HIRED','REJECTED') NOT NULL DEFAULT 'APPLIED',
  `jobId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client`
--

CREATE TABLE `client` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `address` varchar(191) NOT NULL,
  `city` varchar(191) NOT NULL,
  `state` varchar(191) NOT NULL,
  `zip` varchar(191) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `client`
--

INSERT INTO `client` (`id`, `name`, `phone`, `email`, `address`, `city`, `state`, `zip`, `organizationId`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
(1, 'Raza', '332475792983', 'basil480@gmail.com', 'Lahore, johar town', 'Lahore', 'Punjab', '1212', 2, '2026-08-06 09:38:02.095', '2026-08-06 09:38:02.095', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `company`
--

CREATE TABLE `company` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `timezone` varchar(191) DEFAULT NULL,
  `organizationId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `address` varchar(191) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `enableGeofence` tinyint(1) NOT NULL DEFAULT 0,
  `radius` double DEFAULT NULL,
  `type` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company`
--

INSERT INTO `company` (`id`, `name`, `latitude`, `longitude`, `timezone`, `organizationId`, `createdAt`, `updatedAt`, `deletedAt`, `active`, `address`, `capacity`, `enableGeofence`, `radius`, `type`) VALUES
(1, 'Head Office', NULL, NULL, 'Africa/Abidjan', 2, '2026-08-05 13:07:48.727', '2026-08-10 13:30:21.213', NULL, 1, 'Karachi', 100, 0, 0, 'office'),
(2, 'Head Office', NULL, NULL, NULL, 3, '2026-08-05 13:08:35.606', '2026-08-05 13:08:35.606', NULL, 1, 'Karachi', NULL, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `organizationId` int(11) NOT NULL,
  `companyId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `department`
--

INSERT INTO `department` (`id`, `title`, `status`, `organizationId`, `companyId`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
(1, 'Tech', 'active', 2, 1, '2026-08-05 13:12:35.706', '2026-08-10 13:49:04.665', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `employee`
--

CREATE TABLE `employee` (
  `id` int(11) NOT NULL,
  `firstName` varchar(191) NOT NULL,
  `lastName` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) DEFAULT NULL,
  `pin` varchar(191) DEFAULT NULL,
  `role` enum('ADMIN','SUPERVISOR','USER') NOT NULL DEFAULT 'USER',
  `organizationId` int(11) NOT NULL,
  `companyId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `departmentId` int(11) DEFAULT NULL,
  `profileImage` varchar(191) DEFAULT NULL,
  `supervisorId` int(11) DEFAULT NULL,
  `canLogin` tinyint(1) NOT NULL DEFAULT 1,
  `employeeId` varchar(191) DEFAULT NULL,
  `nationalId` varchar(191) DEFAULT NULL,
  `phoneNumber` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employee`
--

INSERT INTO `employee` (`id`, `firstName`, `lastName`, `username`, `email`, `password`, `pin`, `role`, `organizationId`, `companyId`, `createdAt`, `updatedAt`, `deletedAt`, `departmentId`, `profileImage`, `supervisorId`, `canLogin`, `employeeId`, `nationalId`, `phoneNumber`) VALUES
(2, 'Admin', 'User', 'admin', 'admin@test.com', '$2b$10$DFtca1P8eBGn.YG3T0srvuEnKtuhlBxUgwNQgRpdjKdmjgI7stvcy', '1234', 'ADMIN', 2, 1, '2026-08-05 13:07:48.804', '2026-08-05 13:07:48.804', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL),
(3, 'Supervisor', 'User', 'supervisor', 'supervisor@test.com', '$2b$10$DFtca1P8eBGn.YG3T0srvuEnKtuhlBxUgwNQgRpdjKdmjgI7stvcy', '1234', 'SUPERVISOR', 2, 1, '2026-08-05 13:07:48.819', '2026-08-10 14:00:26.675', NULL, 1, NULL, NULL, 1, NULL, NULL, NULL),
(4, 'Agent', 'User', 'agent', 'agent@test.com', '$2b$10$DFtca1P8eBGn.YG3T0srvuEnKtuhlBxUgwNQgRpdjKdmjgI7stvcy', '1234', 'USER', 2, 1, '2026-08-05 13:07:48.823', '2026-08-05 13:07:48.823', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `employeeincrement`
--

CREATE TABLE `employeeincrement` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `type` varchar(191) NOT NULL,
  `value` double NOT NULL,
  `previousSalary` double NOT NULL,
  `newSalary` double NOT NULL,
  `effectiveDate` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employeejob`
--

CREATE TABLE `employeejob` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `employmentStatus` varchar(191) DEFAULT NULL,
  `designation` varchar(191) DEFAULT NULL,
  `hiringDate` datetime(3) DEFAULT NULL,
  `workMode` varchar(191) DEFAULT NULL,
  `allowExtraHours` tinyint(1) NOT NULL DEFAULT 0,
  `maxExtraHours` int(11) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employeejob`
--

INSERT INTO `employeejob` (`id`, `employeeId`, `employmentStatus`, `designation`, `hiringDate`, `workMode`, `allowExtraHours`, `maxExtraHours`, `createdAt`, `updatedAt`) VALUES
(1, 3, 'Active', NULL, NULL, 'On-site', 0, NULL, '2026-08-10 14:00:26.675', '2026-08-10 14:00:26.675');

-- --------------------------------------------------------

--
-- Table structure for table `employeepayroll`
--

CREATE TABLE `employeepayroll` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `payoutType` varchar(191) NOT NULL,
  `rate` double NOT NULL,
  `currency` varchar(191) NOT NULL,
  `cycleDate` int(11) NOT NULL,
  `overtimeRate` double DEFAULT NULL,
  `annualLeaves` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employeeprivilege`
--

CREATE TABLE `employeeprivilege` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `canCreate` tinyint(1) NOT NULL DEFAULT 0,
  `canDelete` tinyint(1) NOT NULL DEFAULT 0,
  `canRead` tinyint(1) NOT NULL DEFAULT 1,
  `canUpdate` tinyint(1) NOT NULL DEFAULT 0,
  `module` enum('EMPLOYEE','ATTENDANCE','LEAVE','PROJECT','TASK','INVOICE','REPORT','OVERTIME','ENABLE_GPS') NOT NULL,
  `ownTeamOnly` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice`
--

CREATE TABLE `invoice` (
  `id` int(11) NOT NULL,
  `invoiceNumber` varchar(191) NOT NULL,
  `companyId` int(11) NOT NULL,
  `clientId` int(11) DEFAULT NULL,
  `organizationId` int(11) NOT NULL,
  `issueDate` datetime(3) NOT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `currency` varchar(191) NOT NULL,
  `subtotal` double NOT NULL,
  `discount` double NOT NULL,
  `tax` double NOT NULL,
  `total` double NOT NULL,
  `paidAmount` double NOT NULL DEFAULT 0,
  `balance` double NOT NULL,
  `status` enum('DRAFT','UNPAID','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED') NOT NULL DEFAULT 'UNPAID',
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoicecompany`
--

CREATE TABLE `invoicecompany` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `vat` varchar(191) DEFAULT NULL,
  `logoUrl` varchar(191) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `organizationId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoiceitem`
--

CREATE TABLE `invoiceitem` (
  `id` int(11) NOT NULL,
  `invoiceId` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `quantity` double NOT NULL,
  `unitPrice` double NOT NULL,
  `discountType` varchar(191) NOT NULL,
  `discountValue` double NOT NULL,
  `total` double NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoicelog`
--

CREATE TABLE `invoicelog` (
  `id` int(11) NOT NULL,
  `invoiceId` int(11) NOT NULL,
  `action` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoicetransaction`
--

CREATE TABLE `invoicetransaction` (
  `id` int(11) NOT NULL,
  `invoiceId` int(11) NOT NULL,
  `amount` double NOT NULL,
  `paymentMethod` varchar(191) DEFAULT NULL,
  `reference` varchar(191) DEFAULT NULL,
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job`
--

CREATE TABLE `job` (
  `id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `department` varchar(191) NOT NULL,
  `location` varchar(191) NOT NULL,
  `experience` int(11) DEFAULT NULL,
  `salaryMin` double DEFAULT NULL,
  `salaryMax` double DEFAULT NULL,
  `positions` int(11) DEFAULT NULL,
  `employmentType` varchar(191) DEFAULT NULL,
  `deadline` datetime(3) DEFAULT NULL,
  `skills` varchar(191) DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  `status` enum('DRAFT','OPEN','CLOSED','ON_HOLD') NOT NULL DEFAULT 'DRAFT',
  `organizationId` int(11) NOT NULL,
  `postedById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leaverequest`
--

CREATE TABLE `leaverequest` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `leaveTypeId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `days` double NOT NULL DEFAULT 1,
  `reason` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `payType` enum('PAID','UNPAID') DEFAULT NULL,
  `reviewedById` int(11) DEFAULT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leaverequest`
--

INSERT INTO `leaverequest` (`id`, `employeeId`, `leaveTypeId`, `organizationId`, `startDate`, `endDate`, `days`, `reason`, `status`, `payType`, `reviewedById`, `reviewedAt`, `createdAt`, `updatedAt`) VALUES
(1, 2, 1, 2, '2026-08-11 19:00:00.000', '2026-08-13 18:59:59.999', 1, 'Nothing', 'APPROVED', 'PAID', 2, '2026-08-10 05:08:50.898', '2026-08-06 13:39:19.270', '2026-08-10 05:08:50.901');

-- --------------------------------------------------------

--
-- Table structure for table `leavetype`
--

CREATE TABLE `leavetype` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `organizationId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leavetype`
--

INSERT INTO `leavetype` (`id`, `name`, `code`, `isActive`, `organizationId`, `createdAt`, `updatedAt`) VALUES
(1, 'Matternity', '123456_ORG2', 1, 2, '2026-08-06 13:38:52.181', '2026-08-06 13:45:34.096');

-- --------------------------------------------------------

--
-- Table structure for table `organization`
--

CREATE TABLE `organization` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `category` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `emergencyContact` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `subscriptionEnd` datetime(3) DEFAULT NULL,
  `subscriptionPlan` enum('BASIC','PRO','ENTERPRISE') NOT NULL DEFAULT 'BASIC',
  `subscriptionStart` datetime(3) DEFAULT NULL,
  `subscriptionStatus` enum('ACTIVE','EXPIRED','CANCELLED','TRIAL') NOT NULL DEFAULT 'ACTIVE',
  `totalEmployees` int(11) DEFAULT 0,
  `orgTimeZone` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `organization`
--

INSERT INTO `organization` (`id`, `name`, `category`, `createdAt`, `updatedAt`, `deletedAt`, `address`, `email`, `emergencyContact`, `phone`, `subscriptionEnd`, `subscriptionPlan`, `subscriptionStart`, `subscriptionStatus`, `totalEmployees`, `orgTimeZone`) VALUES
(1, 'Renoranker Test Org', 'HRM', '2026-08-05 13:04:46.356', '2026-08-05 13:04:46.356', NULL, NULL, NULL, NULL, NULL, NULL, 'BASIC', NULL, 'ACTIVE', 0, NULL),
(2, 'Renoranker Test Org', 'HRM', '2026-08-05 13:07:48.715', '2026-08-05 13:07:48.715', NULL, NULL, NULL, NULL, NULL, NULL, 'BASIC', NULL, 'ACTIVE', 0, NULL),
(3, 'Renoranker Test Org', 'HRM', '2026-08-05 13:08:35.597', '2026-08-05 13:08:35.597', NULL, NULL, NULL, NULL, NULL, NULL, 'BASIC', NULL, 'ACTIVE', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `overtime`
--

CREATE TABLE `overtime` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `createdById` int(11) NOT NULL,
  `reviewedById` int(11) DEFAULT NULL,
  `organizationId` int(11) NOT NULL,
  `date` datetime(3) NOT NULL,
  `hours` double NOT NULL,
  `rate` double NOT NULL,
  `amount` double NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `reviewedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `overtime`
--

INSERT INTO `overtime` (`id`, `employeeId`, `createdById`, `reviewedById`, `organizationId`, `date`, `hours`, `rate`, `amount`, `reason`, `status`, `reviewedAt`, `createdAt`, `updatedAt`) VALUES
(1, 2, 2, 2, 2, '2026-08-06 00:00:00.000', 1, 1.5, 0, 'desc', 'APPROVED', '2026-08-06 10:50:48.916', '2026-08-06 10:50:46.556', '2026-08-06 10:50:48.919'),
(2, 2, 2, 2, 2, '2026-08-11 00:00:00.000', 2, 1.5, 0, 'no', 'APPROVED', '2026-08-07 13:37:45.356', '2026-08-06 11:05:00.301', '2026-08-07 13:37:45.358');

-- --------------------------------------------------------

--
-- Table structure for table `payroll`
--

CREATE TABLE `payroll` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `periodStart` datetime(3) NOT NULL,
  `periodEnd` datetime(3) NOT NULL,
  `payoutType` varchar(191) NOT NULL,
  `rate` double NOT NULL,
  `currency` varchar(191) NOT NULL,
  `workingDays` int(11) NOT NULL,
  `presentDays` int(11) NOT NULL,
  `absentDays` int(11) NOT NULL,
  `leaveDays` int(11) NOT NULL,
  `lateDays` int(11) NOT NULL,
  `overtimeHours` double NOT NULL DEFAULT 0,
  `grossSalary` double NOT NULL,
  `netSalary` double NOT NULL,
  `status` enum('DRAFT','GENERATED','PAID') NOT NULL DEFAULT 'GENERATED',
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `isEditable` tinyint(1) NOT NULL DEFAULT 1,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `paidAt` datetime(3) DEFAULT NULL,
  `paymentMethod` varchar(191) DEFAULT NULL,
  `runId` int(11) DEFAULT NULL,
  `transactionRef` varchar(191) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payrollauditlog`
--

CREATE TABLE `payrollauditlog` (
  `id` int(11) NOT NULL,
  `payrollId` int(11) NOT NULL,
  `action` varchar(191) NOT NULL,
  `performedById` int(11) NOT NULL,
  `note` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payrollcomponent`
--

CREATE TABLE `payrollcomponent` (
  `id` int(11) NOT NULL,
  `payrollId` int(11) NOT NULL,
  `type` enum('BASIC','ALLOWANCE','BONUS','COMMISSION','TAX','LOAN','DEDUCTION','OVERTIME') NOT NULL,
  `title` varchar(191) NOT NULL,
  `amount` double NOT NULL,
  `isTaxable` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `createdById` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payrollrun`
--

CREATE TABLE `payrollrun` (
  `id` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `status` enum('DRAFT','GENERATED','UNDER_REVIEW','APPROVED','LOCKED','PAID') NOT NULL DEFAULT 'DRAFT',
  `totalEmployees` int(11) NOT NULL DEFAULT 0,
  `totalGross` double NOT NULL DEFAULT 0,
  `totalNet` double NOT NULL DEFAULT 0,
  `lockedAt` datetime(3) DEFAULT NULL,
  `generatedById` int(11) NOT NULL,
  `approvedById` int(11) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project`
--

CREATE TABLE `project` (
  `id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `budget` double NOT NULL,
  `spent` double NOT NULL DEFAULT 0,
  `status` enum('PLANNING','IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED') NOT NULL DEFAULT 'PLANNING',
  `progress` int(11) NOT NULL DEFAULT 0,
  `organizationId` int(11) NOT NULL,
  `clientId` int(11) NOT NULL,
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `project`
--

INSERT INTO `project` (`id`, `title`, `description`, `startDate`, `endDate`, `budget`, `spent`, `status`, `progress`, `organizationId`, `clientId`, `createdById`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
(1, 'Salon', 'Salon Project ', '2026-08-06 00:00:00.000', '2026-08-31 00:00:00.000', 0, 0, 'IN_PROGRESS', 0, 2, 1, 2, '2026-08-06 09:38:02.102', '2026-08-10 07:22:28.893', NULL),
(2, 'Website', 'halooooo', '2026-08-11 00:00:00.000', '2026-08-14 00:00:00.000', 0, 0, 'CANCELLED', 0, 2, 1, 2, '2026-08-10 06:21:31.473', '2026-08-10 09:07:39.257', NULL),
(3, 'Parking manigment system', 'Working required', '2026-08-12 00:00:00.000', '2026-08-15 00:00:00.000', 0, 0, 'COMPLETED', 0, 2, 1, 2, '2026-08-10 06:24:07.622', '2026-08-10 09:07:25.552', NULL),
(4, 'Chek', '123qwer', '2026-08-10 00:00:00.000', '2026-08-13 00:00:00.000', 0, 0, 'PLANNING', 0, 2, 1, 2, '2026-08-10 06:25:48.046', '2026-08-10 07:22:44.595', '2026-08-10 07:22:44.593'),
(5, 'Test', '', '2026-08-10 00:00:00.000', '2026-08-12 00:00:00.000', 0, 0, 'PLANNING', 0, 2, 1, 2, '2026-08-10 07:22:17.243', '2026-08-10 07:22:17.243', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `projectattachment`
--

CREATE TABLE `projectattachment` (
  `id` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `fileName` varchar(191) NOT NULL,
  `filePath` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projectattachment`
--

INSERT INTO `projectattachment` (`id`, `projectId`, `fileName`, `filePath`, `createdAt`) VALUES
(1, 3, '476645222_654820217066185_3876917844483867398_n.gif', '/uploads/1786343047609-606281649.gif', '2026-08-10 06:24:07.665'),
(2, 4, '673118579_18101197264820264_3989991801475188632_n.jpg', '/uploads/1786343148039-14527073.jpg', '2026-08-10 06:25:48.072');

-- --------------------------------------------------------

--
-- Table structure for table `projectlog`
--

CREATE TABLE `projectlog` (
  `id` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `action` enum('CREATED','UPDATED','DELETED','STATUS_CHANGED','TASK_CREATED','TASK_UPDATED','TASK_DELETED') NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `oldValue` varchar(191) DEFAULT NULL,
  `newValue` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projectlog`
--

INSERT INTO `projectlog` (`id`, `projectId`, `userId`, `action`, `title`, `description`, `oldValue`, `newValue`, `createdAt`) VALUES
(1, 1, 2, 'CREATED', 'Project Created', 'Project \"Salon\" was created', NULL, NULL, '2026-08-06 09:38:02.114'),
(2, 2, 2, 'CREATED', 'Project Created', 'Project \"Website\" was created', NULL, NULL, '2026-08-10 06:21:31.500'),
(3, 3, 2, 'CREATED', 'Project Created', 'Project \"Parking manigment system\" was created', NULL, NULL, '2026-08-10 06:24:07.651'),
(4, 4, 2, 'CREATED', 'Project Created', 'Project \"Chek\" was created', NULL, NULL, '2026-08-10 06:25:48.067'),
(5, 5, 2, 'CREATED', 'Project Created', 'Project \"Test\" was created', NULL, NULL, '2026-08-10 07:22:17.275');

-- --------------------------------------------------------

--
-- Table structure for table `refreshtoken`
--

CREATE TABLE `refreshtoken` (
  `id` int(11) NOT NULL,
  `hashedToken` varchar(255) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT 0,
  `employeeId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `remark`
--

CREATE TABLE `remark` (
  `id` int(11) NOT NULL,
  `title` varchar(191) DEFAULT NULL,
  `content` varchar(191) NOT NULL,
  `taskId` int(11) NOT NULL,
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `remarkattachment`
--

CREATE TABLE `remarkattachment` (
  `id` int(11) NOT NULL,
  `remarkId` int(11) NOT NULL,
  `fileName` varchar(191) NOT NULL,
  `filePath` varchar(191) NOT NULL,
  `mimeType` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedule`
--

CREATE TABLE `schedule` (
  `id` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`days`)),
  `startTime` varchar(191) NOT NULL,
  `endTime` varchar(191) NOT NULL,
  `companyId` int(11) DEFAULT NULL,
  `allowEarlyIn` tinyint(1) NOT NULL DEFAULT 0,
  `earlyInMinutes` int(11) DEFAULT NULL,
  `allowEarlyOut` tinyint(1) NOT NULL DEFAULT 0,
  `earlyOutMinutes` int(11) DEFAULT NULL,
  `overtimeAllowed` tinyint(1) NOT NULL DEFAULT 0,
  `overtimeMinutes` int(11) DEFAULT NULL,
  `breaksAllowed` tinyint(1) NOT NULL DEFAULT 0,
  `breakDurations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`breakDurations`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `allowHalfDay` tinyint(1) NOT NULL DEFAULT 0,
  `halfDayMinutes` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schedule`
--

INSERT INTO `schedule` (`id`, `employeeId`, `days`, `startTime`, `endTime`, `companyId`, `allowEarlyIn`, `earlyInMinutes`, `allowEarlyOut`, `earlyOutMinutes`, `overtimeAllowed`, `overtimeMinutes`, `breaksAllowed`, `breakDurations`, `createdAt`, `updatedAt`, `deletedAt`, `allowHalfDay`, `halfDayMinutes`) VALUES
(1, 2, '[\"Mon\",\"Tue\",\"Wed\",\"Thu\"]', '09:00', '18:00', NULL, 1, 15, 1, 15, 1, 30, 1, '[15]', '2026-08-05 13:09:13.843', '2026-08-06 05:51:21.614', '2026-08-06 05:51:21.612', 0, NULL),
(2, 3, '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\"]', '09:00', '18:00', NULL, 1, 15, 1, 15, 1, 30, 1, '[15,15]', '2026-08-05 13:09:13.843', '2026-08-10 07:14:32.687', NULL, 1, 200),
(3, 4, '[\"Wed\",\"Sat\",\"Sun\",\"Thu\",\"Fri\"]', '09:00', '18:00', NULL, 1, 15, 1, 15, 1, 30, 1, '[15]', '2026-08-05 13:09:13.843', '2026-08-07 06:33:41.934', NULL, 0, NULL),
(4, 2, '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\"]', '09:00', '18:00', NULL, 0, NULL, 0, NULL, 0, NULL, 0, '[]', '2026-08-06 05:51:21.633', '2026-08-06 07:16:17.785', '2026-08-06 07:16:17.782', 0, NULL),
(5, 2, '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\"]', '09:00', '18:00', NULL, 0, NULL, 0, NULL, 0, NULL, 0, '[]', '2026-08-06 07:16:17.806', '2026-08-06 07:16:27.547', '2026-08-06 07:16:27.544', 0, NULL),
(6, 2, '[\"Sun\",\"Thu\",\"Fri\",\"Tue\",\"Wed\"]', '09:00', '18:00', NULL, 0, NULL, 0, NULL, 1, 30, 0, '[]', '2026-08-06 07:16:49.579', '2026-08-07 07:27:38.341', NULL, 1, 240);

-- --------------------------------------------------------

--
-- Table structure for table `task`
--

CREATE TABLE `task` (
  `id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'TODO',
  `progress` int(11) NOT NULL DEFAULT 0,
  `deadline` datetime(3) DEFAULT NULL,
  `projectId` int(11) DEFAULT NULL,
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  `organizationId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `task`
--

INSERT INTO `task` (`id`, `title`, `description`, `status`, `progress`, `deadline`, `projectId`, `createdById`, `createdAt`, `updatedAt`, `deletedAt`, `priority`, `organizationId`) VALUES
(1, 'test', 'test', 'TODO', 0, '2026-08-05 00:00:00.000', NULL, 2, '2026-08-05 13:15:22.989', '2026-08-10 07:37:07.004', NULL, 'MEDIUM', 2),
(2, 'Test', '', 'TODO', 0, '2026-08-13 00:00:00.000', 1, 2, '2026-08-06 09:59:22.427', '2026-08-10 07:37:04.129', NULL, 'MEDIUM', 2);

-- --------------------------------------------------------

--
-- Table structure for table `taskassignee`
--

CREATE TABLE `taskassignee` (
  `id` int(11) NOT NULL,
  `taskId` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `progress` int(11) NOT NULL DEFAULT 0,
  `startedAt` datetime(3) DEFAULT NULL,
  `status` enum('TODO','IN_PROGRESS','COMPLETED','BLOCKED') NOT NULL DEFAULT 'TODO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `taskassignee`
--

INSERT INTO `taskassignee` (`id`, `taskId`, `employeeId`, `completedAt`, `progress`, `startedAt`, `status`) VALUES
(1, 1, 4, NULL, 0, NULL, 'TODO'),
(2, 2, 4, NULL, 0, NULL, 'TODO');

-- --------------------------------------------------------

--
-- Table structure for table `taskattachment`
--

CREATE TABLE `taskattachment` (
  `id` int(11) NOT NULL,
  `taskId` int(11) NOT NULL,
  `fileName` varchar(191) NOT NULL,
  `filePath` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tasklog`
--

CREATE TABLE `tasklog` (
  `id` int(11) NOT NULL,
  `taskId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `action` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tasklog`
--

INSERT INTO `tasklog` (`id`, `taskId`, `userId`, `action`, `title`, `description`, `createdAt`) VALUES
(1, 1, 2, 'CREATED', 'Task Created', 'Task \"test\" created', '2026-08-05 13:15:23.000'),
(2, 2, 2, 'CREATED', 'Task Created', 'Task \"Test\" created', '2026-08-06 09:59:22.454'),
(3, 2, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-06 10:10:06.179'),
(4, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-06 10:10:08.629'),
(5, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-06 10:10:09.871'),
(6, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-06 10:39:11.874'),
(7, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-06 10:40:08.770'),
(8, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-06 10:40:13.379'),
(9, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-06 10:58:06.264'),
(10, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-07 07:15:28.671'),
(11, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-07 07:15:30.008'),
(12, 2, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-07 07:15:31.374'),
(13, 2, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-07 10:30:36.473'),
(14, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-10 04:42:37.205'),
(15, 2, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-10 04:42:45.788'),
(16, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-10 07:37:02.040'),
(17, 2, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-10 07:37:04.136'),
(18, 1, 2, 'STATUS_CHANGED', 'Task Status Auto Updated', 'Task recalculated to TODO', '2026-08-10 07:37:07.010');

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('048616aa-04a9-4fa6-b04f-56aa96b72ea6', 'ce3513a8432778d4ee0ed3a071d0a5882ff18c5c1ac6299ca970d7a8453cb656', '2026-08-05 13:03:40.659', '20260221050552_fix_payroll_component_relation', NULL, NULL, '2026-08-05 13:03:40.594', 1),
('05d2f8cd-31a3-485a-93e7-179eee9d63a4', '556f5500a35bfeff2ba463d8556e3e2b2c635fde567f872b376dc285518c4a7a', '2026-08-05 13:03:39.878', '20260219212059_relation_update_for_payroll', NULL, NULL, '2026-08-05 13:03:39.799', 1),
('12aab422-593e-46ff-966a-475905a95a9e', 'd8387f362cb8d9858d1597467038e1c7b619defa3d75f36e5d12cd6f580e0d28', '2026-08-05 13:03:38.173', '20260218205951_changes', NULL, NULL, '2026-08-05 13:03:38.136', 1),
('1a095248-c2d5-4621-a6ce-332c28131a78', '4fb6e807603212aa8e5ef684d4c549e439928425aefe7150dede92dfd2512fe4', '2026-08-05 13:03:41.080', '20260222073036_enh', NULL, NULL, '2026-08-05 13:03:41.067', 1),
('211eb786-df12-4d21-a31a-d392e7734d83', 'da41e856e526fdc4ed76e630d6f182dc6e38dc370a5a1e441b08c4d2d032a5ad', '2026-08-05 13:03:38.922', '20260219131958_add_over_timetable', NULL, NULL, '2026-08-05 13:03:38.570', 1),
('37a857d2-daf6-4db2-99cb-12fa886b65e7', '4c8d08684ffa5ba54d9e86ca7a3167c7d9bfbe1369ec0f5d496a7389920c8973', '2026-08-05 13:03:40.106', '20260221002903_add_column_summary_in_attenadnce', NULL, NULL, '2026-08-05 13:03:40.096', 1),
('3cedeead-afb1-4508-93c8-5237ff2b1d80', '974ea2c0c18fa55d3d117399382c28272e3ccae7c36ae8f1f43646fed48bc530', '2026-08-05 13:03:39.609', '20260219173328_add_invoice_tbls', NULL, NULL, '2026-08-05 13:03:38.925', 1),
('3d0ef4a1-fc61-46cd-8ec0-c3487a78e232', 'caff75028f2ed4a0bfcdeec2fe67c6ce677ccf08fa7ebe11ce7fccb0b9981482', '2026-08-05 13:03:39.796', '20260219190556_add_payroll_tbl', NULL, NULL, '2026-08-05 13:03:39.613', 1),
('41037a2d-d015-41f7-96eb-85cd7a85b781', '8082c2b31e9546253b48f3427bd916e50085628a86039e439ac6ff983278fd03', '2026-08-05 13:03:38.251', '20260219085431_add_login_fields', NULL, NULL, '2026-08-05 13:03:38.190', 1),
('5015235a-1926-494b-926b-a787c032dbea', '370d0236d060efde5aa99c64288fdb6d56cdf21a4095c925cb1d9070287d219e', '2026-08-05 13:03:38.567', '20260219113420_add_leave_module', NULL, NULL, '2026-08-05 13:03:38.268', 1),
('58a70152-ba96-46b8-8c35-fb12d8ae4a37', 'e5ac7e2fca4f188861a10f4c3ec3e26bd276fec90f43c2b290bc455c05c49af9', '2026-08-05 13:03:40.137', '20260221012433_add_module_privileges', NULL, NULL, '2026-08-05 13:03:40.108', 1),
('6afff760-d02f-4fb4-9a8a-0b9905017335', '126afe9dc5638bacf5d587d2ff91d960cf2a1867d7d231a8484b4adb1d8e0570', '2026-08-05 13:03:41.095', '20260223154743_add_org_column', NULL, NULL, '2026-08-05 13:03:41.083', 1),
('6d5a2aef-bdb9-43c0-aaeb-7ed6a1a975f5', 'fa7eadc85d2b0c785a594aa168587a381390bb4ba77f0af13e62b2d44428a14a', '2026-08-05 13:03:35.982', '20260218130855_add_departments', NULL, NULL, '2026-08-05 13:03:35.823', 1),
('80ca8413-a584-4269-bc3f-3fffc77c1c16', '78b2a6e333734f0808f58beba8f756bc9462de8110172f99c72b638c225e6a8a', '2026-08-05 13:03:38.188', '20260218211905_add_shift_snapshot', NULL, NULL, '2026-08-05 13:03:38.175', 1),
('8de2894d-8e94-4e4e-8a9a-538df6cd7193', '218fb558343256126774b7f6d863c581d90c1790fe9889cf4793ab4fb3a56536', '2026-08-05 13:03:36.418', '20260218132755_employee_full_structure', NULL, NULL, '2026-08-05 13:03:35.985', 1),
('a618e15a-2df0-4afc-b046-4e951404379a', '2de134338b269c2bf6a1b2fbb330857e49804a848fc3d54e52912bff29abcbe6', '2026-08-05 13:03:41.044', '20260222024425_add_job_model', NULL, NULL, '2026-08-05 13:03:40.740', 1),
('ac3dddde-867a-4b17-beb5-2f16488ea9bb', '338164481dcba518d09ab184d352ea59a89f78c898cc51726bd0d93fb2b51a2f', '2026-08-05 13:03:41.065', '20260222041649_enhance_organizaion', NULL, NULL, '2026-08-05 13:03:41.047', 1),
('afe2748a-fb11-4778-bfd3-10d0d00ef1aa', '85ab817a3574bf168654d66cea25d709f613b04833be57143efec6bb2729975c', '2026-08-05 13:03:40.591', '20260221042702_payroll_enterprise_upgrade', NULL, NULL, '2026-08-05 13:03:40.163', 1),
('b634876e-7949-459a-97a9-1a2c56714493', '89693493c1372e0ae36a2e6c8b1fe1993aa9a9524714edf2de4d84291064537c', '2026-08-05 13:03:40.156', '20260221012536_add_module_privileges', NULL, NULL, '2026-08-05 13:03:40.139', 1),
('b8837b56-a75c-4e86-b067-fa5d49b51304', 'a3f61632f2d6525ed2a6bc07b2b979abff62765e83e8697239933ad96b576b9f', '2026-08-05 13:03:37.570', '20260218193700_add_schedule_format_better', NULL, NULL, '2026-08-05 13:03:37.418', 1),
('bcde883d-bc1e-4435-999e-01ac37a235dc', '1874afc478c094e894a6653c107c96fce2137d3bf3bdfc5ccf1fddd71991f989', '2026-08-05 13:03:35.784', '20260218110057_add_location', NULL, NULL, '2026-08-05 13:03:35.703', 1),
('c4c6c04e-2134-4247-b236-34f48df2617b', 'bf5dc88155c5cb3ea80b7d4a0ff358e0d1a14980459d32174633b881c65a6428', '2026-08-05 13:03:37.415', '20260218171650_add_task_priority', NULL, NULL, '2026-08-05 13:03:37.403', 1),
('d2363c01-0d03-4af9-a124-eeb17713b36e', '43c220e32ebd20bd0dda36738f230b8e9f71152b3d35b7796cd22c82a2da3e38', '2026-08-05 13:03:36.812', '20260218145755_add_project_module', NULL, NULL, '2026-08-05 13:03:36.420', 1),
('d4c851c2-dd79-4e60-8b2b-d70ef9568722', '1ebb71491e9cae8839cd98644c79702d340dfdf46743058c297799a9d0e1e2aa', '2026-08-05 13:03:37.400', '20260218161710_add_task_tbl_logs', NULL, NULL, '2026-08-05 13:03:36.964', 1),
('d6d67d43-8dd9-40eb-992e-7a6fbea5bbe4', '413b6315bc8485ec92b2f88a9443e742dc6b8134284c1a5c1e1687f1d0f8acd0', '2026-08-05 13:03:35.698', '20260218102404_inital_migration', NULL, NULL, '2026-08-05 13:03:35.291', 1),
('d7f8fd11-72f4-4d9c-a54f-d45511132242', '95a5c409f5c5e1b4a6e65e258bda4399c3ccd27ccaa19ebc812596df5bf3f410', '2026-08-05 13:03:40.721', '20260221142904_fix_payroll_auditlog', NULL, NULL, '2026-08-05 13:03:40.662', 1),
('e160120d-40c6-4f4a-9bf7-6d6284d6f459', '672313f9bacd84ab4298938d0cb03db88223e9129ccae39270b67abfe4e47199', '2026-08-05 13:03:40.094', '20260220230917_add_remarks_tbl', NULL, NULL, '2026-08-05 13:03:39.887', 1),
('e6f56316-baae-45d3-a4af-1aa241b389a5', '4d66f741920548d1397313380320a462b637bf56e1a82f9af013d15409ae0a05', '2026-08-05 13:03:40.737', '20260221142943_fix_payroll_auditlog', NULL, NULL, '2026-08-05 13:03:40.724', 1),
('f0fde217-2a29-48bd-8916-a980432a9013', 'b87da780cec00f84cda5abb1ed5ba0ac3c9e423b0a2e2a027e51eebc3a4bc174', '2026-08-05 13:03:38.265', '20260219105101_add_info', NULL, NULL, '2026-08-05 13:03:38.254', 1),
('f38d9a07-0d23-4ef7-b24a-61f18446e4b9', '43cc301ffe893bbde7b72ca3bf36e71a2c06fab99b3e4d91ee816456a237b4c4', '2026-08-05 13:03:35.820', '20260218114402_company_as_location', NULL, NULL, '2026-08-05 13:03:35.787', 1),
('f3a7d58b-9313-43d8-822e-378efb7d264f', 'ed65c7c6da00ceead7dea6c807cb6f936f3fe5b23b868928be0b40893b831c1c', '2026-08-05 13:03:38.134', '20260218204136_add_attendance_punch', NULL, NULL, '2026-08-05 13:03:37.580', 1),
('f3c7180e-21c2-4d37-b771-d77ceb1cdd9d', '7009d68a514e96f701028cb6583a66d1797b533ca731972bd32d13f04824e9d5', '2026-08-05 13:03:36.961', '20260218153503_add_project_logs', NULL, NULL, '2026-08-05 13:03:36.815', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activitylog`
--
ALTER TABLE `activitylog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ActivityLog_employeeId_idx` (`employeeId`),
  ADD KEY `ActivityLog_taskId_idx` (`taskId`),
  ADD KEY `ActivityLog_attendanceId_fkey` (`attendanceId`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Attendance_employeeId_date_key` (`employeeId`,`date`),
  ADD KEY `Attendance_employeeId_idx` (`employeeId`);

--
-- Indexes for table `attendanceauditlog`
--
ALTER TABLE `attendanceauditlog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AttendanceAuditLog_attendanceId_fkey` (`attendanceId`),
  ADD KEY `AttendanceAuditLog_editedById_fkey` (`editedById`);

--
-- Indexes for table `attendancepunch`
--
ALTER TABLE `attendancepunch`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AttendancePunch_employeeId_idx` (`employeeId`),
  ADD KEY `AttendancePunch_attendanceId_idx` (`attendanceId`);

--
-- Indexes for table `candidate`
--
ALTER TABLE `candidate`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Candidate_jobId_idx` (`jobId`),
  ADD KEY `Candidate_status_idx` (`status`),
  ADD KEY `Candidate_organizationId_fkey` (`organizationId`);

--
-- Indexes for table `client`
--
ALTER TABLE `client`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Client_organizationId_idx` (`organizationId`);

--
-- Indexes for table `company`
--
ALTER TABLE `company`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Company_organizationId_idx` (`organizationId`),
  ADD KEY `Company_deletedAt_idx` (`deletedAt`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Department_organizationId_idx` (`organizationId`),
  ADD KEY `Department_companyId_idx` (`companyId`),
  ADD KEY `Department_deletedAt_idx` (`deletedAt`);

--
-- Indexes for table `employee`
--
ALTER TABLE `employee`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Employee_username_key` (`username`),
  ADD UNIQUE KEY `Employee_email_key` (`email`),
  ADD UNIQUE KEY `Employee_employeeId_key` (`employeeId`),
  ADD KEY `Employee_organizationId_idx` (`organizationId`),
  ADD KEY `Employee_companyId_idx` (`companyId`),
  ADD KEY `Employee_departmentId_idx` (`departmentId`),
  ADD KEY `Employee_supervisorId_fkey` (`supervisorId`);

--
-- Indexes for table `employeeincrement`
--
ALTER TABLE `employeeincrement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeIncrement_employeeId_idx` (`employeeId`);

--
-- Indexes for table `employeejob`
--
ALTER TABLE `employeejob`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeeJob_employeeId_key` (`employeeId`);

--
-- Indexes for table `employeepayroll`
--
ALTER TABLE `employeepayroll`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeePayroll_employeeId_key` (`employeeId`);

--
-- Indexes for table `employeeprivilege`
--
ALTER TABLE `employeeprivilege`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeePrivilege_employeeId_module_key` (`employeeId`,`module`),
  ADD KEY `EmployeePrivilege_employeeId_idx` (`employeeId`);

--
-- Indexes for table `invoice`
--
ALTER TABLE `invoice`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Invoice_invoiceNumber_key` (`invoiceNumber`),
  ADD KEY `Invoice_organizationId_idx` (`organizationId`),
  ADD KEY `Invoice_status_idx` (`status`),
  ADD KEY `Invoice_companyId_fkey` (`companyId`),
  ADD KEY `Invoice_clientId_fkey` (`clientId`),
  ADD KEY `Invoice_createdById_fkey` (`createdById`);

--
-- Indexes for table `invoicecompany`
--
ALTER TABLE `invoicecompany`
  ADD PRIMARY KEY (`id`),
  ADD KEY `InvoiceCompany_organizationId_idx` (`organizationId`);

--
-- Indexes for table `invoiceitem`
--
ALTER TABLE `invoiceitem`
  ADD PRIMARY KEY (`id`),
  ADD KEY `InvoiceItem_invoiceId_fkey` (`invoiceId`);

--
-- Indexes for table `invoicelog`
--
ALTER TABLE `invoicelog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `InvoiceLog_invoiceId_idx` (`invoiceId`),
  ADD KEY `InvoiceLog_userId_fkey` (`userId`);

--
-- Indexes for table `invoicetransaction`
--
ALTER TABLE `invoicetransaction`
  ADD PRIMARY KEY (`id`),
  ADD KEY `InvoiceTransaction_invoiceId_idx` (`invoiceId`),
  ADD KEY `InvoiceTransaction_createdById_fkey` (`createdById`);

--
-- Indexes for table `job`
--
ALTER TABLE `job`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Job_organizationId_idx` (`organizationId`),
  ADD KEY `Job_status_idx` (`status`),
  ADD KEY `Job_priority_idx` (`priority`),
  ADD KEY `Job_postedById_fkey` (`postedById`);

--
-- Indexes for table `leaverequest`
--
ALTER TABLE `leaverequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeaveRequest_employeeId_idx` (`employeeId`),
  ADD KEY `LeaveRequest_organizationId_idx` (`organizationId`),
  ADD KEY `LeaveRequest_status_idx` (`status`),
  ADD KEY `LeaveRequest_startDate_endDate_idx` (`startDate`,`endDate`),
  ADD KEY `LeaveRequest_leaveTypeId_fkey` (`leaveTypeId`),
  ADD KEY `LeaveRequest_reviewedById_fkey` (`reviewedById`);

--
-- Indexes for table `leavetype`
--
ALTER TABLE `leavetype`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `LeaveType_code_key` (`code`),
  ADD KEY `LeaveType_organizationId_idx` (`organizationId`);

--
-- Indexes for table `organization`
--
ALTER TABLE `organization`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Organization_deletedAt_idx` (`deletedAt`);

--
-- Indexes for table `overtime`
--
ALTER TABLE `overtime`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Overtime_employeeId_idx` (`employeeId`),
  ADD KEY `Overtime_status_idx` (`status`),
  ADD KEY `Overtime_date_idx` (`date`),
  ADD KEY `Overtime_createdById_fkey` (`createdById`),
  ADD KEY `Overtime_reviewedById_fkey` (`reviewedById`),
  ADD KEY `Overtime_organizationId_fkey` (`organizationId`);

--
-- Indexes for table `payroll`
--
ALTER TABLE `payroll`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Payroll_employeeId_idx` (`employeeId`),
  ADD KEY `Payroll_organizationId_idx` (`organizationId`),
  ADD KEY `Payroll_createdById_fkey` (`createdById`),
  ADD KEY `Payroll_runId_fkey` (`runId`);

--
-- Indexes for table `payrollauditlog`
--
ALTER TABLE `payrollauditlog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PayrollAuditLog_performedById_fkey` (`performedById`),
  ADD KEY `PayrollAuditLog_payrollId_fkey` (`payrollId`);

--
-- Indexes for table `payrollcomponent`
--
ALTER TABLE `payrollcomponent`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PayrollComponent_payrollId_fkey` (`payrollId`),
  ADD KEY `PayrollComponent_createdById_fkey` (`createdById`);

--
-- Indexes for table `payrollrun`
--
ALTER TABLE `payrollrun`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `PayrollRun_organizationId_month_year_key` (`organizationId`,`month`,`year`),
  ADD KEY `PayrollRun_generatedById_fkey` (`generatedById`),
  ADD KEY `PayrollRun_approvedById_fkey` (`approvedById`);

--
-- Indexes for table `project`
--
ALTER TABLE `project`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Project_organizationId_idx` (`organizationId`),
  ADD KEY `Project_clientId_idx` (`clientId`),
  ADD KEY `Project_status_idx` (`status`),
  ADD KEY `Project_createdById_fkey` (`createdById`);

--
-- Indexes for table `projectattachment`
--
ALTER TABLE `projectattachment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProjectAttachment_projectId_idx` (`projectId`);

--
-- Indexes for table `projectlog`
--
ALTER TABLE `projectlog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProjectLog_projectId_idx` (`projectId`),
  ADD KEY `ProjectLog_userId_idx` (`userId`);

--
-- Indexes for table `refreshtoken`
--
ALTER TABLE `refreshtoken`
  ADD PRIMARY KEY (`id`),
  ADD KEY `RefreshToken_employeeId_idx` (`employeeId`),
  ADD KEY `RefreshToken_expiresAt_idx` (`expiresAt`);

--
-- Indexes for table `remark`
--
ALTER TABLE `remark`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Remark_taskId_idx` (`taskId`),
  ADD KEY `Remark_createdById_idx` (`createdById`),
  ADD KEY `Remark_deletedAt_idx` (`deletedAt`);

--
-- Indexes for table `remarkattachment`
--
ALTER TABLE `remarkattachment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `RemarkAttachment_remarkId_idx` (`remarkId`);

--
-- Indexes for table `schedule`
--
ALTER TABLE `schedule`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Schedule_employeeId_idx` (`employeeId`),
  ADD KEY `Schedule_companyId_idx` (`companyId`),
  ADD KEY `Schedule_deletedAt_idx` (`deletedAt`);

--
-- Indexes for table `task`
--
ALTER TABLE `task`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Task_projectId_idx` (`projectId`),
  ADD KEY `Task_createdById_fkey` (`createdById`);

--
-- Indexes for table `taskassignee`
--
ALTER TABLE `taskassignee`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `TaskAssignee_taskId_employeeId_key` (`taskId`,`employeeId`),
  ADD KEY `TaskAssignee_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `taskattachment`
--
ALTER TABLE `taskattachment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TaskAttachment_taskId_fkey` (`taskId`);

--
-- Indexes for table `tasklog`
--
ALTER TABLE `tasklog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TaskLog_taskId_fkey` (`taskId`),
  ADD KEY `TaskLog_userId_fkey` (`userId`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activitylog`
--
ALTER TABLE `activitylog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `attendanceauditlog`
--
ALTER TABLE `attendanceauditlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendancepunch`
--
ALTER TABLE `attendancepunch`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `candidate`
--
ALTER TABLE `candidate`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `client`
--
ALTER TABLE `client`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `company`
--
ALTER TABLE `company`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `department`
--
ALTER TABLE `department`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `employee`
--
ALTER TABLE `employee`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `employeeincrement`
--
ALTER TABLE `employeeincrement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employeejob`
--
ALTER TABLE `employeejob`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `employeepayroll`
--
ALTER TABLE `employeepayroll`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employeeprivilege`
--
ALTER TABLE `employeeprivilege`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice`
--
ALTER TABLE `invoice`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoicecompany`
--
ALTER TABLE `invoicecompany`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoiceitem`
--
ALTER TABLE `invoiceitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoicelog`
--
ALTER TABLE `invoicelog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoicetransaction`
--
ALTER TABLE `invoicetransaction`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job`
--
ALTER TABLE `job`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leaverequest`
--
ALTER TABLE `leaverequest`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `leavetype`
--
ALTER TABLE `leavetype`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `organization`
--
ALTER TABLE `organization`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `overtime`
--
ALTER TABLE `overtime`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payrollauditlog`
--
ALTER TABLE `payrollauditlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payrollcomponent`
--
ALTER TABLE `payrollcomponent`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payrollrun`
--
ALTER TABLE `payrollrun`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project`
--
ALTER TABLE `project`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `projectattachment`
--
ALTER TABLE `projectattachment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `projectlog`
--
ALTER TABLE `projectlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `refreshtoken`
--
ALTER TABLE `refreshtoken`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `remark`
--
ALTER TABLE `remark`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `remarkattachment`
--
ALTER TABLE `remarkattachment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `schedule`
--
ALTER TABLE `schedule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `task`
--
ALTER TABLE `task`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `taskassignee`
--
ALTER TABLE `taskassignee`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `taskattachment`
--
ALTER TABLE `taskattachment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasklog`
--
ALTER TABLE `tasklog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activitylog`
--
ALTER TABLE `activitylog`
  ADD CONSTRAINT `ActivityLog_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `attendance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ActivityLog_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ActivityLog_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `Attendance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `attendanceauditlog`
--
ALTER TABLE `attendanceauditlog`
  ADD CONSTRAINT `AttendanceAuditLog_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `attendance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `AttendanceAuditLog_editedById_fkey` FOREIGN KEY (`editedById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `attendancepunch`
--
ALTER TABLE `attendancepunch`
  ADD CONSTRAINT `AttendancePunch_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `attendance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `AttendancePunch_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `candidate`
--
ALTER TABLE `candidate`
  ADD CONSTRAINT `Candidate_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `job` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Candidate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `client`
--
ALTER TABLE `client`
  ADD CONSTRAINT `Client_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `company`
--
ALTER TABLE `company`
  ADD CONSTRAINT `Company_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `department`
--
ALTER TABLE `department`
  ADD CONSTRAINT `Department_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Department_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employee`
--
ALTER TABLE `employee`
  ADD CONSTRAINT `Employee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Employee_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Employee_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Employee_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `employee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `employeeincrement`
--
ALTER TABLE `employeeincrement`
  ADD CONSTRAINT `EmployeeIncrement_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employeejob`
--
ALTER TABLE `employeejob`
  ADD CONSTRAINT `EmployeeJob_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employeepayroll`
--
ALTER TABLE `employeepayroll`
  ADD CONSTRAINT `EmployeePayroll_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employeeprivilege`
--
ALTER TABLE `employeeprivilege`
  ADD CONSTRAINT `EmployeePrivilege_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoice`
--
ALTER TABLE `invoice`
  ADD CONSTRAINT `Invoice_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `invoicecompany` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoicecompany`
--
ALTER TABLE `invoicecompany`
  ADD CONSTRAINT `InvoiceCompany_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoiceitem`
--
ALTER TABLE `invoiceitem`
  ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoicelog`
--
ALTER TABLE `invoicelog`
  ADD CONSTRAINT `InvoiceLog_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `InvoiceLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `invoicetransaction`
--
ALTER TABLE `invoicetransaction`
  ADD CONSTRAINT `InvoiceTransaction_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `InvoiceTransaction_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `job`
--
ALTER TABLE `job`
  ADD CONSTRAINT `Job_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Job_postedById_fkey` FOREIGN KEY (`postedById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `leaverequest`
--
ALTER TABLE `leaverequest`
  ADD CONSTRAINT `LeaveRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveRequest_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `leavetype` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveRequest_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveRequest_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `employee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `leavetype`
--
ALTER TABLE `leavetype`
  ADD CONSTRAINT `LeaveType_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `overtime`
--
ALTER TABLE `overtime`
  ADD CONSTRAINT `Overtime_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Overtime_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Overtime_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Overtime_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `employee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payroll`
--
ALTER TABLE `payroll`
  ADD CONSTRAINT `Payroll_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Payroll_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Payroll_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Payroll_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `payrollrun` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payrollauditlog`
--
ALTER TABLE `payrollauditlog`
  ADD CONSTRAINT `PayrollAuditLog_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `payroll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PayrollAuditLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `payrollcomponent`
--
ALTER TABLE `payrollcomponent`
  ADD CONSTRAINT `PayrollComponent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PayrollComponent_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `payroll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payrollrun`
--
ALTER TABLE `payrollrun`
  ADD CONSTRAINT `PayrollRun_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `employee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PayrollRun_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `PayrollRun_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `project`
--
ALTER TABLE `project`
  ADD CONSTRAINT `Project_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Project_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Project_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `projectattachment`
--
ALTER TABLE `projectattachment`
  ADD CONSTRAINT `ProjectAttachment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `projectlog`
--
ALTER TABLE `projectlog`
  ADD CONSTRAINT `ProjectLog_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProjectLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `refreshtoken`
--
ALTER TABLE `refreshtoken`
  ADD CONSTRAINT `RefreshToken_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `remark`
--
ALTER TABLE `remark`
  ADD CONSTRAINT `Remark_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Remark_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `remarkattachment`
--
ALTER TABLE `remarkattachment`
  ADD CONSTRAINT `RemarkAttachment_remarkId_fkey` FOREIGN KEY (`remarkId`) REFERENCES `remark` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `schedule`
--
ALTER TABLE `schedule`
  ADD CONSTRAINT `Schedule_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Schedule_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `task`
--
ALTER TABLE `task`
  ADD CONSTRAINT `Task_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `taskassignee`
--
ALTER TABLE `taskassignee`
  ADD CONSTRAINT `TaskAssignee_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskAssignee_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `taskattachment`
--
ALTER TABLE `taskattachment`
  ADD CONSTRAINT `TaskAttachment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tasklog`
--
ALTER TABLE `tasklog`
  ADD CONSTRAINT `TaskLog_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `employee` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
