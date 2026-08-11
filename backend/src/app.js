const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require('path')

const { errorHandler, notFound } = require("./middleware/error");
const authRoutes = require("./modules/auth/auth.routes");
const locationRoutes = require("./modules/location/location.routes");
const departmentRoutes = require("./modules/department/department.routes");
const userRoutes = require("./modules/users/users.routes");
const projectRoutes = require("./modules/project/project.routes");
const scheduleRoutes = require("./modules/schedule/schedule.routes");
const attendanceRoutes = require("./modules/attendance/attendance.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const leaveRoutes = require("./modules/leave/leave.routes");
const overTimeRoutes = require("./modules/overtime/overtime.route");
const invoiceCompany = require("./modules/invoice/invoiceCompany.routes");
const invoices = require("./modules/invoice/invoice.routes");
const payrollRoutes = require("./modules/payroll/payroll.routes");
const jobsRoutes = require("./modules/job/job.routes");
const candidateRoutes = require("./modules/job/candidate.routes");
const reportRoutes = require("./modules/report/report.routes");


const app = express();
app.use(express.urlencoded({ extended: true }));  // for urlencoded (optional but good)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
    cors({
      origin: ["http://localhost:3000","http://localhost:3001"],
      credentials: true,
    })
  );
  

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);


app.use("/api/auth", authRoutes);
app.use("/api/employees", userRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/overtimes", overTimeRoutes);
app.use("/api/invoice-company", invoiceCompany);
app.use("/api/invoices", invoices);
app.use("/api/jobs", jobsRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/reports", reportRoutes);

app.use("/api/payroll", payrollRoutes);




app.use(notFound);
app.use(errorHandler);

module.exports = app;
