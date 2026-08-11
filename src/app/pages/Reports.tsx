import React, { useEffect, useState } from "react";
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
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import { reportsAPI, departmentAPI, locationAPI ,employeeAPI} from "../services/api";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [locationId, setLocationId] = useState("all");

  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>({});
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [taskDistribution, setTaskDistribution] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("all");
const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadReports();
  }, [dateRange, departmentId, locationId,employeeId]);

  const loadFilters = async () => {
    const dep = await departmentAPI.getDepartments();
    const loc = await locationAPI.getLocations();
    setDepartments(dep?.data || []);
    setLocations(loc?.data || []);
  };
  const loadEmployees = async (dept?: string, loc?: string) => {
    const filters: any = {};
  
    if (dept && dept !== "all") filters.departmentId = dept;
    if (loc && loc !== "all") filters.companyId = loc;
  
    const res = await employeeAPI.getEmployees(filters);
    setEmployees(res?.data || []);
  };
  useEffect(() => {
    loadEmployees(departmentId, locationId);
    setEmployeeId("all"); // reset employee when department changes
  }, [departmentId, locationId]);

  const loadReports = async () => {
    const filters: any = {
      filter: dateRange || "all",
    };
  
    if (departmentId !== "all") filters.departmentId = departmentId;
    if (locationId !== "all") filters.companyId = locationId;
    if (employeeId !== "all") filters.employeeId = employeeId;
  
    const attendance = await reportsAPI.getAttendanceReport(filters);
    const performance = await reportsAPI.getPerformanceReport(filters);
    const tasks = await reportsAPI.getTaskAnalytics(filters);
  
    setAttendanceTrend(attendance?.trend || []);
    setAttendanceStats(attendance?.stats || {});
    setPerformanceData(performance?.ranking || []);
    setTaskDistribution(tasks?.distribution || []);
  };

  return (
    <div className="space-y-6">

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>

        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
            </SelectContent>
          </Select>
          <SearchableSelect
            className="w-[180px]"
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
            className="w-[180px]"
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
            className="w-[180px]"
            placeholder="Location"
            searchPlaceholder="Search location..."
            value={locationId}
            onValueChange={setLocationId}
            options={[
              { value: "all", label: "All Locations" },
              ...locations.map((l) => ({
                value: String(l.id),
                label: l.name,
              })),
            ]}
          />
        </div>
      </div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* ================= ATTENDANCE ================= */}
        <TabsContent value="attendance" className="space-y-6">

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <StatCard title="Total Working Hours" value={attendanceStats.totalHours} />
            <StatCard title="Present Days" value={attendanceStats.present} />
            <StatCard title="Late Entries" value={attendanceStats.late} />
            <StatCard title="Overtime Hours" value={attendanceStats.overtime} />
          </div>

          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#10b981" />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" />
                </LineChart>
              </ResponsiveContainer>
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
  <Card>
    <CardHeader>
      <CardTitle className="text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value || 0}</div>
    </CardContent>
  </Card>
);