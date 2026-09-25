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
  ArrowUpRight,
  SlidersHorizontal,
  Trash2,
  Plus,
  CalendarCheck,
  CalendarX,
  AlertTriangle,
  Check,
  X,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { attendanceAPI, departmentAPI, employeeAPI, locationAPI } from '../services/api';
import { deviceService } from '../services/device.service';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

  // 1. First priority: exact match on reportDate or dateStr
  const reportMatches = attendanceList.filter((a: any) => {
    if (!a) return false;
    return a.reportDate === targetDateStr || a.dateStr === targetDateStr;
  });
  if (reportMatches.length > 0) {
    if (reportMatches.length === 1) return reportMatches[0];
    reportMatches.sort((a, b) => {
      const aHasCheckIn = a.checkInTime ? 1 : 0;
      const bHasCheckIn = b.checkInTime ? 1 : 0;
      if (aHasCheckIn !== bHasCheckIn) return bHasCheckIn - aHasCheckIn;
      return (Number(b.totalWorkedMinutes) || 0) - (Number(a.totalWorkedMinutes) || 0);
    });
    return reportMatches[0];
  }

  // 2. Secondary fallback for raw attendance records without reportDate
  const matches = attendanceList.filter((a: any) => {
    if (!a) return false;
    if (a.checkInTime && getFormattedDateStr(a.checkInTime) === targetDateStr) return true;
    if (a.date && getFormattedDateStr(a.date) === targetDateStr) return true;
    return false;
  });

  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  matches.sort((a, b) => {
    const aOnTarget = a.checkInTime && getFormattedDateStr(a.checkInTime) === targetDateStr ? 1 : 0;
    const bOnTarget = b.checkInTime && getFormattedDateStr(b.checkInTime) === targetDateStr ? 1 : 0;
    if (aOnTarget !== bOnTarget) return bOnTarget - aOnTarget;

    const aHasCheckIn = a.checkInTime ? 1 : 0;
    const bHasCheckIn = b.checkInTime ? 1 : 0;
    if (aHasCheckIn !== bHasCheckIn) return bHasCheckIn - aHasCheckIn;

    const aNotAbsent = a.status && a.status !== "ABSENT" && a.status !== "OFF_DAY" && a.status !== "UPCOMING_DAY" ? 1 : 0;
    const bNotAbsent = b.status && b.status !== "ABSENT" && b.status !== "OFF_DAY" && b.status !== "UPCOMING_DAY" ? 1 : 0;
    if (aNotAbsent !== bNotAbsent) return bNotAbsent - aNotAbsent;

    return (Number(b.totalWorkedMinutes) || 0) - (Number(a.totalWorkedMinutes) || 0);
  });

  return matches[0];
};

export const isScheduleOffDay = (schedules: any, date: Date | string, overrideType?: string | null): boolean => {
  if (overrideType === "WORK_DAY") return false;
  if (overrideType === "OFF_DAY") return true;
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

const calculateShiftDuration = (startStr?: string, endStr?: string) => {
  if (!startStr || !endStr) return "—";
  try {
    const [sh, sm] = startStr.trim().split(":").map(Number);
    const [eh, em] = endStr.trim().split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "—";
    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // Overnight shift
    }
    const diff = endMinutes - startMinutes;
    return formatMinutes(diff);
  } catch {
    return "—";
  }
};

export const getEmployeeScheduleForDate = (schedules: any, date: Date | string, fallbackRecord?: any) => {
  const list = Array.isArray(schedules) ? schedules : (schedules ? [schedules] : []);
  const activeSched = list.find((s: any) => s && !s.deletedAt) || list[0];

  const targetDate = typeof date === "string" ? new Date(date.length <= 10 ? `${date}T00:00:00` : date) : new Date(date);
  const shortDay = format(targetDate, "EEE").toLowerCase();
  const fullDay = format(targetDate, "EEEE").toLowerCase();

  if (!activeSched) {
    if (fallbackRecord?.shiftStartTime && fallbackRecord?.shiftEndTime) {
      return {
        isScheduled: true,
        isWorkingDay: true,
        dayName: format(targetDate, "EEEE"),
        startTime: fallbackRecord.shiftStartTime,
        endTime: fallbackRecord.shiftEndTime,
        startTime12: convertTo12Hour(fallbackRecord.shiftStartTime),
        endTime12: convertTo12Hour(fallbackRecord.shiftEndTime),
        allowEarlyIn: false,
        earlyInMinutes: 0,
        allowEarlyOut: false,
        earlyOutMinutes: 0,
        overtimeAllowed: false,
        overtimeMinutes: 0,
        allowHalfDay: false,
        halfDayMinutes: 0,
        breaksAllowed: false,
        breakDurations: [],
      };
    }
    return null;
  }

  const daysArr = Array.isArray(activeSched.days) ? activeSched.days : [];
  
  let isWorkingDay = false;
  let daySpecificStart: string | null = null;
  let daySpecificEnd: string | null = null;

  for (const d of daysArr) {
    if (typeof d === "object" && d !== null) {
      const name = String(d.day || d.dayFull || d.name || d.short || "").trim().toLowerCase();
      if (name === shortDay || name === fullDay) {
        isWorkingDay = true;
        if (d.startTime) daySpecificStart = d.startTime;
        if (d.endTime) daySpecificEnd = d.endTime;
        break;
      }
    } else {
      const name = String(d || "").trim().toLowerCase();
      if (name === shortDay || name === fullDay) {
        isWorkingDay = true;
        break;
      }
    }
  }

  const shiftStart = daySpecificStart || activeSched.startTime || fallbackRecord?.shiftStartTime || "09:00";
  const shiftEnd = daySpecificEnd || activeSched.endTime || fallbackRecord?.shiftEndTime || "18:00";

  return {
    isScheduled: true,
    isWorkingDay,
    dayName: format(targetDate, "EEEE"),
    startTime: shiftStart,
    endTime: shiftEnd,
    startTime12: convertTo12Hour(shiftStart),
    endTime12: convertTo12Hour(shiftEnd),
    allowEarlyIn: Boolean(activeSched.allowEarlyIn),
    earlyInMinutes: activeSched.earlyInMinutes ?? 15,
    allowEarlyOut: Boolean(activeSched.allowEarlyOut),
    earlyOutMinutes: activeSched.earlyOutMinutes ?? 15,
    overtimeAllowed: Boolean(activeSched.overtimeAllowed),
    overtimeMinutes: activeSched.overtimeMinutes ?? 30,
    allowHalfDay: Boolean(activeSched.allowHalfDay),
    halfDayMinutes: activeSched.halfDayMinutes ?? 240,
    breaksAllowed: Boolean(activeSched.breaksAllowed),
    breakDurations: activeSched.breakDurations || [],
  };
};

export const getEmployeeDailyStatus = (emp: any, date: Date | string): string => {
  const targetDateStr = getFormattedDateStr(date);
  const record = findAttendanceRecord(emp?.Attendance || emp?.attendance, targetDateStr);
  const isEmpDayOff = isScheduleOffDay(emp?.Schedule, date, record?.overrideType);
  const isFutureDate = isAfter(startOfDay(new Date(date)), startOfDay(new Date()));

  const checkInDateStr = record?.checkInTime ? getFormattedDateStr(record.checkInTime) : null;
  const hasActualCheckInOnThisDate = Boolean(
    record?.checkInTime &&
    checkInDateStr === targetDateStr &&
    (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(String(record.status).toUpperCase())))
  );

  let defaultStatus = "ABSENT";
  if (isEmpDayOff && !hasActualCheckInOnThisDate) {
    defaultStatus = "OFF_DAY";
  } else if (isFutureDate && !hasActualCheckInOnThisDate) {
    defaultStatus = "UPCOMING_DAY";
  }

  let rawStatus = record?.status;
  if (rawStatus === "LATE") rawStatus = "TARDY";

  if (record?.checkInTime && !isEmpDayOff && rawStatus !== "LEAVE") {
    const sched = getEmployeeScheduleForDate(emp?.Schedule, date, record);
    const graceMinutes = sched?.allowEarlyIn ? (Number(sched.earlyInMinutes) || 0) : 0;
    const sTime = sched?.startTime || "09:00";
    const [sh, sm] = sTime.split(":").map(Number);
    const inDate = new Date(record.checkInTime);
    const inTotalMins = inDate.getHours() * 60 + inDate.getMinutes();
    const shiftStartTotalMins = (sh || 9) * 60 + (sm || 0);
    const diffFromStart = inTotalMins - shiftStartTotalMins;

    if (diffFromStart > graceMinutes) {
      rawStatus = "TARDY";
    } else if (rawStatus === "LATE" || rawStatus === "TARDY" || !rawStatus || rawStatus === "ABSENT") {
      rawStatus = "PRESENT";
    }
  } else if (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE") {
    rawStatus = "OFF_DAY";
  } else if (!rawStatus || rawStatus === "ABSENT") {
    rawStatus = defaultStatus;
  }

  const isOffDayRow = rawStatus === "OFF_DAY" || (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE");
  const finalStatus = isOffDayRow ? "OFF_DAY" : (rawStatus?.toUpperCase() || defaultStatus);
  return finalStatus === "LATE" ? "TARDY" : finalStatus === "OFF" ? "OFF_DAY" : finalStatus;
};

const getPaginationRange = (current: number, total: number) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const delta = 1;
  const range: (number | string)[] = [];

  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) {
    range.push(i);
  }

  if (current - delta > 2) {
    range.unshift("...");
  }
  if (current + delta < total - 1) {
    range.push("...");
  }

  range.unshift(1);
  range.push(total);

  return range;
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
  const [syncingMachine, setSyncingMachine] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Day Override State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [dayOverridesList, setDayOverridesList] = useState<any[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [editingOverrideId, setEditingOverrideId] = useState<number | null>(null);

  // Day Override Form State
  const [overrideType, setOverrideType] = useState<"WORK_DAY" | "OFF_DAY">("WORK_DAY");
  const [overrideDate, setOverrideDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [overrideScope, setOverrideScope] = useState<"ALL" | "DEPARTMENT" | "LOCATION" | "EMPLOYEE">("ALL");
  const [overrideDeptId, setOverrideDeptId] = useState<string>("");
  const [overrideLocId, setOverrideLocId] = useState<string>("");
  const [overrideEmpId, setOverrideEmpId] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");

  const resetOverrideForm = () => {
    setEditingOverrideId(null);
    setOverrideType("WORK_DAY");
    setOverrideDate(format(new Date(), "yyyy-MM-dd"));
    setOverrideScope("ALL");
    setOverrideDeptId("");
    setOverrideLocId("");
    setOverrideEmpId("");
    setOverrideReason("");
  };

  const handleStartEditOverride = (item: any) => {
    setEditingOverrideId(item.id);
    setOverrideType(item.type || "WORK_DAY");
    setOverrideDate(item.date ? String(item.date).slice(0, 10) : format(new Date(), "yyyy-MM-dd"));
    setOverrideScope(item.scope || "ALL");
    setOverrideDeptId(item.departmentId ? String(item.departmentId) : "");
    setOverrideLocId(item.companyId ? String(item.companyId) : "");
    setOverrideEmpId(item.employeeId ? String(item.employeeId) : "");
    setOverrideReason(item.reason || "");
  };

  const loadDayOverrides = async () => {
    try {
      setLoadingOverrides(true);
      const res = await attendanceAPI.getDayOverrides();
      if (res && res.overrides) {
        setDayOverridesList(res.overrides);
      }
    } catch (err: any) {
      console.error("Error loading day overrides:", err);
    } finally {
      setLoadingOverrides(false);
    }
  };

  const handleSaveDayOverride = async () => {
    if (!overrideDate) {
      toast.error("Please select a date for the override");
      return;
    }
    if (!overrideReason || !overrideReason.trim()) {
      toast.error("Please enter a reason for the override");
      return;
    }
    if (overrideScope === "DEPARTMENT" && (!overrideDeptId || overrideDeptId === "all")) {
      toast.error("Please select a specific department");
      return;
    }
    if (overrideScope === "LOCATION" && (!overrideLocId || overrideLocId === "all")) {
      toast.error("Please select a specific location");
      return;
    }
    if (overrideScope === "EMPLOYEE" && (!overrideEmpId || overrideEmpId === "all")) {
      toast.error("Please select a specific employee");
      return;
    }

    try {
      setSavingOverride(true);
      const payload = {
        date: overrideDate,
        type: overrideType,
        reason: overrideReason.trim(),
        scope: overrideScope,
        departmentId: overrideScope === "DEPARTMENT" ? Number(overrideDeptId) : null,
        companyId: overrideScope === "LOCATION" ? Number(overrideLocId) : null,
        employeeId: overrideScope === "EMPLOYEE" ? Number(overrideEmpId) : null,
      };

      if (editingOverrideId) {
        if (attendanceAPI.updateDayOverride) {
          await attendanceAPI.updateDayOverride(editingOverrideId, payload);
        } else {
          await attendanceAPI.saveDayOverride({ ...payload, id: editingOverrideId });
        }
        toast.success("Day override updated successfully!");
      } else {
        await attendanceAPI.saveDayOverride(payload);
        toast.success(
          overrideType === "WORK_DAY"
            ? "Off-day successfully turned ON as a Working Day!"
            : "Work day successfully turned OFF as an Admin Holiday!"
        );
      }

      resetOverrideForm();
      await loadDayOverrides();
      await loadReport();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save day override");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteDayOverride = async (id: number) => {
    try {
      await attendanceAPI.deleteDayOverride(id);
      toast.success("Day override removed successfully");
      if (editingOverrideId === id) {
        resetOverrideForm();
      }
      await loadDayOverrides();
      await loadReport();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove day override");
    }
  };

  // Pagination state for Daily View table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedDate, departmentId, locationId, selectedEmployeeId, statusFilter]);

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
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      toast.success("Excel exported successfully!", { id: "export-excel" });
    } catch (err: any) {
      toast.error("Failed to export Excel report", { id: "export-excel" });
    } finally {
      setExporting(false);
    }
  };

  const openViewPanel = (record: any, emp?: any) => {
    const matchedEmp = emp || report.find((e) => e.id === record?.employeeId) || employees.find((e) => e.id === record?.employeeId);
    setViewRecord({
      ...record,
      employee: matchedEmp || record?.employee,
      schedule: record?.schedule || matchedEmp?.Schedule,
    });
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

    const isEmpDayOff = isScheduleOffDay(emp?.Schedule, cellDate, record?.overrideType);

    const checkInDateStr = record?.checkInTime ? getFormattedDateStr(record.checkInTime) : null;
    const hasActualCheckInOnThisDate = Boolean(
      record?.checkInTime &&
      checkInDateStr === cellDateStr &&
      (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(record.status.toUpperCase())))
    );

    let defaultStatus = "ABSENT";
    if (isEmpDayOff && !hasActualCheckInOnThisDate) {
      defaultStatus = "OFF_DAY";
    } else if (isFutureDay && !hasActualCheckInOnThisDate) {
      defaultStatus = "UPCOMING_DAY";
    }

    let rawStatus = record?.status;
    if (rawStatus === "LATE") rawStatus = "TARDY";

    if (record?.checkInTime && !isEmpDayOff && rawStatus !== "LEAVE") {
      const daySchedule = getEmployeeScheduleForDate(emp?.Schedule, day, record);
      const graceMinutes = daySchedule?.allowEarlyIn ? (Number(daySchedule.earlyInMinutes) || 0) : 0;
      const sTime = daySchedule?.startTime || "09:00";
      const [sh, sm] = sTime.split(":").map(Number);
      const inDate = new Date(record.checkInTime);
      const inTotalMins = inDate.getHours() * 60 + inDate.getMinutes();
      const shiftStartTotalMins = (sh || 9) * 60 + (sm || 0);
      const diffFromStart = inTotalMins - shiftStartTotalMins;

      if (diffFromStart > graceMinutes) {
        rawStatus = "TARDY";
      } else if (rawStatus === "LATE" || rawStatus === "TARDY" || !rawStatus || rawStatus === "ABSENT") {
        rawStatus = "PRESENT";
      }
    } else if (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE") {
      rawStatus = "OFF_DAY";
    } else if (!rawStatus || rawStatus === "ABSENT") {
      rawStatus = defaultStatus;
    }

    const isOffCell = rawStatus === "OFF_DAY" || (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE");
    const cellCheckIn = (isOffCell || checkInDateStr !== cellDateStr) ? null : (record?.checkInTime ?? null);
    const cellCheckOut = (isOffCell || (record?.checkOutTime && getFormattedDateStr(record.checkOutTime) !== cellDateStr)) ? null : (record?.checkOutTime ?? null);

    const finalRecord = {
      id: record?.id ?? null,
      date: record?.date ?? day,
      checkInTime: cellCheckIn,
      checkOutTime: cellCheckOut,
      totalWorkedMinutes: isOffCell ? 0 : (record?.totalWorkedMinutes ?? 0),
      totalBreakMinutes: isOffCell ? 0 : (record?.totalBreakMinutes ?? 0),
      employeeId: record?.employeeId ?? emp.id,
      overtimeAmount: isOffCell ? 0 : (record?.overtimeAmount ?? 0),
      ...record,
      status: isOffCell ? "OFF_DAY" : (rawStatus === "LATE" ? "TARDY" : rawStatus),
      overtimeHours: isOffCell ? 0 : otHours,
      overtimeMinutes: isOffCell ? 0 : otMins,
    };

    if (!finalRecord) {
      return <span className="text-gray-400">—</span>;
    }

    const status = finalRecord.status?.toUpperCase();
    const isOff = status === "OFF_DAY" || status === "OFF" || (isEmpDayOff && !hasActualCheckInOnThisDate && status !== "LEAVE");
    const hasWorked = !isOff && (status === "PRESENT" || status === "LATE" || status === "TARDY" || (Number(finalRecord.totalWorkedMinutes) > 0));
    const isUpcoming = !hasWorked && !isOff && (isFutureDay || status === "UPCOMING_DAY" || status === "UPCOMING");
    const isLeave = status === "LEAVE";
    const isAbsent = !hasWorked && !isOff && !isUpcoming && !isLeave;

    // Tooltip is enabled if there's an override, or for worked days
    const isTooltipDisabled = !finalRecord.overrideType && (isOff || isLeave || isAbsent || isUpcoming);

    const config = STATUS_CONFIG[isOff ? "OFF_DAY" : (isUpcoming ? "UPCOMING_DAY" : status)] || STATUS_CONFIG["ABSENT"];
    const isUserMonthly = activeTab === "monthly" && user?.role === "USER";

    const cellElement = (
      <div
        onClick={() => {
          if (isTooltipDisabled && !finalRecord.overrideType) {
            return;
          }
          setSelectedRecord(finalRecord);
          setEditModalOpen(true);
        }}
        className={`relative ${isTooltipDisabled && !finalRecord.overrideType ? "cursor-default select-none" : "cursor-pointer transition-all hover:scale-[1.05] hover:shadow-md"} ${
          isUserMonthly
            ? "w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
            : "rounded-md p-1"
        } ${config.cell}`}
      >
        {/* Visual indicator dot for Day Override */}
        {finalRecord.overrideType && (
          <span
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-950 z-10 ${
              finalRecord.overrideType === 'WORK_DAY' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
            title={finalRecord.overrideType === 'WORK_DAY' ? 'Admin Override: Forced ON (Working Day)' : 'Admin Override: Forced OFF (Holiday / Off Day)'}
          />
        )}
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

    if (isTooltipDisabled && !finalRecord.overrideType) {
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
            <div className="font-bold text-sm border-b border-white/20 pb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {format(new Date(finalRecord.date), "PPP")}
              </div>
              {finalRecord.overrideType && (
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                  finalRecord.overrideType === 'WORK_DAY'
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                    : 'bg-amber-500/30 text-amber-200 border-amber-400/50'
                }`}>
                  {finalRecord.overrideType === 'WORK_DAY' ? 'ON (Work Day)' : 'OFF (Admin Off)'}
                </span>
              )}
            </div>

            {/* Day Override Alert / Reason Banner */}
            {finalRecord.overrideType && (
              <div className={`p-2.5 rounded-lg text-xs border ${
                finalRecord.overrideType === 'WORK_DAY'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-100'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    finalRecord.overrideType === 'WORK_DAY' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`} />
                  <span>
                    {finalRecord.overrideType === 'WORK_DAY'
                      ? 'Day Override: Working Day (ON)'
                      : 'Day Override: Admin Off / Holiday (OFF)'}
                  </span>
                </div>
                {finalRecord.overrideReason && (
                  <div className="text-[11px] opacity-95 italic font-sans pl-3 border-l-2 border-white/30 my-1">
                    "{finalRecord.overrideReason}"
                  </div>
                )}
                {finalRecord.overrideScope && (
                  <div className="text-[10px] opacity-80 font-mono mt-1">
                    Scope: {finalRecord.overrideScope}
                  </div>
                )}
              </div>
            )}

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

  const handleSyncFromMachine = async () => {
    try {
      setSyncingMachine(true);
      toast.loading("Connecting to machine & syncing punches...", { id: "sync-machine" });
      const res = await deviceService.syncAllDevices();
      toast.success(res?.message || "Punches synced from machine successfully!", { id: "sync-machine" });
      await loadReport(false);
    } catch (err: any) {
      console.error("Machine sync failed:", err);
      toast.error(err?.message || "Failed to sync from machine", { id: "sync-machine" });
    } finally {
      setSyncingMachine(false);
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
      const rec = findAttendanceRecord(emp.Attendance || emp.attendance, targetDateStr);
      let st = rec?.status?.toUpperCase();
      if (st === "LATE") st = "TARDY";

      if (rec?.checkInTime && st !== "LEAVE" && st !== "OFF_DAY") {
        const daySched = getEmployeeScheduleForDate(emp?.Schedule, selectedDate, rec);
        const graceMins = daySched?.allowEarlyIn ? (Number(daySched.earlyInMinutes) || 0) : 0;
        const sTime = daySched?.startTime || "09:00";
        const [sh, sm] = sTime.split(":").map(Number);
        const inDate = new Date(rec.checkInTime);
        const inTotalMins = inDate.getHours() * 60 + inDate.getMinutes();
        const shiftStartTotalMins = (sh || 9) * 60 + (sm || 0);
        if (inTotalMins - shiftStartTotalMins > graceMins) {
          st = "TARDY";
        } else if (st === "TARDY" || st === "LATE" || !st || st === "ABSENT") {
          st = "PRESENT";
        }
      } else if (!st) {
        st = "ABSENT";
      }
      const isOff = isScheduleOffDay(emp?.Schedule, selectedDate, rec?.overrideType) && st !== "PRESENT" && st !== "LATE" && st !== "TARDY" && st !== "LEAVE";

      if (st === "PRESENT") present++;
      else if (st === "LATE" || st === "TARDY") tardy++;
      else if (st === "LEAVE") leave++;
      else if (st === "OFF_DAY" || isOff || st === "UPCOMING_DAY") {
        // Off or upcoming day: not counted as absent
      } else absent++;
    });

    return { present, tardy, absent, leave, total: report.length };
  }, [report, selectedDate, activeTab]);

  // Filtered report calculation based on statusFilter
  const filteredReport = useMemo(() => {
    if (!statusFilter || statusFilter === "all") {
      return report;
    }
    const filterUpper = statusFilter.toUpperCase();

    return report.filter((emp) => {
      if (activeTab === "daily") {
        const empStatus = getEmployeeDailyStatus(emp, selectedDate);
        if (filterUpper === "TARDY") return empStatus === "TARDY" || empStatus === "LATE";
        if (filterUpper === "OFF_DAY") return empStatus === "OFF_DAY" || empStatus === "OFF";
        return empStatus === filterUpper;
      }

      // For weekly & monthly views: check if employee has this status on any day of the period, or on selectedDate
      const records = emp.Attendance || emp.attendance || [];
      const hasStatusInRecords = records.some((r: any) => {
        const s = (r.status || "").toUpperCase();
        if (filterUpper === "TARDY") return s === "TARDY" || s === "LATE";
        if (filterUpper === "OFF_DAY") return s === "OFF_DAY" || s === "OFF";
        return s === filterUpper;
      });
      if (hasStatusInRecords) return true;

      const dailyStatus = getEmployeeDailyStatus(emp, selectedDate);
      if (filterUpper === "TARDY") return dailyStatus === "TARDY" || dailyStatus === "LATE";
      if (filterUpper === "OFF_DAY") return dailyStatus === "OFF_DAY" || dailyStatus === "OFF";
      return dailyStatus === filterUpper;
    });
  }, [report, statusFilter, activeTab, selectedDate]);

  // Pagination calculations (shared across Daily, Weekly, and Monthly views)
  const totalEmployees = filteredReport.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEmployees);
  const paginatedReport = useMemo(() => {
    return filteredReport.slice(startIndex, endIndex);
  }, [filteredReport, startIndex, endIndex]);
  const paginatedDailyReport = paginatedReport;

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
        const record = findAttendanceRecord(emp.Attendance || emp.attendance, dayStr);

        const cellDate = new Date(`${dayStr}T00:00:00`);
        const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));
        const isEmpDayOff = isScheduleOffDay(emp?.Schedule, cellDate);
        const checkInDateStr = record?.checkInTime ? getFormattedDateStr(record.checkInTime) : null;
        const hasActualCheckInOnThisDate = Boolean(
          record?.checkInTime &&
          checkInDateStr === dayStr &&
          (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(record.status.toUpperCase())))
        );

        let rawStatus = record?.status?.toUpperCase();
        if (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE") {
          rawStatus = "OFF_DAY";
        } else if (isFutureDay && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE") {
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
              const record = findAttendanceRecord(emp.Attendance || emp.attendance, dayStr);

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
        <div className="overflow-x-auto w-full max-w-full">
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
                    <span>Employee ({filteredReport.length})</span>
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
              {paginatedReport.map((emp) => {
                const totalMinutes = days.reduce((sum: number, day: Date) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const record = findAttendanceRecord(emp.Attendance || emp.attendance, dayStr);

                  const cellDate = new Date(`${dayStr}T00:00:00`);
                  const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));
                  const isEmpDayOff = isScheduleOffDay(emp?.Schedule, cellDate);
                  const checkInDateStr = record?.checkInTime ? getFormattedDateStr(record.checkInTime) : null;
                  const hasActualCheckInOnThisDate = Boolean(
                    record?.checkInTime &&
                    checkInDateStr === dayStr &&
                    (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(record.status.toUpperCase())))
                  );

                  let rawStatus = record?.status?.toUpperCase();
                  if (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE") {
                    rawStatus = "OFF_DAY";
                  } else if (isFutureDay && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE") {
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
                      const record = findAttendanceRecord(emp.Attendance || emp.attendance, format(day, "yyyy-MM-dd"));
  
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
  
        {filteredReport.length === 0 && (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-gray-400" />
            <p className="font-medium text-base">No attendance records found for this period</p>
            <p className="text-xs text-gray-400">Try adjusting your filters or date selection.</p>
          </div>
        )}

        {/* Pagination Footer */}
        {totalEmployees > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                Showing <strong className="text-gray-700 dark:text-gray-200">{startIndex + 1}</strong> to{" "}
                <strong className="text-gray-700 dark:text-gray-200">{endIndex}</strong> of{" "}
                <strong className="text-gray-700 dark:text-gray-200">{totalEmployees}</strong> employees
              </span>

              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-gray-500 dark:text-gray-400">Rows per page:</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(val) => {
                    setItemsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[72px] text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={validPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {getPaginationRange(validPage, totalPages).map((item, idx) => {
                  if (item === "...") {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-8 h-8 flex items-center justify-center text-xs text-gray-400"
                      >
                        ...
                      </span>
                    );
                  }

                  const pageNum = Number(item);
                  const isActive = pageNum === validPage;

                  return (
                    <Button
                      key={`page-${pageNum}`}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 p-0 text-xs font-semibold rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs border-blue-600"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={validPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2 overflow-x-hidden">
      {/* Simple Header with Refresh & Export Excel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Management</h2>
          <p className="text-gray-500 text-sm">
            Track, edit, and audit daily, weekly, and monthly employee timesheets effortlessly.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {user?.role !== 'USER' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOverrideModalOpen(true);
                loadDayOverrides();
              }}
              className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/40 shadow-2xs rounded-xl transition-all"
              title="Advance Settings: Turn Off-Days ON or On-Days OFF"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Advance Settings</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={syncingMachine || refreshing}
            onClick={handleSyncFromMachine}
            className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 shadow-2xs rounded-xl"
            title="Fetch real-time punches from machine and update attendance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingMachine ? "animate-spin text-blue-600" : "text-gray-500"}`} />
            <span>{syncingMachine ? "Syncing..." : "Sync From Machine"}</span>
          </Button>

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

      {/* Main Filter & Content Card */}
      <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Date Navigation */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-950 p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs shrink-0">
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

            {/* DatePicker Input Box (Same as Dashboard) */}
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-xl shadow-2xs shrink-0 h-9">
              <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <DatePicker
                selected={selectedDate}
                maxDate={new Date()}
                onChange={(date: Date | null) => {
                  if (!date) return;
                  if (isAfter(startOfDay(date), startOfDay(new Date()))) return;
                  setSelectedDate(date);
                  if (activeTab === "weekly") setWeekOffset(0);
                  if (activeTab === "monthly") setMonthOffset(0);
                }}
                showMonthDropdown={activeTab !== "monthly"}
                showYearDropdown={activeTab !== "monthly"}
                dropdownMode="select"
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
                    ? "yyyy-MM-dd"
                    : activeTab === "weekly"
                    ? "'Week of' yyyy-MM-dd"
                    : "MMMM yyyy"
                }
                className="w-28 sm:w-32 bg-transparent text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm focus:outline-none cursor-pointer p-0"
                placeholderText="Select date..."
              />
              {!isSameDay(selectedDate, new Date()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(new Date());
                    if (activeTab === "weekly") setWeekOffset(0);
                    if (activeTab === "monthly") setMonthOffset(0);
                  }}
                  className="text-xs font-semibold px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-xs ml-0.5"
                >
                  Today
                </button>
              )}
            </div>

            {user?.role === "ADMIN" && (
              <>
                <SearchableSelect
                  className="w-32 sm:w-36 shrink-0"
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
                  className="w-32 sm:w-36 shrink-0"
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
                  className="w-36 sm:w-40 shrink-0"
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

            {/* Attendance Status Filter */}
            <SearchableSelect
              className="w-32 sm:w-36 shrink-0"
              icon={<Filter className="w-3.5 h-3.5 text-gray-400" />}
              placeholder="All Statuses"
              searchPlaceholder="Filter status..."
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "PRESENT", label: "Present" },
                { value: "ABSENT", label: "Absent" },
                { value: "TARDY", label: "Tardy" },
                { value: "LEAVE", label: "Leave" },
                { value: "OFF_DAY", label: "Off Day" },
              ]}
            />
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
                    {paginatedDailyReport.map(emp => {
                      const targetDateStr = format(selectedDate, "yyyy-MM-dd");
                      const record = findAttendanceRecord(emp.Attendance || emp.attendance, targetDateStr);

                      const otHours = Number(record?.overtimeHours) || 0;
                      const otMins = record?.overtimeMinutes ? Number(record?.overtimeMinutes) : Math.round(otHours * 60);

                      const isEmpDayOff = isScheduleOffDay(emp?.Schedule, selectedDate, record?.overrideType);
                      const isFutureDate = isAfter(startOfDay(selectedDate), startOfDay(new Date()));

                      const checkInDateStr = record?.checkInTime ? getFormattedDateStr(record.checkInTime) : null;
                      const hasActualCheckInOnThisDate = Boolean(
                        record?.checkInTime &&
                        checkInDateStr === targetDateStr &&
                        (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(record.status.toUpperCase())))
                      );

                      let defaultStatus = "ABSENT";
                      if (isEmpDayOff && !hasActualCheckInOnThisDate) {
                        defaultStatus = "OFF_DAY";
                      } else if (isFutureDate && !hasActualCheckInOnThisDate) {
                        defaultStatus = "UPCOMING_DAY";
                      }

                      let rawStatus = record?.status;
                      if (rawStatus === "LATE") rawStatus = "TARDY";

                      if (record?.checkInTime && !isEmpDayOff && rawStatus !== "LEAVE") {
                        const daySchedule = getEmployeeScheduleForDate(emp?.Schedule, selectedDate, record);
                        const graceMinutes = daySchedule?.allowEarlyIn ? (Number(daySchedule.earlyInMinutes) || 0) : 0;
                        const sTime = daySchedule?.startTime || "09:00";
                        const [sh, sm] = sTime.split(":").map(Number);
                        const inDate = new Date(record.checkInTime);
                        const inTotalMins = inDate.getHours() * 60 + inDate.getMinutes();
                        const shiftStartTotalMins = (sh || 9) * 60 + (sm || 0);
                        const diffFromStart = inTotalMins - shiftStartTotalMins;

                        if (diffFromStart > graceMinutes) {
                          rawStatus = "TARDY";
                        } else if (rawStatus === "LATE" || rawStatus === "TARDY" || !rawStatus || rawStatus === "ABSENT") {
                          rawStatus = "PRESENT";
                        }
                      } else if (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE") {
                        rawStatus = "OFF_DAY";
                      } else if (!rawStatus || rawStatus === "ABSENT") {
                        rawStatus = defaultStatus;
                      }

                      // Compute real-time elapsed minutes if actively on shift today
                      let workedMins = record?.totalWorkedMinutes ?? 0;
                      if (record?.checkInTime && !record?.checkOutTime && isSameDay(selectedDate, new Date())) {
                        const inMs = new Date(record.checkInTime).getTime();
                        const nowMs = Date.now();
                        if (nowMs > inMs) {
                          const diffMins = Math.floor((nowMs - inMs) / 60000);
                          workedMins = Math.max(0, Math.min(diffMins, 900) - (record.totalBreakMinutes || 0));
                        }
                      }

                      const nextDateStr = format(addDays(selectedDate, 1), "yyyy-MM-dd");
                      const checkOutDateStr = record?.checkOutTime ? getFormattedDateStr(record.checkOutTime) : null;
                      const isCheckOutOnShift = checkOutDateStr === targetDateStr || checkOutDateStr === nextDateStr;

                      const isOffDayRow = rawStatus === "OFF_DAY" || (isEmpDayOff && !hasActualCheckInOnThisDate && rawStatus !== "LEAVE");
                      const validCheckIn = (!isOffDayRow && (checkInDateStr === targetDateStr || checkInDateStr === nextDateStr)) ? (record?.checkInTime ?? null) : null;
                      const validCheckOut = (!isOffDayRow && record?.checkOutTime && isCheckOutOnShift) ? record.checkOutTime : null;

                      const finalRecord = {
                        ...record,
                        id: record?.id ?? null,
                        date: record?.date ?? selectedDate,
                        checkInTime: validCheckIn,
                        checkOutTime: validCheckOut,
                        totalWorkedMinutes: isOffDayRow ? 0 : workedMins,
                        totalBreakMinutes: isOffDayRow ? 0 : (record?.totalBreakMinutes ?? 0),
                        employeeId: record?.employeeId ?? emp.id,
                        employee: emp,
                        schedule: emp?.Schedule,
                        shiftStartTime: record?.shiftStartTime || (Array.isArray(emp?.Schedule) ? emp.Schedule[0]?.startTime : emp?.Schedule?.startTime),
                        shiftEndTime: record?.shiftEndTime || (Array.isArray(emp?.Schedule) ? emp.Schedule[0]?.endTime : emp?.Schedule?.endTime),
                        status: isOffDayRow ? "OFF_DAY" : rawStatus,
                        overtimeHours: isOffDayRow ? 0 : otHours,
                        overtimeMinutes: isOffDayRow ? 0 : otMins,
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
                            <div className="flex flex-col gap-1 items-start">
                              <Badge className={`px-2.5 py-0.5 border font-semibold tracking-wide ${statusCfg.badge}`}>
                                {finalRecord.status}
                              </Badge>
                              {finalRecord.overrideType && (
                                <span 
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                                    finalRecord.overrideType === "WORK_DAY"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                  }`}
                                  title={finalRecord.overrideReason || ""}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${finalRecord.overrideType === "WORK_DAY" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                                  {finalRecord.overrideType === "WORK_DAY" ? "Override: ON" : "Override: OFF"}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Action Buttons */}
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => openViewPanel(finalRecord, emp)}
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

                    {filteredReport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                          No attendance data found for the selected filter and date.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Footer */}
                {totalEmployees > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Showing <strong className="text-gray-700 dark:text-gray-200">{startIndex + 1}</strong> to{" "}
                        <strong className="text-gray-700 dark:text-gray-200">{endIndex}</strong> of{" "}
                        <strong className="text-gray-700 dark:text-gray-200">{totalEmployees}</strong> employees
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="hidden sm:inline text-gray-500 dark:text-gray-400">Rows per page:</span>
                        <Select
                          value={String(itemsPerPage)}
                          onValueChange={(val) => {
                            setItemsPerPage(Number(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[72px] text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent side="top">
                            {[10, 20, 50, 100].map((size) => (
                              <SelectItem key={size} value={String(size)} className="text-xs">
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={validPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {getPaginationRange(validPage, totalPages).map((item, idx) => {
                          if (item === "...") {
                            return (
                              <span
                                key={`ellipsis-${idx}`}
                                className="w-8 h-8 flex items-center justify-center text-xs text-gray-400"
                              >
                                ...
                              </span>
                            );
                          }

                          const pageNum = Number(item);
                          const isActive = pageNum === validPage;

                          return (
                            <Button
                              key={`page-${pageNum}`}
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`h-8 w-8 p-0 text-xs font-semibold rounded-lg transition-colors ${
                                isActive
                                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs border-blue-600"
                                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={validPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
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
                      if (!e.target.value) {
                        setSelectedRecord((prev: any) => ({
                          ...prev,
                          checkInTime: null,
                          totalWorkedMinutes: 0
                        }));
                        return;
                      }
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(selectedRecord.date);
                      newDate.setHours(Number(hours), Number(minutes), 0, 0);

                      const inIso = newDate.toISOString();
                      setSelectedRecord((prev: any) => {
                        let worked = 0;
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
                      if (!e.target.value) {
                        setSelectedRecord((prev: any) => ({
                          ...prev,
                          checkOutTime: null,
                          totalWorkedMinutes: 0
                        }));
                        return;
                      }
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(selectedRecord.date);
                      newDate.setHours(Number(hours), Number(minutes), 0, 0);

                      const outIso = newDate.toISOString();
                      setSelectedRecord((prev: any) => {
                        let worked = 0;
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

                        if (statusVal === "ABSENT" || statusVal === "OFF_DAY" || statusVal === "OFF" || statusVal === "LEAVE") {
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
          {viewRecord && (() => {
            const targetEmp = viewRecord.employee || report.find((e) => e.id === viewRecord.employeeId) || employees.find((e) => e.id === viewRecord.employeeId);
            const empSched = viewRecord.schedule || targetEmp?.Schedule;
            const daySchedule = getEmployeeScheduleForDate(empSched, viewRecord.date, viewRecord);
            const companyObj = targetEmp?.company || locations.find((l) => String(l.id) === String(targetEmp?.companyId || (Array.isArray(empSched) ? empSched[0]?.companyId : empSched?.companyId)));
            const locName = companyObj?.name || companyObj?.title || "";
            const empFullName = targetEmp ? `${targetEmp.firstName || ""} ${targetEmp.lastName || ""}`.trim() : "";
            const empIdCode = targetEmp?.employeeId || targetEmp?.id;

            const sortedPunches = Array.isArray(viewRecord.punches) && viewRecord.punches.length > 0
              ? [...viewRecord.punches].sort((a: any, b: any) => new Date(b.punchTime).getTime() - new Date(a.punchTime).getTime())
              : [];

            const latestPunch = sortedPunches[0] || null;

            const recentAction = latestPunch ? {
              type: latestPunch.type,
              time: latestPunch.punchTime,
              device: latestPunch.device,
            } : (viewRecord.checkOutTime ? {
              type: "CHECK_OUT",
              time: viewRecord.checkOutTime,
              device: viewRecord.checkOutDevice,
            } : (viewRecord.checkInTime ? {
              type: "CHECK_IN",
              time: viewRecord.checkInTime,
              device: viewRecord.checkInDevice,
            } : null));

            return (
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
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-gray-500 font-medium text-left">
                      {format(new Date(viewRecord.date), "EEEE, MMMM d, yyyy")}
                    </p>
                    {empFullName && (
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {empFullName} {empIdCode ? `(#${empIdCode})` : ""}
                      </span>
                    )}
                  </div>
                </DialogHeader>

                {/* Body */}
                <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
                  {/* ── Today's Scheduled Shift Card ────────────────────────── */}
                  <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                            Today's Shift Schedule
                          </h4>
                          <p className="text-[11px] text-blue-600/90 dark:text-blue-400 font-medium">
                            {daySchedule?.dayName || format(new Date(viewRecord.date), "EEEE")}
                          </p>
                        </div>
                      </div>

                      {viewRecord.overrideType ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          viewRecord.overrideType === "WORK_DAY"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${viewRecord.overrideType === "WORK_DAY" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                          {viewRecord.overrideType === "WORK_DAY" ? "Override: Working Day (ON)" : "Override: Admin Off (OFF)"}
                        </span>
                      ) : daySchedule ? (
                        daySchedule.isWorkingDay ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                            Working Day
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                            Scheduled Off Day
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          No Schedule
                        </span>
                      )}
                    </div>

                    {viewRecord.overrideReason && (
                      <div className="mt-2.5 p-2 rounded-lg bg-white/80 dark:bg-gray-900/60 border border-blue-200 dark:border-blue-900 text-xs">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Admin Override Reason: </span>
                        <span className="italic text-gray-600 dark:text-gray-400">"{viewRecord.overrideReason}"</span>
                      </div>
                    )}

                    {daySchedule?.isWorkingDay ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/80 dark:bg-gray-900/80 border border-blue-100/80 dark:border-blue-900/50 rounded-xl p-3 text-xs">
                          <div>
                            <span className="text-gray-400 font-medium block text-[11px]">Shift Timing</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                              {daySchedule.startTime12} — {daySchedule.endTime12}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-medium block text-[11px]">Shift Duration</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                              {calculateShiftDuration(daySchedule.startTime, daySchedule.endTime)}
                            </span>
                          </div>
                          {locName && (
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-gray-400 font-medium block text-[11px]">Location</span>
                              <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate block">
                                {locName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Shift Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {daySchedule.allowEarlyIn && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Early In ({daySchedule.earlyInMinutes}m)
                            </span>
                          )}
                          {daySchedule.allowEarlyOut && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                              Early Out ({daySchedule.earlyOutMinutes}m)
                            </span>
                          )}
                          {daySchedule.overtimeAllowed && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                              Overtime ({daySchedule.overtimeMinutes}m)
                            </span>
                          )}
                          {daySchedule.allowHalfDay && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                              Half Day ({daySchedule.halfDayMinutes}m)
                            </span>
                          )}
                          {daySchedule.breaksAllowed && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                              Breaks ({Array.isArray(daySchedule.breakDurations) ? daySchedule.breakDurations.length : 1})
                            </span>
                          )}
                          {!daySchedule.allowEarlyIn &&
                            !daySchedule.allowEarlyOut &&
                            !daySchedule.overtimeAllowed &&
                            !daySchedule.allowHalfDay &&
                            !daySchedule.breaksAllowed && (
                              <span className="text-[11px] text-gray-400">Standard Shift</span>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/80 dark:bg-gray-900/80 border border-blue-100/80 dark:border-blue-900/50 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
                        {daySchedule
                          ? `This day (${daySchedule.dayName}) is a scheduled Off Day / Rest Day for this employee.`
                          : "No active schedule assigned to this employee."}
                      </div>
                    )}
                  </div>

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

                    <div className="col-span-2 sm:col-span-4 pt-3 mt-1 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <span className="text-gray-400 font-medium block">Overtime</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                          {formatMinutes(Math.round(((Number(viewRecord.overtimeHours) || 0) * 60) || Number(viewRecord.overtimeMinutes) || 0))}
                        </span>
                      </div>

                      <div className="space-y-1 col-span-1 sm:col-span-3">
                        <span className="text-gray-400 font-medium block">Recent Action</span>
                        {recentAction ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="outline"
                              className={`text-[11px] px-2 py-0.5 font-bold uppercase tracking-wider shrink-0 ${
                                recentAction.type === "CHECK_IN" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300" 
                                  : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {recentAction.type === "CHECK_IN" ? (
                                  <>
                                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                                    Recent Check In
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                                    Recent Check Out
                                  </>
                                )}
                              </span>
                            </Badge>
                            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm font-mono">
                              {recentAction.time ? format(new Date(recentAction.time), "hh:mm a") : "—"}
                            </span>
                            {recentAction.device && (
                              <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]">
                                ({recentAction.device})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-bold text-gray-500 text-sm">—</span>
                        )}
                      </div>
                    </div>
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
          );
        })()}
        </DialogContent>
      </Dialog>

      {/* ── Day Override (Advance Settings) Modal ────────────────────── */}
      <Dialog
        open={isOverrideModalOpen}
        onOpenChange={(open) => {
          setIsOverrideModalOpen(open);
          if (!open) {
            resetOverrideForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl">
          <DialogHeader className="space-y-2 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Advance Settings — Day Override
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Override working calendar: Turn off-days into working days (ON) or declare emergency holidays / days off (OFF).
                  </DialogDescription>
                </div>
              </div>

              {editingOverrideId && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs animate-pulse">
                    <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Editing Mode Active (#{editingOverrideId})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetOverrideForm}
                    className="h-7 text-xs px-2.5 rounded-lg border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    Cancel Edit
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-5">
            {/* 1. Form Section Card */}
            <div className="bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {editingOverrideId ? "Edit Day Override Details" : "Configure New Day Override"}
                  </span>
                  {editingOverrideId && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500 text-white">
                      Editing
                    </span>
                  )}
                </div>
                {editingOverrideId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetOverrideForm}
                    className="h-7 text-xs px-2.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset to New
                  </Button>
                )}
              </div>

              {/* Action Type Toggle */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  Override Action Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setOverrideType("WORK_DAY")}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                      overrideType === "WORK_DAY"
                        ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-500/80 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/20"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900/60 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-bold text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <CalendarCheck className="w-4 h-4" />
                        Turn Off-Day → ON
                      </span>
                      {overrideType === "WORK_DAY" && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">
                      Force Sunday or off-day into an official working day (e.g. IT deadline, weekend sprint, shift compensation).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideType("OFF_DAY")}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                      overrideType === "OFF_DAY"
                        ? "border-amber-500 bg-amber-50/80 text-amber-950 dark:bg-amber-950/40 dark:border-amber-500/80 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/20"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900/60 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-bold text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <CalendarX className="w-4 h-4" />
                        Turn Work Day → OFF
                      </span>
                      {overrideType === "OFF_DAY" && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">
                      Declare an admin off-day or emergency holiday (e.g. heavy rain, extreme weather, special administrative holiday).
                    </p>
                  </button>
                </div>
              </div>

              {/* Target Date, Scope, Sub-Scope */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span>Target Date *</span>
                  </label>
                  <Input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                  />
                </div>

                {/* Scope Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span>Applied Scope *</span>
                  </label>
                  <Select
                    value={overrideScope}
                    onValueChange={(val: any) => {
                      setOverrideScope(val);
                      setOverrideDeptId("");
                      setOverrideLocId("");
                      setOverrideEmpId("");
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                      <SelectValue placeholder="Select target scope" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="ALL">All Employees (Global)</SelectItem>
                      <SelectItem value="DEPARTMENT">Specific Department</SelectItem>
                      <SelectItem value="LOCATION">Specific Location / Branch</SelectItem>
                      <SelectItem value="EMPLOYEE">Specific Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-scope target selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {overrideScope === "DEPARTMENT" && "Select Department *"}
                    {overrideScope === "LOCATION" && "Select Location / Branch *"}
                    {overrideScope === "EMPLOYEE" && "Select Employee *"}
                    {overrideScope === "ALL" && "Target Scope"}
                  </label>
                  {overrideScope === "DEPARTMENT" && (
                    <SearchableSelect
                      className="w-full h-10 rounded-xl border-gray-200 dark:border-gray-800 text-xs sm:text-sm bg-white dark:bg-gray-900"
                      popoverClassName="w-[320px] sm:w-[420px] z-[80]"
                      icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
                      placeholder="Choose department..."
                      searchPlaceholder="Search department..."
                      value={overrideDeptId}
                      onValueChange={setOverrideDeptId}
                      options={departments.map((dept) => ({
                        value: String(dept.id),
                        label: dept.title || dept.name,
                      }))}
                    />
                  )}
                  {overrideScope === "LOCATION" && (
                    <SearchableSelect
                      className="w-full h-10 rounded-xl border-gray-200 dark:border-gray-800 text-xs sm:text-sm bg-white dark:bg-gray-900"
                      popoverClassName="w-[320px] sm:w-[420px] z-[80]"
                      icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
                      placeholder="Choose branch / location..."
                      searchPlaceholder="Search location..."
                      value={overrideLocId}
                      onValueChange={setOverrideLocId}
                      options={locations.map((loc) => ({
                        value: String(loc.id),
                        label: loc.name,
                      }))}
                    />
                  )}
                  {overrideScope === "EMPLOYEE" && (
                    <SearchableSelect
                      className="w-full h-10 rounded-xl border-gray-200 dark:border-gray-800 text-xs sm:text-sm bg-white dark:bg-gray-900"
                      popoverClassName="w-[320px] sm:w-[420px] z-[80]"
                      icon={<User className="w-3.5 h-3.5 text-gray-400" />}
                      placeholder="Choose employee..."
                      searchPlaceholder="Search employee by name or ID..."
                      value={overrideEmpId}
                      onValueChange={setOverrideEmpId}
                      options={employees.map((emp) => {
                        const empCode = emp.employeeId ? ` (${emp.employeeId})` : "";
                        const deptTitle = emp.department?.title || (typeof emp.department === "string" ? emp.department : "");
                        return {
                          value: String(emp.id),
                          label: `${emp.firstName} ${emp.lastName || ""}${empCode}`.trim(),
                          sublabel: deptTitle ? `Dept: ${deptTitle}` : undefined,
                        };
                      })}
                    />
                  )}
                  {overrideScope === "ALL" && (
                    <div className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100/70 dark:bg-gray-800/40 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      Applies to all registered staff members
                    </div>
                  )}
                </div>
              </div>

              {/* Reason & Action Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Override Reason / Description *
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex-1 w-full">
                    <Input
                      placeholder="e.g., Sunday Sprint for product launch / Heavy rain emergency holiday"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="h-10 text-xs sm:text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {editingOverrideId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetOverrideForm}
                        className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      disabled={savingOverride}
                      onClick={handleSaveDayOverride}
                      className={`h-10 px-5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all gap-2 ${
                        editingOverrideId
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {savingOverride ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{editingOverrideId ? "Updating..." : "Saving..."}</span>
                        </>
                      ) : editingOverrideId ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Update Day Override</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Apply Day Override</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  💡 This reason will be displayed in employee tooltips, shift calendar, and monthly attendance audit reports.
                </p>
              </div>
            </div>

            {/* 2. Configured Overrides Table Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-indigo-500" />
                    <span>Configured Overrides</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {dayOverridesList.length}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Active day overrides applied to the attendance calculation engine
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDayOverrides}
                  disabled={loadingOverrides}
                  className="h-8 text-xs px-3 rounded-lg border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingOverrides ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {loadingOverrides ? (
                <div className="text-center py-10 text-xs text-gray-400 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading active overrides...
                </div>
              ) : dayOverridesList.length === 0 ? (
                <div className="text-center py-10 bg-gray-50/60 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">No active day overrides configured</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Use the configuration form above to schedule a work day or off day override.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xs bg-white dark:bg-gray-900">
                  <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/80 dark:bg-gray-800/60 sticky top-0 z-10 backdrop-blur-xs">
                        <TableRow className="border-b border-gray-200 dark:border-gray-800">
                          <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            Target Date
                          </TableHead>
                          <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            Override Type
                          </TableHead>
                          <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            Target Scope
                          </TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            Reason / Remarks
                          </TableHead>
                          <TableHead className="w-[150px] text-right text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayOverridesList.map((item) => {
                          const isEditingThis = editingOverrideId === item.id;
                          return (
                            <TableRow
                              key={item.id}
                              className={`transition-colors border-b border-gray-100 dark:border-gray-800/80 ${
                                isEditingThis
                                  ? "bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500/50"
                                  : "hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                              }`}
                            >
                              {/* Date */}
                              <TableCell className="py-3 font-semibold text-xs text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span>{format(new Date(`${item.date}T00:00:00`), "MMM d, yyyy")}</span>
                                </div>
                              </TableCell>

                              {/* Override Type */}
                              <TableCell className="py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                                    item.type === "WORK_DAY"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                      : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                                  }`}
                                >
                                  {item.type === "WORK_DAY" ? "⚡ ON (Work Day)" : "🏖️ OFF (Holiday)"}
                                </span>
                              </TableCell>

                              {/* Target Scope */}
                              <TableCell className="py-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-medium inline-flex items-center gap-1">
                                    {item.scope === "ALL" && (
                                      <>
                                        <Globe className="w-3 h-3 text-gray-500" />
                                        <span>All Employees</span>
                                      </>
                                    )}
                                    {item.scope === "DEPARTMENT" && (
                                      <>
                                        <Building2 className="w-3 h-3 text-indigo-500" />
                                        <span>Dept: {item.departmentTitle || item.departmentId}</span>
                                      </>
                                    )}
                                    {item.scope === "LOCATION" && (
                                      <>
                                        <MapPin className="w-3 h-3 text-emerald-500" />
                                        <span>Branch: {item.companyName || item.companyId}</span>
                                      </>
                                    )}
                                    {item.scope === "EMPLOYEE" && (
                                      <>
                                        <User className="w-3 h-3 text-blue-500" />
                                        <span>Employee: {item.employeeName || item.employeeId}</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Reason */}
                              <TableCell className="py-3 text-xs text-gray-600 dark:text-gray-300">
                                <span className="italic">"{item.reason}"</span>
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartEditOverride(item)}
                                    className={`h-7 px-2.5 text-xs font-semibold rounded-lg transition-colors gap-1 ${
                                      isEditingThis
                                        ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 hover:text-white"
                                        : "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                    }`}
                                    title="Edit this override"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteDayOverride(item.id)}
                                    className="h-7 px-2 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 rounded-lg transition-colors gap-1"
                                    title="Delete this override"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};