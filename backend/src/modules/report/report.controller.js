const moment = require("moment");
const prisma = require("../../config/prisma");


function parseOptionalInt(value) {
    if (!value || value === "all" || value === "undefined") return undefined;
    return Number(value);
  }
function getDateRange(filter, startDate, endDate) {
  let start, end;

  switch (filter) {
    case "thisWeek":
      start = moment().startOf("week");
      end = moment().endOf("week");
      break;
    case "thisMonth":
      start = moment().startOf("month");
      end = moment().endOf("month");
      break;
    case "thisYear":
      start = moment().startOf("year");
      end = moment().endOf("year");
      break;
    case "custom":
      start = moment(startDate);
      end = moment(endDate);
      break;
    default:
      start = moment("2000-01-01");
      end = moment();
  }

  return {
    start: start.toDate(),
    end: end.toDate(),
  };
}
exports.getAdminDashboard = async (req, res) => {
    try {
      const { filter, startDate, endDate, departmentId, companyId, employeeId } = req.query;
  
      const { start, end } = getDateRange(filter, startDate, endDate);
  
      const department = parseOptionalInt(departmentId);
      const company = parseOptionalInt(companyId);
      const employee = parseOptionalInt(employeeId);
  
      const employeeFilter = {
        organizationId: req.user.organizationId,
        deletedAt: null,
        ...(department && { departmentId: department }),
        ...(company && { companyId: company }),
        ...(employee && { id: employee }), // 🔥 NEW
      };
  
      const employees = await prisma.employee.findMany({
        where: employeeFilter,
        select: { id: true },
      });
  
      const employeeIds = employees.map((e) => e.id);
  
      if (employeeIds.length === 0) {
        return res.json({ success: true, data: {} });
      }
  
      const attendanceStats = await prisma.attendance.aggregate({
        _sum: {
          totalWorkedMinutes: true,
          overtimeMinutes: true,
        },
        _count: { id: true },
        where: {
          employeeId: { in: employeeIds },
          date: { gte: start, lte: end },
        },
      });
  
      const activityStats = await prisma.activityLog.groupBy({
        by: ["employeeId"],
        where: {
          employeeId: { in: employeeIds },
          type: "TASK",
          startTime: { gte: start, lte: end },
        },
        _sum: {
          durationMinutes: true,
        },
      });
  
      res.json({
        success: true,
        data: {
          totalWorkedMinutes: attendanceStats._sum.totalWorkedMinutes || 0,
          totalOvertimeMinutes: attendanceStats._sum.overtimeMinutes || 0,
          totalAttendanceRecords: attendanceStats._count.id,
          productivity: activityStats,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  };
  exports.getAttendanceReport = async (req, res) => {
    try {
      const {
        filter = "all",
        startDate,
        endDate,
        departmentId,
        companyId,
        employeeId
      } = req.query;
  
      const { start, end } = getDateRange(filter, startDate, endDate);
      const department = parseOptionalInt(departmentId);
const company = parseOptionalInt(companyId);
const employee = parseOptionalInt(employeeId);

  
      const attendance = await prisma.attendance.findMany({
        where: {
          date: { gte: start, lte: end },
          employee: {
            organizationId: req.user.organizationId,
            ...(department && { departmentId: department }),
            ...(company && { companyId: company }),
            ...(employee && { id: employee }), // 🔥 NEW

          },
        },
      });
  
      // 🔹 Stats Calculation
      const totalMinutes = attendance.reduce(
        (sum, a) => sum + (a.totalWorkedMinutes || 0),
        0
      );
  
      const overtimeMinutes = attendance.reduce(
        (sum, a) => sum + (a.overtimeMinutes || 0),
        0
      );
  
      const lateCount = attendance.filter((a) => a.isLate).length;
  
      const presentCount = attendance.length;
  
      // 🔹 Trend Group By Day
      const grouped = {};
  
      attendance.forEach((a) => {
        const label = moment(a.date).format("DD MMM");
  
        if (!grouped[label]) {
          grouped[label] = { label, present: 0, late: 0 };
        }
  
        grouped[label].present += 1;
        if (a.isLate) grouped[label].late += 1;
      });
  
      res.json({
        success: true,
        trend: Object.values(grouped),
        stats: {
          totalHours: (totalMinutes / 60).toFixed(1),
          present: presentCount,
          late: lateCount,
          overtime: (overtimeMinutes / 60).toFixed(1),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  };
  exports.getEmployeePerformance = async (req, res) => {
    try {
      const { filter = "all", startDate, endDate } = req.query;
  
      const { start, end } = getDateRange(filter, startDate, endDate);
      const department = parseOptionalInt(req.query.departmentId);
      const company = parseOptionalInt(req.query.companyId);
      const employee = parseOptionalInt(req.query.employeeId);

      
      const activities = await prisma.activityLog.findMany({
        where: {
          type: "TASK",
          startTime: { gte: start, lte: end },
          employee: {
            organizationId: req.user.organizationId,
            ...(department && { departmentId: department }),
            ...(company && { companyId: company }),
            ...(employee && { id: employee }), // 🔥 NEW

          },
        },
        include: {
          employee: true,
        },
      });
    
  
      const grouped = {};
  
      activities.forEach((a) => {
        const id = a.employeeId;
  
        if (!grouped[id]) {
          grouped[id] = {
            employee: `${a.employee.firstName} ${a.employee.lastName}`,
            totalMinutes: 0,
          };
        }
  
        grouped[id].totalMinutes += a.durationMinutes || 0;
      });
  
      const ranking = Object.values(grouped)
        .map((e) => ({
          employee: e.employee,
          totalHours: (e.totalMinutes / 60).toFixed(1),
        }))
        .sort((a, b) => b.totalHours - a.totalHours);
  
      res.json({
        success: true,
        ranking,
      });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  };
  exports.getTaskAnalytics = async (req, res) => {
    const employee = parseOptionalInt(req.query.employeeId);
    console.log()

    try {
      const tasks = await prisma.task.findMany({
        where: { deletedAt: null },
        include:{
            assignees:{
                where:{
                    ...(employee && { employeeId: employee }),
                }
            }
        }
        

      });
  
      const completed = tasks.filter((t) => t.status === "COMPLETED").length;
      const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
      const todo = tasks.filter((t) => t.status === "TODO").length;
  
      res.json({
        success: true,
        distribution: [
          { name: "Completed", value: completed },
          { name: "In Progress", value: inProgress },
          { name: "Todo", value: todo },
        ],
      });
    } catch (err) {
      res.status(500).json({ success: false,error: err.message});
    }
  };