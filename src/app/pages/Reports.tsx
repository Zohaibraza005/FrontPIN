import React, { useEffect, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  isAfter,
  startOfDay,
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { reportsAPI, departmentAPI, locationAPI ,employeeAPI, attendanceAPI} from "../services/api";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departmentId, setDepartmentId] = useState("all");
  const getInitialReportLoc = () => {
    const loc = localStorage.getItem("selectedLocation") || "all";
    return loc.toLowerCase() === "all" ? "all" : loc;
  };
  const [locationId, setLocationId] = useState<string>(getInitialReportLoc);

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const loc = e.detail || localStorage.getItem("selectedLocation") || "all";
      const normalized = loc.toLowerCase() === "all" ? "all" : loc;
      setLocationId(normalized);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);

  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>({});
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [taskDistribution, setTaskDistribution] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("all");
  const [employees, setEmployees] = useState<any[]>([]);
  const [monthlyReportEmployees, setMonthlyReportEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadFilters();
  }, []);

  const getDateInterval = () => {
    const now = new Date();
    if (dateRange === "thisWeek") {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return { start, end, view: "weekly" };
    }
    if (dateRange === "thisMonth") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return { start, end, view: "monthly" };
    }
    if (dateRange === "thisYear") {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return { start, end, view: "yearly" };
    }
    if (dateRange === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return { start, end, view: "custom" };
    }
    // Default or "all"
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return { start, end, view: "monthly" };
  };

  useEffect(() => {
    if (dateRange === "custom" && (!startDate || !endDate)) {
      return;
    }
    loadReports();
  }, [dateRange, startDate, endDate, departmentId, locationId, employeeId]);

  const loadFilters = async () => {
    const dep = await departmentAPI.getDepartments();
    const loc = await locationAPI.getLocations();
    setDepartments(dep?.data || []);
    setLocations(loc?.data || []);
  };
  const loadEmployees = async (dept?: string, loc?: string) => {
    const filters: any = {};
  
    if (dept && dept.toLowerCase() !== "all") filters.departmentId = dept;
    if (loc && loc.toLowerCase() !== "all") filters.companyId = loc;
  
    const res = await employeeAPI.getEmployees(filters);
    setEmployees(res?.data || []);
  };
  useEffect(() => {
    loadEmployees(departmentId, locationId);
    setEmployeeId("all"); // reset employee when department changes
  }, [departmentId, locationId]);

  const loadReports = async () => {
    try {
      const { start, end, view } = getDateInterval();
      const formattedStart = format(start, "yyyy-MM-dd");
      const formattedEnd = format(end, "yyyy-MM-dd");

      const filters: any = {
        filter: dateRange || "all",
        startDate: formattedStart,
        endDate: formattedEnd,
      };

      const isAllDept = !departmentId || departmentId.toLowerCase() === "all";
      const isAllLoc = !locationId || locationId.toLowerCase() === "all";
      const isAllEmp = !employeeId || employeeId.toLowerCase() === "all";

      if (!isAllDept) filters.departmentId = departmentId;
      if (!isAllLoc) filters.companyId = locationId;
      if (!isAllEmp) filters.employeeId = employeeId;

      const activeDeptId = !isAllDept ? departmentId : undefined;
      const activeLocId = !isAllLoc ? locationId : undefined;
      const activeEmpId = !isAllEmp ? employeeId : undefined;

      const [attendanceRes, performanceRes, tasksRes, monthlyReportRes] = await Promise.allSettled([
        reportsAPI.getAttendanceReport(filters),
        reportsAPI.getPerformanceReport(filters),
        reportsAPI.getTaskAnalytics(filters),
        attendanceAPI.getAttendanceReport({
          view: view,
          filter: dateRange,
          date: formattedStart,
          startDate: formattedStart,
          endDate: formattedEnd,
          departmentId: activeDeptId,
          companyId: activeLocId,
          locationId: activeLocId,
          employeeId: activeEmpId,
        }),
      ]);

      if (attendanceRes.status === "fulfilled") {
        const attendance = attendanceRes.value;
        setAttendanceTrend(attendance?.trend || []);
        setAttendanceStats(attendance?.stats || {});
        setAttendanceRecords(attendance?.records || []);
      }
      if (performanceRes.status === "fulfilled") {
        const performance = performanceRes.value;
        setPerformanceData(performance?.ranking || []);
      }
      if (tasksRes.status === "fulfilled") {
        const tasks = tasksRes.value;
        setTaskDistribution(tasks?.distribution || []);
      }
      if (monthlyReportRes.status === "fulfilled") {
        const monthlyReport = monthlyReportRes.value;
        setMonthlyReportEmployees(monthlyReport?.employees || []);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  const exportToCSV = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      toast.error("No attendance records to export.");
      return;
    }

    const headers = [
      "Date",
      "Employee Name",
      "Employee ID",
      "Department",
      "Location",
      "Clock In",
      "Clock Out",
      "Total Worked Hours",
      "Overtime Hours",
      "Status",
      "Is Late",
    ];

    const rows = attendanceRecords.map((r) => [
      `"${r.date}"`,
      `"${(r.employeeName || "").replace(/"/g, '""')}"`,
      `"${(r.employeeCode || "").replace(/"/g, '""')}"`,
      `"${(r.department || "").replace(/"/g, '""')}"`,
      `"${(r.location || "").replace(/"/g, '""')}"`,
      `"${r.clockIn}"`,
      `"${r.clockOut}"`,
      `"${r.totalHours}"`,
      `"${r.overtimeHours}"`,
      `"${r.status}"`,
      `"${r.isLate}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Attendance_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance report exported to CSV successfully!");
  };

  const generateGridExcel = () => {
    if (!monthlyReportEmployees || monthlyReportEmployees.length === 0) {
      toast.error("No attendance data to export.", { id: "export-excel" });
      return;
    }

    const { start, end } = getDateInterval();
    const days = eachDayOfInterval({ start, end });
    const formattedStart = format(start, "yyyy-MM-dd");
    const formattedEnd = format(end, "yyyy-MM-dd");

    let titleText = `Daily Attendance Tracker ${format(start, "MMMM yyyy")}`;
    if (dateRange === "thisWeek") {
      titleText = `Weekly Attendance Tracker (${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")})`;
    } else if (dateRange === "thisYear") {
      titleText = `Annual Attendance Tracker ${format(start, "yyyy")}`;
    } else if (dateRange === "custom") {
      titleText = `Attendance Tracker (${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")})`;
    }

    const dayHeaders = days.map((d) => `"${format(d, "EEEE, MMMM d, yyyy")}"`);
    const headers = [
      "Emp ID",
      "Agent / Employee Name",
      "Departments",
      "Sup Names",
      "Designation",
      "Status",
      "Total No. Of Days",
      "Schedule",
      "Present",
      "Annual Leaves",
      "Off Days",
      "Post-Acquired Leaves",
      "Paid Leaves (SL/Abs/CL)",
      "Early Leave",
      "Pre-Acquired Leaves",
      "Unpaid Days",
      "T",
      "MU",
      "ML",
      "Overall Leave",
      ...dayHeaders,
    ];

    const rows = monthlyReportEmployees.map((emp) => {
      const empCode = emp.employeeId || "NULL";
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "NULL";
      const deptTitle = emp.department?.title || "NULL";
      const supName = emp.supervisor
        ? `${emp.supervisor.firstName || ""} ${emp.supervisor.lastName || ""}`.trim() || "NULL"
        : "NULL";
      const desig = emp.jobInfo?.designation || "NULL";
      const statusStr = emp.jobInfo?.employmentStatus || "NULL";

      let presentCount = 0;
      let tardyCount = 0;
      let offDaysCount = 0;
      let annualLeavesCount = 0;
      let paidLeavesCount = 0;
      let unpaidDaysCount = 0;

      const dailyCodes = days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const rec = emp.Attendance?.find((a: any) =>
          typeof a.date === "string" ? a.date.slice(0, 10) === dayStr : format(new Date(a.date), "yyyy-MM-dd") === dayStr
        );
        const cellDate = new Date(`${dayStr}T00:00:00`);
        const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));

        let isEmpDayOff = false;
        if (emp?.Schedule) {
          const scheduleList = Array.isArray(emp.Schedule) ? emp.Schedule : [emp.Schedule];
          const activeSched = scheduleList.find((s: any) => s && !s.deletedAt);
          if (activeSched && Array.isArray(activeSched.days) && activeSched.days.length > 0) {
            const dStr = format(cellDate, "EEE").toLowerCase();
            const dFull = format(cellDate, "EEEE").toLowerCase();
            const daysArr = activeSched.days.map((d: any) => {
              if (typeof d === "object" && d !== null) {
                return String(d.day || d.dayFull || d.name || d.short || "").trim().toLowerCase();
              }
              return String(d || "").trim().toLowerCase();
            });
            isEmpDayOff = !daysArr.includes(dStr) && !daysArr.includes(dFull);
          }
        }

        if (isEmpDayOff) offDaysCount++;

        let st = rec?.status?.toUpperCase();
        if (isEmpDayOff && st !== "PRESENT" && st !== "LATE" && st !== "TARDY" && st !== "LEAVE") {
          st = "OFF_DAY";
        }

        if (st === "PRESENT") {
          presentCount++;
          return "P";
        } else if (st === "LATE" || st === "TARDY") {
          presentCount++;
          tardyCount++;
          return "T";
        } else if (st === "LEAVE") {
          paidLeavesCount++;
          return "L";
        } else if (st === "OFF_DAY" || st === "OFF" || isEmpDayOff) {
          return "OFF";
        } else if (isFutureDay) {
          return "";
        } else {
          unpaidDaysCount++;
          return "A";
        }
      });

      const scheduledWorkDays = days.length - offDaysCount;
      const overallLeave = annualLeavesCount + paidLeavesCount + unpaidDaysCount;

      return [
        `"${empCode}"`,
        `"${fullName.replace(/"/g, '""')}"`,
        `"${deptTitle.replace(/"/g, '""')}"`,
        `"${supName.replace(/"/g, '""')}"`,
        `"${desig.replace(/"/g, '""')}"`,
        `"${statusStr}"`,
        days.length,
        scheduledWorkDays,
        presentCount,
        annualLeavesCount,
        offDaysCount,
        0, // Post-Acquired Leaves
        paidLeavesCount,
        0, // Early Leave
        0, // Pre-Acquired Leaves
        unpaidDaysCount,
        tardyCount,
        0, // MU
        0, // ML
        overallLeave,
        ...dailyCodes.map((c) => `"${c}"`),
      ].join(",");
    });

    const titleRow = `"${titleText}"` + ",".repeat(headers.length - 1);
    const csvContent = "\uFEFF" + [titleRow, headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const exportFileName = dateRange === "thisWeek"
      ? `Weekly_Attendance_Tracker_${formattedStart}_to_${formattedEnd}.csv`
      : `Attendance_Tracker_${dateRange}_${formattedStart}_to_${formattedEnd}.csv`;
    link.download = exportFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Attendance Excel sheet exported successfully!", { id: "export-excel" });
  };

  const exportToExcel = async () => {
    try {
      toast.loading("Generating Excel sheet...", { id: "export-excel" });
      const { start, end, view } = getDateInterval();
      const formattedStart = format(start, "yyyy-MM-dd");
      const formattedEnd = format(end, "yyyy-MM-dd");

      const isAllDept = !departmentId || departmentId.toLowerCase() === "all";
      const isAllLoc = !locationId || locationId.toLowerCase() === "all";
      const isAllEmp = !employeeId || employeeId.toLowerCase() === "all";

      await attendanceAPI.exportExcel({
        filter: dateRange,
        view: view,
        date: formattedStart,
        startDate: formattedStart,
        endDate: formattedEnd,
        from: formattedStart,
        to: formattedEnd,
        departmentId: !isAllDept ? departmentId : undefined,
        companyId: !isAllLoc ? locationId : undefined,
        locationId: !isAllLoc ? locationId : undefined,
        employeeId: !isAllEmp ? employeeId : undefined,
      });
      toast.success("Attendance tracker exported to Excel successfully!", { id: "export-excel" });
    } catch (err: any) {
      toast.error("Failed to export Excel report", { id: "export-excel" });
    }
  };

  const printReport = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      toast.error("No attendance records to print.");
      return;
    }

    const selectedDeptName = departments.find((d) => String(d.id) === departmentId)?.title || "All Departments";
    const selectedEmpObj = employees.find((e) => String(e.id) === employeeId);
    const selectedEmpName = selectedEmpObj ? `${selectedEmpObj.firstName} ${selectedEmpObj.lastName || ""}`.trim() : "All Employees";
    const selectedLocName = locations.find((l) => String(l.id) === locationId)?.name || "All Locations";
    const dateLabel = dateRange === "custom" ? `${startDate} to ${endDate}` : dateRange.toUpperCase();

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to export PDF.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report - FRONTPIN</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
            .subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }
            .filters { background: #f3f4f6; padding: 12px; margin-bottom: 20px; font-size: 13px; display: flex; flex-wrap: wrap; gap: 15px; border-radius: 6px; }
            .stats { display: flex; gap: 15px; margin-bottom: 20px; }
            .stat-card { flex: 1; background: #fff; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; text-align: center; }
            .stat-value { font-size: 20px; font-weight: bold; color: #2563eb; }
            .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; color: #374151; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .badge-present { background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-late { background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #9ca3af; }
            @media print {
              body { margin: 0; }
              @page { size: A4 landscape; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">FRONTPIN</div>
              <div class="subtitle">Filtered Real-Time Attendance Report</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #6b7280;">
              Date Generated: ${new Date().toLocaleDateString()}<br/>
              Time: ${new Date().toLocaleTimeString()}
            </div>
          </div>

          <div class="filters">
            <div><strong>Date Range:</strong> ${dateLabel}</div>
            <div><strong>Department:</strong> ${selectedDeptName}</div>
            <div><strong>Employee:</strong> ${selectedEmpName}</div>
            <div><strong>Location:</strong> ${selectedLocName}</div>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-label">Total Working Hours</div>
              <div class="stat-value">${attendanceStats.totalHours || 0} hrs</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Present Days</div>
              <div class="stat-value">${attendanceStats.present || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Late Entries</div>
              <div class="stat-value">${attendanceStats.late || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Overtime Hours</div>
              <div class="stat-value">${attendanceStats.overtime || 0} hrs</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee Name</th>
                <th>Emp ID</th>
                <th>Department</th>
                <th>Location</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
                <th>Overtime</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRecords
                .map(
                  (r) => `
                <tr>
                  <td>${r.date}</td>
                  <td><strong>${r.employeeName}</strong></td>
                  <td>${r.employeeCode}</td>
                  <td>${r.department}</td>
                  <td>${r.location}</td>
                  <td>${r.clockIn}</td>
                  <td>${r.clockOut}</td>
                  <td>${r.totalHours} h</td>
                  <td>${r.overtimeHours} h</td>
                  <td>
                    <span class="${r.isLate === "Yes" ? "badge-late" : "badge-present"}">
                      ${r.status}
                    </span>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            Report generated by Frontpin HR Management System
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-3 max-w-full overflow-hidden p-1">

      {/* HEADER & EXPORT BUTTONS */}
      <div className="flex flex-wrap gap-2.5 justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight">Reports & Analytics</h2>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={exportToExcel} variant="default" size="sm" className="h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            Export Excel Sheet
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
            Export CSV
          </Button>
          <Button onClick={printReport} variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5">
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            Export / Print PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="attendance" className="space-y-3">
        {/* TabsList hidden since only Attendance report is used */}

        {/* ================= ATTENDANCE ================= */}
        <TabsContent value="attendance" className="space-y-3 mt-0">

          {/* Real-Time Attendance Grid (Excel View) */}
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden" style={{ maxWidth: "1040px" }}>
            <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div>
                <CardTitle className="text-sm font-bold">Real-Time Attendance Excel Grid View</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Showing {monthlyReportEmployees.length} employee records matching current filters
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="thisYear">This Year</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>

                {dateRange === "custom" && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      value={startDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        const val = e.target.value;
                        const todayStr = new Date().toISOString().split("T")[0];
                        if (val && val > todayStr) return;
                        setStartDate(val);
                      }}
                      className="w-[130px] h-9 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={endDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        const val = e.target.value;
                        const todayStr = new Date().toISOString().split("T")[0];
                        if (val && val > todayStr) return;
                        setEndDate(val);
                      }}
                      className="w-[130px] h-9 text-xs"
                    />
                  </div>
                )}

                <SearchableSelect
                  className="w-[160px]"
                  placeholder="Department"
                  searchPlaceholder="Search department..."
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  options={[
                    { value: "all", label: "All Departments" },
                    ...departments.map((d) => ({
                      value: String(d.id),
                      label: d.title,
                    })),
                  ]}
                />

                <SearchableSelect
                  className="w-[160px]"
                  placeholder="Employee"
                  searchPlaceholder="Search employee..."
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  options={[
                    { value: "all", label: "All Employees" },
                    ...employees.map((e) => ({
                      value: String(e.id),
                      label: `${e.firstName} ${e.lastName || ""}`.trim(),
                    })),
                  ]}
                />

                <SearchableSelect
                  className="w-[160px]"
                  placeholder="Location"
                  searchPlaceholder="Search location..."
                  value={locationId}
                  onValueChange={(val) => {
                    setLocationId(val);
                    localStorage.setItem("selectedLocation", val);
                    localStorage.setItem("dashboard-selected-location", val);
                    window.dispatchEvent(new CustomEvent("location-changed", { detail: val }));
                  }}
                  options={[
                    { value: "all", label: "All Locations" },
                    ...locations.map((l) => ({
                      value: String(l.id),
                      label: l.name,
                    })),
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
              {monthlyReportEmployees.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No real-time employee attendance records found for the selected filters.
                </div>
              ) : (
                <div className="overflow-auto w-full max-w-full max-h-[calc(100vh-295px)] min-h-[220px] rounded-lg border border-gray-200 shadow-xs dark:border-gray-800" style={{ maxWidth: "1075px" }}>
                  {(() => {
                    const { start, end } = getDateInterval();
                    const days = eachDayOfInterval({ start, end });
                    const daysInMonthCount = days.length;

                    return (
                      <table className="w-full border-collapse text-xs text-left">
                        <thead className="sticky top-0 z-30 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-xs">
                          <tr className="bg-gray-100 dark:bg-gray-900">
                            <th className="sticky left-0 z-40 bg-gray-100 dark:bg-gray-900 px-3 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 min-w-[110px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Emp IDs</th>
                            <th className="sticky left-[110px] z-40 bg-gray-100 dark:bg-gray-900 px-3 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Agent / Employee Name</th>
                            <th className="px-3 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 min-w-[120px]">Departments</th>
                            <th className="px-3 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 min-w-[140px]">Sup Names</th>
                            <th className="px-3 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 min-w-[180px]">Designation</th>
                            <th className="px-3 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center min-w-[70px]">Status</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center min-w-[75px]">Total Days</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center min-w-[70px]">Schedule</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center min-w-[70px]">Present</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center bg-yellow-300 text-black min-w-[85px]">Annual Leaves</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center min-w-[70px]">Off Days</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center bg-yellow-300 text-black min-w-[85px]">Paid Leaves</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center min-w-[75px]">Unpaid Days</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center min-w-[50px]">T</th>
                            <th className="px-2 py-3 font-bold border-r border-gray-200 dark:border-gray-800 text-center bg-yellow-300 text-black min-w-[85px]">Overall Leave</th>
                            {days.map((day) => (
                              <th
                                key={day.toISOString()}
                                className="px-1.5 py-2 font-bold text-center border-r border-gray-200 dark:border-gray-800 bg-slate-900 text-white min-w-[38px]"
                              >
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-[9px] uppercase tracking-tighter opacity-80">{format(day, "EEE")}</span>
                                  <span className="font-extrabold text-xs">{format(day, "d")}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
                          {monthlyReportEmployees.map((emp) => {
                            const empCode = emp.employeeId || "NULL";
                            const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "NULL";
                            const deptTitle = emp.department?.title || "NULL";
                            const supName = emp.supervisor
                              ? `${emp.supervisor.firstName || ""} ${emp.supervisor.lastName || ""}`.trim() || "NULL"
                              : "NULL";
                            const desig = emp.jobInfo?.designation || "NULL";
                            const statusStr = emp.jobInfo?.employmentStatus || "NULL";

                            let presentCount = 0;
                            let tardyCount = 0;
                            let offDaysCount = 0;
                            let annualLeavesCount = 0;
                            let paidLeavesCount = 0;
                            let unpaidDaysCount = 0;

                            const dailyCells = days.map((day) => {
                              const dayStr = format(day, "yyyy-MM-dd");
                              const rec = emp.Attendance?.find((a: any) =>
                                typeof a.date === "string" ? a.date.slice(0, 10) === dayStr : format(new Date(a.date), "yyyy-MM-dd") === dayStr
                              );

                              const cellDate = new Date(`${dayStr}T00:00:00`);
                              const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));

                              let isEmpDayOff = false;
                              if (emp?.Schedule) {
                                const scheduleList = Array.isArray(emp.Schedule) ? emp.Schedule : [emp.Schedule];
                                const activeSched = scheduleList.find((s: any) => s && !s.deletedAt);
                                if (activeSched && Array.isArray(activeSched.days) && activeSched.days.length > 0) {
                                  const dStr = format(cellDate, "EEE").toLowerCase();
                                  const dFull = format(cellDate, "EEEE").toLowerCase();
                                  const daysArr = activeSched.days.map((d: any) => {
                                    if (typeof d === "object" && d !== null) {
                                      return String(d.day || d.dayFull || d.name || d.short || "").trim().toLowerCase();
                                    }
                                    return String(d || "").trim().toLowerCase();
                                  });
                                  isEmpDayOff = !daysArr.includes(dStr) && !daysArr.includes(dFull);
                                }
                              }

                              if (isEmpDayOff) offDaysCount++;

                              let st = rec?.status?.toUpperCase();
                              if (isEmpDayOff && st !== "PRESENT" && st !== "LATE" && st !== "TARDY" && st !== "LEAVE") {
                                st = "OFF_DAY";
                              }

                              if (st === "PRESENT") {
                                presentCount++;
                                return { code: "P", style: "bg-emerald-100 text-emerald-950 font-bold" };
                              } else if (st === "LATE" || st === "TARDY") {
                                presentCount++;
                                tardyCount++;
                                return { code: "T", style: "bg-amber-300 text-amber-950 font-bold" };
                              } else if (st === "LEAVE") {
                                paidLeavesCount++;
                                return { code: "L", style: "bg-sky-200 text-sky-950 font-bold" };
                              } else if (st === "OFF_DAY" || st === "OFF" || isEmpDayOff) {
                                return { code: "OFF", style: "bg-black text-white font-bold" };
                              } else if (isFutureDay) {
                                return { code: "", style: "bg-black text-white" };
                              } else {
                                unpaidDaysCount++;
                                return { code: "A", style: "bg-rose-200 text-rose-950 font-bold" };
                              }
                            });

                            const scheduledWorkDays = daysInMonthCount - offDaysCount;
                            const overallLeave = annualLeavesCount + paidLeavesCount + unpaidDaysCount;

                            return (
                              <tr key={emp.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40">
                                <td className="sticky left-0 z-20 bg-white dark:bg-gray-950 px-3 py-2 font-mono font-medium border-r border-gray-200 dark:border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">{empCode}</td>
                                <td className="sticky left-[110px] z-20 bg-white dark:bg-gray-950 px-3 py-2 font-semibold border-r border-gray-200 dark:border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">{fullName}</td>
                                <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-800">{deptTitle}</td>
                                <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-800">{supName}</td>
                                <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-800">{desig}</td>
                                <td className="px-3 py-2 text-center font-medium border-r border-gray-200 dark:border-gray-800">{statusStr}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800">{daysInMonthCount}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800">{scheduledWorkDays}</td>
                                <td className="px-2 py-2 text-center font-bold border-r border-gray-200 dark:border-gray-800 text-emerald-600">{presentCount}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 bg-yellow-100/70 font-semibold">{annualLeavesCount}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800">{offDaysCount}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 bg-yellow-100/70 font-semibold">{paidLeavesCount}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 text-rose-600 font-semibold">{unpaidDaysCount}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 font-bold text-amber-600">{tardyCount}</td>
                                <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 bg-yellow-100/70 font-bold">{overallLeave}</td>
                                {dailyCells.map((cell, idx) => (
                                  <td key={idx} className={`px-1 py-1 text-center border-r border-gray-200 dark:border-gray-800 ${cell.style}`}>
                                    {cell.code}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PERFORMANCE ================= */}
        <TabsContent value="performance" className="space-y-6">

          <Card>
            <CardHeader>
              <CardTitle>Employee Productivity Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="employee" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalHours" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ================= TASK ANALYTICS ================= */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={taskDistribution}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={120}
                    label
                  >
                    {taskDistribution.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

const StatCard = ({ title, value }: any) => (
  <Card className="p-3 shadow-xs">
    <div className="text-xs font-semibold text-muted-foreground">{title}</div>
    <div className="text-xl font-bold mt-1 text-gray-900 dark:text-gray-100">{value || 0}</div>
  </Card>
);