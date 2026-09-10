//@ts-nocheck

import React, { useState, useMemo, useEffect } from 'react';
import { mockAttendance, mockEmployees, mockSchedules } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addDays, 
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isAfter,
  startOfDay
} from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  MapPin, 
  User, 
  Eye, 
  Pencil, 
  UserCheck, 
  UserX, 
  Clock3, 
  CalendarDays,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Fingerprint,
  Smartphone,
  Hash,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { attendanceAPI, departmentAPI, employeeAPI, locationAPI } from '../services/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

import { useAuth } from '../contexts/AuthContext';
import { 
  Sheet, 
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';

function convertTo12Hour(timeStr) {
  // Input check
  if (!timeStr || typeof timeStr !== 'string') {
    return "Invalid time";
  }

  // Split hours and minutes
  const [hoursStr, minutes] = timeStr.trim().split(':');
  
  // Parse karo aur validate
  const hours = parseInt(hoursStr, 10);
  const mins = parseInt(minutes, 10);

  if (isNaN(hours) || isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return "Invalid time format";
  }

  // 12-hour conversion logic
  let period = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;

  // 12:00 midnight → 12 AM, 00:00 → 12:00 AM
  if (displayHours === 0) {
    displayHours = 12;
  }

  // Minutes ko 2 digits rakho
  const displayMinutes = minutes.padStart(2, '0');

  return `${displayHours}:${displayMinutes} ${period}`;
}

const STATUS_CONFIG: Record<string, any> = {
  PRESENT: {
    label: "Present",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    cell: "bg-emerald-600 text-white font-medium shadow-sm hover:bg-emerald-700 transition-colors",
    dot: "bg-emerald-500",
    tooltip: "bg-emerald-900 text-white border-emerald-700",
  },
  LATE: {
    label: "Tardy",
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    cell: "bg-amber-400 text-amber-950 font-semibold shadow-sm hover:bg-amber-500 transition-colors",
    dot: "bg-amber-500",
    tooltip: "bg-amber-900 text-white border-amber-700",
  },
  TARDY: {
    label: "Tardy",
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    cell: "bg-amber-400 text-amber-950 font-semibold shadow-sm hover:bg-amber-500 transition-colors",
    dot: "bg-amber-500",
    tooltip: "bg-amber-900 text-white border-amber-700",
  },
  ABSENT: {
    label: "Absent",
    badge: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    cell: "bg-rose-600 text-white font-medium shadow-sm hover:bg-rose-700 transition-colors",
    dot: "bg-rose-500",
    tooltip: "bg-rose-900 text-white border-rose-700",
  },
  LEAVE: {
    label: "Leave",
    badge: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    cell: "bg-sky-500 text-white font-medium shadow-sm hover:bg-sky-600 transition-colors",
    dot: "bg-sky-500",
    tooltip: "bg-sky-900 text-white border-sky-700",
  },
  OFF_DAY: {
    label: "Off Day",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
    cell: "bg-slate-100 text-slate-600 font-medium shadow-xs hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 transition-colors",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  },
  OFF: {
    label: "Off Day",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
    cell: "bg-slate-100 text-slate-600 font-medium shadow-xs hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 transition-colors",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  },
  UPCOMING_DAY: {
    label: "Upcoming",
    badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800",
    cell: "bg-slate-100/90 text-slate-500 font-medium shadow-2xs hover:bg-slate-200 dark:bg-slate-900/80 dark:text-slate-400 transition-colors border border-slate-200/50",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  },
  UPCOMING: {
    label: "Upcoming",
    badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800",
    cell: "bg-slate-100/90 text-slate-500 font-medium shadow-2xs hover:bg-slate-200 dark:bg-slate-900/80 dark:text-slate-400 transition-colors border border-slate-200/50",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  }
};

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const getFormattedDateStr = (d: any) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch (e) {
    if (typeof d === "string") return d.slice(0, 10);
    return "";
  }
};

const findAttendanceRecord = (attendanceList: any[], targetDateStr: string) => {
  if (!Array.isArray(attendanceList) || attendanceList.length === 0) return undefined;

  return attendanceList.find((a: any) => {
    if (!a) return false;
    if (a.reportDate && a.reportDate === targetDateStr) return true;
    if (a.dateStr && a.dateStr === targetDateStr) return true;
    if (typeof a.date === "string" && a.date.slice(0, 10) === targetDateStr) return true;
    if (a.date && getFormattedDateStr(a.date) === targetDateStr) return true;
    if (a.checkInTime && getFormattedDateStr(a.checkInTime) === targetDateStr) return true;
    if (a.checkInTime && typeof a.checkInTime === "string" && a.checkInTime.slice(0, 10) === targetDateStr) return true;
    if (a.checkOutTime && getFormattedDateStr(a.checkOutTime) === targetDateStr) return true;
    if (a.checkOutTime && typeof a.checkOutTime === "string" && a.checkOutTime.slice(0, 10) === targetDateStr) return true;
    return false;
  });
};

export const isScheduleOffDay = (schedules: any, date: Date | string): boolean => {
  if (!schedules) return false;
  const list = Array.isArray(schedules) ? schedules : [schedules];
  const activeSched = list.find((s: any) => s && !s.deletedAt);
  if (!activeSched || !Array.isArray(activeSched.days) || activeSched.days.length === 0) {
    return false;
  }
  const d = typeof date === "string" ? new Date(date.length <= 10 ? `${date}T00:00:00` : date) : date;
  const dStr = format(d, "EEE").toLowerCase();
  const dFull = format(d, "EEEE").toLowerCase();
  const daysArr = activeSched.days.map((item: any) => {
    if (typeof item === "object" && item !== null) {
      return String(item.day || item.dayFull || item.name || item.short || "").trim().toLowerCase();
    }
    return String(item || "").trim().toLowerCase();
  });
  return !daysArr.includes(dStr) && !daysArr.includes(dFull);
};

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user?.role === 'USER' ? 'monthly' : 'daily');

  useEffect(() => {
    if (user?.role === 'USER') {
      setActiveTab('monthly');
    }
  }, [user]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewPanelOpen, setViewPanelOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const [report, setReport] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState<string>();
  const [locationId, setLocationId] = useState<string>(() => localStorage.getItem("selectedLocation") || "all");
  const [companyId, setCompanyId] = useState<string>();
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const loc = e.detail || localStorage.getItem("selectedLocation") || "all";
      setLocationId(loc);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      toast.loading("Generating Excel sheet...", { id: "export-excel" });
      await attendanceAPI.exportExcel({
        date: selectedDate,
        departmentId,
        locationId,
        employeeId: selectedEmployeeId !== "all" ? selectedEmployeeId : undefined,
      });
      toast.success("Excel exported successfully!", { id: "export-excel" });
    } catch (err: any) {
      toast.error("Failed to export Excel report", { id: "export-excel" });
    } finally {
      setExporting(false);
    }
  };

  const openViewPanel = (record) => {
    setViewRecord(record);
    setViewPanelOpen(true);
  };

  const handleSaveAttendance = async () => {
    const isFutureDate = isAfter(startOfDay(new Date(selectedRecord.date)), startOfDay(new Date()));
    if (isFutureDate || selectedRecord?.status === "UPCOMING_DAY" || selectedRecord?.status === "UPCOMING") {
      toast.error("There is no schedule for this day yet.");
      return;
    }
    if (selectedRecord?.status === "OFF_DAY" || selectedRecord?.status === "OFF") {
      toast.error("This is an Off Day. Attendance cannot be marked for this day.");
      return;
    }
    try {
      const payload = {
        employeeId: selectedRecord.employeeId,
        date: selectedRecord.date,
        checkInTime: selectedRecord.checkInTime,
        checkOutTime: selectedRecord.checkOutTime,
        status: selectedRecord.status
      };

      if (selectedRecord.id) {
        await attendanceAPI.updateAttendance(selectedRecord.id, payload);
      } else {
        await attendanceAPI.createAttendance(payload);
      }

      toast.success("Attendance saved successfully");
      setEditModalOpen(false);
      loadReport();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Failed to save attendance");
    }
  };

  const renderAttendanceCell = (record: any, day, emp) => {
    const otHours = Number(record?.overtimeHours) || 0;
    const otMins = record?.overtimeMinutes ? Number(record?.overtimeMinutes) : Math.round(otHours * 60);

    const cellDateStr = getFormattedDateStr(day) || (record?.date ? getFormattedDateStr(record.date) : "");
    const cellDate = cellDateStr ? new Date(`${cellDateStr}T00:00:00`) : (day ? new Date(day) : new Date());
    const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));

    const isEmpDayOff = isScheduleOffDay(emp?.Schedule, cellDate);

    let defaultStatus = "ABSENT";
    if (isEmpDayOff) {
      defaultStatus = "OFF_DAY";
    } else if (isFutureDay) {
      defaultStatus = "UPCOMING_DAY";
    }

    let rawStatus = record?.status;
    if (!rawStatus || rawStatus === "ABSENT") {
      rawStatus = defaultStatus;
    }
    if (isEmpDayOff && rawStatus !== "PRESENT" && rawStatus !== "LATE" && rawStatus !== "TARDY" && rawStatus !== "LEAVE") {
      rawStatus = "OFF_DAY";
    }

    const finalRecord = {
      id: record?.id ?? null,
      date: record?.date ?? day,
      checkInTime: record?.checkInTime ?? null,
      checkOutTime: record?.checkOutTime ?? null,
      totalWorkedMinutes: record?.totalWorkedMinutes ?? 0,
      totalBreakMinutes: record?.totalBreakMinutes ?? 0,
      employeeId: record?.employeeId ?? emp.id,
      overtimeAmount: record?.overtimeAmount ?? 0,
      ...record,
      status: rawStatus,
      overtimeHours: otHours,
      overtimeMinutes: otMins,
    };

    if (!finalRecord) {
      return <span className="text-gray-400">—</span>;
    }

    const status = finalRecord.status?.toUpperCase();
    const hasWorked = status === "PRESENT" || status === "LATE" || status === "TARDY" || (Number(finalRecord.totalWorkedMinutes) > 0);
    const isOff = !hasWorked && (status === "OFF_DAY" || status === "OFF" || (isEmpDayOff && status !== "LEAVE"));
    const isUpcoming = !hasWorked && !isOff && (isFutureDay || status === "UPCOMING_DAY" || status === "UPCOMING");
    const isLeave = status === "LEAVE";
    const isAbsent = !hasWorked && !isOff && !isUpcoming && !isLeave;

    // Disable tooltip and lock interactions for OFF (O), LEAVE (L), ABSENT (A), and UPCOMING (U) days
    const isTooltipDisabled = isOff || isLeave || isAbsent || isUpcoming;

    const config = STATUS_CONFIG[isOff ? "OFF_DAY" : (isUpcoming ? "UPCOMING_DAY" : status)] || STATUS_CONFIG["ABSENT"];
    const isUserMonthly = activeTab === "monthly" && user?.role === "USER";

    const cellElement = (
      <div
        onClick={() => {
          if (isTooltipDisabled) {
            return;
          }
          setSelectedRecord(finalRecord);
          setEditModalOpen(true);
        }}
        className={`${isTooltipDisabled ? "cursor-default select-none" : "cursor-pointer transition-all hover:scale-[1.05] hover:shadow-md"} ${
          isUserMonthly
            ? "w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
            : "rounded-md p-1"
        } ${config.cell}`}
      >
        {isUserMonthly ? (
          <span className="text-xs uppercase font-extrabold tracking-wider opacity-95">
            {status === "PRESENT"
              ? "P"
              : status === "ABSENT"
              ? "A"
              : (status === "LATE" || status === "TARDY")
              ? "T"
              : status === "LEAVE"
              ? "L"
              : isOff
              ? "O"
              : isUpcoming
              ? "U"
              : status ? status.charAt(0) : "A"}
          </span>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[34px] px-1">
            {activeTab !== "monthly" ? (
              <span className="font-semibold tracking-tight">
                {isUpcoming
                  ? "Upcoming"
                  : isOff
                  ? "Off Day"
                  : formatMinutes(finalRecord.totalWorkedMinutes)}
              </span>
            ) : (
              <span className="text-xs uppercase font-extrabold tracking-wider opacity-95">
                {status === "PRESENT"
                  ? "P"
                  : status === "ABSENT"
                  ? "A"
                  : (status === "LATE" || status === "TARDY")
                  ? "T"
                  : status === "LEAVE"
                  ? "L"
                  : isOff
                  ? "O"
                  : isUpcoming
                  ? "U"
                  : status ? status.charAt(0) : "A"}
              </span>
            )}
          </div>
        )}
      </div>
    );

    if (isTooltipDisabled) {
      return cellElement;
    }

    return (
      <TooltipProvider>
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            {cellElement}
          </TooltipTrigger>

          <TooltipContent
            side="top"
            className={`text-xs space-y-2 p-3.5 rounded-lg border shadow-xl backdrop-blur-md ${config.tooltip}`}
          >
            {/* Date */}
            <div className="font-bold text-sm border-b border-white/20 pb-1.5 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {format(new Date(finalRecord.date), "PPP")}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-white/80">Status:</span>
              <span className="font-bold tracking-wide uppercase px-2 py-0.5 rounded text-[11px] bg-white/20">
                {finalRecord.status}
              </span>
            </div>

            {/* Shift Time */}
            <div className="text-white/90">
              <span className="font-medium text-white/80">Shift:</span>{" "}
              {finalRecord.shiftStartTime
                ? convertTo12Hour(finalRecord.shiftStartTime)
                : "-"}{" "}
              —{" "}
              {finalRecord.shiftEndTime
                ? convertTo12Hour(finalRecord.shiftEndTime)
                : "-"}
            </div>

            {/* Check In */}
            <div className="text-white/90">
              <span className="font-medium text-white/80">Check In:</span>{" "}
              {finalRecord.checkInTime
                ? format(new Date(finalRecord.checkInTime), "hh:mm a")
                : "-"}
            </div>

            {/* Check Out */}
            <div className="text-white/90">
              <span className="font-medium text-white/80">Check Out:</span>{" "}
              {finalRecord.checkOutTime
                ? format(new Date(finalRecord.checkOutTime), "hh:mm a")
                : "-"}
            </div>

            {/* Break Time */}
            <div className="text-white/90">
              <span className="font-medium text-white/80">Break:</span>{" "}
              {finalRecord.totalBreakMinutes
                ? formatMinutes(finalRecord.totalBreakMinutes)
                : "0h 0m"}
            </div>

            {/* Total Work */}
            <div className="text-white/90 pt-1 border-t border-white/10">
              <span className="font-medium text-white/80">Total Worked:</span>{" "}
              <span className="font-bold text-white">
                {formatMinutes(finalRecord.totalWorkedMinutes)}
              </span>
            </div>

            {finalRecord.overtimeMinutes > 0 && (
              <div>
                <span className="font-medium text-white/80">Overtime:</span>{" "}
                <span className="text-purple-300 font-bold">
                  {formatMinutes(finalRecord.overtimeMinutes)}
                </span>
              </div>
            )}

            {finalRecord.tasks?.length > 0 && (
              <div className="pt-1 border-t border-white/10">
                <span className="font-medium text-white/80">Tasks:</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-white/90">
                  {finalRecord.tasks.map((task, i) => (
                    <li key={i}>{task}</li>
                  ))}
                </ul>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // For weekly/monthly navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // ── Computed date ranges ───────────────────────────────────────────────
  const currentWeekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const currentMonthStart = startOfMonth(addDays(new Date(), monthOffset * 30));
  const currentMonthEnd = endOfMonth(currentMonthStart);
  const monthDays = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });

  useEffect(() => {
    loadFilters();
  }, []);
  
  const loadFilters = async () => {
    if (user?.role === "ADMIN") {
      const dept = await departmentAPI.getDepartments();
      const loc = await locationAPI.getLocations();
      const emp = await employeeAPI.getEmployees();
  
      setDepartments(dept.data || []);
      setLocations(loc.data || []);
      setEmployees((emp.data || []).filter((e: any) => e.role !== 'ADMIN' && e.role !== 'admin'));
    }
  };
  
  useEffect(() => {
    loadReport();

    // ⚡ Real-time live polling every 10 seconds
    const interval = setInterval(() => {
      loadReport(false);
    }, 10000);

    // ⚡ Real-time event listener for immediate clock-in/out or punch sync
    const handleAttendanceUpdate = () => {
      loadReport(false);
    };
    window.addEventListener("attendance-updated", handleAttendanceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("attendance-updated", handleAttendanceUpdate);
    };
  }, [activeTab, selectedDate, departmentId, locationId, selectedEmployeeId]);
  
  const loadReport = async (showFeedback = false) => {
    try {
      if (showFeedback) setRefreshing(true);
      const res = await attendanceAPI.getAttendanceReport({
        view: activeTab,
        date: selectedDate,
        departmentId,
        locationId,
        employeeId:
          user?.role === "ADMIN" && selectedEmployeeId !== "all"
            ? selectedEmployeeId
            : undefined
      });
      
      setReport((res.employees || []).filter((e: any) => e.role !== 'ADMIN' && e.role !== 'admin'));
      if (showFeedback) {
        toast.success("Attendance updated!");
      }
    } catch (err) {
      console.error("Failed to load attendance report:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const isNextDisabled = useMemo(() => {
    const today = startOfDay(new Date());
    const sel = startOfDay(selectedDate);
    if (activeTab === "daily") {
      return sel >= today;
    } else if (activeTab === "weekly") {
      const currentWeekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return currentWeekEnd >= today;
    } else if (activeTab === "monthly") {
      const currentMonthEnd = endOfMonth(selectedDate);
      return currentMonthEnd >= today;
    }
    return sel >= today;
  }, [selectedDate, activeTab]);

  // Date Navigation step handlers
  const handlePrevDate = () => {
    if (activeTab === "daily") {
      setSelectedDate(prev => subDays(prev, 1));
    } else if (activeTab === "weekly") {
      setSelectedDate(prev => subWeeks(prev, 1));
    } else if (activeTab === "monthly") {
      setSelectedDate(prev => subMonths(prev, 1));
    }
  };

  const handleNextDate = () => {
    if (isNextDisabled) return;
    if (activeTab === "daily") {
      setSelectedDate(prev => {
        const next = addDays(prev, 1);
        return isAfter(startOfDay(next), startOfDay(new Date())) ? new Date() : next;
      });
    } else if (activeTab === "weekly") {
      setSelectedDate(prev => addWeeks(prev, 1));
    } else if (activeTab === "monthly") {
      setSelectedDate(prev => addMonths(prev, 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
    setWeekOffset(0);
    setMonthOffset(0);
  };

  // Compute daily summary stats
  const dailyStats = useMemo(() => {
    let present = 0;
    let tardy = 0;
    let absent = 0;
    let leave = 0;

    const targetDateStr = format(selectedDate, "yyyy-MM-dd");
    report.forEach(emp => {
      const rec = findAttendanceRecord(emp.Attendance, targetDateStr)
        || (activeTab === "daily" && Array.isArray(emp.Attendance) && emp.Attendance.length === 1 && emp.Attendance[0]?.id ? emp.Attendance[0] : undefined);
      const st = rec?.status?.toUpperCase() || "ABSENT";
      const isOff = isScheduleOffDay(emp?.Schedule, selectedDate) && st !== "PRESENT" && st !== "LATE" && st !== "TARDY" && st !== "LEAVE";

      if (st === "PRESENT") present++;
      else if (st === "LATE" || st === "TARDY") tardy++;
      else if (st === "LEAVE") leave++;
      else if (st === "OFF_DAY" || isOff || st === "UPCOMING_DAY") {
        // Off or upcoming day: not counted as absent
      } else absent++;
    });

    return { present, tardy, absent, leave, total: report.length };
  }, [report, selectedDate, activeTab]);

  const renderTimesheetView = (start: Date, end: Date) => {
    const days = eachDayOfInterval({ start, end });
    const isMonthly = activeTab === 'monthly';
    
    if (user?.role === 'USER') {
      const emp = report[0];
      if (!emp) {
        return (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <AlertCircle className="w-8 h-8 text-gray-400" />
            <p className="font-medium text-base">No attendance records found for this period</p>
          </div>
        );
      }

      let totalMinutes = 0;
      totalMinutes = days.reduce((sum: number, day: Date) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const record = findAttendanceRecord(emp.Attendance, dayStr);

        const cellDate = new Date(`${dayStr}T00:00:00`);
        const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));
        const isEmpDayOff = isScheduleOffDay(emp?.Schedule, cellDate);

        let rawStatus = record?.status?.toUpperCase();
        if (isEmpDayOff && rawStatus !== "PRESENT" && rawStatus !== "LATE" && rawStatus !== "TARDY" && rawStatus !== "LEAVE") {
          rawStatus = "OFF_DAY";
        } else if (isFutureDay && rawStatus !== "PRESENT" && rawStatus !== "LATE" && rawStatus !== "TARDY" && rawStatus !== "LEAVE" && rawStatus !== "OFF_DAY") {
          rawStatus = "UPCOMING_DAY";
        }

        const isWorkingStatus = rawStatus === "PRESENT" || rawStatus === "LATE" || rawStatus === "TARDY";
        const workedMins = isWorkingStatus ? (Number(record?.totalWorkedMinutes) || 0) : 0;
        const otHours = Number(record?.overtimeHours) || 0;
        const otMins = record?.overtimeMinutes ? Number(record?.overtimeMinutes) : Math.round(otHours * 60);

        return sum + workedMins + otMins;
      }, 0);

      return (
        <div className="space-y-4 w-full">
          {/* Header Stats Info Box */}
          <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Monthly Summary:</span>
              <Badge className="bg-blue-600 text-white font-mono text-xs">
                Total Worked: {formatMinutes(totalMinutes)}
              </Badge>
            </div>
          </div>

          {/* Simple Row of Small Boxes (Flex-wrap) */}
          <div className="flex flex-wrap gap-2.5 p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm justify-start">
            {days.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const record = findAttendanceRecord(emp.Attendance, dayStr);

              return (
                <div 
                  key={day.toISOString()} 
                  className="flex flex-col items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/40 dark:bg-gray-900/40 w-[54px] min-h-[85px] transition-all hover:shadow-xs"
                >
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    {format(day, "EEE")}
                  </span>
                  <span className="text-xs font-extrabold text-gray-600 dark:text-gray-400 mt-0.5">
                    {format(day, "d")}
                  </span>
                  <div className="mt-1.5">
                    {renderAttendanceCell(record, day, emp)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950" style={{ width: "1000px" }}>
        {/* Scrollable container with sticky headers and sticky employee column */}
        <div className="overflow-auto w-full max-w-full max-h-[calc(100vh-360px)] min-h-[250px]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/95 dark:border-gray-800">
              <tr>
                {/* Employee column – sticky left */}
                <th
                  scope="col"
                  className="sticky left-0 z-40 bg-gray-50 px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[160px] md:min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Employee ({report.length})</span>
                  </div>
                </th>
  
                {/* Date columns */}
                {days.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <th
                      key={day.toISOString()}
                      scope="col"
                      className={`px-1 py-2.5 text-center text-xs font-medium border-r border-gray-200 dark:border-gray-800 ${
                        isMonthly 
                          ? (user?.role === 'USER' ? 'min-w-[42px]' : 'min-w-[68px] sm:min-w-[72px]') 
                          : 'min-w-[75px] md:min-w-[85px]'
                      } transition-colors ${
                        isToday 
                          ? 'bg-blue-50/80 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' 
                          : isWeekend 
                          ? 'bg-gray-100/50 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {format(day, "EEE")}
                        </span>
                        <span className={`text-sm font-extrabold mt-0.5 rounded-full w-6 h-6 flex items-center justify-center ${
                          isToday ? 'bg-blue-600 text-white shadow-sm' : ''
                        }`}>
                          {format(day, "d")}
                        </span>
                      </div>
                    </th>
                  );
                })}
  
                {/* Total Hours Column */}
                <th
                  scope="col"
                  className="sticky right-0 z-40 bg-gray-50 px-4 py-3.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-l border-gray-200 min-w-[110px] shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800"
                >
                  Total Hours
                </th>
              </tr>
            </thead>
  
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
              {report.map((emp) => {
                const totalMinutes = days.reduce((sum: number, day: Date) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const record = findAttendanceRecord(emp.Attendance, dayStr);

                  const cellDate = new Date(`${dayStr}T00:00:00`);
                  const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));
                  const isEmpDayOff = isScheduleOffDay(emp?.Schedule, cellDate);

                  let rawStatus = record?.status?.toUpperCase();
                  if (isEmpDayOff && rawStatus !== "PRESENT" && rawStatus !== "LATE" && rawStatus !== "TARDY" && rawStatus !== "LEAVE") {
                    rawStatus = "OFF_DAY";
                  } else if (isFutureDay && rawStatus !== "PRESENT" && rawStatus !== "LATE" && rawStatus !== "TARDY" && rawStatus !== "LEAVE" && rawStatus !== "OFF_DAY") {
                    rawStatus = "UPCOMING_DAY";
                  }

                  const isWorkingStatus = rawStatus === "PRESENT" || rawStatus === "LATE" || rawStatus === "TARDY";
                  const workedMins = isWorkingStatus ? (Number(record?.totalWorkedMinutes) || 0) : 0;
                  const otHours = Number(record?.overtimeHours) || 0;
                  const otMins = record?.overtimeMinutes ? Number(record?.overtimeMinutes) : Math.round(otHours * 60);

                  return sum + workedMins + otMins;
                }, 0);
                
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors">
                    {/* Employee cell – sticky left */}
                    <td className="sticky left-0 z-20 bg-white px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {emp.firstName?.charAt(0)}{(emp.lastName || "").charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="truncate">{emp.firstName} {emp.lastName || ""}</span>
                          {emp.department && (
                            <span className="text-[11px] text-gray-400 font-normal truncate">
                              {emp.department.title || emp.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
  
                    {/* Date cells */}
                    {days.map((day) => {
                      const record = findAttendanceRecord(emp.Attendance, format(day, "yyyy-MM-dd"));
  
                      return (
                        <td
                          key={day.toISOString()}
                          className={`px-1 py-2 text-center border-r border-gray-100 dark:border-gray-900 ${
                            isMonthly ? 'min-w-[68px] sm:min-w-[72px]' : 'min-w-[75px]'
                          }`}
                        >
                          {renderAttendanceCell(record, day, emp)}
                        </td>
                      );
                    })}
  
                    {/* Total cell – sticky right */}
                    <td className="sticky right-0 z-20 bg-white px-4 py-3 text-center text-sm font-bold text-gray-900 border-l border-gray-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 font-mono text-xs">
                        {formatMinutes(totalMinutes)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
  
        {report.length === 0 && (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-gray-400" />
            <p className="font-medium text-base">No attendance records found for this period</p>
            <p className="text-xs text-gray-400">Try adjusting your filters or date selection.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2 overflow-x-hidden">
      {/* Simple Header with Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Management</h2>
          <p className="text-gray-500 text-sm">
            Track, edit, and audit daily, weekly, and monthly employee timesheets effortlessly.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => loadReport(true)}
          className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 shadow-2xs rounded-xl"
          title="Real-time live refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : "text-gray-500"}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Main Filter & Content Card */}
      <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3.5 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Left Controls: Date Navigation & DatePicker in one neat group */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-white dark:bg-gray-950 p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-600 hover:text-gray-900 dark:text-gray-400 rounded-lg"
                  onClick={handlePrevDate}
                  title="Previous Period"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-600 hover:text-gray-900 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                  onClick={handleNextDate}
                  disabled={isNextDisabled}
                  title="Next Period"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* DatePicker Input Box */}
              <div className="relative w-48 sm:w-56">
                <DatePicker
                  selected={selectedDate}
                  maxDate={new Date()}
                  onChange={(date: Date) => {
                    if (!date) return;
                    if (isAfter(startOfDay(date), startOfDay(new Date()))) return;
                    setSelectedDate(date);
                    if (activeTab === "weekly") setWeekOffset(0);
                    if (activeTab === "monthly") setMonthOffset(0);
                  }}
                  showMonthYearPicker={activeTab === "monthly"}
                  highlightDates={
                    activeTab === "weekly"
                      ? [
                          {
                            "react-datepicker__day--highlighted-custom-1": eachDayOfInterval({
                              start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                              end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
                            }),
                          },
                        ]
                      : undefined
                  }
                  dateFormat={
                    activeTab === "daily"
                      ? "PPP"
                      : activeTab === "weekly"
                      ? "'Week of' MMM d, yyyy"
                      : "MMMM yyyy"
                  }
                  className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 h-9 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Right Controls: Filter Selects + Export Excel in a single line */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {user?.role === "ADMIN" && (
                <>
                  <SearchableSelect
                    className="w-36 sm:w-40"
                    icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
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
                    className="w-36 sm:w-40"
                    icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
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

                  <SearchableSelect
                    className="w-40 sm:w-44"
                    icon={<User className="w-3.5 h-3.5 text-gray-400" />}
                    placeholder="All Employees"
                    searchPlaceholder="Search employee..."
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                    options={[
                      { value: "all", label: "All Employees" },
                      ...employees.map((emp) => ({
                        value: String(emp.id),
                        label: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                      })),
                    ]}
                  />
                </>
              )}

              <Button
                variant="default"
                size="sm"
                disabled={exporting}
                onClick={handleExportExcel}
                className="shrink-0 h-9 px-3 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs rounded-xl transition-all whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {user?.role !== 'USER' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <TabsList className="grid w-full grid-cols-3 max-w-md bg-gray-100/80 dark:bg-gray-900 p-1 rounded-xl">
                  <TabsTrigger 
                    value="daily" 
                    className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:shadow-sm transition-all"
                  >
                    Daily View
                  </TabsTrigger>
                  <TabsTrigger 
                    value="weekly" 
                    className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:shadow-sm transition-all"
                  >
                    Weekly View
                  </TabsTrigger>
                  <TabsTrigger 
                    value="monthly" 
                    className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:shadow-sm transition-all"
                  >
                    Monthly View
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            {/* Legend - Only show in Weekly and Monthly views, positioned in the next row */}
            {activeTab !== 'daily' && (
              <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50/80 dark:bg-gray-900/60 px-3.5 py-2 rounded-xl border border-gray-200/80 dark:border-gray-800 flex-wrap sm:flex-nowrap w-fit">
                <span className="font-bold text-gray-700 dark:text-gray-300">Legend:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                  <span className="font-medium">Present (P)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                  <span className="font-medium">Tardy (T)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                  <span className="font-medium">Absent (A)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                  <span className="font-medium">Leave (L)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                  <span className="font-medium">Off Day (O)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span>
                  <span className="font-medium">Upcoming (U)</span>
                </div>
              </div>
            )}

            {/* ── DAILY VIEW ────────────────────────────────────────────────── */}
            <TabsContent value="daily" className="mt-0 space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm bg-white dark:bg-gray-950">
                <Table>
                  <TableHeader className="bg-gray-50/80 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Employee</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Date</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Check In</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Check Out</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Total Hours</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Overtime</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Status</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300 text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {report.map(emp => {
                      const targetDateStr = format(selectedDate, "yyyy-MM-dd");
                      const record = findAttendanceRecord(emp.Attendance, targetDateStr)
                        || (activeTab === "daily" && Array.isArray(emp.Attendance) && emp.Attendance.length === 1 && emp.Attendance[0]?.id ? emp.Attendance[0] : undefined);

                      const otHours = Number(record?.overtimeHours) || 0;
                      const otMins = record?.overtimeMinutes ? Number(record?.overtimeMinutes) : Math.round(otHours * 60);

                      const isEmpDayOff = isScheduleOffDay(emp?.Schedule, selectedDate);
                      const isFutureDate = isAfter(startOfDay(selectedDate), startOfDay(new Date()));

                      let defaultStatus = "ABSENT";
                      if (isEmpDayOff) {
                        defaultStatus = "OFF_DAY";
                      } else if (isFutureDate) {
                        defaultStatus = "UPCOMING_DAY";
                      }

                      let rawStatus = record?.status;
                      if (!rawStatus || rawStatus === "ABSENT") {
                        rawStatus = defaultStatus;
                      }
                      if (isEmpDayOff && rawStatus !== "PRESENT" && rawStatus !== "LATE" && rawStatus !== "TARDY" && rawStatus !== "LEAVE") {
                        rawStatus = "OFF_DAY";
                      }

                      const finalRecord = {
                        id: record?.id ?? null,
                        date: record?.date ?? selectedDate,
                        checkInTime: record?.checkInTime ?? null,
                        checkOutTime: record?.checkOutTime ?? null,
                        totalWorkedMinutes: record?.totalWorkedMinutes ?? 0,
                        totalBreakMinutes: record?.totalBreakMinutes ?? 0,
                        employeeId: record?.employeeId ?? emp.id,
                        ...record,
                        status: rawStatus,
                        overtimeHours: otHours,
                        overtimeMinutes: otMins,
                      };

                      const statusCfg = STATUS_CONFIG[finalRecord.status?.toUpperCase()] || STATUS_CONFIG["ABSENT"];

                      return (
                        <TableRow key={emp.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors">
                          {/* Employee info */}
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                {emp.firstName?.charAt(0)}{(emp.lastName || "").charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span>{emp.firstName} {emp.lastName || ""}</span>
                                {emp.department && (
                                  <span className="text-[11px] text-gray-400 font-normal">
                                    {emp.department.title || emp.department}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-gray-600 dark:text-gray-400 text-xs font-medium">
                            {format(selectedDate, "PPP")}
                          </TableCell>

                          <TableCell className="font-medium text-gray-800 dark:text-gray-200 text-xs">
                            {finalRecord.checkInTime ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <Clock className="w-3 h-3" />
                                {format(new Date(finalRecord.checkInTime), "hh:mm a")}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="font-medium text-gray-800 dark:text-gray-200 text-xs">
                            {finalRecord.checkOutTime ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                <Clock className="w-3 h-3" />
                                {format(new Date(finalRecord.checkOutTime), "hh:mm a")}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100 font-mono text-xs">
                            {formatMinutes(finalRecord.totalWorkedMinutes)}
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {finalRecord.overtimeMinutes > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                                +{formatMinutes(finalRecord.overtimeMinutes)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge className={`px-2.5 py-0.5 border font-semibold tracking-wide ${statusCfg.badge}`}>
                              {finalRecord.status}
                            </Badge>
                          </TableCell>

                          {/* Action Buttons */}
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => openViewPanel(finalRecord)}
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                View
                              </Button>
                              {user?.role !== 'USER' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-2.5 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                  onClick={() => {
                                  const isFutureDate = isAfter(startOfDay(selectedDate), startOfDay(new Date()));
                                  if (isFutureDate || finalRecord.status === "UPCOMING_DAY" || finalRecord.status === "UPCOMING") {
                                    toast.error("There is no schedule for this day yet.");
                                    return;
                                  }
                                  if (finalRecord.status === "OFF_DAY" || finalRecord.status === "OFF") {
                                    toast.error("This is an Off Day. Attendance cannot be marked for this day.");
                                    return;
                                  }
                                  setSelectedRecord(finalRecord);
                                  setEditModalOpen(true);
                                }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Edit
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {report.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                          No attendance data found for the selected filter and date.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── WEEKLY VIEW ──────────────────────────────────────────────── */}
            <TabsContent value="weekly" className="mt-0">
              {renderTimesheetView(
                startOfWeek(selectedDate, { weekStartsOn: 1 }),
                endOfWeek(selectedDate, { weekStartsOn: 1 })
              )}
            </TabsContent>

            {/* ── MONTHLY VIEW ─────────────────────────────────────────────── */}
            <TabsContent value="monthly" className="mt-0">
              {renderTimesheetView(
                startOfMonth(selectedDate),
                endOfMonth(selectedDate)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Modal Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl p-6">
          {selectedRecord && (
            <>
              <DialogHeader className="border-b pb-3">
                <DialogTitle className="text-xl font-bold flex items-center justify-between">
                  <span>Edit Attendance Record</span>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {format(new Date(selectedRecord.date), "MMM d, yyyy")}
                  </Badge>
                </DialogTitle>
                {user?.role === 'USER' && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 mt-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>You do not have permission to edit your timesheet.</span>
                  </div>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Check In */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Check In Time
                  </label>
                  <Input
                    type="time"
                    className="rounded-lg shadow-sm"
                    value={
                      selectedRecord.checkInTime
                        ? format(new Date(selectedRecord.checkInTime), "HH:mm")
                        : ""
                    }
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(selectedRecord.date);
                      newDate.setHours(Number(hours));
                      newDate.setMinutes(Number(minutes));
                      newDate.setSeconds(0);

                      const inIso = newDate.toISOString();
                      setSelectedRecord((prev: any) => {
                        let worked = prev.totalWorkedMinutes || 0;
                        if (prev.checkOutTime) {
                          const inT = newDate.getTime();
                          const outT = new Date(prev.checkOutTime).getTime();
                          if (outT > inT) worked = Math.max(0, Math.floor((outT - inT) / 60000) - (prev.totalBreakMinutes || 0));
                        }
                        return {
                          ...prev,
                          checkInTime: inIso,
                          totalWorkedMinutes: worked
                        };
                      });
                    }}
                  />
                </div>

                {/* Check Out */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Check Out Time
                  </label>
                  <Input
                    type="time"
                    className="rounded-lg shadow-sm"
                    value={
                      selectedRecord.checkOutTime
                        ? format(new Date(selectedRecord.checkOutTime), "HH:mm")
                        : ""
                    }
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(selectedRecord.date);
                      newDate.setHours(Number(hours));
                      newDate.setMinutes(Number(minutes));
                      newDate.setSeconds(0);

                      const outIso = newDate.toISOString();
                      setSelectedRecord((prev: any) => {
                        let worked = prev.totalWorkedMinutes || 0;
                        if (prev.checkInTime) {
                          const inT = new Date(prev.checkInTime).getTime();
                          const outT = newDate.getTime();
                          if (outT > inT) worked = Math.max(0, Math.floor((outT - inT) / 60000) - (prev.totalBreakMinutes || 0));
                        }
                        return {
                          ...prev,
                          checkOutTime: outIso,
                          totalWorkedMinutes: worked
                        };
                      });
                    }}
                  />
                </div>

                {/* Hours Breakdown */}
                {(() => {
                  const otHours = Number(selectedRecord.overtimeHours) || 0;
                  const otMins = selectedRecord.overtimeMinutes ? Number(selectedRecord.overtimeMinutes) : Math.round(otHours * 60);
                  return (
                    <div className={`grid ${otMins > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3 bg-gray-50 dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800`}>
                      <div>
                        <span className="text-xs text-gray-500 font-medium block">Total Worked</span>
                        <span className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                          {formatMinutes(selectedRecord.totalWorkedMinutes)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-medium block">Break Time</span>
                        <span className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                          {formatMinutes(selectedRecord.totalBreakMinutes)}
                        </span>
                      </div>
                      {otMins > 0 && (
                        <div>
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold block">Overtime</span>
                          <span className="text-base font-extrabold text-purple-700 dark:text-purple-300">
                            {formatMinutes(otMins)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Status Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Attendance Status
                  </label>
                  <Select 
                    value={selectedRecord.status} 
                    onValueChange={(statusVal) => {
                      setSelectedRecord((prev: any) => {
                        let cIn = prev.checkInTime;
                        let cOut = prev.checkOutTime;
                        let worked = prev.totalWorkedMinutes || 0;

                        if ((statusVal === "PRESENT" || statusVal === "LATE" || statusVal === "TARDY") && (!cIn || !cOut)) {
                          const base = new Date(prev.date || new Date());
                          const dIn = new Date(base);
                          dIn.setHours(9, 0, 0, 0);
                          const dOut = new Date(base);
                          dOut.setHours(17, 0, 0, 0);

                          cIn = cIn || dIn.toISOString();
                          cOut = cOut || dOut.toISOString();
                          worked = Math.max(0, 480 - (prev.totalBreakMinutes || 0));
                        } else if (statusVal === "ABSENT" || statusVal === "OFF_DAY" || statusVal === "OFF" || statusVal === "LEAVE") {
                          cIn = null;
                          cOut = null;
                          worked = 0;
                        }

                        return {
                          ...prev,
                          status: statusVal,
                          checkInTime: cIn,
                          checkOutTime: cOut,
                          totalWorkedMinutes: worked
                        };
                      });
                    }}
                  >
                    <SelectTrigger className="rounded-lg shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT">Present</SelectItem>
                      <SelectItem value="TARDY">Tardy</SelectItem>
                      <SelectItem value="ABSENT">Absent</SelectItem>
                      <SelectItem value="LEAVE">Leave</SelectItem>
                      <SelectItem value="OFF_DAY">Off Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  disabled={user?.role === 'USER'} 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-md transition-all mt-2" 
                  onClick={handleSaveAttendance}
                >
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Detail Modal Dialog */}
      <Dialog open={viewPanelOpen} onOpenChange={setViewPanelOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          {viewRecord && (
            <div className="space-y-5">
              {/* Clean, Single-color Header */}
              <DialogHeader className="border-b border-gray-100 dark:border-gray-800 pb-3.5 pr-8">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Attendance Details</span>
                  </DialogTitle>
                  <Badge className={`px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[viewRecord.status]?.badge}`}>
                    {viewRecord.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 font-medium text-left">
                  {format(new Date(viewRecord.date), "EEEE, MMMM d, yyyy")}
                </p>
              </DialogHeader>

              {/* Body */}
              <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
                {/* Summary Grid Box */}
                <div className="bg-gray-50/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl p-4.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium block">Check In</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        {viewRecord.checkInTime ? format(new Date(viewRecord.checkInTime), "hh:mm a") : "—"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium block">Check Out</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        {viewRecord.checkOutTime ? format(new Date(viewRecord.checkOutTime), "hh:mm a") : "—"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium block">Total Worked</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {formatMinutes(viewRecord.totalWorkedMinutes)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 font-medium block">Break Duration</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        {formatMinutes(viewRecord.totalBreakMinutes)}
                      </span>
                    </div>

                    {((Number(viewRecord.overtimeHours) || 0) > 0 || (Number(viewRecord.overtimeMinutes) || 0) > 0) && (
                      <div className="space-y-1 col-span-2 sm:col-span-4 pt-2 border-t border-gray-200 dark:border-gray-800">
                        <span className="text-gray-400 font-medium block">Overtime</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                          {formatMinutes(Math.round(((Number(viewRecord.overtimeHours) || 0) * 60) || Number(viewRecord.overtimeMinutes) || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Section */}
                <div>
                  <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Summary Note</h4>
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 bg-white dark:bg-gray-950 text-sm leading-relaxed text-gray-700 dark:text-gray-300 shadow-2xs">
                    {viewRecord.summary || "No summary provided for this shift."}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-3">Activity Timeline</h4>

                  {viewRecord.activities?.length ? (
                    <div className="space-y-3.5 border-l-2 border-indigo-200 dark:border-indigo-900 pl-4 ml-2">
                      {viewRecord.activities.map((act, i) => (
                        <div 
                          key={i} 
                          className="relative pb-1 last:pb-0"
                        >
                          <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-gray-900 shadow-xs" />
                          
                          <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs p-3 hover:border-blue-300 transition-colors">
                            <div className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{act.type}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                              {format(new Date(act.startTime), "hh:mm a")}
                              {" — "}
                              {act.endTime
                                ? format(new Date(act.endTime), "hh:mm a")
                                : "Ongoing"}
                            </div>
                            {act.title && (
                              <div className="text-xs mt-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                                {act.title}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-xs italic py-6 text-center bg-gray-50/80 dark:bg-gray-900/60 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                      No detailed timeline activities logged for this date.
                    </div>
                  )}
                </div>

                {/* 🧾 Daily Attendance Punches (Invoice / Receipt Style) */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Punch Logs ({viewRecord.punches?.length || 0})</span>
                    </h4>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Real-time Device Logs
                    </span>
                  </div>

                  {viewRecord.punches?.length ? (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950 shadow-2xs">
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {viewRecord.punches.map((punch: any, idx: number) => {
                          const isCheckIn = punch.type === "CHECK_IN";
                          const isCheckOut = punch.type === "CHECK_OUT";

                          return (
                            <div 
                              key={punch.id || idx} 
                              className="p-3 hover:bg-gray-50/70 dark:hover:bg-gray-900/50 transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              {/* Punch # and Direction */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge 
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider shrink-0 ${
                                        isCheckIn 
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300" 
                                          : isCheckOut 
                                          ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300" 
                                          : "bg-gray-50 text-gray-700 border-gray-300"
                                      }`}
                                    >
                                      {isCheckIn ? (
                                        <span className="inline-flex items-center gap-0.5">
                                          <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                                          IN
                                        </span>
                                      ) : isCheckOut ? (
                                        <span className="inline-flex items-center gap-0.5">
                                          <ArrowUpRight className="w-3 h-3 text-blue-600" />
                                          OUT
                                        </span>
                                      ) : (
                                        punch.type
                                      )}
                                    </Badge>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                      {punch.device || "Biometric Terminal"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                    <span className="capitalize">{punch.method || "Biometric"}</span>
                                    {punch.ip && <span>• IP: {punch.ip}</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Timestamp */}
                              <div className="text-right shrink-0">
                                <div className="font-bold text-gray-900 dark:text-gray-100 font-mono text-xs">
                                  {punch.punchTime ? format(new Date(punch.punchTime), "hh:mm:ss a") : "—"}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  {punch.punchTime ? format(new Date(punch.punchTime), "MMM d") : ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-xs italic py-6 text-center bg-gray-50/80 dark:bg-gray-900/60 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                      No raw biometric punches recorded for this date.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};