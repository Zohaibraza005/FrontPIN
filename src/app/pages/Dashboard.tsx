import React, { useEffect, useState } from "react";
import moment from "moment";
import { pdf } from "@react-pdf/renderer";
import { PayrollSlipPDF } from "./PayrollDetail";
import { useAuth } from "../contexts/AuthContext";
import { dashboardAPI, employeeAPI, locationAPI, taskAPI, leaveAPI, payrollAPI, attendanceAPI, API_URL } from "../services/api";
import { toast } from "sonner";
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
  Timer,
  LogIn,
  LogOut,
  Coffee,
  BarChart3,
  Eye,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Plus,
  Pencil,
  Calendar,
  Flag,
  Wallet,
  Trash2,
  Megaphone,
  Plane,
  FileText,
  CalendarDays,
  User,
  Search,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipTrigger as UITooltipTrigger,
  TooltipProvider as UITooltipProvider,
} from "../components/ui/tooltip";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const DATE_KEY = "dashboard-selected-date";
  const LOCATION_KEY = "dashboard-selected-location";

  // ── Initialize with today's local date for real-time live attendance ──
  const getInitialDate = () => {
    return moment().format("YYYY-MM-DD");
  };

  const getInitialLocation = () => {
    return localStorage.getItem("selectedLocation") || localStorage.getItem(LOCATION_KEY) || "ALL";
  };

  const [weeklyDummyData,setWeeklyTimeSheetData] =useState([]);
  
  const isAdminOrSupervisor =
    user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  // ── Admin/Supervisor states ──
  const [stats, setStats] = useState<any>({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    absentToday: 0,
    lateToday: 0,
    overtimeRequests: 0,
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
  const today = moment().format("YYYY-MM-DD");
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
  const [weeklyTasks, setWeeklyTasks] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState<string>( "");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [todayElapsedMinutes, setTodayElapsedMinutes] = useState<number>(0);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [payrollSummaryData, setPayrollSummaryData] = useState<any>(null);
  const [upcomingHolidayData, setUpcomingHolidayData] = useState<any>(null);
  const [isTodayOff, setIsTodayOff] = useState<boolean>(false);
  const [announcementIndex, setAnnouncementIndex] = useState<number>(0);
  const [todayStatusState, setTodayStatusState] = useState<any>(null);

  // Apply Leave Modal State
  const [applyLeaveOpen, setApplyLeaveOpen] = useState<boolean>(false);
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<any[]>([]);
  const [leaveFormData, setLeaveFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState<boolean>(false);
  const [downloadingPayslip, setDownloadingPayslip] = useState<boolean>(false);

  const handleDownloadPayslip = async () => {
    if (downloadingPayslip) return;
    try {
      setDownloadingPayslip(true);
      let targetPayrollId = payrollSummaryData?.id;

      if (!targetPayrollId) {
        try {
          const res = await payrollAPI.getAll();
          const list = Array.isArray(res) ? res : (res?.data || []);
          if (list && list.length > 0) {
            targetPayrollId = list[0].id;
          }
        } catch (err) {
          console.warn("Could not fetch user payroll list:", err);
        }
      }

      if (targetPayrollId) {
        toast.info("Preparing your payslip PDF...");
        const payrollRecord = await payrollAPI.getById(targetPayrollId);

        if (payrollRecord) {
          const blob = await pdf(<PayrollSlipPDF payroll={payrollRecord} />).toBlob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const empName = `${payrollRecord.employee?.firstName || "employee"}_${payrollRecord.employee?.lastName || ""}`.trim();
          const period = moment(payrollRecord.periodStart || payrollRecord.createdAt || new Date()).format("MMM-YYYY");
          link.download = `payslip_${empName}_${period}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Payslip downloaded successfully!");
          return;
        }
      }

      // If no generated payroll record exists for this user:
      if (user?.role === "ADMIN") {
        toast.info("No generated payroll record found. Redirecting to Payroll page...");
        navigate("/payroll");
      } else {
        toast.error("No generated payroll record found for your account.");
      }
    } catch (error) {
      console.error("Failed to download payslip:", error);
      if (user?.role === "ADMIN") {
        navigate("/payroll");
      } else {
        toast.error("Failed to generate payslip PDF");
      }
    } finally {
      setDownloadingPayslip(false);
    }
  };

  const handleOpenApplyLeave = async () => {
    setApplyLeaveOpen(true);
    if (leaveBalances.length > 0 && !leaveFormData.leaveTypeId) {
      setLeaveFormData((prev) => ({
        ...prev,
        leaveTypeId: String(leaveBalances[0].id),
      }));
    }
    try {
      const res = await leaveAPI.getLeaveTypes({ all: true });
      const types = res?.types || res?.data?.types || [];
      if (types.length > 0) {
        setAvailableLeaveTypes(types);
        if (!leaveFormData.leaveTypeId) {
          setLeaveFormData((prev) => ({
            ...prev,
            leaveTypeId: String(types[0].id),
          }));
        }
      }
    } catch (err) {
      console.warn("Could not load additional leave types:", err);
    }
  };

  const handleCreateLeaveSubmit = async () => {
    if (!leaveFormData.leaveTypeId || !leaveFormData.startDate || !leaveFormData.endDate) {
      toast.error("Please select a leave type, start date, and end date");
      return;
    }
    if (new Date(leaveFormData.startDate) > new Date(leaveFormData.endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setSubmittingLeave(true);
    try {
      await leaveAPI.createLeave({
        employeeId: user?.id,
        leaveTypeId: Number(leaveFormData.leaveTypeId),
        startDate: leaveFormData.startDate,
        endDate: leaveFormData.endDate,
        reason: leaveFormData.reason,
      });
      toast.success("Leave request submitted successfully!");
      setApplyLeaveOpen(false);
      setLeaveFormData({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      loadDashboard();
    } catch (err: any) {
      console.error("Create leave error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit leave request");
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Task detail sheet states
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedDashboardTask, setSelectedDashboardTask] = useState<any>(null);
  const [taskRemarks, setTaskRemarks] = useState<any[]>([]);
  const [remarkFormOpen, setRemarkFormOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState<any>(null);
  const [remarkTitle, setRemarkTitle] = useState("");
  const [remarkContent, setRemarkContent] = useState("");
  const [remarkAttachments, setRemarkAttachments] = useState<File[]>([]);
  const [remarkLoading, setRemarkLoading] = useState(false);

  const handleOpenTaskDetails = async (task: any) => {
    setSelectedDashboardTask(task);
    setTaskDetailOpen(true);
    try {
      const res = await taskAPI.getRemarks(task.id);
      setTaskRemarks(res.data || []);
    } catch (err) {
      console.error("Failed to load task remarks:", err);
    }
  };

  const handleSaveRemark = async () => {
    if (!selectedDashboardTask || !remarkContent.trim()) return;
    setRemarkLoading(true);
    try {
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          title: remarkTitle.trim() || null,
          content: remarkContent.trim(),
        })
      );
      remarkAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      if (editingRemark) {
        await taskAPI.updateRemark(
          selectedDashboardTask.id,
          editingRemark.id,
          {
            title: remarkTitle.trim() || undefined,
            content: remarkContent.trim(),
          }
        );
      } else {
        await taskAPI.createRemark(selectedDashboardTask.id, formData);
      }

      setRemarkFormOpen(false);
      setRemarkTitle("");
      setRemarkContent("");
      setRemarkAttachments([]);
      setEditingRemark(null);

      // Reload remarks
      const res = await taskAPI.getRemarks(selectedDashboardTask.id);
      setTaskRemarks(res.data || []);
    } catch (err) {
      console.error("Failed to save remark:", err);
    } finally {
      setRemarkLoading(false);
    }
  };

  const handleDeleteRemark = async (remarkId: number) => {
    if (!selectedDashboardTask) return;
    if (confirm("Are you sure you want to delete this remark?")) {
      try {
        await taskAPI.deleteRemark(selectedDashboardTask.id, remarkId);
        setTaskRemarks((prev) => prev.filter((r) => r.id !== remarkId));
      } catch (err) {
        console.error("Failed to delete remark:", err);
      }
    }
  };

  const formatRemarkDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    localStorage.removeItem(DATE_KEY);
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedLocation", selectedLocation);
    localStorage.setItem(LOCATION_KEY, selectedLocation);
  }, [selectedLocation]);
  
  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const newLoc = e.detail || localStorage.getItem("selectedLocation") || localStorage.getItem(LOCATION_KEY) || "ALL";
      setSelectedLocation(newLoc);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);

  useEffect(() => {
    loadDashboard(selectedDate, selectedLocation);

    const handleAttendanceUpdate = () => {
      loadDashboard(selectedDate, selectedLocation);
      attendanceAPI.getTodayStatus().then((st) => setTodayStatusState(st)).catch(() => {});
    };

    window.addEventListener("attendance-updated", handleAttendanceUpdate);

    // 🔄 Real-Time Polling every 5 seconds for live dashboard updates
    const pollInterval = setInterval(() => {
      loadDashboard(selectedDate, selectedLocation);
    }, 5000);

    return () => {
      window.removeEventListener("attendance-updated", handleAttendanceUpdate);
      clearInterval(pollInterval);
    };
  }, [selectedDate, selectedLocation, user?.role]);

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
          date: formattedDate,
          location,
        });
        const weeklyAttendance = await dashboardAPI.getWeeklyTimesheet({
          date: formattedDate,
          location,
        });
        setWeeklyTimeSheetData(weeklyAttendance.data)

        const graphData = await dashboardAPI.getAdminGraphs({
          date: formattedDate,
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
          date: formattedDate,
          location,
        });

        const graphData = await dashboardAPI.getAdminGraphs({
          date: formattedDate,
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
        // Always fetch today's real-time attendance status first (reliable endpoint)
        const statusRes = await attendanceAPI.getTodayStatus().catch(() => null);
        if (statusRes) {
          setTodayStatusState(statusRes);
        }

        try {
          const userData = await dashboardAPI.getUserDashboard(formattedDate);

          setEmployeeTaskStats(
            userData.taskStats || {
              total: 0,
              active: 0,
              completed: 0,
              overdue: 0,
            }
          );

          setWeeklyTasks(userData.weeklyTasks || []);
          setWeeklyAttendance(userData.weeklyAttendance || []);
          setCompanyName(userData.companyName || "");
          setLeaves(userData.leaves || []);
          setOvertimes(userData.overtimes || []);
          setLeaveBalances(userData.leaveBalances || []);
          setPayrollSummaryData(userData.payrollSummary || null);
          setUpcomingHolidayData(userData.upcomingHoliday || null);
          setIsTodayOff(Boolean(userData.isTodayOff));
        } catch (userDashErr) {
          console.error("User dashboard data error:", userDashErr);
        }
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    }
  };
  // Format attendance (used in both views if needed)
  const formattedAttendance = attendanceData.map((a: any) => ({
    id: a.id,
    name: a.name || (a.employee?.firstName ? `${a.employee.firstName} ${a.employee.lastName || ""}`.trim() : "Unknown"),
    status: (a?.status || "").toLowerCase(),
    clockIn: a?.checkInTime
      ? new Date(a.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null,
    clockOut: a?.checkOutTime
      ? new Date(a.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null,
    activities: a.activities || [],
  }));

  const getFilteredEmployees = (status: string) => {
    return formattedAttendance.filter((emp) => {
      const st = (emp.status || "").toLowerCase();
      if (status === "present") return st === "present" || st === "late" || st === "working";
      if (status === "break") return st === "break" || st === "on_break";
      if (status === "absent") return st === "absent";
      return st === status;
    });
  };
  const chartData = weeklyDummyData.map(item => ({
    day: item.day,
    working:   Number(item.workingHours),
    break:     Number(item.breakHours),
    overtime:  Number(item.overtimeHours),
  }));

  // ── Employee-specific helpers and timers ──
  const getTodayRecord = () => {
    const todayStr = new Date().toDateString();

    // 1. Prioritize todayStatusState (from dedicated /attendance/today-status endpoint)
    if (todayStatusState && (todayStatusState.clockedIn || todayStatusState.clockedOut || todayStatusState.checkInTime)) {
      // Verify checkInTime actually belongs to today
      if (todayStatusState.checkInTime && new Date(todayStatusState.checkInTime).toDateString() !== todayStr) {
        // Old state from previous day
      } else {
        const weeklyMatch = (weeklyAttendance || []).find((att: any) => {
          if (att.checkInTime && new Date(att.checkInTime).toDateString() === todayStr) return true;
          if (att.date && new Date(att.date).toDateString() === todayStr) return true;
          return false;
        });

        return {
          checkInTime: todayStatusState.checkInTime,
          checkOutTime: todayStatusState.checkOutTime,
          status: todayStatusState.clockedOut ? "CLOCKED_OUT" : "PRESENT",
          totalWorkedMinutes: todayStatusState.totalWorkedMinutes || weeklyMatch?.totalWorkedMinutes || 0,
          totalBreakMinutes: todayStatusState.totalBreakMinutes || weeklyMatch?.totalBreakMinutes || 0,
          punches: todayStatusState.punches || weeklyMatch?.punches || [],
        };
      }
    }

    if (weeklyAttendance && weeklyAttendance.length > 0) {
      // 2. Check by checkInTime matching today
      const byCheckIn = weeklyAttendance.find(
        (att: any) => att.checkInTime && new Date(att.checkInTime).toDateString() === todayStr
      );
      if (byCheckIn) return byCheckIn;

      // 3. Check by date (+12h UTC offset buffer) — only if checkInTime exists
      const byDate = weeklyAttendance.find((att: any) => {
        if (!att.date || !att.checkInTime) return false;
        const d1 = new Date(att.date).toDateString();
        if (d1 === todayStr) return true;
        const adjustedDate = new Date(new Date(att.date).getTime() + 12 * 3600 * 1000).toDateString();
        return adjustedDate === todayStr;
      });
      if (byDate) return byDate;

      // 4. Fallback to active unclosed record ONLY IF checkInTime is TODAY
      const activeUnclosed = weeklyAttendance.find((att: any) => {
        if (!att.checkInTime || att.checkOutTime) return false;
        return new Date(att.checkInTime).toDateString() === todayStr;
      });
      if (activeUnclosed) return activeUnclosed;
    }

    return null;
  };

  useEffect(() => {
    const todayRecord = getTodayRecord();
    if (todayRecord && todayRecord.checkInTime && !todayRecord.checkOutTime) {
      const updateTimer = () => {
        const checkInMs = new Date(todayRecord.checkInTime).getTime();
        const nowMs = Date.now();
        const diffMin = Math.floor((nowMs - checkInMs) / 60000);
        const breakMin = todayRecord.totalBreakMinutes || 0;
        const workedMin = Math.max(0, diffMin - breakMin);
        setTodayElapsedMinutes(workedMin);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else if (todayRecord) {
      setTodayElapsedMinutes(todayRecord.totalWorkedMinutes || 0);
    } else {
      setTodayElapsedMinutes(0);
    }
  }, [weeklyAttendance, todayStatusState]);

  const formatPunchTime = (timeStr: string) => {
    if (!timeStr) return "";
    const d = new Date(timeStr);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const getWeekDays = (dateStr: string) => {
    const baseDate = new Date(dateStr);
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(baseDate.setDate(diff));

    const weekdays = [];
    for (let i = 0; i < 5; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      weekdays.push(nextDay);
    }
    return weekdays;
  };

  const getAttendanceForDay = (day: Date) => {
    const y = day.getFullYear();
    const m = (day.getMonth() + 1).toString().padStart(2, "0");
    const d = day.getDate().toString().padStart(2, "0");
    const dayStr = `${y}-${m}-${d}`;
    const isToday = day.toDateString() === new Date().toDateString();

    if (weeklyAttendance && weeklyAttendance.length > 0) {
      const found = weeklyAttendance.find((a: any) => {
        if (a.checkInTime) {
          const cd = new Date(a.checkInTime);
          const cy = cd.getFullYear();
          const cm = (cd.getMonth() + 1).toString().padStart(2, "0");
          const cdd = cd.getDate().toString().padStart(2, "0");
          if (`${cy}-${cm}-${cdd}` === dayStr) return true;
        }

        if (a.date) {
          const ad = new Date(a.date);
          const ay = ad.getFullYear();
          const am = (ad.getMonth() + 1).toString().padStart(2, "0");
          const add = ad.getDate().toString().padStart(2, "0");
          if (`${ay}-${am}-${add}` === dayStr) return true;

          const adShift = new Date(new Date(a.date).getTime() + 12 * 3600 * 1000);
          const sY = adShift.getFullYear();
          const sM = (adShift.getMonth() + 1).toString().padStart(2, "0");
          const sD = adShift.getDate().toString().padStart(2, "0");
          if (`${sY}-${sM}-${sD}` === dayStr) return true;
        }

        return false;
      });

      if (found) return found;
    }

    if (isToday && todayStatusState && (todayStatusState.clockedIn || todayStatusState.checkInTime)) {
      return {
        checkInTime: todayStatusState.checkInTime,
        checkOutTime: todayStatusState.checkOutTime,
        status: todayStatusState.clockedOut ? "CLOCKED_OUT" : "PRESENT",
      };
    }

    return null;
  };

  const formatTableDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${monthName} ${day}, ${year}`;
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "--";
    const d = new Date(timeStr);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatWorkedHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} hrs`;
  };

  const formatStatus = (statusStr?: string | null) => {
    if (!statusStr) return "--";
    const status = statusStr.toUpperCase();
    if (status === "PRESENT" || status === "LATE") {
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          status === "PRESENT" 
            ? "bg-green-100 text-green-800" 
            : "bg-amber-100 text-amber-800"
        }`}>
          {status === "PRESENT" ? "Present" : "Late"}
        </span>
      );
    }
    if (status === "ABSENT") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          Absent
        </span>
      );
    }
    if (status === "LEAVE") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          Leave
        </span>
      );
    }
    return statusStr;
  };

  const getCalendarDays = (dateStr: string) => {
    const baseDate = new Date(dateStr);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    
    const prevMonthEnd = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      prevMonthDays.push(new Date(year, month - 1, prevMonthEnd - i));
    }
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push(new Date(year, month, i));
    }
    
    const nextMonthDays = [];
    const remaining = 42 - (prevMonthDays.length + currentMonthDays.length);
    for (let i = 1; i <= remaining; i++) {
      nextMonthDays.push(new Date(year, month + 1, i));
    }
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const formatMonthName = (dateStr: string) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const d = new Date(dateStr);
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const isCurrentOrFutureMonth = () => {
    if (!selectedDate) return true;
    const current = new Date(selectedDate);
    const now = new Date();
    return (
      current.getFullYear() > now.getFullYear() ||
      (current.getFullYear() === now.getFullYear() && current.getMonth() >= now.getMonth())
    );
  };

  const handlePrevMonth = () => {
    const current = new Date(selectedDate);
    current.setDate(1);
    current.setMonth(current.getMonth() - 1);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const handleNextMonth = () => {
    if (isCurrentOrFutureMonth()) return;
    const current = new Date(selectedDate);
    current.setDate(1);
    current.setMonth(current.getMonth() + 1);
    const nextStr = current.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];
    setSelectedDate(nextStr > todayStr ? todayStr : nextStr);
  };

  const todayRecord = getTodayRecord();
  const todayPunches = todayRecord?.punches || [];
  const todayHours = Math.floor(todayElapsedMinutes / 60);
  const todayMins = todayElapsedMinutes % 60;
  const todayHoursText = `${todayHours.toString().padStart(2, "0")}:${todayMins.toString().padStart(2, "0")} hrs`;
  const checkInTime = todayRecord?.checkInTime;
  const checkOutTime = todayRecord?.checkOutTime;
  const checkInTimeFormatted = checkInTime ? formatPunchTime(checkInTime) : "-----";
  const checkOutTimeFormatted = checkOutTime ? formatPunchTime(checkOutTime) : "-----";

  const pendingTasks = weeklyTasks.filter((t: any) =>
    ["TODO", "IN_PROGRESS"].includes(t.myStatus)
  );

  const filteredPendingTasks = pendingTasks.filter((t: any) => {
    if (priorityFilter === "ALL") return true;
    return t.priority?.toUpperCase() === priorityFilter;
  });

  // ────────────── RENDER ──────────────
  return (
    <div className="tour-dashboard space-y-6 p-4 md:p-6">
      {isAdminOrSupervisor ? (
        <>
          {/* ── Stats + Attendance ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Stats Cards ── takes more space on large screens */}
            <div className="xl:col-span-8 space-y-6">
              {/* Welcome Card – clean white card with vector illustration */}
              <div className="shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-6 md:p-7 flex flex-row items-center justify-between gap-4 min-h-[175px]">
                {/* LEFT SIDE: Welcome Text + Date Filter */}
                <div className="space-y-4 max-w-[65%] sm:max-w-[70%]">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                      Welcome back
                       {/* {user?.name || "User"}! */}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      Here's what's happening with your company today.
                    </p>
                  </div>

                  {/* DATE FILTER */}
                  <div className="inline-flex items-center gap-2.5 bg-gray-50/90 border border-gray-200/80 p-2.5 rounded-2xl">
                    <Calendar className="w-4 h-4 text-blue-600 ml-1 shrink-0" />
                    <DatePicker
                      selected={selectedDate ? moment(selectedDate, "YYYY-MM-DD").toDate() : new Date()}
                      maxDate={new Date()}
                      onChange={(date: Date | null) => {
                        if (!date) return;
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        if (date > today) return;
                        setSelectedDate(moment(date).format("YYYY-MM-DD"));
                      }}
                      dateFormat={viewMode === "month" ? "MMMM yyyy" : viewMode === "week" ? "yyyy-'W'II" : "yyyy-MM-dd"}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      className="text-gray-900 font-semibold bg-white w-full px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs cursor-pointer"
                      placeholderText="Select date..."
                    />
                    {selectedDate !== moment().format("YYYY-MM-DD") && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(moment().format("YYYY-MM-DD"))}
                        className="text-xs font-semibold px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors whitespace-nowrap shadow-xs"
                      >
                        Today
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE: SVG Vector Illustration */}
                <div className="hidden sm:block w-32 h-32 md:w-36 md:h-36 opacity-95 select-none flex-shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-600 fill-current">
                    {/* Background soft circle */}
                    <circle cx="100" cy="100" r="80" className="text-indigo-50/50" />
                    
                    {/* Laptop screen base */}
                    <rect x="50" y="80" width="100" height="60" rx="8" className="text-indigo-100" />
                    <rect x="55" y="85" width="90" height="42" rx="4" className="text-white" />
                    
                    {/* Laptop keyboard area */}
                    <path d="M40,140 L160,140 L150,148 L50,148 Z" className="text-indigo-300" />
                    <rect x="85" y="142" width="30" height="4" rx="1" className="text-indigo-400" />
                    
                    {/* Coffee mug */}
                    <rect x="154" y="115" width="12" height="18" rx="2" className="text-amber-500" />
                    <path d="M166,120 C170,120 170,128 166,128" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M150,110 C152,108 154,110 156,108" fill="none" stroke="#f59e0b" strokeWidth="1" />
                    
                    {/* Potted Plant */}
                    <path d="M25,120 L37,120 L34,136 L28,136 Z" className="text-emerald-300" />
                    <path d="M31,105 C25,110 28,120 31,120 C34,120 37,110 31,105 Z" className="text-emerald-500" />
                    <path d="M22,112 C18,118 25,123 27,120 C29,117 26,112 22,112 Z" className="text-emerald-600" />
                    <path d="M40,112 C44,118 37,123 35,120 C33,117 36,112 40,112 Z" className="text-emerald-600" />
                    
                    {/* Large clock */}
                    <circle cx="100" cy="50" r="32" className="text-white" stroke="#6366f1" strokeWidth="4.5" />
                    <line x1="100" y1="50" x2="100" y2="32" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="100" y1="50" x2="116" y2="50" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="100" cy="50" r="3.5" className="text-indigo-700" />
                    
                    {/* Code symbols on screen */}
                    <rect x="62" y="92" width="35" height="5" rx="1.5" className="text-indigo-400" />
                    <rect x="62" y="102" width="22" height="5" rx="1.5" className="text-indigo-300" />
                    <rect x="62" y="112" width="45" height="5" rx="1.5" className="text-indigo-200" />
                    
                    {/* Floating calendar checklist checkmark */}
                    <circle cx="152" cy="70" r="7" className="text-amber-100" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M149,70 L151,72 L154,68" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                Attendance Stats
              </h2>

              <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Total Employees"
                  value={stats.totalEmployees}
                  icon={Users}
                  selectedDate={selectedDate}
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
                  selectedDate={selectedDate}
                  selectedLocation={selectedLocation}
                  img={'/assets/Presents.png'}
                  label="Presents"
                />
                <StatCard
                  title="Absent Today"
                  value={stats.absentToday ?? Math.max(0, stats.totalEmployees - stats.presentToday - stats.onLeave)}
                  icon={UserX}
                  color="red"
                  selectedDate={selectedDate}
                  selectedLocation={selectedLocation}
                  img={'/assets/Absents.png'}
                  label="Absents"
                />
                <StatCard
                  title="On Leave"
                  value={stats.onLeave}
                  icon={CalendarOff}
                  color="amber"
                  selectedDate={selectedDate}
                  selectedLocation={selectedLocation}
                  img={'/assets/Leaves.png'}
                  label="On Leave"
                />
                <StatCard
                  title="Late / Tardy"
                  value={stats.lateToday ?? 0}
                  icon={AlertTriangle}
                  color="orange"
                  selectedDate={selectedDate}
                  selectedLocation={selectedLocation}
                  label="Late Today"
                />
                <StatCard
                  title="Overtime Requests"
                  value={stats.overtimeRequests ?? 0}
                  icon={Timer}
                  color="purple"
                  selectedDate={selectedDate}
                  selectedLocation={selectedLocation}
                  label="Overtime"
                />
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

            {/* Right: Today's Attendance Widget ── sleek & professional */}
            <div className="xl:col-span-4 xl:sticky xl:top-6">
              <Card className="h-full shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white flex flex-col">
                <CardHeader className="bg-white p-5 pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Clock className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-gray-900">
                          Today's Attendance
                        </CardTitle>
                        <p className="text-xs text-gray-400 font-medium">Real-time tracking</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 flex flex-col flex-1 min-h-[460px]">
                  <Tabs defaultValue="present" className="flex flex-col flex-1">
                    <TabsList className="grid grid-cols-3 gap-1.5 bg-gray-100/80 p-1.5 rounded-xl mb-4 border border-gray-200/60 h-auto">
                      <TabsTrigger
                        value="present"
                        className="rounded-lg text-xs font-semibold py-1.5 px-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs transition-all"
                      >
                        Present ({getFilteredEmployees("present").length})
                      </TabsTrigger>

                      <TabsTrigger
                        value="break"
                        className="rounded-lg text-xs font-semibold py-1.5 px-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-xs transition-all"
                      >
                        Break ({getFilteredEmployees("break").length})
                      </TabsTrigger>

                      <TabsTrigger
                        value="absent"
                        className="rounded-lg text-xs font-semibold py-1.5 px-2 data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-xs transition-all"
                      >
                        Absent ({getFilteredEmployees("absent").length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Scrollable content area */}
                    <div className="flex-1 overflow-hidden rounded-xl bg-white">
                      <div className="h-full overflow-y-auto pr-1">
                        <TabContent
                          status="present"
                          title="Present"
                          icon={LogIn}
                          color="emerald-600"
                          getFiltered={getFilteredEmployees}
                          setSelectedAttendance={setSelectedAttendance}
                          setAttendanceSheetOpen={setAttendanceSheetOpen}
                        />
                        <TabContent
                          status="late"
                          title="Late"
                          icon={Clock}
                          color="amber-600"
                          getFiltered={getFilteredEmployees}
                          setSelectedAttendance={setSelectedAttendance}
                          setAttendanceSheetOpen={setAttendanceSheetOpen}
                        />
                        <TabContent
                          status="break"
                          title="Break"
                          icon={Coffee}
                          color="orange-600"
                          getFiltered={getFilteredEmployees}
                          setSelectedAttendance={setSelectedAttendance}
                          setAttendanceSheetOpen={setAttendanceSheetOpen}
                        />
                        <TabContent
                          status="leave"
                          title="Leave"
                          icon={UserX}
                          color="purple-600"
                          getFiltered={getFilteredEmployees}
                          setSelectedAttendance={setSelectedAttendance}
                          setAttendanceSheetOpen={setAttendanceSheetOpen}
                        />
                        <TabContent
                          status="absent"
                          title="Absent"
                          icon={CalendarOff}
                          color="rose-600"
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

      {/* Attendance Details Sheet */}
      <Sheet open={attendanceSheetOpen} onOpenChange={setAttendanceSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 overflow-y-auto bg-gray-50/50">
          {selectedAttendance && (
            <div className="flex flex-col min-h-full">
              {/* Top Banner Header */}
              <div className="bg-white border-b border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                    {selectedAttendance.name
                      ? selectedAttendance.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate">
                      {selectedAttendance.name || "Employee Details"}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                      <span>Today's Activity Timeline</span>
                      <span>•</span>
                      <span className="font-semibold text-gray-700">
                        {selectedDate ? moment(selectedDate).format("MMM DD, YYYY") : "Today"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {/* Clock In */}
                  <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Clock In</span>
                      <div className="size-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <LogIn className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold font-mono text-gray-900 truncate">
                      {selectedAttendance.clockIn || "—"}
                    </p>
                  </div>

                  {/* Clock Out */}
                  <div className="bg-rose-50/60 border border-rose-100/80 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Clock Out</span>
                      <div className="size-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <LogOut className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold font-mono text-gray-900 truncate">
                      {selectedAttendance.clockOut || "—"}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Status</span>
                      <div className="size-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <UserCheck className="size-3.5" />
                      </div>
                    </div>
                    <div>
                      {(() => {
                        const st = (selectedAttendance.status || "").toLowerCase();
                        if (st === "present" || st === "working") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Present
                            </span>
                          );
                        } else if (st === "late") {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              Late
                            </span>
                          );
                        } else if (st === "break") {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
                              Break
                            </span>
                          );
                        } else if (st === "leave" || st === "on_leave") {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                              On Leave
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              Absent
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Timeline Body */}
              <div className="p-6 flex-1 bg-white mt-2">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Clock className="size-4" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">
                      Activity Timeline
                    </h3>
                  </div>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs font-semibold px-2.5 py-0.5">
                    {selectedAttendance.activities?.length || 0} Entries
                  </Badge>
                </div>

                {selectedAttendance.activities?.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-indigo-100 space-y-5">
                    {selectedAttendance.activities.map((act: any, idx: number) => {
                      const isTask = act.type === "task";
                      const startTimeFormatted = new Date(act.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const endTimeFormatted = act.endTime
                        ? new Date(act.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : null;

                      return (
                        <div key={act.id || idx} className="relative group">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[31px] top-1.5 size-4 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                            isTask ? "bg-indigo-600" : "bg-amber-500"
                          }`} />

                          {/* Card Content */}
                          <div className="bg-white border border-gray-200/80 hover:border-indigo-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`size-7 rounded-lg flex items-center justify-center ${
                                  isTask ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                                }`}>
                                  {isTask ? <PlayCircle className="size-4" /> : <Coffee className="size-4" />}
                                </div>
                                <span className="font-bold text-sm text-gray-900 capitalize">
                                  {act.type || "Activity"}
                                </span>
                              </div>

                              <span className="text-xs font-semibold font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                {startTimeFormatted} {endTimeFormatted && `→ ${endTimeFormatted}`}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100 mt-2">
                              <span className="flex items-center gap-1 font-medium">
                                <span>Duration:</span>
                                <span className="font-bold text-gray-800">
                                  {act.durationMinutes !== null && act.durationMinutes !== undefined
                                    ? `${act.durationMinutes} min`
                                    : "Ongoing"}
                                </span>
                              </span>

                              {act.taskId && (
                                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                                  Task #{act.taskId}
                                </span>
                              )}
                            </div>

                            {act.idleDetected && (
                              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                                <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                                <span>Idle Time Detected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <div className="size-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <Clock className="size-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">No Activities Logged</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      No activity transitions or task logs recorded for this employee today.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
        </>
      ) : (
        // ── REGULAR USER / EMPLOYEE VIEW ──
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Welcome Box */}
            <Card className="shadow-sm border rounded-2xl overflow-hidden bg-white flex flex-col justify-between p-6 min-h-[350px]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Welcome To {companyName || "Frontpin"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">CLOCK IN / Clock Out</p>
                </div>
                <div className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
                  <span className="font-bold text-indigo-600">Today:</span>
                  <span>{moment().format("DD MMM YYYY")}</span>
                </div>
              </div>

              <div className="flex flex-row items-center justify-between gap-6 my-auto">
                <div className="flex flex-col space-y-5">
                  <div className="relative pl-6 space-y-4">
                    {/* Vertical line connecting check-in and check-out */}
                    <div className="absolute left-[4px] top-2 bottom-2 w-0.5 bg-gray-200" />
                    
                    {/* Check In Row */}
                    <div className="flex items-center gap-3 text-sm whitespace-nowrap">
                      <span className="absolute left-0 w-2.5 h-2.5 rounded-full border-2 border-green-500 bg-white" />
                      <span className="font-semibold text-gray-700">CLOCK IN</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-600 font-medium">{checkInTimeFormatted}</span>
                    </div>

                    {/* Check Out Row */}
                    <div className="flex items-center gap-3 text-sm whitespace-nowrap">
                      <span className="absolute left-0 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-white" />
                      <span className="font-semibold text-gray-700">Clock Out</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-600 font-medium">{checkOutTimeFormatted}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {todayHoursText}
                    </div>
                    <p className="text-xs text-gray-500">Today's Hours</p>
                  </div>
                </div>

                {/* SVG Illustration - Modern Office Workstation */}
                <div className="hidden sm:block w-36 h-36 md:w-44 md:h-44 opacity-90 select-none flex-shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-600 fill-current">
                    {/* Background soft circle */}
                    <circle cx="100" cy="100" r="80" className="text-indigo-50/50" />
                    
                    {/* Laptop screen base */}
                    <rect x="50" y="80" width="100" height="60" rx="8" className="text-indigo-100" />
                    <rect x="55" y="85" width="90" height="42" rx="4" className="text-white" />
                    
                    {/* Laptop keyboard area */}
                    <path d="M40,140 L160,140 L150,148 L50,148 Z" className="text-indigo-300" />
                    <rect x="85" y="142" width="30" height="4" rx="1" className="text-indigo-400" />
                    
                    {/* Coffee mug */}
                    <rect x="154" y="115" width="12" height="18" rx="2" className="text-amber-500" />
                    <path d="M166,120 C170,120 170,128 166,128" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M150,110 C152,108 154,110 156,108" fill="none" stroke="#f59e0b" strokeWidth="1" />
                    
                    {/* Potted Plant */}
                    <path d="M25,120 L37,120 L34,136 L28,136 Z" className="text-emerald-300" />
                    <path d="M31,105 C25,110 28,120 31,120 C34,120 37,110 31,105 Z" className="text-emerald-500" />
                    <path d="M22,112 C18,118 25,123 27,120 C29,117 26,112 22,112 Z" className="text-emerald-600" />
                    <path d="M40,112 C44,118 37,123 35,120 C33,117 36,112 40,112 Z" className="text-emerald-600" />
                    
                    {/* Large clock */}
                    <circle cx="100" cy="50" r="32" className="text-white" stroke="#6366f1" strokeWidth="4.5" />
                    <line x1="100" y1="50" x2="100" y2="32" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="100" y1="50" x2="116" y2="50" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="100" cy="50" r="3.5" className="text-indigo-700" />
                    
                    {/* Code symbols on screen */}
                    <rect x="62" y="92" width="35" height="5" rx="1.5" className="text-indigo-400" />
                    <rect x="62" y="102" width="22" height="5" rx="1.5" className="text-indigo-300" />
                    <rect x="62" y="112" width="45" height="5" rx="1.5" className="text-indigo-200" />
                    
                    {/* Floating calendar checklist checkmark */}
                    <circle cx="152" cy="70" r="7" className="text-amber-100" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M149,70 L151,72 L154,68" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Card>

            {/* Card 3: My Attendance Box */}
            <Card className="shadow-sm border rounded-2xl overflow-hidden bg-white flex flex-col p-6 min-h-[350px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Attendance
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    {formatMonthName(selectedDate)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg border-gray-200 hover:bg-gray-50"
                      onClick={handlePrevMonth}
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={handleNextMonth}
                      disabled={isCurrentOrFutureMonth()}
                    >
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 flex flex-col justify-between">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 border-b pb-2 mb-2">
                  <span>S</span>
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-2 gap-x-1 flex-1 items-center">
                  {getCalendarDays(selectedDate).map((day: Date, idx: number) => {
                    const isCurrentMonth = day.getMonth() === new Date(selectedDate).getMonth();
                    const record = getAttendanceForDay(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isPast = day < new Date();

                    let dayStyle = "text-gray-800";
                    if (!isCurrentMonth) {
                      dayStyle = "text-gray-300";
                    }

                    // Background color determination
                    let bgStyle = "";
                    if (record && (record.status === "PRESENT" || record.status === "LATE")) {
                      bgStyle = "bg-teal-500 text-white font-semibold";
                    } else if (isCurrentMonth && !isWeekend && isPast) {
                      // Weekday in the past with no check-in -> absent/leave
                      bgStyle = "bg-gray-100 text-gray-400";
                    }

                    const tooltipTrigger = (
                      <div
                        className={`flex flex-col items-center justify-center h-8 w-8 mx-auto rounded-lg text-xs ${bgStyle} ${dayStyle} ${
                          isToday ? "ring-2 ring-indigo-600 font-bold" : ""
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    );

                    if (record) {
                      const workedHours = isToday && !record.checkOutTime
                        ? todayHoursText
                        : formatWorkedHours(record.totalWorkedMinutes);

                      return (
                        <UITooltip key={idx} delayDuration={50}>
                          <UITooltipTrigger asChild>
                            <div className="cursor-help">{tooltipTrigger}</div>
                          </UITooltipTrigger>
                          <UITooltipContent side="top" className="bg-white text-gray-900 p-3.5 rounded-2xl shadow-xl border border-gray-200 space-y-2 text-xs min-w-[170px]">
                            <p className="font-bold border-b border-gray-100 pb-1.5 text-blue-600">
                              {day.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="flex justify-between items-center gap-4">
                              <span className="text-gray-500 font-medium">Clock In:</span>
                              <span className="font-mono font-semibold text-gray-900">{formatTime(record.checkInTime)}</span>
                            </p>
                            <p className="flex justify-between items-center gap-4">
                              <span className="text-gray-500 font-medium">Clock Out:</span>
                              <span className="font-mono font-semibold text-gray-900">{formatTime(record.checkOutTime)}</span>
                            </p>
                            <p className="flex justify-between items-center gap-4 border-t border-gray-100 pt-1.5">
                              <span className="text-gray-600 font-semibold">Worked:</span>
                              <span className="font-bold text-teal-600">{workedHours}</span>
                            </p>
                          </UITooltipContent>
                        </UITooltip>
                      );
                    }

                    return (
                      <div key={idx} className="relative">
                        {tooltipTrigger}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2: 4 Real-time Functional Summary Cards (Unified Theme) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Present Days (This Month) */}
            <Card className="shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between min-h-[175px]">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Present Days</h3>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900 leading-none mb-1">
                      {(() => {
                        const targetMonth = selectedDate ? new Date(selectedDate).getMonth() : new Date().getMonth();
                        const targetYear = selectedDate ? new Date(selectedDate).getFullYear() : new Date().getFullYear();
                        const presentDaysSet = new Set<string>();

                        (weeklyAttendance || []).forEach((a: any) => {
                          const dt = new Date(a.checkInTime || a.date);
                          if (dt.getMonth() === targetMonth && dt.getFullYear() === targetYear) {
                            const st = String(a.status || "").toUpperCase();
                            if (st === "PRESENT" || st === "LATE" || st === "TARDY") {
                              presentDaysSet.add(dt.toDateString());
                            }
                          }
                        });

                        const todayRec = getTodayRecord();
                        const today = new Date();
                        if (today.getMonth() === targetMonth && today.getFullYear() === targetYear) {
                          if (todayRec && (todayRec.checkInTime || todayStatusState?.checkInTime)) {
                            presentDaysSet.add(today.toDateString());
                          }
                        }

                        return presentDaysSet.size;
                      })()}
                    </p>
                    <p className="text-xs font-semibold text-gray-700">Days Present</p>
                    <p className="text-[11px] text-gray-400">This Month ({moment(selectedDate || new Date()).format("MMM YYYY")})</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/attendance")}
                className="w-full mt-4 h-9 text-xs font-semibold text-emerald-700 border-emerald-100 hover:bg-emerald-50/50 rounded-xl"
              >
                View Attendance
              </Button>
            </Card>

            {/* Card 2: Monthly Leaves */}
            <Card className="shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between min-h-[175px]">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Monthly Leaves</h3>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Calendar className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900 leading-none mb-1">
                      {(() => {
                        const targetMonth = selectedDate ? new Date(selectedDate).getMonth() : new Date().getMonth();
                        const targetYear = selectedDate ? new Date(selectedDate).getFullYear() : new Date().getFullYear();
                        const leaveDaysSet = new Set<string>();

                        // 1. Count days from attendance records marked as LEAVE or L
                        (weeklyAttendance || []).forEach((a: any) => {
                          const dt = new Date(a.date || a.checkInTime);
                          if (dt.getMonth() === targetMonth && dt.getFullYear() === targetYear) {
                            const st = String(a.status || "").toUpperCase();
                            if (st === "LEAVE" || st === "L") {
                              leaveDaysSet.add(dt.toDateString());
                            }
                          }
                        });

                        // 2. Count days from approved leave requests in database
                        (leaves || []).forEach((l: any) => {
                          const isApproved = String(l.status || "").toUpperCase() === "APPROVED";
                          if (isApproved) {
                            const st = new Date(l.startDate);
                            const et = new Date(l.endDate || l.startDate);
                            let curr = new Date(st);
                            while (curr <= et) {
                              if (curr.getMonth() === targetMonth && curr.getFullYear() === targetYear) {
                                leaveDaysSet.add(curr.toDateString());
                              }
                              curr.setDate(curr.getDate() + 1);
                            }
                          }
                        });

                        return leaveDaysSet.size;
                      })()}
                    </p>
                    <p className="text-xs font-semibold text-gray-700">Days On Leave</p>
                    <p className="text-[11px] text-gray-400">This Month ({moment(selectedDate || new Date()).format("MMM YYYY")})</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenApplyLeave}
                className="w-full mt-4 h-9 text-xs font-semibold text-blue-600 border-blue-100 hover:bg-blue-50/50 rounded-xl"
              >
                Apply Leave
              </Button>
            </Card>

            {/* Card 3: Monthly Tardies */}
            <Card className="shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between min-h-[175px]">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Monthly Tardies</h3>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900 leading-none mb-1">
                      {(() => {
                        const targetMonth = selectedDate ? new Date(selectedDate).getMonth() : new Date().getMonth();
                        const targetYear = selectedDate ? new Date(selectedDate).getFullYear() : new Date().getFullYear();
                        const tardyDaysSet = new Set<string>();

                        (weeklyAttendance || []).forEach((a: any) => {
                          const dt = new Date(a.checkInTime || a.date);
                          if (dt.getMonth() === targetMonth && dt.getFullYear() === targetYear) {
                            const st = String(a.status || "").toUpperCase();
                            if (st === "LATE" || st === "TARDY") {
                              tardyDaysSet.add(dt.toDateString());
                            }
                          }
                        });

                        return tardyDaysSet.size;
                      })()}
                    </p>
                    <p className="text-xs font-semibold text-gray-700">Late Arrivals</p>
                    <p className="text-[11px] text-gray-400">This Month ({moment(selectedDate || new Date()).format("MMM YYYY")})</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/attendance")}
                className="w-full mt-4 h-9 text-xs font-semibold text-amber-700 border-amber-100 hover:bg-amber-50/50 rounded-xl"
              >
                View Attendance
              </Button>
            </Card>

            {/* Card 4: Payroll Summary */}
            <Card className="shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between min-h-[175px]">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Payroll Summary</h3>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Wallet className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-gray-900 leading-none mb-1 truncate">
                      {payrollSummaryData?.amount || "No Payroll Record"}
                    </p>
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {payrollSummaryData?.hasRecord
                        ? `Net Salary (${payrollSummaryData.month})`
                        : "Net Salary"}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {payrollSummaryData?.paidDate
                        ? payrollSummaryData.paidDate.startsWith("Paid") || payrollSummaryData.paidDate.startsWith("Active") || payrollSummaryData.paidDate.startsWith("Contact")
                          ? payrollSummaryData.paidDate
                          : `Paid on ${payrollSummaryData.paidDate}`
                        : "Pending Setup"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={downloadingPayslip}
                onClick={handleDownloadPayslip}
                className="w-full mt-4 h-9 text-xs font-semibold text-blue-600 border-blue-100 hover:bg-blue-50/50 rounded-xl"
              >
                {downloadingPayslip ? "Downloading..." : "View Payslip"}
              </Button>
            </Card>
          </div>

          {/* Row 3: Company Announcements & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Company Announcements Section */}
            <Card className="shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="size-5" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Company Announcements</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAnnouncementIndex((prev) => (prev > 0 ? prev - 1 : 2))}
                      className="size-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnouncementIndex((prev) => (prev < 2 ? prev + 1 : 0))}
                      className="size-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                {(() => {
                  const announcementsList = [
                    {
                      id: 1,
                      title: "System maintenance this weekend",
                      content: "Our HRMS portal will be undergoing scheduled maintenance on July 12, 2026 from 12:00 AM to 04:00 AM.",
                    },
                    {
                      id: 2,
                      title: "Upcoming Defense Day Holiday",
                      content: "Defense Day will be observed on September 6, 2026. The office will remain closed.",
                    },
                    {
                      id: 3,
                      title: "Monthly Performance Review",
                      content: "Please ensure all monthly tasks and logs are submitted before end of week.",
                    },
                  ];
                  const currentAnn = announcementsList[announcementIndex] || announcementsList[0];
                  return (
                    <div className="mt-2">
                      <h4 className="text-sm font-bold text-gray-900 mb-1.5">{currentAnn.title}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">{currentAnn.content}</p>
                      <button
                        type="button"
                        onClick={() => navigate("/schedule")}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-all inline-block"
                      >
                        Read more
                      </button>
                    </div>
                  );
                })()}
              </div>
            </Card>

            {/* 2. Quick Actions Section */}
            <Card className="shadow-sm border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-5">Quick Actions</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center justify-items-center">
                  {/* Action 1: Apply Leave */}
                  <div
                    onClick={handleOpenApplyLeave}
                    className="flex flex-col items-center group cursor-pointer w-full"
                  >
                    <div className="size-13 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-2xs">
                      <Plane className="size-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 text-center mt-2.5 transition-colors">
                      Apply Leave
                    </span>
                  </div>

                  {/* Action 2: Download Payslip */}
                  <div
                    onClick={handleDownloadPayslip}
                    className="flex flex-col items-center group cursor-pointer w-full"
                  >
                    <div className="size-13 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-2xs">
                      <FileText className="size-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 text-center mt-2.5 transition-colors">
                      {downloadingPayslip ? "Downloading..." : "Download Payslip"}
                    </span>
                  </div>

                  {/* Action 3: View Attendance */}
                  <div
                    onClick={() => navigate("/attendance")}
                    className="flex flex-col items-center group cursor-pointer w-full"
                  >
                    <div className="size-13 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-2xs">
                      <CalendarDays className="size-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 text-center mt-2.5 transition-colors">
                      View Attendance
                    </span>
                  </div>

                  {/* Action 4: Update Profile */}
                  <div
                    onClick={() => navigate("/profile")}
                    className="flex flex-col items-center group cursor-pointer w-full"
                  >
                    <div className="size-13 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-2xs">
                      <User className="size-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 text-center mt-2.5 transition-colors">
                      Update Profile
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Dashboard Task Details Dialog */}
      <Dialog open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
        <DialogContent className="w-full sm:max-w-[600px] md:max-w-[700px] p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border bg-white dark:bg-gray-950">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-400" />
              <span>Task Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedDashboardTask && (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Task general info */}
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100">
                    {selectedDashboardTask.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                    {selectedDashboardTask.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div>
                    <span className="text-gray-400 font-medium block">Status</span>
                    <Badge className="mt-0.5 capitalize">{selectedDashboardTask.myStatus || selectedDashboardTask.status}</Badge>
                  </div>

                  <div>
                    <span className="text-gray-400 font-medium block">Priority</span>
                    <Badge variant="outline" className="mt-0.5 font-semibold capitalize">{selectedDashboardTask.priority?.toLowerCase()}</Badge>
                  </div>

                  <div>
                    <span className="text-gray-400 font-medium block">Deadline</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm font-mono mt-0.5 block">
                      {selectedDashboardTask.deadline ? new Date(selectedDashboardTask.deadline).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 font-medium block">Project</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {selectedDashboardTask.project?.title || "No Project"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remarks Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Remarks & Activity</span>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      setEditingRemark(null);
                      setRemarkTitle("");
                      setRemarkContent("");
                      setRemarkAttachments([]);
                      setRemarkFormOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Remark
                  </Button>
                </div>

                {/* Timeline */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  {taskRemarks.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-8 bg-gray-50 rounded-xl border border-dashed">
                      No remarks or comments added yet.
                    </div>
                  ) : (
                    taskRemarks
                      .slice()
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((remark) => {
                        const isOwn =
                          remark.createdBy?.id === user?.id ||
                          user?.role === "ADMIN" ||
                          user?.role === "SUPERVISOR";

                        return (
                          <div key={remark.id} className="flex gap-3 pb-4 border-b last:border-none">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {remark.createdBy?.profileImage ? (
                                <img
                                  src={`${API_URL}${remark.createdBy.profileImage}`}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                  {remark.createdBy?.firstName?.[0]}
                                  {remark.createdBy?.lastName?.[0]}
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-900">
                                  {remark.createdBy?.firstName} {remark.createdBy?.lastName}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {formatRemarkDate(remark.createdAt)}
                                </span>
                              </div>

                              {remark.title && (
                                <p className="font-bold text-gray-800 mt-1">{remark.title}</p>
                              )}

                              <p className="text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">
                                {remark.content}
                              </p>

                              {/* Attachments */}
                              {remark.attachments?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {remark.attachments.map((att: any) => (
                                    <a
                                      key={att.id}
                                      href={`${API_URL}${att.filePath || att.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] bg-gray-100 text-blue-600 px-2 py-0.5 rounded-md hover:underline flex items-center gap-1 border"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span>{att.fileName || att.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              {isOwn && (
                                <div className="mt-2 flex gap-2 items-center">
                                  <button
                                    className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                    title="Edit remark"
                                    onClick={() => {
                                      setEditingRemark(remark);
                                      setRemarkTitle(remark.title || "");
                                      setRemarkContent(remark.content);
                                      setRemarkAttachments([]);
                                      setRemarkFormOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    className="p-1.5 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                    title="Delete remark"
                                    onClick={() => handleDeleteRemark(remark.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer close */}
          <div className="border-t p-4 flex justify-end flex-shrink-0 bg-white">
            <Button variant="outline" onClick={() => setTaskDetailOpen(false)} className="rounded-xl px-5 h-9 text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Remark Dialog */}
      <Dialog open={remarkFormOpen} onOpenChange={setRemarkFormOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-bold">
              {editingRemark ? "Edit Remark" : "Add New Remark"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">Subject (optional)</Label>
              <Input
                value={remarkTitle}
                onChange={(e) => setRemarkTitle(e.target.value)}
                placeholder="Short summary or title"
                className="rounded-lg shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">Remark / Comment *</Label>
              <Textarea
                value={remarkContent}
                onChange={(e) => setRemarkContent(e.target.value)}
                placeholder="Write your remark or progress update here..."
                rows={4}
                className="rounded-lg shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">Attachments (optional)</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setRemarkAttachments(Array.from(e.target.files));
                  }
                }}
                className="rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t mt-4">
              <Button variant="outline" onClick={() => setRemarkFormOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                disabled={remarkLoading || !remarkContent.trim()}
                onClick={handleSaveRemark}
              >
                {remarkLoading ? "Posting..." : "Post Remark"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Leave Modal */}
      <Dialog open={applyLeaveOpen} onOpenChange={setApplyLeaveOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Request Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Leave Type</Label>
              <Select
                value={leaveFormData.leaveTypeId}
                onValueChange={(val) => setLeaveFormData({ ...leaveFormData, leaveTypeId: val })}
              >
                <SelectTrigger className="mt-1 w-full rounded-xl border-gray-200">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const list = leaveBalances.length > 0 ? leaveBalances : availableLeaveTypes;
                    if (list.length === 0) {
                      return <SelectItem value="1">Annual Leave</SelectItem>;
                    }
                    return list.map((lb: any) => (
                      <SelectItem key={lb.id} value={String(lb.id)}>
                        {lb.name} {lb.available !== undefined ? `(${lb.available} days available)` : ''}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Start Date</Label>
              <Input
                type="date"
                value={leaveFormData.startDate}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                className="mt-1 rounded-xl border-gray-200"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">End Date</Label>
              <Input
                type="date"
                value={leaveFormData.endDate}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                className="mt-1 rounded-xl border-gray-200"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Reason</Label>
              <Textarea
                placeholder="Reason for leave..."
                value={leaveFormData.reason}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                className="mt-1 rounded-xl border-gray-200"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="outline"
                onClick={() => setApplyLeaveOpen(false)}
                className="rounded-xl border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLeaveSubmit}
                disabled={submittingLeave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
              >
                {submittingLeave ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Helper Components ──



// Optional: lucide icons for fallback
// import { Users, UserCheck, UserX, CalendarOff } from "lucide-react";

interface StatCardProps {
  label: string;
  title: string;
  value: number | string;
  color?: "blue" | "green" | "red" | "orange" | "purple" | "amber" | "gray";
  img?: string;
  icon?: React.ComponentType<{ className?: string }>;
  selectedDate: string;
  selectedLocation: string;
  attendanceSheetOpen?: boolean;
}

export const StatCard = ({
  label,
  title,
  value,
  color = "blue",
  img,
  icon: Icon,
  selectedDate,
  selectedLocation,
}: StatCardProps) => {
  const navigate = useNavigate();

  const handleClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const getSlug = (t: string) => {
      if (t === "Late / Tardy") return "late-tardy";
      return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    };
    const slug = getSlug(title);
    navigate(`/stats/${slug}?date=${selectedDate}&location=${selectedLocation}`);
  };

  const styleMap = {
    blue: {
      bgIcon: "bg-blue-50 text-blue-600",
      btn: "text-blue-700 border-blue-100 hover:bg-blue-50/50",
    },
    green: {
      bgIcon: "bg-emerald-50 text-emerald-600",
      btn: "text-emerald-700 border-emerald-100 hover:bg-emerald-50/50",
    },
    red: {
      bgIcon: "bg-rose-50 text-rose-600",
      btn: "text-rose-700 border-rose-100 hover:bg-rose-50/50",
    },
    amber: {
      bgIcon: "bg-amber-50 text-amber-600",
      btn: "text-amber-700 border-amber-100 hover:bg-amber-50/50",
    },
    orange: {
      bgIcon: "bg-orange-50 text-orange-600",
      btn: "text-orange-700 border-orange-100 hover:bg-orange-50/50",
    },
    purple: {
      bgIcon: "bg-purple-50 text-purple-600",
      btn: "text-purple-700 border-purple-100 hover:bg-purple-50/50",
    },
    gray: {
      bgIcon: "bg-gray-50 text-gray-600",
      btn: "text-gray-700 border-gray-100 hover:bg-gray-50/50",
    },
  }[color] || {
    bgIcon: "bg-blue-50 text-blue-600",
    btn: "text-blue-700 border-blue-100 hover:bg-blue-50/50",
  };

  return (
    <Card
      onClick={handleClick}
      className="shadow-xs border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-4.5 sm:p-5 flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">{title}</h3>
        <div className="flex items-center gap-3.5">
          <div
            className={`size-11 rounded-xl ${styleMap.bgIcon} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}
          >
            {Icon ? (
              <Icon className="size-5" />
            ) : img ? (
              <img
                src={img}
                alt={title}
                width={22}
                height={22}
                className="object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="font-bold text-sm">{label?.charAt(0)}</span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none mb-1">
              {value}
            </p>
            <p className="text-xs font-semibold text-gray-700">{label}</p>
          </div>
        </div>
      </div>
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
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  const [currentPage, setCurrentPage] = useState(1);

  const employeesByStatus = getFiltered(status);

  const filteredEmployees = employeesByStatus.filter((emp: any) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, status]);

  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleView = (emp: any) => {
    setSelectedAttendance(emp);
    setAttendanceSheetOpen(true);
  };

  const statusBadgeColor: Record<string, { bg: string; text: string }> = {
    present: { bg: "bg-emerald-50", text: "text-emerald-700" },
    late: { bg: "bg-amber-50", text: "text-amber-700" },
    break: { bg: "bg-orange-50", text: "text-orange-700" },
    leave: { bg: "bg-purple-50", text: "text-purple-700" },
    absent: { bg: "bg-rose-50", text: "text-rose-700" },
  };

  const currentBadge = statusBadgeColor[status] || { bg: "bg-blue-50", text: "text-blue-700" };

  return (
    <TabsContent 
      value={status} 
      className="mt-0 flex flex-col flex-1 min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder={`Search ${title.toLowerCase()} employees...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/80 border-gray-200/80 rounded-xl focus:bg-white transition-all"
          />
        </div>

        {/* Count info */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold text-gray-400">
            Showing {paginatedEmployees.length} of {filteredEmployees.length}
          </p>
        </div>

        {/* List area */}
        <div className="min-h-[220px]">
          {filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
              <div className="size-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-2 text-gray-400">
                <Icon className="h-5 w-5 opacity-60" />
              </div>
              <p className="text-xs font-semibold text-gray-600">
                {searchTerm
                  ? `No matching ${title.toLowerCase()} employees`
                  : `No employees ${title.toLowerCase()} today`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedEmployees.map((emp: any) => (
                <div
                  key={emp.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (status === "present" || status === "late") {
                      handleView(emp);
                    }
                  }}
                  className={`
                    flex items-center justify-between 
                    p-2.5 rounded-xl border border-gray-100
                    bg-white hover:bg-blue-50/40 hover:border-blue-200
                    transition-all duration-150 cursor-pointer shadow-2xs group
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${currentBadge.bg} ${currentBadge.text}`}>
                      {emp.name?.charAt(0)?.toUpperCase() || "E"}
                    </div>
                    <span className="font-semibold text-xs text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {emp.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200/70 px-2 py-0.5 rounded-lg shrink-0">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span>{emp.clockIn || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 mt-2 text-xs">
            <span className="text-[11px] font-semibold text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2 text-[11px] font-semibold rounded-lg border-gray-200"
              >
                <ChevronLeft className="size-3.5" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2 text-[11px] font-semibold rounded-lg border-gray-200"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
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
