//@ts-nocheck

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Eye,
  Pencil,
  Trash2,
  Search,
  Building2,
  User,
  RefreshCw,
  AlertTriangle,
  Sun,
  Sunset,
  Moon,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { toast } from "sonner";
import { employeeAPI, departmentAPI, locationAPI, scheduleAPI } from "../services/api";

type ShiftType = "day" | "evening" | "night";

const SHIFT_TYPES: {
  id: ShiftType;
  label: string;
  defaultStart: string;
  defaultEnd: string;
  icon: any;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    id: "day",
    label: "Day",
    defaultStart: "09:00",
    defaultEnd: "18:00",
    icon: Sun,
    activeClass: "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/30",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "evening",
    label: "Evening",
    defaultStart: "16:00",
    defaultEnd: "00:00",
    icon: Sunset,
    activeClass: "bg-sky-100 text-sky-900 border-sky-300 ring-2 ring-sky-400/30",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "night",
    label: "Night",
    defaultStart: "23:00",
    defaultEnd: "07:00",
    icon: Moon,
    activeClass: "bg-slate-800 text-white border-slate-900 ring-2 ring-slate-700/50",
    badgeClass: "bg-slate-800 text-white border-slate-700",
  },
];

const DAYS_LIST = [
  { full: "Monday", short: "Mon" },
  { full: "Tuesday", short: "Tue" },
  { full: "Wednesday", short: "Wed" },
  { full: "Thursday", short: "Thu" },
  { full: "Friday", short: "Fri" },
  { full: "Saturday", short: "Sat" },
  { full: "Sunday", short: "Sun" },
];

export const Schedule: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [newScheduleOpen, setNewScheduleOpen] = useState(false);

  // ── Create Schedule Form State ─────────────────────────────────────
  const [scopeType, setScopeType] = useState<
    "individual" | "location" | "department"
  >("individual");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [scopeSearchQuery, setScopeSearchQuery] = useState("");
  const [scopePopoverOpen, setScopePopoverOpen] = useState(false);

  const [selectedDays, setSelectedDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  const [daySchedules, setDaySchedules] = useState<Record<string, { startTime: string; endTime: string }>>({
    Monday: { startTime: "09:00", endTime: "18:00" },
    Tuesday: { startTime: "09:00", endTime: "18:00" },
    Wednesday: { startTime: "09:00", endTime: "18:00" },
    Thursday: { startTime: "09:00", endTime: "18:00" },
    Friday: { startTime: "09:00", endTime: "18:00" },
  });

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [allowEarlyIn, setAllowEarlyIn] = useState(false);
  const [earlyInMinutes, setEarlyInMinutes] = useState(15);
  const [allowEarlyOut, setAllowEarlyOut] = useState(false);
  const [earlyOutMinutes, setEarlyOutMinutes] = useState(15);
  const [overtimeAllowed, setOvertimeAllowed] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState(30);
  const [allowHalfDay, setAllowHalfDay] = useState(false);
  const [halfDayMinutes, setHalfDayMinutes] = useState(240);
  const [breaksAllowed, setBreaksAllowed] = useState(false);
  const [numBreaks, setNumBreaks] = useState(1);
  const [breakDurations, setBreakDurations] = useState<number[]>([15]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [overwriteIds, setOverwriteIds] = useState<number[]>([]);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);

  // ── View Details Modal State ────────────────────────────────────────
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<any>(null);

  // ── Edit Schedule Modal State ────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editShiftType, setEditShiftType] = useState<ShiftType>("day");
  const [editDaySchedules, setEditDaySchedules] = useState<Record<string, { startTime: string; endTime: string }>>({});
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAllowEarlyIn, setEditAllowEarlyIn] = useState(false);
  const [editEarlyInMinutes, setEditEarlyInMinutes] = useState(15);
  const [editAllowEarlyOut, setEditAllowEarlyOut] = useState(false);
  const [editEarlyOutMinutes, setEditEarlyOutMinutes] = useState(15);
  const [editOvertimeAllowed, setEditOvertimeAllowed] = useState(false);
  const [editOvertimeMinutes, setEditOvertimeMinutes] = useState(30);
  const [editAllowHalfDay, setEditAllowHalfDay] = useState(false);
  const [editHalfDayMinutes, setEditHalfDayMinutes] = useState(240);
  const [editBreaksAllowed, setEditBreaksAllowed] = useState(false);
  const [editNumBreaks, setEditNumBreaks] = useState(1);
  const [editBreakDurations, setEditBreakDurations] = useState<number[]>([15]);
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Delete Confirmation Modal State ─────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Create Form when dialog opens
  useEffect(() => {
    if (newScheduleOpen) {
      setScopeType("individual");
      setSelectedItems([]);
      setScopeSearchQuery("");
      setScopePopoverOpen(false);
      setSelectedDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
      setShiftType("day");
      setStartTime("09:00");
      setEndTime("18:00");
      setDaySchedules({
        Monday: { startTime: "09:00", endTime: "18:00" },
        Tuesday: { startTime: "09:00", endTime: "18:00" },
        Wednesday: { startTime: "09:00", endTime: "18:00" },
        Thursday: { startTime: "09:00", endTime: "18:00" },
        Friday: { startTime: "09:00", endTime: "18:00" },
      });
      setSelectedLocation("");
      setAllowEarlyIn(false);
      setEarlyInMinutes(15);
      setAllowEarlyOut(false);
      setEarlyOutMinutes(15);
      setOvertimeAllowed(false);
      setOvertimeMinutes(30);
      setAllowHalfDay(false);
      setHalfDayMinutes(240);
      setBreaksAllowed(false);
      setNumBreaks(1);
      setBreakDurations([15]);
    }
  }, [newScheduleOpen]);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getActiveEmployees();
      setEmployees(res.data || []);
    } catch {
      // ignore
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getDepartments();
      setDepartments(res.data || []);
    } catch {
      // ignore
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await locationAPI.getLocations();
      setLocations(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const loadScopeData = async () => {
      try {
        setLoadingScope(true);
        if (scopeType === "individual") {
          await fetchEmployees();
        } else if (scopeType === "department") {
          await fetchDepartments();
        } else if (scopeType === "location") {
          await fetchLocations();
        }
      } catch (err) {
        toast.error("Failed to load options");
      } finally {
        setLoadingScope(false);
      }
    };

    loadScopeData();
  }, [scopeType]);

  useEffect(() => {
    fetchSchedules();
    fetchLocations();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await scheduleAPI.getSchedules();
      setSchedules(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch schedules");
    } finally {
      setLoading(false);
    }
  };

  const getScopeItems = () => {
    if (scopeType === "individual") return employees;
    if (scopeType === "department") return departments;
    if (scopeType === "location") return locations;
    return [];
  };

  const getFormattedScopeItems = () => {
    const rawItems = getScopeItems() || [];
    return rawItems.map((item: any) => {
      const id = item.id;
      let label = "";
      if (scopeType === "individual") {
        label = `${item.firstName || ""} ${item.lastName || ""}`.trim();
      } else if (scopeType === "department") {
        label = item.title || item.name || "";
      } else {
        label = item.name || item.title || "";
      }
      return { id, label, original: item };
    });
  };

  // Select Shift Type Handler
  const handleSelectShiftType = (type: ShiftType) => {
    setShiftType(type);
    const targetShift = SHIFT_TYPES.find((s) => s.id === type) || SHIFT_TYPES[0];
    setStartTime(targetShift.defaultStart);
    setEndTime(targetShift.defaultEnd);

    // Auto fill default working hours for each selected day
    setDaySchedules((prev) => {
      const updated: Record<string, { startTime: string; endTime: string }> = {};
      DAYS_LIST.forEach((d) => {
        updated[d.full] = {
          startTime: targetShift.defaultStart,
          endTime: targetShift.defaultEnd,
        };
      });
      return updated;
    });
  };

  // Toggle Working Day Selection
  const handleToggleDay = (dayFull: string) => {
    if (selectedDays.includes(dayFull)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayFull));
    } else {
      setSelectedDays([...selectedDays, dayFull]);
      if (!daySchedules[dayFull]) {
        const targetShift = SHIFT_TYPES.find((s) => s.id === shiftType) || SHIFT_TYPES[0];
        setDaySchedules((prev) => ({
          ...prev,
          [dayFull]: {
            startTime: targetShift.defaultStart,
            endTime: targetShift.defaultEnd,
          },
        }));
      }
    }
  };

  // Handle Per-Day Time Editing
  const handleUpdateDayTime = (dayFull: string, field: "startTime" | "endTime", value: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [dayFull]: {
        ...(prev[dayFull] || { startTime: "09:00", endTime: "18:00" }),
        [field]: value,
      },
    }));
  };

  // Filter schedules based on search and location
  const filteredSchedules = schedules?.filter((schedule) => {
    const empName = `${schedule.employee?.firstName || ''} ${schedule.employee?.lastName || ''}`.toLowerCase();
    const companyObj = schedule.company || locations.find(l => String(l.id) === String(schedule.companyId));
    const locName = (companyObj?.name || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      empName.includes(query) ||
      locName.includes(query) ||
      (Array.isArray(schedule.days) && schedule.days.some((d: string) => d.toLowerCase().includes(query)));

    const matchesLocation =
      filterLocation === "all" ||
      String(schedule.companyId || schedule.company?.id) === filterLocation;

    return matchesSearch && matchesLocation;
  });

  // ── Handlers for View, Edit, and Delete ──────────────────────────────
  const handleOpenView = (schedule: any) => {
    setViewingSchedule(schedule);
    setViewModalOpen(true);
  };

  const handleOpenEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    const existingDays = Array.isArray(schedule.days) ? schedule.days : [];
    
    // Map short or full day names
    const mappedDays = existingDays.map((d: string) => {
      const match = DAYS_LIST.find((item) => item.short.toLowerCase() === d.toLowerCase() || item.full.toLowerCase() === d.toLowerCase());
      return match ? match.full : d;
    });

    setEditDays(mappedDays);
    setEditStartTime(schedule.startTime || "09:00");
    setEditEndTime(schedule.endTime || "18:00");
    
    // Set per-day schedules for editing
    const initEditDayScheds: Record<string, { startTime: string; endTime: string }> = {};
    mappedDays.forEach((dayFull: string) => {
      initEditDayScheds[dayFull] = {
        startTime: schedule.startTime || "09:00",
        endTime: schedule.endTime || "18:00",
      };
    });
    setEditDaySchedules(initEditDayScheds);

    setEditLocation(
      schedule.companyId
        ? String(schedule.companyId)
        : schedule.company?.id
        ? String(schedule.company.id)
        : ""
    );
    setEditAllowEarlyIn(Boolean(schedule.allowEarlyIn ?? schedule.allow_early_in));
    setEditEarlyInMinutes(schedule.earlyInMinutes ?? schedule.early_in_minutes ?? 15);
    setEditAllowEarlyOut(Boolean(schedule.allowEarlyOut ?? schedule.allow_early_out));
    setEditEarlyOutMinutes(schedule.earlyOutMinutes ?? schedule.early_out_minutes ?? 15);
    setEditOvertimeAllowed(
      Boolean(
        schedule.overtimeAllowed ??
        schedule.allowOvertime ??
        schedule.overtime_allowed ??
        schedule.allow_overtime ??
        schedule.isOvertime ??
        (schedule.overtimeMinutes && Number(schedule.overtimeMinutes) > 0) ??
        (schedule.overtime_minutes && Number(schedule.overtime_minutes) > 0)
      )
    );
    setEditOvertimeMinutes(
      schedule.overtimeMinutes ??
      schedule.overtime_minutes ??
      (typeof schedule.overtime === "number" ? schedule.overtime : null) ??
      30
    );
    setEditAllowHalfDay(
      Boolean(
        schedule.allowHalfDay ??
        schedule.allow_half_day ??
        schedule.halfDayAllowed ??
        schedule.half_day_allowed ??
        schedule.isHalfDay ??
        (schedule.halfDayMinutes && Number(schedule.halfDayMinutes) > 0) ??
        (schedule.half_day_minutes && Number(schedule.half_day_minutes) > 0)
      )
    );
    setEditHalfDayMinutes(
      schedule.halfDayMinutes ??
      schedule.half_day_minutes ??
      (typeof schedule.halfDay === "number" ? schedule.halfDay : null) ??
      240
    );
    setEditBreaksAllowed(Boolean(schedule.breaksAllowed ?? schedule.breaks_allowed));

    const durs =
      Array.isArray(schedule.breakDurations)
        ? schedule.breakDurations
        : Array.isArray(schedule.break_durations)
        ? schedule.break_durations
        : [15];
    setEditNumBreaks(durs.length);
    setEditBreakDurations(durs);

    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;
    if (!editDays.length) {
      toast.error("Please select at least one working day");
      return;
    }

    try {
      setIsUpdating(true);

      // Convert days to short names for backend compatibility
      const shortDays = editDays.map(d => DAYS_LIST.find(x => x.full === d)?.short || d);
      const firstDayTime = editDaySchedules[editDays[0]] || { startTime: editStartTime, endTime: editEndTime };

      const payload = {
        days: shortDays,
        startTime: firstDayTime.startTime || editStartTime,
        endTime: firstDayTime.endTime || editEndTime,
        companyId: editLocation ? Number(editLocation) : null,
        allowEarlyIn: editAllowEarlyIn,
        earlyInMinutes: editAllowEarlyIn ? editEarlyInMinutes : null,
        allowEarlyOut: editAllowEarlyOut,
        earlyOutMinutes: editAllowEarlyOut ? editEarlyOutMinutes : null,
        overtimeAllowed: editOvertimeAllowed,
        allowOvertime: editOvertimeAllowed,
        overtime_allowed: editOvertimeAllowed,
        overtimeMinutes: editOvertimeAllowed ? editOvertimeMinutes : null,
        overtime_minutes: editOvertimeAllowed ? editOvertimeMinutes : null,
        allowHalfDay: editAllowHalfDay,
        allow_half_day: editAllowHalfDay,
        halfDayAllowed: editAllowHalfDay,
        half_day_allowed: editAllowHalfDay,
        halfDayMinutes: editAllowHalfDay ? editHalfDayMinutes : null,
        half_day_minutes: editAllowHalfDay ? editHalfDayMinutes : null,
        breaksAllowed: editBreaksAllowed,
        breakDurations: editBreaksAllowed ? editBreakDurations : [],
      };

      await scheduleAPI.updateSchedule(editingSchedule.id, payload);

      toast.success("Schedule updated successfully!");

      // Instant Real-Time UI Update
      setSchedules((prev) =>
        prev.map((s) => {
          if (s.id === editingSchedule.id) {
            const updatedCompany =
              locations.find((l) => String(l.id) === String(editLocation)) || s.company;
            return {
              ...s,
              ...payload,
              company: updatedCompany,
            };
          }
          return s;
        })
      );

      setEditModalOpen(false);
      setEditingSchedule(null);
      fetchSchedules(); // sync backend
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update schedule");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDelete = (schedule: any) => {
    setDeletingSchedule(schedule);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSchedule) return;

    try {
      setIsDeleting(true);
      await scheduleAPI.deleteSchedule(deletingSchedule.id);

      toast.success("Schedule deleted successfully!");

      // Instant Real-Time UI Update
      setSchedules((prev) => prev.filter((s) => s.id !== deletingSchedule.id));

      setDeleteModalOpen(false);
      setDeletingSchedule(null);
      fetchSchedules(); // sync backend
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete schedule");
    } finally {
      setIsDeleting(false);
    }
  };

  const currentShiftConfig = SHIFT_TYPES.find((s) => s.id === shiftType) || SHIFT_TYPES[0];
  const CurrentShiftIcon = currentShiftConfig.icon;

  const formattedScopeItems = getFormattedScopeItems();
  const filteredScopeItems = formattedScopeItems.filter((i) =>
    i.label.toLowerCase().includes(scopeSearchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Header + Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule Management</h2>
          <p className="text-gray-500 text-sm">Manage employee work schedules and shift options</p>
        </div>

        <Dialog open={newScheduleOpen} onOpenChange={setNewScheduleOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="mr-2 size-4" />
              Create Schedule
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="size-5 text-sky-500" />
                Create New Schedule
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* 1. Apply To + Searchable Multi-select Dropdown */}
              <div className="space-y-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                <div className="space-y-2">
                  <Label className="font-semibold text-gray-800">Apply Schedule To</Label>
                  <Select
                    value={scopeType}
                    onValueChange={(v) => {
                      setScopeType(v as any);
                      setSelectedItems([]);
                      setScopeSearchQuery("");
                      setScopePopoverOpen(false);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        Individual Employees
                      </SelectItem>
                      <SelectItem value="location">Locations</SelectItem>
                      <SelectItem value="department">Departments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Searchable Multi-Select Dropdown */}
                <div className="space-y-2">
                  <Label className="font-semibold text-gray-800">
                    Select{" "}
                    {scopeType === "individual"
                      ? "Employees"
                      : scopeType === "location"
                      ? "Locations"
                      : "Departments"}
                  </Label>

                  <Popover open={scopePopoverOpen} onOpenChange={setScopePopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="min-h-11 border border-gray-200 rounded-xl bg-white p-2 flex items-center justify-between gap-2 cursor-pointer hover:border-gray-300 transition-colors shadow-2xs">
                        {selectedItems.length === 0 ? (
                          <span className="text-sm text-gray-400 pl-1 font-normal">
                            Select {scopeType === "individual" ? "Employees" : scopeType === "location" ? "Locations" : "Departments"}...
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pl-1 pr-1">
                            {selectedItems.map((itemId) => {
                              const found = formattedScopeItems.find((i) => String(i.id) === String(itemId));
                              if (!found) return null;
                              return (
                                <Badge
                                  key={found.id}
                                  variant="secondary"
                                  className="bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100 flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg text-xs font-medium"
                                >
                                  <span>{found.label}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItems(selectedItems.filter((id) => String(id) !== String(found.id)));
                                    }}
                                    className="rounded-full p-0.5 hover:bg-sky-200 text-sky-700 transition-colors"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-1 pr-1 text-gray-400">
                          {selectedItems.length > 0 && (
                            <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                              {selectedItems.length}
                            </span>
                          )}
                          <ChevronDown className="size-4 shrink-0 text-gray-400" />
                        </div>
                      </div>
                    </PopoverTrigger>

                    <PopoverContent className="w-[360px] p-0 border border-gray-200 shadow-lg rounded-2xl bg-white" align="start">
                      <div className="p-2 border-b border-gray-100 space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                          <Input
                            placeholder={`Search ${scopeType === "individual" ? "employees" : scopeType === "location" ? "locations" : "departments"}...`}
                            value={scopeSearchQuery}
                            onChange={(e) => setScopeSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs bg-gray-50/70 border-gray-200"
                          />
                        </div>
                        <div className="flex items-center justify-between px-1 text-xs text-gray-500">
                          <span>{filteredScopeItems.length} options</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedItems.length === formattedScopeItems.length) {
                                setSelectedItems([]);
                              } else {
                                setSelectedItems(formattedScopeItems.map((i) => i.id));
                              }
                            }}
                            className="text-sky-600 font-semibold hover:underline"
                          >
                            {selectedItems.length === formattedScopeItems.length ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredScopeItems.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400">
                            No matching items found
                          </div>
                        ) : (
                          filteredScopeItems.map((item) => {
                            const isChecked = selectedItems.some((id) => String(id) === String(item.id));
                            return (
                              <label
                                key={item.id}
                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                                  isChecked ? "bg-sky-50/70 text-sky-900 font-semibold" : "hover:bg-gray-50 text-gray-700"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedItems([...selectedItems, item.id]);
                                      } else {
                                        setSelectedItems(selectedItems.filter((id) => String(id) !== String(item.id)));
                                      }
                                    }}
                                    className="size-4 accent-sky-500 rounded cursor-pointer"
                                  />
                                  <span>{item.label}</span>
                                </div>
                                {isChecked && <Check className="size-3.5 text-sky-600" />}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* ── Working Schedule Section ───────────────────────────── */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2 text-sky-500 font-bold text-lg border-b pb-2">
                  <Clock className="size-5" />
                  <span>Working Schedule</span>
                </div>

                {/* Shift Type Toggles */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Clock className="size-4 text-gray-500" />
                    <span>Shift Type</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {SHIFT_TYPES.map((st) => {
                      const IconComp = st.icon;
                      const isSelected = shiftType === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectShiftType(st.id)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-medium transition-all ${
                            isSelected
                              ? st.activeClass
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <IconComp className="size-4" />
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs text-gray-500 italic pt-0.5">
                    Selecting a shift automatically fills the default working hours for each selected day. You can still edit each day manually below.
                  </p>
                </div>

                {/* Working Days */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <CalendarIcon className="size-4 text-sky-500" />
                    <span>Working Days</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {DAYS_LIST.map((dayObj) => {
                      const isSelected = selectedDays.includes(dayObj.full);
                      return (
                        <button
                          key={dayObj.full}
                          type="button"
                          onClick={() => handleToggleDay(dayObj.full)}
                          className={`px-4 py-2 rounded-full border text-sm transition-all ${
                            isSelected
                              ? "bg-sky-500 text-white border-sky-500 font-semibold shadow-xs"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {dayObj.full}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly Schedule Cards */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Clock className="size-4 text-gray-500" />
                    <span>Weekly Schedule</span>
                  </div>

                  {selectedDays.length === 0 ? (
                    <div className="p-6 border border-dashed rounded-2xl text-center text-gray-400 text-sm">
                      Please select at least one working day above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {DAYS_LIST.filter((d) => selectedDays.includes(d.full)).map((dayObj) => {
                        const daySched = daySchedules[dayObj.full] || {
                          startTime: currentShiftConfig.defaultStart,
                          endTime: currentShiftConfig.defaultEnd,
                        };

                        return (
                          <div
                            key={dayObj.full}
                            className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <CurrentShiftIcon className="size-4 text-amber-500" />
                                <span className="font-bold text-gray-900 text-sm">
                                  {dayObj.full}
                                </span>
                              </div>
                              <span
                                className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${currentShiftConfig.badgeClass}`}
                              >
                                {currentShiftConfig.label}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-gray-500">
                                  Start Time
                                </Label>
                                <div className="relative">
                                  <Input
                                    type="time"
                                    value={daySched.startTime}
                                    onChange={(e) =>
                                      handleUpdateDayTime(dayObj.full, "startTime", e.target.value)
                                    }
                                    className="bg-gray-50/50 rounded-xl pr-8 text-sm"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-gray-500">
                                  End Time
                                </Label>
                                <div className="relative">
                                  <Input
                                    type="time"
                                    value={daySched.endTime}
                                    onChange={(e) =>
                                      handleUpdateDayTime(dayObj.full, "endTime", e.target.value)
                                    }
                                    className="bg-gray-50/50 rounded-xl pr-8 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Shift Options */}
              <div className="space-y-5 border-t pt-5">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                  Shift Rules & Options
                </h4>

                {/* Early In */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="earlyIn"
                      checked={allowEarlyIn}
                      onChange={(e) => setAllowEarlyIn(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="earlyIn" className="cursor-pointer font-medium text-sm">
                      Allow Early In
                    </Label>
                  </div>
                  {allowEarlyIn && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">
                        Early In Margin (minutes) — how early they can arrive
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={earlyInMinutes}
                        onChange={(e) =>
                          setEarlyInMinutes(
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                        className="w-40 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Early Out */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="earlyOut"
                      checked={allowEarlyOut}
                      onChange={(e) => setAllowEarlyOut(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="earlyOut" className="cursor-pointer font-medium text-sm">
                      Allow Early Out
                    </Label>
                  </div>
                  {allowEarlyOut && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">
                        Early Out Margin (minutes) — how early they can leave
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={earlyOutMinutes}
                        onChange={(e) =>
                          setEarlyOutMinutes(
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                        className="w-40 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Overtime */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="overtime"
                      checked={overtimeAllowed}
                      onChange={(e) => setOvertimeAllowed(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="overtime" className="cursor-pointer font-medium text-sm">
                      Overtime Allowed
                    </Label>
                  </div>
                  {overtimeAllowed && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">Max Overtime (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={overtimeMinutes}
                        onChange={(e) =>
                          setOvertimeMinutes(
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                        className="w-40 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Half Day */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowHalfDay"
                      checked={allowHalfDay}
                      onChange={(e) => setAllowHalfDay(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="allowHalfDay" className="cursor-pointer font-medium text-sm">
                      Half Day Allowed
                    </Label>
                  </div>
                  {allowHalfDay && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">Half Day Duration (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={halfDayMinutes}
                        onChange={(e) =>
                          setHalfDayMinutes(
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                        className="w-40 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Breaks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="breaks"
                      checked={breaksAllowed}
                      onChange={(e) => setBreaksAllowed(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="breaks" className="cursor-pointer font-medium text-sm">
                      Breaks Allowed
                    </Label>
                  </div>

                  {breaksAllowed && (
                    <div className="ml-7 space-y-3 border-l-2 border-gray-200 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Number of Breaks</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={numBreaks}
                          onChange={(e) => {
                            const val = Math.max(
                              1,
                              Math.min(5, parseInt(e.target.value) || 1)
                            );
                            setNumBreaks(val);
                            let newDurs = [...breakDurations];
                            if (val > breakDurations.length) {
                              newDurs = [
                                ...newDurs,
                                ...Array(val - breakDurations.length).fill(15),
                              ];
                            } else {
                              newDurs = newDurs.slice(0, val);
                            }
                            setBreakDurations(newDurs);
                          }}
                          className="w-24 h-8 text-sm"
                        />
                      </div>

                      {breakDurations?.map((duration, idx) => (
                        <div key={idx} className="space-y-1">
                          <Label className="text-xs text-gray-500">Break {idx + 1} (minutes)</Label>
                          <Input
                            type="number"
                            min={5}
                            value={duration}
                            onChange={(e) => {
                              const newDurs = [...breakDurations];
                              newDurs[idx] = parseInt(e.target.value) || 0;
                              setBreakDurations(newDurs);
                            }}
                            className="w-36 h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setNewScheduleOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={isCreating}
                  onClick={async () => {
                    if (!selectedItems.length) {
                      toast.error("Please select at least one employee/location/department");
                      return;
                    }
                    if (!selectedDays.length) {
                      toast.error("Please select at least one working day");
                      return;
                    }

                    try {
                      setIsCreating(true);

                      // Map selected days to short names for backend compatibility (e.g., ["Mon", "Tue"])
                      const shortDays = selectedDays.map(d => DAYS_LIST.find(x => x.full === d)?.short || d);

                      // Get start/end time from first selected day card or default
                      const firstDayTime = daySchedules[selectedDays[0]] || { startTime, endTime };

                      const payload = {
                        scopeType,
                        selectedIds: selectedItems,
                        days: shortDays,
                        startTime: firstDayTime.startTime || startTime,
                        endTime: firstDayTime.endTime || endTime,
                        companyId: selectedLocation,
                        allowEarlyIn,
                        earlyInMinutes,
                        allowEarlyOut,
                        earlyOutMinutes,
                        overtimeAllowed,
                        allowOvertime: overtimeAllowed,
                        overtime_allowed: overtimeAllowed,
                        overtimeMinutes: overtimeAllowed ? overtimeMinutes : null,
                        overtime_minutes: overtimeAllowed ? overtimeMinutes : null,
                        allowHalfDay,
                        allow_half_day: allowHalfDay,
                        halfDayAllowed: allowHalfDay,
                        half_day_allowed: allowHalfDay,
                        halfDayMinutes: allowHalfDay ? halfDayMinutes : null,
                        half_day_minutes: allowHalfDay ? halfDayMinutes : null,
                        breaksAllowed,
                        breakDurations,
                      };

                      const res = await scheduleAPI.createSchedule(payload);

                      toast.success("Schedule created successfully!");
                      setNewScheduleOpen(false);

                      if (res && res.data) {
                        const newItems = Array.isArray(res.data) ? res.data : [res.data];
                        setSchedules((prev) => [...newItems, ...prev]);
                      }
                      fetchSchedules();
                    } catch (err: any) {
                      if (err.status === 409) {
                        setConflicts(err.data.conflictingEmployees);
                        setShowOverwriteModal(true);
                      } else {
                        toast.error(err?.data?.message || "Failed to create schedule");
                      }
                    } finally {
                      setIsCreating(false);
                    }
                  }}
                >
                  {isCreating ? "Creating..." : "Create Schedule"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overwrite Modal */}
      <Dialog open={showOverwriteModal} onOpenChange={setShowOverwriteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite Existing Schedules</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              The following employees already have schedules assigned. Select which ones to overwrite:
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverwriteIds(conflicts.map((e) => e.id))}
              >
                Select All
              </Button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 border p-3 rounded-lg">
              {conflicts.map((emp) => (
                <label key={emp.id} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary rounded"
                    checked={overwriteIds.includes(emp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOverwriteIds([...overwriteIds, emp.id]);
                      } else {
                        setOverwriteIds(overwriteIds.filter((id) => id !== emp.id));
                      }
                    }}
                  />
                  <span className="text-sm font-medium">{emp.name}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowOverwriteModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const shortDays = selectedDays.map(d => DAYS_LIST.find(x => x.full === d)?.short || d);
                    const firstDayTime = daySchedules[selectedDays[0]] || { startTime, endTime };

                    const payload = {
                      scopeType,
                      selectedIds: selectedItems,
                      days: shortDays,
                      startTime: firstDayTime.startTime || startTime,
                      endTime: firstDayTime.endTime || endTime,
                      companyId: selectedLocation,
                      allowEarlyIn,
                      earlyInMinutes,
                      allowEarlyOut,
                      earlyOutMinutes,
                      overtimeAllowed,
                      allowOvertime: overtimeAllowed,
                      overtime_allowed: overtimeAllowed,
                      overtimeMinutes: overtimeAllowed ? overtimeMinutes : null,
                      overtime_minutes: overtimeAllowed ? overtimeMinutes : null,
                      allowHalfDay,
                      allow_half_day: allowHalfDay,
                      halfDayAllowed: allowHalfDay,
                      half_day_allowed: allowHalfDay,
                      halfDayMinutes: allowHalfDay ? halfDayMinutes : null,
                      half_day_minutes: allowHalfDay ? halfDayMinutes : null,
                      breaksAllowed,
                      breakDurations,
                      overwriteEmployeeIds: overwriteIds,
                    };

                    const res = await scheduleAPI.createSchedule(payload);

                    toast.success("Schedules overwritten successfully!");
                    setShowOverwriteModal(false);
                    setNewScheduleOpen(false);

                    if (res && res.data) {
                      const newItems = Array.isArray(res.data) ? res.data : [res.data];
                      setSchedules((prev) => [...newItems, ...prev]);
                    }
                    fetchSchedules();
                  } catch {
                    toast.error("Failed to overwrite schedules");
                  }
                }}
              >
                Overwrite Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Redesigned Work Schedules Card & Table ───────────────────── */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Work Schedules</CardTitle>
                <Badge variant="secondary" className="font-semibold text-xs">
                  {filteredSchedules?.length || 0} Total
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Overview of active employee shift schedules and configurations
              </p>
            </div>

            {/* Controls: Search & Location Filter */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search employee, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {locations?.length > 0 && (
                <SearchableSelect
                  className="w-[160px] h-9 text-sm"
                  placeholder="All Locations"
                  searchPlaceholder="Search location..."
                  value={filterLocation}
                  onValueChange={setFilterLocation}
                  options={[
                    { value: "all", label: "All Locations" },
                    ...locations.map((loc) => ({
                      value: String(loc.id),
                      label: loc.name,
                    })),
                  ]}
                />
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 text-gray-500 hover:text-gray-900"
                onClick={fetchSchedules}
                title="Refresh Table"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                  <TableHead className="font-semibold text-gray-700">Employee</TableHead>
                  <TableHead className="font-semibold text-gray-700">Working Days</TableHead>
                  <TableHead className="font-semibold text-gray-700">Shift Hours</TableHead>
                  <TableHead className="font-semibold text-gray-700">Location</TableHead>
                  <TableHead className="font-semibold text-gray-700">Shift Features</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="size-5 animate-spin text-primary" />
                        <span className="text-sm font-medium">Loading schedules...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSchedules?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <CalendarIcon className="size-8 text-gray-300 mb-1" />
                        <p className="text-sm font-medium text-gray-700">No work schedules found</p>
                        <p className="text-xs text-gray-400">
                          {searchQuery || filterLocation !== "all"
                            ? "Try adjusting your search filters."
                            : "Click 'Create Schedule' to add a new schedule."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchedules.map((schedule) => {
                    const empName = `${schedule.employee?.firstName || "Unknown"} ${schedule.employee?.lastName || ""}`.trim();
                    const companyObj = schedule.company || locations.find((l) => String(l.id) === String(schedule.companyId));
                    const locationName = companyObj?.name || "-";

                    const daysArr = Array.isArray(schedule.days) ? schedule.days : [];
                    const daysCount = daysArr.length;

                    const hasEarlyIn = Boolean(schedule.allowEarlyIn ?? schedule.allow_early_in);
                    const earlyInMins = schedule.earlyInMinutes ?? schedule.early_in_minutes ?? 15;
                    const hasEarlyOut = Boolean(schedule.allowEarlyOut ?? schedule.allow_early_out);
                    const earlyOutMins = schedule.earlyOutMinutes ?? schedule.early_out_minutes ?? 15;
                    const hasOvertime = Boolean(
                      schedule.overtimeAllowed ??
                      schedule.allowOvertime ??
                      schedule.overtime_allowed ??
                      schedule.allow_overtime ??
                      schedule.isOvertime ??
                      (typeof schedule.overtime === "boolean" ? schedule.overtime : false) ??
                      (schedule.overtimeMinutes && Number(schedule.overtimeMinutes) > 0) ??
                      (schedule.overtime_minutes && Number(schedule.overtime_minutes) > 0)
                    );
                    const overtimeMins =
                      schedule.overtimeMinutes ??
                      schedule.overtime_minutes ??
                      (typeof schedule.overtime === "number" ? schedule.overtime : null) ??
                      30;
                    const hasHalfDay = Boolean(
                      schedule.allowHalfDay ??
                      schedule.allow_half_day ??
                      schedule.halfDayAllowed ??
                      schedule.half_day_allowed ??
                      schedule.isHalfDay ??
                      (typeof schedule.halfDay === "boolean" ? schedule.halfDay : false) ??
                      (schedule.halfDayMinutes && Number(schedule.halfDayMinutes) > 0) ??
                      (schedule.half_day_minutes && Number(schedule.half_day_minutes) > 0)
                    );
                    const halfDayMins =
                      schedule.halfDayMinutes ??
                      schedule.half_day_minutes ??
                      (typeof schedule.halfDay === "number" ? schedule.halfDay : null) ??
                      240;
                    const hasBreaks = Boolean(schedule.breaksAllowed ?? schedule.breaks_allowed);
                    const breakList = schedule.breakDurations ?? schedule.break_durations;

                    return (
                      <TableRow key={schedule.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Employee */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {schedule.employee?.firstName?.[0]?.toUpperCase() || "E"}
                              {schedule.employee?.lastName?.[0]?.toUpperCase() || ""}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 leading-none mb-1">
                                {empName}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: #{schedule.employee?.id || schedule.employeeId}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Working Days (Shows Days Count) */}
                        <TableCell>
                          {daysCount > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 cursor-default shadow-2xs hover:bg-blue-100 transition-colors">
                                    {daysCount} {daysCount === 1 ? "Day" : "Days"}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs font-medium">{daysArr.join(", ")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>

                        {/* Shift Hours */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100/80 text-gray-800 text-xs font-semibold">
                            <Clock className="size-3.5 text-gray-500" />
                            <span>
                              {schedule.startTime || "--:--"} - {schedule.endTime || "--:--"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Location */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <Building2 className="size-3.5 text-gray-400 shrink-0" />
                            <span className="font-medium">{locationName}</span>
                          </div>
                        </TableCell>

                        {/* Shift Features / Badges (Includes Half Day properly) */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {hasEarlyIn && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Early In ({earlyInMins}m)
                              </span>
                            )}
                            {hasEarlyOut && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Early Out ({earlyOutMins}m)
                              </span>
                            )}
                            {hasOvertime && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Overtime ({overtimeMins}m)
                              </span>
                            )}
                            {hasHalfDay && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                Half Day{halfDayMins ? ` (${halfDayMins}m)` : ""}
                              </span>
                            )}
                            {hasBreaks && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                Breaks ({Array.isArray(breakList) ? breakList.length : 1})
                              </span>
                            )}
                            {!hasEarlyIn &&
                              !hasEarlyOut &&
                              !hasOvertime &&
                              !hasHalfDay &&
                              !hasBreaks && (
                                <span className="text-xs text-gray-400">Standard</span>
                              )}
                          </div>
                        </TableCell>

                        {/* Actions Column */}
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-lg"
                                    onClick={() => handleOpenView(schedule)}
                                  >
                                    <Eye className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>View Details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Edit Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors rounded-lg"
                                    onClick={() => handleOpenEdit(schedule)}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Edit Schedule</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Delete Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                                    onClick={() => handleOpenDelete(schedule)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Delete Schedule</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── 1. View Details Modal ────────────────────────────────────── */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="size-5 text-blue-600" />
              Schedule Details
            </DialogTitle>
          </DialogHeader>

          {viewingSchedule && (
            <div className="space-y-4 py-2">
              {/* Employee Card */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                <div className="size-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {viewingSchedule.employee?.firstName?.[0]?.toUpperCase() || "E"}
                  {viewingSchedule.employee?.lastName?.[0]?.toUpperCase() || ""}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">
                    {viewingSchedule.employee?.firstName} {viewingSchedule.employee?.lastName}
                  </h4>
                  <p className="text-xs text-gray-500">Employee ID: #{viewingSchedule.employee?.id || viewingSchedule.employeeId}</p>
                </div>
              </div>

              {/* Timing & Days */}
              <div className="space-y-3 border p-4 rounded-xl bg-gray-50/50">
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-gray-500 font-medium">Shift Hours:</span>
                  <span className="font-bold text-gray-900 flex items-center gap-1">
                    <Clock className="size-3.5 text-primary" />
                    {viewingSchedule.startTime} - {viewingSchedule.endTime}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-gray-500 font-medium">Location:</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <Building2 className="size-3.5 text-gray-500" />
                    {viewingSchedule.company?.name ||
                      locations.find((l) => String(l.id) === String(viewingSchedule.companyId))?.name ||
                      "N/A"}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Working Days:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Array.isArray(viewingSchedule.days) && viewingSchedule.days.map((day: string) => (
                      <Badge key={day} variant="secondary" className="font-medium bg-white border">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shift Options Breakdown */}
              <div className="space-y-2 border p-4 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Shift Rules & Margins
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-gray-50 border">
                    <span className="text-gray-500 block">Early In:</span>
                    <span className="font-semibold text-gray-900">
                      {viewingSchedule.allowEarlyIn ? `Allowed (${viewingSchedule.earlyInMinutes}m)` : "Disabled"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border">
                    <span className="text-gray-500 block">Early Out:</span>
                    <span className="font-semibold text-gray-900">
                      {viewingSchedule.allowEarlyOut ? `Allowed (${viewingSchedule.earlyOutMinutes}m)` : "Disabled"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border">
                    <span className="text-gray-500 block">Overtime:</span>
                    <span className="font-semibold text-gray-900">
                      {viewingSchedule.overtimeAllowed ? `Allowed (${viewingSchedule.overtimeMinutes}m max)` : "Disabled"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border">
                    <span className="text-gray-500 block">Half Day:</span>
                    <span className="font-semibold text-gray-900">
                      {viewingSchedule.allowHalfDay ? `Allowed (${viewingSchedule.halfDayMinutes}m)` : "Disabled"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border col-span-2">
                    <span className="text-gray-500 block">Breaks:</span>
                    <span className="font-semibold text-gray-900">
                      {viewingSchedule.breaksAllowed
                        ? `${Array.isArray(viewingSchedule.breakDurations) ? viewingSchedule.breakDurations.join(", ") : 15} mins`
                        : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 2. Edit Schedule Modal ────────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="size-5 text-amber-600" />
              Edit Work Schedule
            </DialogTitle>
          </DialogHeader>

          {editingSchedule && (
            <div className="space-y-6 py-2">
              {/* Employee Info Header */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-medium">Editing schedule for:</span>
                  <p className="text-base font-bold text-gray-900">
                    {editingSchedule.employee?.firstName} {editingSchedule.employee?.lastName}
                  </p>
                </div>
                <Badge variant="outline" className="bg-white text-gray-700">
                  ID: #{editingSchedule.employee?.id || editingSchedule.employeeId}
                </Badge>
              </div>

              {/* Working Schedule Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sky-500 font-bold text-base border-b pb-1.5">
                  <Clock className="size-4" />
                  <span>Working Schedule</span>
                </div>

                {/* Shift Type Toggles */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Clock className="size-3.5 text-gray-500" />
                    <span>Shift Type</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SHIFT_TYPES.map((st) => {
                      const IconComp = st.icon;
                      const isSelected = editShiftType === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setEditShiftType(st.id);
                            setEditStartTime(st.defaultStart);
                            setEditEndTime(st.defaultEnd);
                            setEditDaySchedules((prev) => {
                              const updated: Record<string, { startTime: string; endTime: string }> = {};
                              DAYS_LIST.forEach((d) => {
                                updated[d.full] = { startTime: st.defaultStart, endTime: st.defaultEnd };
                              });
                              return updated;
                            });
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-all ${
                            isSelected ? st.activeClass : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <IconComp className="size-3.5" />
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Working Days */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <CalendarIcon className="size-3.5 text-sky-500" />
                    <span>Working Days</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_LIST.map((dayObj) => {
                      const isSelected = editDays.includes(dayObj.full);
                      return (
                        <button
                          key={dayObj.full}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEditDays(editDays.filter((d) => d !== dayObj.full));
                            } else {
                              setEditDays([...editDays, dayObj.full]);
                              if (!editDaySchedules[dayObj.full]) {
                                const stConfig = SHIFT_TYPES.find((s) => s.id === editShiftType) || SHIFT_TYPES[0];
                                setEditDaySchedules((prev) => ({
                                  ...prev,
                                  [dayObj.full]: { startTime: stConfig.defaultStart, endTime: stConfig.defaultEnd },
                                }));
                              }
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                            isSelected
                              ? "bg-sky-500 text-white border-sky-500 font-semibold"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {dayObj.full}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly Schedule Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Clock className="size-3.5 text-gray-500" />
                    <span>Weekly Schedule</span>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {DAYS_LIST.filter((d) => editDays.includes(d.full)).map((dayObj) => {
                      const daySched = editDaySchedules[dayObj.full] || { startTime: editStartTime, endTime: editEndTime };
                      const stConfig = SHIFT_TYPES.find((s) => s.id === editShiftType) || SHIFT_TYPES[0];
                      const IconComp = stConfig.icon;

                      return (
                        <div key={dayObj.full} className="bg-white border rounded-xl p-3 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <IconComp className="size-3.5 text-amber-500" />
                              <span className="font-bold text-gray-900 text-xs">{dayObj.full}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${stConfig.badgeClass}`}>
                              {stConfig.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-[11px] font-medium text-gray-500">Start Time</Label>
                              <Input
                                type="time"
                                value={daySched.startTime}
                                onChange={(e) => {
                                  setEditDaySchedules((prev) => ({
                                    ...prev,
                                    [dayObj.full]: { ...(prev[dayObj.full] || { startTime: editStartTime, endTime: editEndTime }), startTime: e.target.value },
                                  }));
                                }}
                                className="h-8 text-xs bg-gray-50/50"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-medium text-gray-500">End Time</Label>
                              <Input
                                type="time"
                                value={daySched.endTime}
                                onChange={(e) => {
                                  setEditDaySchedules((prev) => ({
                                    ...prev,
                                    [dayObj.full]: { ...(prev[dayObj.full] || { startTime: editStartTime, endTime: editEndTime }), endTime: e.target.value },
                                  }));
                                }}
                                className="h-8 text-xs bg-gray-50/50"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Location Select */}
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-semibold">Location / Office</Label>
                  <SearchableSelect
                    className="w-full"
                    placeholder="Select Location"
                    searchPlaceholder="Search location..."
                    value={editLocation}
                    onValueChange={setEditLocation}
                    options={locations.map((loc) => ({
                      value: String(loc.id),
                      label: loc.name,
                    }))}
                  />
                </div>
              )}

              {/* Shift Options */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                  Shift Rules & Margins
                </h4>

                {/* Early In */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="editEarlyIn"
                      checked={editAllowEarlyIn}
                      onChange={(e) => setEditAllowEarlyIn(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="editEarlyIn" className="cursor-pointer font-medium">
                      Allow Early In
                    </Label>
                  </div>
                  {editAllowEarlyIn && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">Early In Margin (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editEarlyInMinutes}
                        onChange={(e) => setEditEarlyInMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-36 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Early Out */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="editEarlyOut"
                      checked={editAllowEarlyOut}
                      onChange={(e) => setEditAllowEarlyOut(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="editEarlyOut" className="cursor-pointer font-medium">
                      Allow Early Out
                    </Label>
                  </div>
                  {editAllowEarlyOut && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">Early Out Margin (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editEarlyOutMinutes}
                        onChange={(e) => setEditEarlyOutMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-36 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Overtime */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="editOvertime"
                      checked={editOvertimeAllowed}
                      onChange={(e) => setEditOvertimeAllowed(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="editOvertime" className="cursor-pointer font-medium">
                      Overtime Allowed
                    </Label>
                  </div>
                  {editOvertimeAllowed && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">Max Overtime (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editOvertimeMinutes}
                        onChange={(e) => setEditOvertimeMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-36 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Half Day */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="editHalfDay"
                      checked={editAllowHalfDay}
                      onChange={(e) => setEditAllowHalfDay(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="editHalfDay" className="cursor-pointer font-medium">
                      Half Day Allowed
                    </Label>
                  </div>
                  {editAllowHalfDay && (
                    <div className="ml-7 mt-2 space-y-1">
                      <Label className="text-xs text-gray-500">Half Day Duration (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editHalfDayMinutes}
                        onChange={(e) => setEditHalfDayMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-36 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Breaks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="editBreaks"
                      checked={editBreaksAllowed}
                      onChange={(e) => setEditBreaksAllowed(e.target.checked)}
                      className="size-4 accent-primary cursor-pointer rounded"
                    />
                    <Label htmlFor="editBreaks" className="cursor-pointer font-medium">
                      Breaks Allowed
                    </Label>
                  </div>

                  {editBreaksAllowed && (
                    <div className="ml-7 space-y-3 border-l-2 border-gray-200 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Number of Breaks</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={editNumBreaks}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(5, parseInt(e.target.value) || 1));
                            setEditNumBreaks(val);
                            let newDurs = [...editBreakDurations];
                            if (val > editBreakDurations.length) {
                              newDurs = [...newDurs, ...Array(val - editBreakDurations.length).fill(15)];
                            } else {
                              newDurs = newDurs.slice(0, val);
                            }
                            setEditBreakDurations(newDurs);
                          }}
                          className="w-24 h-8 text-sm"
                        />
                      </div>

                      {editBreakDurations?.map((duration, idx) => (
                        <div key={idx} className="space-y-1">
                          <Label className="text-xs text-gray-500">Break {idx + 1} (minutes)</Label>
                          <Input
                            type="number"
                            min={5}
                            value={duration}
                            onChange={(e) => {
                              const newDurs = [...editBreakDurations];
                              newDurs[idx] = parseInt(e.target.value) || 0;
                              setBreakDurations(newDurs);
                            }}
                            className="w-36 h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={isUpdating} onClick={handleSaveEdit}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 3. Delete Confirmation Dialog ────────────────────────────── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Delete Work Schedule
            </DialogTitle>
          </DialogHeader>

          {deletingSchedule && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the work schedule for{" "}
                <span className="font-bold text-gray-900">
                  {deletingSchedule.employee?.firstName} {deletingSchedule.employee?.lastName}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 space-y-1">
                <p className="font-semibold">Schedule to be removed:</p>
                <p>• Days: {Array.isArray(deletingSchedule.days) ? deletingSchedule.days.join(", ") : "-"}</p>
                <p>• Hours: {deletingSchedule.startTime} - {deletingSchedule.endTime}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                >
                  {isDeleting ? "Deleting..." : "Delete Schedule"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
