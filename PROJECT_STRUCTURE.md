# Frontpin Project Structure & Hierarchy Documentation

## 📌 Executive Summary

**Frontpin (Frontforce SaaS)** is an Enterprise Human Resource Management System (HRMS) and Real-Time Biometric Attendance Platform. It provides end-to-end organizational management including biometric device streaming (Hikvision & ZKTeco), automated shift scheduling, leave and overtime processing, payroll calculation, project tracking, invoicing, and reporting.

---

## 🏗 System Architecture Overview

```
                        +-------------------------------------+
                        |          Client / Frontend          |
                        | (React + Vite + Tailwind + TS + App)|
                        +------------------+------------------+
                                           | HTTP / REST
                                           v
                        +------------------+------------------+
                        |           Express Backend           |
                        |      (Node.js + Prisma ORM)         |
                        +---+--------------+--------------+---+
                            |              |              |
         +------------------+              |              +------------------+
         | DB Queries                      | Webhooks / Stream               | Sync
         v                                 v                                 v
+------------------+             +-------------------+             +-------------------+
|   MySQL Server   |             | Hikvision Devices |             |   ZKTeco Devices  |
| (frontforce_saas)|             | (ISAPI Stream/Net)|             |   (Push Server)   |
+------------------+             +-------------------+             +-------------------+
```

---

## 📁 Directory Hierarchy & Tree

```
Frontpin/
├── PROJECT_STRUCTURE.md          # Project Structure & Architecture Guide (This File)
├── README.md                     # Base Project Documentation
├── package.json                  # Frontend & Root Dependencies
├── vite.config.ts                # Vite Bundler & Proxy Configuration
├── electron/                     # Electron Desktop App Wrapper
│   ├── main.ts                   # Electron Main Process Entry
│   └── preload.ts                # Preload Bridge Scripts
├── public/                       # Public Static Assets & Logos
├── src/                          # Frontend Application Source Code
│   ├── index.css                 # Global CSS & Tailwind Directives
│   ├── main.tsx                  # React Application Entrypoint
│   └── app/
│       ├── App.tsx               # Root App Provider & Toast Container
│       ├── routes.tsx            # Application Router & Protected Routes
│       ├── components/           # Reusable UI Components & Layout Layouts
│       │   ├── Layout.tsx        # Main App Layout (Header, Sidebar, Clock In/Out Bar)
│       │   ├── Navbar.tsx        # Top Navigation Bar & Notifications
│       │   └── ui/               # Radix UI / Shadcn UI Primitives
│       ├── contexts/             # React Context Providers (AuthContext, ThemeContext)
│       ├── services/             # Axios API Clients & Service Wrappers
│       │   └── api.ts            # Centralized API Endpoints Mapping
│       ├── utils/                # Helper Functions & Date/Time Formatters
│       └── pages/                # Application Page Components (36 Key Views)
│           ├── Dashboard.tsx            # Main Analytics & Punch Widget
│           ├── Attendance.tsx           # Admin Attendance Management & Report Matrix
│           ├── AttendanceDashboard.tsx  # Map & Live Attendance Radar
│           ├── Employees.tsx            # Employee Directory & Filtering
│           ├── AddEmployee.tsx          # Employee Creation Wizard
│           ├── EmployeeDetail.tsx       # Comprehensive Employee 360 View
│           ├── Schedule.tsx             # Shift & Roster Management
│           ├── Leave.tsx                # Leave Requests & Approval Flow
│           ├── Overtime.tsx             # Overtime Requests & Calculations
│           ├── Payroll.tsx              # Payroll Generation & Payslips
│           ├── PayrollDetail.tsx        # Detailed Payroll Run Breakdown
│           ├── Invoices.tsx             # Client Invoice Management
│           ├── CreateInvoice.tsx        # Invoice Builder
│           ├── Projects.tsx             # Project Tracking
│           ├── DetailProject.tsx        # Project Work Breakdown & Tasks
│           ├── Tasks.tsx                # Task Board & Activity Logs
│           ├── Departments.tsx          # Department Management
│           ├── Locations.tsx            # Organization Locations & Geofences
│           ├── Roles.tsx                # Role-Based Access Control (RBAC)
│           ├── Reports.tsx              # Custom Report Builder & Exports
│           └── Login.tsx / Register.tsx # Authentication Pages
│
└── backend/                      # Backend API Server & Database Layer
    ├── package.json              # Backend Dependencies (Express, Prisma, Moment, etc.)
    ├── prisma/
    │   └── schema.prisma         # Central Database Schema Definition & Relations
    └── src/
        ├── app.js                # Express App Initialization & CORS/Middleware Pipeline
        ├── server.js             # HTTP Server Entrypoint & Port Listener (Default: 4000)
        ├── config/               # Database Client & Global Config
        ├── middleware/           # Express Middlewares (Auth Protect, Role Auth, Uploads)
        ├── utlis/                # Backend Helpers (JWT, Date Parsing, Calculations)
        └── modules/              # Domain-Driven Business Modules
            ├── attendance/       # Attendance Records, Daily/Weekly/Monthly Reports
            │   ├── attendance.controller.js
            │   └── attendance.routes.js
            ├── auth/             # Authentication & Password Security
            ├── dashboard/        # User & Admin Dashboard Aggregation APIs
            ├── department/       # Department CRUD
            ├── devices/          # Biometric Device Listener & Synchronization
            │   ├── device.controller.js   # Punch Processing Engine & Lateness Logic
            │   ├── device.routes.js       # Device Webhook Endpoints
            │   ├── hikvision.service.js   # Hikvision ISAPI Webhook/Stream Parser
            │   └── zkteco.service.js      # ZKTeco Device Adapter
            ├── entity/           # Legal Entities
            ├── invoice/          # Invoice & Line Item Generation
            ├── job/              # Recruitment & Applicant Tracking (ATS)
            ├── leave/            # Leave Entitlements & Approvals
            ├── location/         # Office Locations & Geofence Coordinates
            ├── overtime/         # Overtime Submissions & Approvals
            ├── payroll/          # Salary Calculation Engine
            ├── project/          # Project Portfolio Management
            ├── report/           # Export Engine (Excel, CSV)
            ├── roles/            # Privilege Matrix Enforcement
            ├── schedule/         # Shift Schedules & Roster Rules
            ├── tasks/            # Task Board & Activity Log Timers
            └── users/            # System Users & Profiles
```

---

## ⚙️ Core Technical Components & Modules

### 1. 🕒 Real-Time Biometric Attendance Engine (`backend/src/modules/devices/`)
- **Hikvision Listener (`hikvision.service.js`)**: Connects to Hikvision terminals over ISAPI stream & HTTP Webhooks (`/api/devices/hikvision/event`).
- **Punch Processing Engine (`device.controller.js`)**:
  - Handles **First Punch of the Shift -> CHECK-IN**.
  - Handles **Subsequent Punches -> CHECK-OUT**.
  - Calculates lateness (`calcLateness`) based on shift start time and grace periods.
  - Automatically calculates total worked minutes and overtime hours.
  - Enforces database-level constraint `(employeeId, date)` to guarantee zero duplicate attendance rows.

### 2. 📊 Attendance & Reporting Controller (`backend/src/modules/attendance/`)
- **Daily, Weekly, Monthly Views**: Computes attendance status (`PRESENT`, `LATE`, `LEAVE`, `OFF_DAY`, `ABSENT`, `UPCOMING_DAY`).
- **Safe Mapping Layer**: Prevents valid check-in records from being overwritten by empty or missing entries.
- **Excel & PDF Exporter**: Exports formatted timesheets for payroll auditing.

### 3. 👥 Employee 360° Management (`backend/src/modules/users/`, `src/app/pages/Employees.tsx`)
- Maps biometric IDs (`biometricId`), custom employee codes (`employeeId`), departments, designations, and supervisor hierarchies.
- Controls role-based access levels (`ADMIN`, `SUPERVISOR`, `USER`).

### 4. 📆 Roster & Shift Scheduling (`backend/src/modules/schedule/`)
- Supports flexible shift timings, early-in/early-out allowances, break rules, and designated off-days per employee.

---

## 🗄 Database Schema Highlights (`backend/prisma/schema.prisma`)

- **`Employee`**: Primary user profile entity with department, company, supervisor, and role relations.
- **`Attendance`**: Core attendance table enforcing `@@unique([employeeId, date])`.
- **`AttendancePunch`**: Chronological raw biometric event logs (`CHECK_IN`, `CHECK_OUT`).
- **`ActivityLog`**: Fine-grained task transitions and break logs for accurate timesheets.
- **`Schedule`**: Work shift specifications and working day JSON configurations.
- **`Company` / `Organization`**: Multi-tenant company hierarchy with timezone configurations (`Asia/Karachi`).

---

## 🚀 Environment & Runtime Ports

- **Frontend Port**: `http://localhost:3000` (Vite React App)
- **Backend API Port**: `http://localhost:4000` (Express Node.js Server)
- **Database Connection**: MySQL (`mysql://root:@localhost:3306/frontforce_saas`)
