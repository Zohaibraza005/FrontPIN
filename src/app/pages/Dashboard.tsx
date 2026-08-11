import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dashboardAPI, employeeAPI, locationAPI } from "../services/api";
import { useNavigate, useParams } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  FolderKanban,
  CheckCircle,
  AlertCircle,
  CalendarOff,
  ListTodo,
  PlayCircle,
  CheckSquare,
  AlertTriangle,
  LogIn,
  LogOut,
  Coffee,
  BarChart3,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet"; // Shadcn Sheet
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const DATE_KEY = "dashboard-selected-date";
  const LOCATION_KEY = "dashboard-selected-location";

  // ── Initialize from localStorage (or fallback) ──
  const getInitialDate = () => {
    const saved = localStorage.getItem(DATE_KEY);
    // Check if it's a valid YYYY-MM-DD string
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      return saved;
    }
    return new Date().toISOString().split("T")[0]; // today
  };

  const getInitialLocation = () => {
    return localStorage.getItem(LOCATION_KEY) || "ALL";
  };

  const [weeklyDummyData,setWeeklyTimeSheetData] =useState([]);
  
  const isAdminOrSupervisor =
    user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  // ── Admin/Supervisor states ──
  const [stats, setStats] = useState<any>({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingLeaves: 0,
    activeProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day"); // custom state for switch
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  const [taskTrend, setTaskTrend] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const today = new Date().toISOString().split("T")[0];
  const [attendanceSheetOpen,setAttendanceSheetOpen] = useState(false)
  const [selectedAttendance,setSelectedAttendance] = useState(null)

 
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [selectedLocation, setSelectedLocation] = useState(getInitialLocation);
  const [locations, setLocations] = useState([]);

  // ── Employee-only states ──
  const [employeeTaskStats, setEmployeeTaskStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);
  useEffect(() => {
    localStorage.setItem(DATE_KEY, selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem(LOCATION_KEY, selectedLocation);
  }, [selectedLocation]);
  
  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "SUPERVISOR") {
      loadDashboard(selectedDate, selectedLocation);

    }
  }, [selectedDate, selectedLocation]);

  const loadDashboard = async (
    date = selectedDate,
    location = selectedLocation
  ) => {
    try {
      let formattedDate = date;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split("T")[0];
        } else {
          formattedDate = new Date().toISOString().split("T")[0]; // fallback to today
        }
      } catch {
        formattedDate = new Date().toISOString().split("T")[0];
      }
    }
      if (user?.role === "ADMIN") {
        const statsData = await dashboardAPI.getAdminDashboard({
          date:formattedDate,
          location,
        });
        const weeklyAttendance = await dashboardAPI.getWeeklyTimesheet({
          date:formattedDate,
          location,
        });
        setWeeklyTimeSheetData(weeklyAttendance.data)

        const graphData = await dashboardAPI.getAdminGraphs({
          date:formattedDate,
          location,
        });
        const loc = await locationAPI.getLocations();
        setLocations(loc.data);

        setStats(statsData.stats || {});
        setAttendanceData(statsData.attendanceWidget || []);

        setWeeklyAttendance(graphData.weeklyAttendance || []);
        setProjectStatusData(graphData.projectStatusData || []);
        setTaskTrend(graphData.taskTrend || []);
        setDepartmentData(graphData.departmentData || []);
      } else if (user?.role === "SUPERVISOR") {
        const statsData = await dashboardAPI.getSupervisorDashboard({
          date:formattedDate,
          location,
        });

        const graphData = await dashboardAPI.getAdminGraphs({
          date:formattedDate,
          location,
        });

        setStats(statsData.stats || {});
        setAttendanceData(statsData.attendanceWidget || []);

        setWeeklyAttendance(graphData.weeklyAttendance || []);
        setProjectStatusData(graphData.projectStatusData || []);
        setTaskTrend(graphData.taskTrend || []);
        setDepartmentData(graphData.departmentData || []);
        const loc = await locationAPI.getLocations();
        setLocations(loc.data);
      } else {
        const userData = await dashboardAPI.getUserDashboard();

        setEmployeeTaskStats(
          userData.taskStats || {
            total: 0,
            active: 0,
            completed: 0,
            overdue: 0,
          }
        );

        setAttendanceData(userData.attendanceWidget || []);
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    }
  };
  // Format attendance (used in both views if needed)
  const formattedAttendance = attendanceData.map((a: any) => ({
    id: a.id,
    name: a.employee?.firstName || a.name || "Unknown",
    status: a?.status?.toLowerCase() || "unknown",
    clockIn: a?.checkInTime
      ? new Date(a.checkInTime).toLocaleTimeString()
      : null,
    clockOut: a?.checkOutTime
      ? new Date(a.checkOutTime).toLocaleTimeString()
      : null,
      activities: a.activities
  }));

  const getFilteredEmployees = (status: string) => {
    return formattedAttendance.filter((emp) => emp.status === status);
  };
  const chartData = weeklyDummyData.map(item => ({
    day: item.day,
    working:   Number(item.workingHours),
    break:     Number(item.breakHours),
    overtime:  Number(item.overtimeHours),
  }));

  // ────────────── RENDER ──────────────
  return (
    <div className="tour-dashboard space-y-6 p-4 md:p-6">
      {/* Welcome Banner – common to all roles */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* LEFT SIDE */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {user?.name || "User"}!
          </h1>
          <p className="text-blue-100">
            {isAdminOrSupervisor
              ? "Here's what's happening with your company today."
              : "Here's an overview of your tasks and activity."}
          </p>
        </div>

        {/* RIGHT SIDE FILTERS */}
        {isAdminOrSupervisor && (
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl backdrop-blur">
            {/* DATE FILTER */}
{/*         
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-black"
            /> */}
            <div className="">
            <DatePicker
        selected={selectedDate}
        onChange={(date: Date) => setSelectedDate(date)}
        dateFormat={viewMode === "month" ? "MMMM yyyy" : viewMode === "week" ? "yyyy-'W'II" : "yyyy-MM-dd"}
        
        // Month/Year dropdowns on
        showMonthDropdown
        showYearDropdown
        dropdownMode="select" // ya "scroll"
        
      
        className=" text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        placeholderText="Select date..."
      />
    
              </div>

            {/* LOCATION FILTER - ShadCN */}
            <Select
              value={selectedLocation}
              onValueChange={(value) => setSelectedLocation(value)}
              style={{
                borderWidth:1,
                borderColor:'red'
              }}
             
            >
              <SelectTrigger className="w-[200px] bg-white text-black ">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>

              <SelectContent>
                {/* 🔹 Default ALL option at top */}
                <SelectItem value="ALL">All Locations</SelectItem>

                {/* 🔹 Dynamic Locations */}
                {locations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isAdminOrSupervisor ? (
        <>
          {/* ── Stats + Attendance ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left: Stats Cards ── takes more space on large screens */}
            <div className="xl:col-span-8 space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
               
                Attendance Stats
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <StatCard
                  title="Total Employees"
                  value={stats.totalEmployees}
                  icon={Users}
                  selectedDate={selectedDate}          // ← pass here
                selectedLocation={selectedLocation}
                  img={'/assets/Employees.png'}
                  color="blue"
                  label="Total"
                />
                <StatCard
                  title="Present Today"
                  value={stats.presentToday}
                  icon={UserCheck}
                  color="green"
                  selectedDate={selectedDate}          // ← pass here
                selectedLocation={selectedLocation}
                  img={'/assets/Presents.png'}
                  label="Presents"
                />
                <StatCard
                  title="Absent Today"
                  value={stats.totalEmployees - stats.presentToday}
                  icon={UserX}
                  color="red"
                  selectedDate={selectedDate}          // ← pass here
                selectedLocation={selectedLocation}
                  img={'/assets/Absents.png'}
                  label="Absents"
                />
                <StatCard
                  title="On Leave"
                  value={stats.onLeave}
                  icon={CalendarOff}
                  color="amber"
                  selectedDate={selectedDate}          // ← pass here
                selectedLocation={selectedLocation}
                  img={'/assets/Leaves.png'}
                  label="On Leave"
                />
                {/* <StatCard
                  title="Active Projects"
                  value={stats.activeProjects}
                  icon={FolderKanban}
                  color="purple"
                  selectedDate={selectedDate}          // ← pass here
                selectedLocation={selectedLocation}
                  img={'/assets/project.png'}
                />
                <StatCard
                  title="Completed Tasks"
                  value={stats.completedTasks}
                  icon={CheckCircle}
                  color="emerald"
                  selectedDate={selectedDate}          // ← pass here
                selectedLocation={selectedLocation}
                  img={'/assets/reports.png'}
                />
                <StatCard
                  title="Pending Tasks"
                  value={stats.pendingTasks}
                  icon={ListTodo}
                  color="orange"
                  selectedDate={selectedDate}          // ← pass here
                selectedLocation={selectedLocation}
                  img={'/assets/Assign-Leave.png'}
                  
                /> */}
              </div>
              


              <div className="mt-8">
  <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
    
    Weekly TimeSheet Overview
  </h2>

  <Card className="border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">Working Hours Breakdown</CardTitle>
      <p className="text-sm text-muted-foreground">
        {weeklyDummyData?.[0]?.date ? `Week: ${weeklyDummyData[0].date} – ${weeklyDummyData[6].date}` : "No data"}
      </p>
    </CardHeader>

    <CardContent>
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weeklyDummyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 13 }}
            />
            <YAxis 
              label={{ 
                value: 'Hours', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#64748b',
                fontSize: 13
              }}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${value}h`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              formatter={(value: string) => [`${Number(value).toFixed(1)} hrs`, '']}
              labelFormatter={(label) => `Day: ${label}`}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ fontSize: '13px' }}
            />

            <Bar 
              dataKey="workingHours" 
              name="Working Time" 
              stackId="a" 
              fill="#22c55e" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="breakHours" 
              name="Break Time" 
              stackId="a" 
              fill="#eab308" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="overtimeHours" 
              name="Overtime" 
              fill="#a855f7" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row – dynamic */}
      {weeklyDummyData?.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6 text-center text-sm">
          <div>
            <p className="text-gray-500">Total Working</p>
            <p className="font-semibold text-green-600">
              {weeklyDummyData.reduce((sum, d) => sum + Number(d.workingHours), 0).toFixed(1)} hrs
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Break</p>
            <p className="font-semibold text-yellow-600">
              {weeklyDummyData.reduce((sum, d) => sum + Number(d.breakHours), 0).toFixed(1)} hrs
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Overtime</p>
            <p className="font-semibold text-purple-600">
              {weeklyDummyData.reduce((sum, d) => sum + Number(d.overtimeHours), 0).toFixed(1)} hrs
            </p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
</div>
            </div>

            {/* Right: Today's Attendance Widget ── compact & colorful */}
            <div className="xl:col-span-4">
        <Card className="h-full shadow-xl border-t-4 border-t-blue-600 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/60 pb-0 pt-5 px-3 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-800 text-xl font-semibold">
              <Clock className="h-5 w-5 text-blue-600" />
              Today's Attendance
            </CardTitle>
          </CardHeader>

          <CardContent className="p-2 flex flex-col h-[440px]">
            <Tabs defaultValue="present" className="flex flex-col flex-1">
              <TabsList className="grid grid-cols-5 bg-gray-100/70 p-0 rounded-lg mb-5 border border-gray-200">
                <TabsTrigger
                  value="present"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-white/80 transition-all"
                >
                  Present 
                </TabsTrigger>

                <TabsTrigger
                  value="late"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-white/80 transition-all"
                >
                  Late 
                </TabsTrigger>

                <TabsTrigger
                  value="break"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-white/80 transition-all"
                >
                  Break 
                </TabsTrigger>

                <TabsTrigger
                  value="leave"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-white/80 transition-all"
                >
                  Leave 
                </TabsTrigger>

                <TabsTrigger
                  value="absent"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-white/80 transition-all"
                >
                  Absent  
                </TabsTrigger>
              </TabsList>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-hidden rounded-lg  bg-white">
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <TabContent
                    status="present"
                    title="Present"
                    icon={LogIn}
                    color="green-600"
                    getFiltered={getFilteredEmployees}
                    setSelectedAttendance={setSelectedAttendance}
                    setAttendanceSheetOpen={setAttendanceSheetOpen}
                  />
                  <TabContent
                    status="late"
                    title="Late"
                    icon={Clock}
                    color="yellow-600"
                    getFiltered={getFilteredEmployees}
                    setSelectedAttendance={setSelectedAttendance}
                    setAttendanceSheetOpen={setAttendanceSheetOpen}
                  />
                  <TabContent
                    status="break"
                    title="Break"
                    icon={Coffee}
                    color="amber-600"
                    getFiltered={getFilteredEmployees}
                    setSelectedAttendance={setSelectedAttendance}
                    setAttendanceSheetOpen={setAttendanceSheetOpen}
                  />
                  <TabContent
                    status="leave"
                    title="Leave"
                    icon={UserX}
                    color="orange-600"
                    getFiltered={getFilteredEmployees}
                    setSelectedAttendance={setSelectedAttendance}
                    setAttendanceSheetOpen={setAttendanceSheetOpen}
                  />
                  <TabContent
                    status="absent"
                    title="Absent"
                    icon={CalendarOff}
                    color="red-600"
                    getFiltered={getFilteredEmployees}
                    setSelectedAttendance={setSelectedAttendance}
                    setAttendanceSheetOpen={setAttendanceSheetOpen}
                  />
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
</div>
          </div>

          {/* ── Charts Section ── (same as before but with better spacing) */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
            
              {/* import { BarChart3 } from "lucide-react" */}
              Analytics Overview
            </h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Your existing 4 ChartCard components here – unchanged */}
              <ChartCard title="Weekly Attendance Trend">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#10b981" />
                    <Bar dataKey="absent" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Project Status Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {projectStatusData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Task Completion Trend">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={taskTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Employees by Department">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            {/* Attendance Details Sheet */}
      <Sheet open={attendanceSheetOpen} onOpenChange={setAttendanceSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedAttendance?.name || "Attendance Details"}</SheetTitle>
            <SheetDescription>
              Today's Activity Timeline • {selectedDate}
            </SheetDescription>
          </SheetHeader>

          {selectedAttendance && (
            <div className="mt-6 space-y-6 px-4" >
              {/* Basic Attendance Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Clock In</p>
                  <p className="font-medium">
                    {selectedAttendance.clockIn || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clock Out</p>
                  <p className="font-medium">
                    {selectedAttendance.clockOut || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="mt-1 capitalize">
                    {selectedAttendance.status.toLowerCase()}
                  </Badge>
                </div>
              </div>

              {/* Activities Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Activity Timeline
                </h3>

                {selectedAttendance.activities?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedAttendance.activities.map((act: any) => (
                      <div
                        key={act.id}
                        className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50/70 rounded-r-md"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {act.type === "task" ? (
                              <PlayCircle className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Coffee className="h-5 w-5 text-amber-600" />
                            )}
                            <span className="font-medium capitalize">{act.type}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(act.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {act.endTime && (
                              <> → {new Date(act.endTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}</>
                            )}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-gray-600">
                          Duration: {act.durationMinutes !== null 
                            ? `${act.durationMinutes} min` 
                            : "Ongoing"}
                          {act.taskId && (
                            <span className="ml-2 text-blue-600">
                              (Task #{act.taskId})
                            </span>
                          )}
                        </div>

                        {act.idleDetected && (
                          <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-800">
                            Idle Detected
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    No activities recorded today
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
          </div>
        </>
      ) : (
        // ── REGULAR USER / EMPLOYEE VIEW ──
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <TaskStatCard
            title="Total Tasks"
            value={employeeTaskStats.total}
            icon={ListTodo}
            color="blue"
          />
          <TaskStatCard
            title="Active Tasks"
            value={employeeTaskStats.active}
            icon={PlayCircle}
            color="indigo"
          />
          <TaskStatCard
            title="Completed Tasks"
            value={employeeTaskStats.completed}
            icon={CheckSquare}
            color="green"
          />
          <TaskStatCard
            title="Overdue Tasks"
            value={employeeTaskStats.overdue}
            icon={AlertTriangle}
            color="red"
          />
        </div>
      )}
    </div>
  );
};

// ── Helper Components ──



// Optional: lucide icons for fallback
// import { Users, UserCheck, UserX, CalendarOff } from "lucide-react";

interface StatCardProps {
  label:string;
  title: string;
  value: number | string;
  color?: "blue" | "green" | "red" | "orange" | "purple" | "amber" | "gray";
  img?: string;          // ← custom image URL (left side)
  icon?: React.ComponentType<{ className?: string }>; // fallback lucide icon
  selectedDate: string;         // ← pass here
  selectedLocation:string
  attendanceSheetOpen,
}

export const StatCard = ({
  label,
  title,
  value,
  color = "gray",
  img,
  icon: Icon,
  selectedDate,         // ← pass here
                selectedLocation,
               
}: StatCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    navigate(`/stats/${slug}?date=${selectedDate}&location=${selectedLocation}`);
  };
  

  const borderColorClass = {
    blue:   "border-l-blue-600",
    green:  "border-l-blue-600",
    red:    "border-l-blue-600",
    orange: "border-l-blue-600",
    purple: "border-l-blue-600",
    amber:  "border-l-blue-600",
    gray:   "border-l-blue-600",
  }[color] || "border-l-blue-600";

  return (
    <Card
      onClick={handleClick}
      className={`
        cursor-pointer transition-all duration-200
        hover:shadow-lg hover:-translate-y-1
        border-l-2 ${borderColorClass}
        overflow-hidden bg-white
      `}
    >
      <CardContent className="p-5 flex items-center gap-3">
        {/* ── LEFT: IMAGE / ICON ── */}
        <div className="shrink-0">
          {img ? (
            <img
              src={img}
              alt={title}
              width={35}
              height={35}
              className="object-contain"
              onError={(e) => {
                // agar image fail ho to hide kar do ya fallback dikhao
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : Icon ? (
            <div className={`p-3 rounded-xl bg-${color}-100/50`}>
              <Icon className={`h-10 w-10 text-${color}-600`} />
            </div>
          ) : (
            // simple fallback initial
            <div className="h-16 w-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 text-xl font-bold">
              {title?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>

        {/* ── RIGHT: TITLE + VALUE ── */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-600 truncate text-sm">
            {label}
          </h3>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const TaskStatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    navigate(`/stats/${slug}`);
  };

  return (
    <Card
      onClick={handleClick}
      className={`cursor-pointer border-l-4 border-l-${color}-600`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
};



const TabContent = ({ status, title, icon: Icon, color, getFiltered, setSelectedAttendance, setAttendanceSheetOpen }: any) => {
  const [searchTerm, setSearchTerm] = useState("");

  const employeesByStatus = getFiltered(status);

  const filteredEmployees = employeesByStatus.filter((emp: any) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleView = (emp: any) => {
    setSelectedAttendance(emp);
    setAttendanceSheetOpen(true);
  };

  return (
    <TabsContent 
      value={status} 
      className="mt-0 flex flex-col flex-1 min-h-0"   // ← yeh important hai
    >
      <div className="flex flex-col flex-1 min-h-0 space-y-3 px-1">
        {/* Search Input */}
        
        <Input
          placeholder={`Search ${title.toLowerCase()} employees...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />

        {/* Count */}
        <p className="text-sm font-medium text-gray-600 shrink-0">
          Showing {filteredEmployees.length} of {employeesByStatus.length}
        </p>

        {/* Scrollable Area – yeh pura bacha hua space lega */}
        <div className="attendance-scroll" >
          {filteredEmployees.length === 0 ? (
            <div  className="flex flex-col items-center justify-center text-gray-400 " >
              <Icon className="h-12 w-12 mb-4 opacity-40" />
              {searchTerm
                ? `No matching ${title.toLowerCase()} employees found`
                : `No ${title.toLowerCase()} employees today`}
            </div>
          ) : (
            <div className="space-y-2 p-2 pb-6 0" >
              {filteredEmployees.map((emp: any) => (
                <div
                  key={emp.id}
                  onClick={(e) => {
                    
                    e.stopPropagation(); // card click se conflict na ho
                    if(status === "present" || status === "late"){
                      handleView(emp);
                    }
                    
                  }}
                  className={`
                    flex items-center justify-between 
                    border-1 border-gray-40
                    py-1 px-2 
                    rounded-lg 
                    cursor-pointer
                    bg-white 
                    hover:bg-gray-50 
                    transition-colors
                    
                  `}
                >
                  
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-full bg-${color}/10 flex-shrink-0`}>
                      <Icon className={`h-5 w-5 text-${color}`} />
                    </div>
                    <span className="font-medium truncate max-w-[220px]">
                      {emp.name}
                    </span>
                    
                  </div>
                  <div className="text-sm text-gray-600 font-medium whitespace-nowrap">
                    {emp.clockIn || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
};

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// ── New Details Page Component ──
// Assume this is routed to /stats/:category in your router setup
// You can fetch data via dashboardAPI.getStatsDetails(category) - implement this API to return { list: [...] }
// List items should have fields like id, name, status, clockIn, clockOut, deadline, etc. depending on category
