//@ts-nocheck

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getEditWindow, timeOnRecordDate, isInsideWindow, windowLabel } from '../utils/shiftWindow';
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
import { attendanceAPI, departmentAPI, employeeAPI, entityAPI, locationAPI } from '../services/api';
import { deviceService } from '../services/device.service';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { avatarColor } from '../utils/avatar';
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

import { timeRange12h } from "../utils/time";
import { DatePicker } from "../components/ui/date-picker";
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
    cell: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900 font-semibold transition-colors",
    dot: "bg-emerald-500",
    tooltip: "bg-emerald-900 text-white border-emerald-700",
  },
  LATE: {
    label: "Tardy",
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    cell: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900 font-semibold transition-colors",
    dot: "bg-amber-500",
    tooltip: "bg-amber-900 text-white border-amber-700",
  },
  TARDY: {
    label: "Tardy",
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    cell: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900 font-semibold transition-colors",
    dot: "bg-amber-500",
    tooltip: "bg-amber-900 text-white border-amber-700",
  },
  ABSENT: {
    label: "Absent",
    badge: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    cell: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900 font-semibold transition-colors",
    dot: "bg-rose-500",
    tooltip: "bg-rose-900 text-white border-rose-700",
  },
  LEAVE: {
    label: "Leave",
    badge: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    cell: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900 font-semibold transition-colors",
    dot: "bg-sky-500",
    tooltip: "bg-sky-900 text-white border-sky-700",
  },
  OFF_DAY: {
    label: "Off Day",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
    cell: "bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-100 dark:bg-gray-900/60 dark:text-gray-500 dark:ring-gray-800 font-medium transition-colors",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  },
  OFF: {
    label: "Off Day",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
    cell: "bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-100 dark:bg-gray-900/60 dark:text-gray-500 dark:ring-gray-800 font-medium transition-colors",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  },
  UPCOMING_DAY: {
    label: "Upcoming",
    badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800",
    cell: "bg-transparent text-gray-300 ring-1 ring-inset ring-dashed ring-gray-200 dark:text-gray-600 dark:ring-gray-800 font-medium transition-colors",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  },
  UPCOMING: {
    label: "Upcoming",
    badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800",
    cell: "bg-transparent text-gray-300 ring-1 ring-inset ring-dashed ring-gray-200 dark:text-gray-600 dark:ring-gray-800 font-medium transition-colors",
    dot: "bg-slate-400",
    tooltip: "bg-slate-900 text-white border-slate-700",
  }
};


const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  TARDY: "Tardy",
  LATE: "Tardy",
  ABSENT: "Absent",
  LEAVE: "Leave",
  OFF_DAY: "Off Day",
  OFF: "Off Day",
  UPCOMING_DAY: "Upcoming",
  UPCOMING: "Upcoming",
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

  const prevDateStr = format(subDays(new Date(date), 1), "yyyy-MM-dd");
  const nextDateStr = format(addDays(new Date(date), 1), "yyyy-MM-dd");
  const checkInDateStr = record?.checkInTime ? getFormattedDateStr(record.checkInTime) : null;
  const isCheckInOnShift =
    checkInDateStr === targetDateStr ||
    (checkInDateStr === prevDateStr && !isEmpDayOff) ||
    (checkInDateStr === nextDateStr && !isEmpDayOff);
  const hasActualCheckInOnThisDate = Boolean(
    record?.checkInTime &&
    isCheckInOnShift &&
    (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(String(record.status).toUpperCase())))
  );

  const isToday = isSameDay(date, new Date());
  const sched = getEmployeeScheduleForDate(emp?.Schedule, date, record);
  const sTime = sched?.startTime || "09:00";
  const [sh, sm] = sTime.split(":").map(Number);
  const shiftStartTotalMins = (!isNaN(sh) ? sh : 9) * 60 + (!isNaN(sm) ? sm : 0);
  const currentNowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const shiftNotStartedYet = isToday && currentNowMins < shiftStartTotalMins;

  let defaultStatus = "ABSENT";
  if (isEmpDayOff && !hasActualCheckInOnThisDate) {
    defaultStatus = "OFF_DAY";
  } else if ((isFutureDate || shiftNotStartedYet || record?.status === "UPCOMING_DAY") && !hasActualCheckInOnThisDate) {
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
    const shiftStartTotalMins = (!isNaN(sh) ? sh : 9) * 60 + (!isNaN(sm) ? sm : 0);
    const adjustedInMins = checkInDateStr === nextDateStr ? inTotalMins + 1440 : inTotalMins;
    const diffFromStart = adjustedInMins - shiftStartTotalMins;

    if (diffFromStart > graceMinutes) {
      rawStatus = "TARDY";
    } else if (rawStatus === "LATE" || rawStatus === "TARDY" || !rawStatus || rawStatus === "ABSENT") {
      rawStatus = "PRESENT";
    }
  } else if (isEmpDayOff && rawStatus !== "LEAVE") {
    rawStatus = "OFF_DAY";
  } else if (!rawStatus || rawStatus === "ABSENT") {
    rawStatus = defaultStatus;
  }

  const isOffDayRow = rawStatus === "OFF_DAY" || (isEmpDayOff && rawStatus !== "LEAVE");
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

// Read-only list of raw device punches, shared by the View panel and the Edit dialog
const PunchLogs: React.FC<{ punches?: any[] }> = ({ punches }) => (
  <div>
    <div className="flex items-center justify-between mb-2.5">
      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
        <Fingerprint className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>Punch Logs ({punches?.length || 0})</span>
      </h4>
      <span className="text-[11px] text-gray-400 font-mono">
        Real-time Device Logs
      </span>
    </div>

    {punches?.length ? (
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950 shadow-2xs">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {punches.map((punch: any, idx: number) => {
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
);

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
  // times saved when the edit modal opened – unchanged values are not re-validated
  const editOriginalRef = useRef<{ in: any; out: any }>({ in: null, out: null });
  const [viewPanelOpen, setViewPanelOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const [report, setReport] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [locationId, setLocationId] = useState<string>(() => localStorage.getItem("selectedLocation") || "all");
  const [companyId, setCompanyId] = useState<string>();
  const [entityId, setEntityId] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
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
  }, [activeTab, selectedDate, departmentId, locationId, entityId, selectedEmployeeId, statusFilter]);

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
        entityId,
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

  const getRecordWindow = (rec: any) => {
    if (!rec) return null;
    const sched = rec.schedule || rec.employee?.Schedule || report.find((e: any) => e.id === rec.employeeId)?.Schedule;
    return getEditWindow(sched, rec.date);
  };

  const getEditTimeError = (rec: any) => {
    if (!rec) return null;
    const win = getRecordWindow(rec);
    const sameAsSaved = (v: any, o: any) => v && o && new Date(v).getTime() === new Date(o).getTime();
    const label = win ? windowLabel(win) : "";
    if (rec.checkInTime && !sameAsSaved(rec.checkInTime, editOriginalRef.current.in) && !isInsideWindow(rec.checkInTime, win)) {
      return `Check-in must be between ${label}.`;
    }
    if (rec.checkOutTime && !sameAsSaved(rec.checkOutTime, editOriginalRef.current.out) && !isInsideWindow(rec.checkOutTime, win)) {
      return `Check-out must be between ${label}.`;
    }
    if (rec.checkInTime && rec.checkOutTime && new Date(rec.checkOutTime).getTime() <= new Date(rec.checkInTime).getTime()) {
      return "Check-out must be after check-in.";
    }
    return null;
  };

  useEffect(() => {
    if (editModalOpen) {
      editOriginalRef.current = { in: selectedRecord?.checkInTime || null, out: selectedRecord?.checkOutTime || null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModalOpen]);

  const handleSaveAttendance = async () => {
    const timeError = getEditTimeError(selectedRecord);
    if (timeError) {
      toast.error(timeError);
      return;
    }
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

    const prevCellDateStr = format(subDays(cellDate, 1), "yyyy-MM-dd");
    const nextCellDateStr = format(addDays(cellDate, 1), "yyyy-MM-dd");

    let effCellCheckIn = record?.checkInTime ?? null;
    let effCellCheckOut = record?.checkOutTime ?? null;
    if (!effCellCheckIn && record?.punches?.length) {
      const pIn = record.punches.find((p: any) => p.type === "CHECK_IN");
      if (pIn) effCellCheckIn = pIn.punchTime;
    }
    if (!effCellCheckOut && record?.punches?.length) {
      const pOut = [...record.punches].reverse().find((p: any) => p.type === "CHECK_OUT");
      if (pOut) effCellCheckOut = pOut.punchTime;
    }

    const checkInDateStr = effCellCheckIn ? getFormattedDateStr(effCellCheckIn) : null;
    const checkOutDateStr = effCellCheckOut ? getFormattedDateStr(effCellCheckOut) : null;

    const isCellCheckInOnShift =
      checkInDateStr === cellDateStr ||
      (checkInDateStr === prevCellDateStr && !isEmpDayOff) ||
      (checkInDateStr === nextCellDateStr && !isEmpDayOff);
    const isCellCheckOutOnShift = checkOutDateStr === cellDateStr || checkOutDateStr === nextCellDateStr;

    const hasActualCheckInOnThisDate = Boolean(
      effCellCheckIn &&
      isCellCheckInOnShift &&
      (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(record.status.toUpperCase())))
    );

    const isToday = isSameDay(day, new Date());
    const daySchedule = getEmployeeScheduleForDate(emp?.Schedule, day, record);
    const sTime = daySchedule?.startTime || "09:00";
    const [sh, sm] = sTime.split(":").map(Number);
    const shiftStartTotalMins = (!isNaN(sh) ? sh : 9) * 60 + (!isNaN(sm) ? sm : 0);
    const currentNowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const shiftNotStartedYet = isToday && currentNowMins < shiftStartTotalMins;

    let defaultStatus = "ABSENT";
    if (isEmpDayOff && !hasActualCheckInOnThisDate) {
      defaultStatus = "OFF_DAY";
    } else if ((isFutureDay || shiftNotStartedYet || record?.status === "UPCOMING_DAY") && !hasActualCheckInOnThisDate) {
      defaultStatus = "UPCOMING_DAY";
    }

    let rawStatus = record?.status;
    if (rawStatus === "LATE") rawStatus = "TARDY";

    if (effCellCheckIn && !isEmpDayOff && rawStatus !== "LEAVE") {
      const daySchedule = getEmployeeScheduleForDate(emp?.Schedule, day, record);
      const graceMinutes = daySchedule?.allowEarlyIn ? (Number(daySchedule.earlyInMinutes) || 0) : 0;
      const sTime = daySchedule?.startTime || "09:00";
      const [sh, sm] = sTime.split(":").map(Number);
      const inDate = new Date(effCellCheckIn);
      const inTotalMins = inDate.getHours() * 60 + inDate.getMinutes();
      const shiftStartTotalMins = (!isNaN(sh) ? sh : 9) * 60 + (!isNaN(sm) ? sm : 0);
      const adjustedInMins = checkInDateStr === nextCellDateStr ? inTotalMins + 1440 : inTotalMins;
      const diffFromStart = adjustedInMins - shiftStartTotalMins;

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

    const isOffCell = rawStatus === "OFF_DAY" || (isEmpDayOff && rawStatus !== "LEAVE");
    const cellCheckIn = isCellCheckInOnShift ? effCellCheckIn : null;
    const cellCheckOut = isCellCheckOutOnShift ? effCellCheckOut : null;

    let cellWorkedMins = record?.totalWorkedMinutes ?? 0;
    if (!isOffCell && cellCheckIn && cellCheckOut && (!cellWorkedMins || cellWorkedMins === 0)) {
      const inT = new Date(cellCheckIn).getTime();
      const outT = new Date(cellCheckOut).getTime();
      if (outT > inT) {
        cellWorkedMins = Math.max(0, Math.min(660, Math.floor((outT - inT) / 60000) - (record?.totalBreakMinutes || 0)));
      }
    } else if (!isOffCell && cellCheckIn && !cellCheckOut && isSameDay(day, new Date())) {
      const inMs = new Date(cellCheckIn).getTime();
      const nowMs = Date.now();
      if (nowMs > inMs) {
        const diffMins = Math.floor((nowMs - inMs) / 60000);
        cellWorkedMins = Math.max(0, Math.min(diffMins, 660) - (record?.totalBreakMinutes || 0));
      }
    }

    const finalRecord = {
      id: record?.id ?? null,
      date: record?.date ?? day,
      checkInTime: cellCheckIn,
      checkOutTime: cellCheckOut,
      totalWorkedMinutes: cellWorkedMins,
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
        className={`relative ${isTooltipDisabled && !finalRecord.overrideType ? "cursor-default select-none" : "cursor-pointer transition-all hover:shadow-sm"} ${
          isUserMonthly
            ? "w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
            : "rounded-lg px-1 py-0.5"
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
          <div className="flex flex-col items-center justify-center min-h-[30px] px-0.5">
            {activeTab !== "monthly" ? (
              <span className="text-xs font-semibold tracking-tight tabular-nums whitespace-nowrap">
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
      const [dept, loc, emp, ent] = await Promise.all([
        departmentAPI.getDepartments(),
        locationAPI.getLocations(),
        employeeAPI.getEmployees(),
        entityAPI.getEntities().catch(() => ({ data: [] })),
      ]);

      setDepartments(dept.data || []);
      setLocations(loc.data || []);
      setEntities(ent.data || []);
      setEmployees((emp.data || []).filter((e: any) => e.role !== 'ADMIN' && e.role !== 'admin'));
    }
  };

  const changeLocation = (val: string) => {
    setLocationId(val);
    localStorage.setItem("selectedLocation", val);
    localStorage.setItem("dashboard-selected-location", val);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: val }));
  };

  const isSet = (v?: string) => Boolean(v) && v !== "all";

  // Active filters shown as removable tags under the filter bar
  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string; clear: () => void }[] = [];
    if (isSet(departmentId)) {
      const d = departments.find((x) => String(x.id) === String(departmentId));
      tags.push({ key: "department", label: `Department: ${d?.title || departmentId}`, clear: () => setDepartmentId("all") });
    }
    if (isSet(locationId)) {
      const l = locations.find((x) => String(x.id) === String(locationId));
      tags.push({ key: "location", label: `Location: ${l?.name || locationId}`, clear: () => changeLocation("all") });
    }
    if (isSet(entityId)) {
      const en = entities.find((x) => String(x.id) === String(entityId));
      tags.push({ key: "entity", label: `Entity: ${en?.name || entityId}`, clear: () => setEntityId("all") });
    }
    if (isSet(selectedEmployeeId)) {
      const e = employees.find((x) => String(x.id) === String(selectedEmployeeId));
      tags.push({
        key: "employee",
        label: `Employee: ${e ? `${e.firstName} ${e.lastName || ""}`.trim() : selectedEmployeeId}`,
        clear: () => setSelectedEmployeeId("all"),
      });
    }
    if (isSet(statusFilter)) {
      tags.push({ key: "status", label: `Status: ${statusFilter.replace("_", " ").toLowerCase()}`, clear: () => setStatusFilter("all") });
    }
    return tags;
  }, [departmentId, locationId, entityId, selectedEmployeeId, statusFilter, departments, locations, entities, employees]);

  const clearAllFilters = () => {
    setDepartmentId("all");
    changeLocation("all");
    setEntityId("all");
    setSelectedEmployeeId("all");
    setStatusFilter("all");
  };

  useEffect(() => {
    loadReport();

    // ⚡ Live polling every 30 seconds, paused while the browser tab is hidden
    const interval = setInterval(() => {
      if (!document.hidden) loadReport(false);
    }, 30000);

    // ⚡ Real-time event listener for immediate clock-in/out or punch sync
    const handleAttendanceUpdate = () => {
      loadReport(false);
    };
    const handleVisibility = () => {
      if (!document.hidden) loadReport(false);
    };
    window.addEventListener("attendance-updated", handleAttendanceUpdate);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("attendance-updated", handleAttendanceUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeTab, selectedDate, departmentId, locationId, entityId, selectedEmployeeId]);
  
  const loadReport = async (showFeedback = false) => {
    try {
      if (showFeedback) setRefreshing(true);
      const res = await attendanceAPI.getAttendanceReport({
        view: activeTab,
        date: selectedDate,
        departmentId,
        locationId,
        entityId,
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
      const targetDateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await deviceService.syncAllDevices(targetDateStr);
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
        const isCheckInOnShift = checkInDateStr === dayStr || (checkInDateStr === format(subDays(cellDate, 1), "yyyy-MM-dd") && !isEmpDayOff);
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
        let workedMins = isWorkingStatus ? (Number(record?.totalWorkedMinutes) || 0) : 0;
        if (isWorkingStatus && record?.checkInTime && record?.checkOutTime && (!workedMins || workedMins === 0)) {
          const inT = new Date(record.checkInTime).getTime();
          const outT = new Date(record.checkOutTime).getTime();
          if (outT > inT) workedMins = Math.max(0, Math.floor((outT - inT) / 60000) - (record?.totalBreakMinutes || 0));
        } else if (isWorkingStatus && record?.checkInTime && !record?.checkOutTime && isSameDay(day, new Date())) {
          const diffMins = Math.floor((Date.now() - new Date(record.checkInTime).getTime()) / 60000);
          if (diffMins > 0) workedMins = Math.max(0, Math.min(diffMins, 900) - (record?.totalBreakMinutes || 0));
        }
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
      <div className="w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        {/* Scrollable container with sticky headers and sticky employee column */}
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
              <tr>
                {/* Employee column – sticky left */}
                <th
                  scope="col"
                  className="sticky left-0 z-40 bg-gray-50 px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px] md:min-w-[230px] dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <span>Employee</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-gray-200/70 text-gray-600 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-bold tabular-nums">{filteredReport.length}</span>
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
                      className={`px-1 py-2 text-center text-xs font-medium border-r border-gray-100 dark:border-gray-800 ${
                        isMonthly 
                          ? (user?.role === 'USER' ? 'min-w-[42px]' : 'min-w-[46px]') 
                          : 'min-w-[96px]'
                      } transition-colors ${
                        isToday 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' 
                          : isWeekend 
                          ? 'bg-gray-100/70 text-gray-500 dark:bg-gray-900/60 dark:text-gray-400' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {format(day, "EEE")}
                        </span>
                        <span className={`text-xs font-bold mt-0.5 rounded-full w-6 h-6 flex items-center justify-center tabular-nums ${
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
                  className="sticky right-0 z-40 bg-gray-50 px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-200 min-w-[104px] dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800"
                >
                  Total Hours
                </th>
              </tr>
            </thead>
  
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950">
              {paginatedReport.map((emp) => {
                const totalMinutes = days.reduce((sum: number, day: Date) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const record = findAttendanceRecord(emp.Attendance || emp.attendance, dayStr);

                  const cellDate = new Date(`${dayStr}T00:00:00`);
                  const isFutureDay = isAfter(startOfDay(cellDate), startOfDay(new Date()));
                  const isEmpDayOff = isScheduleOffDay(emp?.Schedule, cellDate);
                  const checkInDateStr = record?.checkInTime ? getFormattedDateStr(record.checkInTime) : null;
                  const isCheckInOnShift = checkInDateStr === dayStr || (checkInDateStr === format(subDays(cellDate, 1), "yyyy-MM-dd") && !isEmpDayOff);
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
                  let workedMins = isWorkingStatus ? (Number(record?.totalWorkedMinutes) || 0) : 0;
                  if (isWorkingStatus && record?.checkInTime && record?.checkOutTime && (!workedMins || workedMins === 0)) {
                    const inT = new Date(record.checkInTime).getTime();
                    const outT = new Date(record.checkOutTime).getTime();
                    if (outT > inT) workedMins = Math.max(0, Math.floor((outT - inT) / 60000) - (record?.totalBreakMinutes || 0));
                  } else if (isWorkingStatus && record?.checkInTime && !record?.checkOutTime && isSameDay(day, new Date())) {
                    const diffMins = Math.floor((Date.now() - new Date(record.checkInTime).getTime()) / 60000);
                    if (diffMins > 0) workedMins = Math.max(0, Math.min(diffMins, 900) - (record?.totalBreakMinutes || 0));
                  }
                  const otHours = Number(record?.overtimeHours) || 0;
                  const otMins = record?.overtimeMinutes ? Number(record?.overtimeMinutes) : Math.round(otHours * 60);

                  return sum + workedMins + otMins;
                }, 0);
                
                return (
                  <tr key={emp.id} className="group hover:bg-slate-50 dark:hover:bg-gray-900 transition-colors">
                    {/* Employee cell – sticky left */}
                    <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 dark:group-hover:bg-gray-900 px-4 py-2.5 border-r border-gray-200 dark:bg-gray-950 dark:border-gray-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${avatarColor(`${emp.firstName} ${emp.lastName || ""}`)}`}>
                          {emp.firstName?.charAt(0)}{(emp.lastName || "").charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{emp.firstName} {emp.lastName || ""}</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {[emp.employeeId, emp.department?.title || (typeof emp.department === "string" ? emp.department : "")].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </div>
                      </div>
                    </td>
  
                    {/* Date cells */}
                    {days.map((day) => {
                      const record = findAttendanceRecord(emp.Attendance || emp.attendance, format(day, "yyyy-MM-dd"));
  
                      return (
                        <td
                          key={day.toISOString()}
                          className={`px-1 py-2 text-center border-r border-gray-50 dark:border-gray-900 ${
                            isMonthly ? 'min-w-[46px]' : 'min-w-[96px]'
                          } ${isSameDay(day, new Date()) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}
                        >
                          {renderAttendanceCell(record, day, emp)}
                        </td>
                      );
                    })}
  
                    {/* Total cell – sticky right */}
                    <td className="sticky right-0 z-20 bg-white group-hover:bg-slate-50 dark:group-hover:bg-gray-900 px-4 py-2.5 text-center border-l border-gray-200 dark:bg-gray-950 dark:border-gray-800">
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Attendance Management</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Track, edit, and audit daily, weekly, and monthly employee timesheets effortlessly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
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
              <span>Settings</span>
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
            <span>{syncingMachine ? "Syncing..." : "Sync"}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={exporting}
            onClick={handleExportExcel}
            className="shrink-0 h-9 px-3 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs rounded-xl transition-all whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Main Filter & Content Card */}
      <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="@container">
          <div className="flex flex-col @6xl:flex-row @6xl:items-center gap-2.5">
            {/* Filters: equal-width grid, single row on wide screens */}
            <div className={`flex-1 min-w-0 grid gap-2.5 grid-cols-2 @xl:grid-cols-3 ${user?.role === "ADMIN" ? "@3xl:grid-cols-5" : ""}`}>
            {user?.role === "ADMIN" && (
              <>
                <SearchableSelect
                  className="w-full min-w-0 h-9 rounded-xl"
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
                  className="w-full min-w-0 h-9 rounded-xl"
                  icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="Location"
                  searchPlaceholder="Search location..."
                  value={locationId}
                  onValueChange={changeLocation}
                  options={[
                    { value: "all", label: "All Locations" },
                    ...locations.map((l) => ({
                      value: String(l.id),
                      label: l.name,
                    })),
                  ]}
                />

                <SearchableSelect
                  className="w-full min-w-0 h-9 rounded-xl"
                  icon={<Globe className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="Entity"
                  searchPlaceholder="Search entity..."
                  value={entityId}
                  onValueChange={(val) => {
                    setEntityId(val);
                    setSelectedEmployeeId("all");
                  }}
                  options={[
                    { value: "all", label: "All Entities" },
                    ...entities.map((en) => ({
                      value: String(en.id),
                      label: en.name,
                    })),
                  ]}
                />

                <SearchableSelect
                  className="w-full min-w-0 h-9 rounded-xl"
                  icon={<User className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="All Employees"
                  searchPlaceholder="Search employee..."
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  options={[
                    { value: "all", label: "All Employees" },
                    ...employees
                      .filter((emp) => entityId === "all" || String(emp.entityId) === entityId)
                      .map((emp) => ({
                      value: String(emp.id),
                      label: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                    })),
                  ]}
                />
              </>
            )}

            {/* Attendance Status Filter */}
            <SearchableSelect
              className="w-full min-w-0 h-9 rounded-xl"
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
          </div>
          </div>

          {activeFilterTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              {activeFilterTags.map((tag) => (
                <span
                  key={tag.key}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900 capitalize"
                >
                  {tag.label}
                  <button
                    type="button"
                    onClick={tag.clear}
                    className="p-0.5 rounded-full hover:bg-blue-200/70 dark:hover:bg-blue-900"
                    aria-label={`Remove ${tag.key} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 transition-colors"
                title="Clear all filters"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {user?.role !== 'USER' ? (
                <TabsList className="grid w-full grid-cols-3 max-w-md bg-gray-100/80 dark:bg-gray-900 p-1 rounded-xl">
                  <TabsTrigger 
                    value="daily" 
                    className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:shadow-sm transition-all"
                  >
                    Daily
                  </TabsTrigger>
                  <TabsTrigger 
                    value="weekly" 
                    className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:shadow-sm transition-all"
                  >
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger 
                    value="monthly" 
                    className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:shadow-sm transition-all"
                  >
                    Monthly
                  </TabsTrigger>
                </TabsList>
              ) : <span />}

              {/* Date controls – right of the view tabs */}
                <div className="flex items-center gap-2 shrink-0">
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
                <div className="inline-flex items-center gap-2 shrink-0">
                  <DatePicker
                    size="sm"
                    required
                    align="end"
                    side="bottom"
                    lockSide
                    value={selectedDate}
                    max={new Date()}
                    displayFormat={
                      activeTab === "daily"
                        ? "dd MMM yyyy"
                        : activeTab === "weekly"
                        ? "'Week of' dd MMM yyyy"
                        : "MMMM yyyy"
                    }
                    onDateChange={(date) => {
                      if (!date) return;
                      if (isAfter(startOfDay(date), startOfDay(new Date()))) return;
                      setSelectedDate(date);
                      if (activeTab === "weekly") setWeekOffset(0);
                      if (activeTab === "monthly") setMonthOffset(0);
                    }}
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
                </div>
            </div>

            {/* Legend - Only show in Weekly and Monthly views, positioned in the next row */}
            {activeTab !== 'daily' && (
              <div className="flex items-center gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 ring-1 ring-emerald-300 inline-block"></span>
                  <span className="font-medium">Present (P)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300 inline-block"></span>
                  <span className="font-medium">Tardy (T)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-100 ring-1 ring-rose-300 inline-block"></span>
                  <span className="font-medium">Absent (A)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-100 ring-1 ring-sky-300 inline-block"></span>
                  <span className="font-medium">Leave (L)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-100 ring-1 ring-gray-200 inline-block"></span>
                  <span className="font-medium">Off Day (O)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded ring-1 ring-dashed ring-gray-300 inline-block"></span>
                  <span className="font-medium">Upcoming (U)</span>
                </div>
              </div>
            )}

            {/* ── DAILY VIEW ────────────────────────────────────────────────── */}
            <TabsContent value="daily" className="mt-0 space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
                {/* Table toolbar: which day + how many rows */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {format(selectedDate, "EEEE, d MMMM yyyy")}
                    </span>
                    {isSameDay(selectedDate, new Date()) && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {totalEmployees} {totalEmployees === 1 ? "employee" : "employees"}
                  </span>
                </div>

                <Table className="min-w-[860px]">
                  <TableHeader className="bg-gray-50/80 dark:bg-gray-900/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 pl-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Check In</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Check Out</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Worked</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overtime</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</TableHead>
                      <TableHead className="h-10 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</TableHead>
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

                      const prevDateStr = format(subDays(selectedDate, 1), "yyyy-MM-dd");
                      const nextDateStr = format(addDays(selectedDate, 1), "yyyy-MM-dd");

                      let effCheckIn = record?.checkInTime ?? null;
                      let effCheckOut = record?.checkOutTime ?? null;
                      if (!effCheckIn && record?.punches?.length) {
                        const pIn = record.punches.find((p: any) => p.type === "CHECK_IN");
                        if (pIn) effCheckIn = pIn.punchTime;
                      }
                      if (!effCheckOut && record?.punches?.length) {
                        const pOut = [...record.punches].reverse().find((p: any) => p.type === "CHECK_OUT");
                        if (pOut) effCheckOut = pOut.punchTime;
                      }

                      const checkInDateStr = effCheckIn ? getFormattedDateStr(effCheckIn) : null;
                      const checkOutDateStr = effCheckOut ? getFormattedDateStr(effCheckOut) : null;

                      const isCheckInOnShift =
                        checkInDateStr === targetDateStr ||
                        (checkInDateStr === prevDateStr && !isEmpDayOff) ||
                        (checkInDateStr === nextDateStr && !isEmpDayOff);
                      const isCheckOutOnShift = checkOutDateStr === targetDateStr || checkOutDateStr === nextDateStr;

                      const hasActualCheckInOnThisDate = Boolean(
                        effCheckIn &&
                        isCheckInOnShift &&
                        (Number(record?.totalWorkedMinutes) > 0 || (record?.status && ["PRESENT", "LATE", "TARDY"].includes(record.status.toUpperCase())))
                      );

                      const isToday = isSameDay(selectedDate, new Date());
                      const daySchedule = getEmployeeScheduleForDate(emp?.Schedule, selectedDate, record);
                      const sTime = daySchedule?.startTime || "09:00";
                      const [sh, sm] = sTime.split(":").map(Number);
                      const shiftStartTotalMins = (!isNaN(sh) ? sh : 9) * 60 + (!isNaN(sm) ? sm : 0);
                      const currentNowMins = new Date().getHours() * 60 + new Date().getMinutes();
                      const shiftNotStartedYet = isToday && currentNowMins < shiftStartTotalMins;

                      let defaultStatus = "ABSENT";
                      if (isEmpDayOff && !hasActualCheckInOnThisDate) {
                        defaultStatus = "OFF_DAY";
                      } else if ((isFutureDate || shiftNotStartedYet || record?.status === "UPCOMING_DAY") && !hasActualCheckInOnThisDate) {
                        defaultStatus = "UPCOMING_DAY";
                      }

                      let rawStatus = record?.status;
                      if (rawStatus === "LATE") rawStatus = "TARDY";

                      if (effCheckIn && !isEmpDayOff && rawStatus !== "LEAVE") {
                        const daySchedule = getEmployeeScheduleForDate(emp?.Schedule, selectedDate, record);
                        const graceMinutes = daySchedule?.allowEarlyIn ? (Number(daySchedule.earlyInMinutes) || 0) : 0;
                        const sTime = daySchedule?.startTime || "09:00";
                        const [sh, sm] = sTime.split(":").map(Number);
                        const inDate = new Date(effCheckIn);
                        const inTotalMins = inDate.getHours() * 60 + inDate.getMinutes();
                        const shiftStartTotalMins = (!isNaN(sh) ? sh : 9) * 60 + (!isNaN(sm) ? sm : 0);
                        const adjustedInMins = checkInDateStr === nextDateStr ? inTotalMins + 1440 : inTotalMins;
                        const diffFromStart = adjustedInMins - shiftStartTotalMins;

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

                      // Compute real-time elapsed minutes if actively on shift today, OR fallback calculate if both checkIn & checkOut exist
                      let workedMins = record?.totalWorkedMinutes ?? 0;
                      if (effCheckIn && effCheckOut && (!workedMins || workedMins === 0)) {
                        const inMs = new Date(effCheckIn).getTime();
                        const outMs = new Date(effCheckOut).getTime();
                        if (outMs > inMs) {
                          workedMins = Math.max(0, Math.min(660, Math.floor((outMs - inMs) / 60000) - (record?.totalBreakMinutes || 0)));
                        }
                      } else if (effCheckIn && !effCheckOut && isSameDay(selectedDate, new Date())) {
                        const inMs = new Date(effCheckIn).getTime();
                        const nowMs = Date.now();
                        if (nowMs > inMs) {
                          const diffMins = Math.floor((nowMs - inMs) / 60000);
                          workedMins = Math.max(0, Math.min(diffMins, 660) - (record.totalBreakMinutes || 0));
                        }
                      }

                      const isOffDayRow = rawStatus === "OFF_DAY" || (isEmpDayOff && rawStatus !== "LEAVE");
                      const validCheckIn = isCheckInOnShift ? effCheckIn : null;
                      const validCheckOut = isCheckOutOnShift ? effCheckOut : null;

                      const finalRecord = {
                        ...record,
                        id: record?.id ?? null,
                        date: record?.date ?? selectedDate,
                        checkInTime: validCheckIn,
                        checkOutTime: validCheckOut,
                        totalWorkedMinutes: workedMins,
                        totalBreakMinutes: record?.totalBreakMinutes ?? 0,
                        employeeId: record?.employeeId ?? emp.id,
                        employee: emp,
                        schedule: emp?.Schedule,
                        shiftStartTime: record?.shiftStartTime || (Array.isArray(emp?.Schedule) ? emp.Schedule[0]?.startTime : emp?.Schedule?.startTime),
                        shiftEndTime: record?.shiftEndTime || (Array.isArray(emp?.Schedule) ? emp.Schedule[0]?.endTime : emp?.Schedule?.endTime),
                        status: isOffDayRow ? "OFF_DAY" : (rawStatus === "LATE" ? "TARDY" : rawStatus),
                        overtimeHours: otHours,
                        overtimeMinutes: otMins,
                      };

                      const statusCfg = STATUS_CONFIG[finalRecord.status?.toUpperCase()] || STATUS_CONFIG["ABSENT"];

                      return (
                        <TableRow key={emp.id} className="group hover:bg-blue-50/40 dark:hover:bg-gray-900/40 transition-colors">
                          {/* Employee */}
                          <TableCell className="py-3 pl-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${avatarColor(`${emp.firstName} ${emp.lastName || ""}`)}`}>
                                {emp.firstName?.charAt(0)}{(emp.lastName || "").charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {emp.firstName} {emp.lastName || ""}
                                </span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {[emp.employeeId, emp.department?.title || (typeof emp.department === "string" ? emp.department : "")].filter(Boolean).join(" · ") || "—"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Check In */}
                          <TableCell className="py-3">
                            {finalRecord.checkInTime ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {format(new Date(finalRecord.checkInTime), "hh:mm a")}
                                </span>
                                {finalRecord.status === "TARDY" && Number(finalRecord.lateMinutes) > 0 && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 pl-3">
                                    {formatMinutes(Number(finalRecord.lateMinutes))} late
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </TableCell>

                          {/* Check Out */}
                          <TableCell className="py-3">
                            {finalRecord.checkOutTime ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                {format(new Date(finalRecord.checkOutTime), "hh:mm a")}
                              </span>
                            ) : finalRecord.checkInTime && isSameDay(selectedDate, new Date()) ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                <span className="relative flex w-1.5 h-1.5">
                                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </span>
                                On shift
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </TableCell>

                          {/* Worked */}
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className={`text-sm font-semibold tabular-nums ${finalRecord.totalWorkedMinutes > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-300 dark:text-gray-600"}`}>
                                {finalRecord.totalWorkedMinutes > 0 ? formatMinutes(finalRecord.totalWorkedMinutes) : "—"}
                              </span>
                              {finalRecord.shiftStartTime && finalRecord.shiftEndTime && (
                                <span className="text-[11px] text-gray-400 tabular-nums">
                                  Shift {timeRange12h(finalRecord.shiftStartTime, finalRecord.shiftEndTime)}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Overtime */}
                          <TableCell className="py-3">
                            {finalRecord.overtimeMinutes > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                +{formatMinutes(finalRecord.overtimeMinutes)}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusCfg.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot || "bg-gray-400"}`} />
                                {STATUS_LABELS[finalRecord.status?.toUpperCase()] || finalRecord.status}
                              </span>
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

                          {/* Actions */}
                          <TableCell className="py-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                                onClick={() => openViewPanel(finalRecord, emp)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </Button>
                              {user?.role !== 'USER' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950"
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
                        <TableCell colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                            <CalendarX className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            <span className="text-sm font-medium">No attendance found</span>
                            <span className="text-xs text-gray-400">Try another date or clear the filters.</span>
                          </div>
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-0 gap-0">
          {selectedRecord && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-left">
                {(() => {
                  const emp = selectedRecord.employee || report.find((e: any) => e.id === selectedRecord.employeeId);
                  const name = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "";
                  const cfg = STATUS_CONFIG[selectedRecord.status?.toUpperCase()] || STATUS_CONFIG["ABSENT"];
                  return (
                    <div className="flex items-start gap-3 pr-6">
                      {emp && (
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${avatarColor(name)}`}>
                          {emp.firstName?.charAt(0)}{(emp.lastName || "").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          Edit attendance
                        </DialogTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {name || "Employee"}{emp?.employeeId ? ` · ${emp.employeeId}` : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(selectedRecord.date), "EEE, d MMM yyyy")}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot || "bg-gray-400"}`} />
                            {STATUS_LABELS[selectedRecord.status?.toUpperCase()] || selectedRecord.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {user?.role === 'USER' && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 mt-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>You do not have permission to edit your timesheet.</span>
                  </div>
                )}
              </DialogHeader>

              <div className="space-y-5 px-6 pt-5">
                <div className="grid grid-cols-2 gap-3">
                {/* Check In */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Check in
                  </label>
                  <Input
                    type="time"
                    className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
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
                      const newDate = timeOnRecordDate(selectedRecord.date, e.target.value, getRecordWindow(selectedRecord));

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
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Check out
                  </label>
                  <Input
                    type="time"
                    className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
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
                      const newDate = timeOnRecordDate(selectedRecord.date, e.target.value, getRecordWindow(selectedRecord));

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

                </div>

                {(() => {
                  const win = getRecordWindow(selectedRecord);
                  const err = getEditTimeError(selectedRecord);
                  if (!win && !err) return null;
                  return (
                    <div className="-mt-2 space-y-1.5">
                      {win && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Allowed time: <span className="font-semibold text-gray-700 dark:text-gray-300">{windowLabel(win)}</span>
                          {win.overtimeMinutes > 0 ? ` · includes ${formatMinutes(win.overtimeMinutes)} overtime` : " · no overtime allowed"}
                        </p>
                      )}
                      {err && (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Hours Breakdown */}
                {(() => {
                  const otHours = Number(selectedRecord.overtimeHours) || 0;
                  const otMins = selectedRecord.overtimeMinutes ? Number(selectedRecord.overtimeMinutes) : Math.round(otHours * 60);
                  return (
                    <div className={`grid ${otMins > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Total Worked</span>
                        <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          {formatMinutes(selectedRecord.totalWorkedMinutes)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Break Time</span>
                        <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          {formatMinutes(selectedRecord.totalBreakMinutes)}
                        </span>
                      </div>
                      {otMins > 0 && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/40 px-3 py-2.5">
                          <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium block">Overtime</span>
                          <span className="text-base font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                            {formatMinutes(otMins)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Status Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
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
                    <SelectTrigger className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20">
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

                {/* Read-only device punches for this day */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                  <PunchLogs punches={selectedRecord.punches} />
                </div>
              </div>

              <div className="sticky bottom-0 mt-5 flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                <Button
                  variant="outline"
                  className="h-10 rounded-lg"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  disabled={user?.role === 'USER' || Boolean(getEditTimeError(selectedRecord))}
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" 
                  onClick={handleSaveAttendance}
                >
                  Save changes
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Detail Modal Dialog */}
      <Dialog open={viewPanelOpen} onOpenChange={setViewPanelOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
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
              <div>
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-left">
                  <div className="flex items-start gap-3 pr-6">
                    {targetEmp && (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${avatarColor(empFullName)}`}>
                        {targetEmp.firstName?.charAt(0)}{(targetEmp.lastName || "").charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Attendance details
                      </DialogTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {empFullName || "Employee"}{empIdCode ? ` · ${empIdCode}` : ""}{locName ? ` · ${locName}` : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(viewRecord.date), "EEE, d MMM yyyy")}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${(STATUS_CONFIG[viewRecord.status?.toUpperCase()] || STATUS_CONFIG["ABSENT"]).badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${(STATUS_CONFIG[viewRecord.status?.toUpperCase()] || STATUS_CONFIG["ABSENT"]).dot || "bg-gray-400"}`} />
                          {STATUS_LABELS[viewRecord.status?.toUpperCase()] || viewRecord.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                  {/* ── Today's Scheduled Shift Card ────────────────────────── */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Shift schedule
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                      <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Admin Override Reason: </span>
                        <span className="italic text-gray-600 dark:text-gray-400">"{viewRecord.overrideReason}"</span>
                      </div>
                    )}

                    {daySchedule?.isWorkingDay ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs">
                          <div>
                            <span className="text-gray-400 font-medium block text-[11px]">Shift Timing</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                              {daySchedule.startTime12} — {daySchedule.endTime12}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-medium block text-[11px]">Shift Duration</span>
                            <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400 text-sm">
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
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
                        {daySchedule
                          ? `This day (${daySchedule.dayName}) is a scheduled Off Day / Rest Day for this employee.`
                          : "No active schedule assigned to this employee."}
                      </div>
                    )}
                  </div>

                  {/* Summary Grid Box */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Check In</span>
                      <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 text-sm">
                        {viewRecord.checkInTime ? format(new Date(viewRecord.checkInTime), "hh:mm a") : "—"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Check Out</span>
                      <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 text-sm">
                        {viewRecord.checkOutTime ? format(new Date(viewRecord.checkOutTime), "hh:mm a") : "—"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Total Worked</span>
                      <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400 text-sm">
                        {formatMinutes(viewRecord.totalWorkedMinutes)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Break Duration</span>
                      <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 text-sm">
                        {formatMinutes(viewRecord.totalBreakMinutes)}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-4 pt-3 mt-1 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Overtime</span>
                        <span className="font-semibold tabular-nums text-violet-600 dark:text-violet-400 text-sm">
                          {formatMinutes(Math.round(((Number(viewRecord.overtimeHours) || 0) * 60) || Number(viewRecord.overtimeMinutes) || 0))}
                        </span>
                      </div>

                      <div className="space-y-1 col-span-1 sm:col-span-3">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Recent Action</span>
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
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Summary note</h4>
                  <div className="rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-900 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {viewRecord.summary || "No summary provided for this shift."}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Activity timeline</h4>

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
                <PunchLogs punches={viewRecord.punches} />
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                <Button variant="outline" className="h-10 rounded-lg" onClick={() => setViewPanelOpen(false)}>
                  Close
                </Button>
                {user?.role !== 'USER' &&
                  !["OFF_DAY", "OFF", "UPCOMING_DAY", "UPCOMING"].includes(String(viewRecord.status || "").toUpperCase()) &&
                  !isAfter(startOfDay(new Date(viewRecord.date)), startOfDay(new Date())) && (
                  <Button
                    className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg gap-1.5"
                    onClick={() => {
                      setSelectedRecord(viewRecord);
                      setViewPanelOpen(false);
                      setEditModalOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                )}
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
                  <DatePicker
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
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
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20">
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
                      className="h-10 text-xs sm:text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
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