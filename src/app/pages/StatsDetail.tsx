import React, { useEffect, useState, useCallback, useMemo } from "react";
import { dashboardAPI, locationAPI, departmentAPI, entityAPI } from "../services/api";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { avatarColor } from "../utils/avatar";
import { DatePicker } from "../components/ui/date-picker";
import { timeRange12h } from "../utils/time";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  ArrowLeft,
  Eye,
  Clock,
  Coffee,
  PlayCircle,
  LogIn,
  LogOut,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  MapPin,
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  UserX,
  CalendarOff,
  Timer,
  Globe,
  User,
  Filter,
  X,
  CalendarX,
} from "lucide-react";
import { format, parse, addDays, subDays } from "date-fns";
import { Badge } from "../components/ui/badge";

// Same look as the Attendance page
const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  present: { label: "Present", badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
  working: { label: "Present", badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
  tardy: { label: "Tardy", badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
  late: { label: "Tardy", badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
  break: { label: "On Break", badge: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800", dot: "bg-orange-500" },
  absent: { label: "Absent", badge: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800", dot: "bg-rose-500" },
  on_leave: { label: "Leave", badge: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800", dot: "bg-sky-500" },
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
  approved: { label: "Approved", badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", badge: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800", dot: "bg-rose-500" },
};
const statusKey = (raw: string) => {
  const s = String(raw || "").toLowerCase();
  if (s === "on leave" || s === "leave") return "on_leave";
  return s || "absent";
};
const STATUS_ORDER = ["present", "tardy", "break", "absent", "on_leave", "pending", "approved", "rejected"];

const formatMinutes = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

const getPaginationRange = (current: number, total: number) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const range: (number | string)[] = [];
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) range.push(i);
  if (current - 1 > 2) range.unshift("...");
  if (current + 1 < total - 1) range.push("...");
  range.unshift(1);
  range.push(total);
  return range;
};

const th = "h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

export const StatsDetails: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canFilterOrg = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter option lists
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);

  // Client-side filters (date / location / department / entity live in the URL)
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal Dialog state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const selectedDate = searchParams.get("date") || todayStr;
  const selectedLocation = searchParams.get("location") || localStorage.getItem("selectedLocation") || "ALL";
  const selectedDepartment = searchParams.get("department") || "all";
  const selectedEntity = searchParams.get("entity") || "all";
  const isNextDisabled = selectedDate >= todayStr;

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  // Listen to top header location change
  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const newLoc = e.detail || localStorage.getItem("selectedLocation") || "ALL";
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("location", newLoc);
        return next;
      });
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => window.removeEventListener("location-changed", handleLocationEvent);
  }, [setSearchParams]);

  // Filter option lists
  useEffect(() => {
    const unwrap = (res: any, ...keys: string[]) => {
      if (Array.isArray(res)) return res;
      for (const k of keys) if (Array.isArray(res?.[k])) return res[k];
      return [];
    };
    // one failing list must never break the page
    const load = (fn: () => Promise<any>, set: (v: any[]) => void, ...keys: string[]) =>
      Promise.resolve()
        .then(fn)
        .then((r: any) => set(unwrap(r, ...keys)))
        .catch((err) => console.error("Filter options load error:", err));
    load(() => locationAPI.getLocations(), setLocations, "data", "locations");
    load(() => departmentAPI.getDepartments(), setDepartments, "data", "departments");
    load(() => entityAPI.getEntities(), setEntities, "data", "entities");
  }, []);

  // Fetch stats details with silent refresh support
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!category) return;
      if (!isSilent) setLoading(true);
      setRefreshing(true);
      try {
        const response = await dashboardAPI.getStatsDetails(category, selectedDate, selectedLocation, selectedDepartment, selectedEntity);
        setData(response.list || []);
      } catch (err) {
        console.error("Stats details load error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, selectedDate, selectedLocation, selectedDepartment, selectedEntity]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Real-time polling every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleDateChange = (newDate: string) => {
    if (!newDate || newDate > todayStr) return;
    setParam("date", newDate);
  };
  const shiftDate = (days: number) => {
    const d = parse(selectedDate, "yyyy-MM-dd", new Date());
    handleDateChange(format(days > 0 ? addDays(d, days) : subDays(d, -days), "yyyy-MM-dd"));
  };

  const handleLocationChange = (newLocation: string) => {
    localStorage.setItem("selectedLocation", newLocation);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: newLocation }));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("location", newLocation);
      return next;
    });
  };

  const getTitle = (cat?: string) => {
    if (!cat) return "Details";
    if (cat === "late-tardy" || cat === "late-today") return "Late / Tardy";
    if (cat === "present-today") return "Present";
    if (cat === "absent-today") return "Absent";
    if (cat === "on-leave") return "On Leave";
    if (cat === "total-employees") return "Total Employees";
    if (cat === "overtime-requests" || cat === "overtime") return "Overtime Requests";
    return cat.split("-").map((w) => w.charAt(0)?.toUpperCase() + w.slice(1)).join(" ");
  };

  const isTaskCategory = category?.includes("task");
  const isProjectCategory = category?.includes("project");
  const isOvertimeCategory = category === "overtime-requests" || category === "overtime";
  const isAttendanceCategory = !isTaskCategory && !isProjectCategory && !isOvertimeCategory;

  const handleViewClick = (employee: any) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    return format(new Date(isoString), "hh:mm a");
  };

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return "Ongoing";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 1000 / 60);
    return mins > 0 ? `${mins} min` : "<1 min";
  };

  // Options built from what this list actually contains
  const employeeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of data) {
      const key = String(it.employeeId ?? it.id);
      if (!seen.has(key)) seen.set(key, it.name || `${it.firstName || ""} ${it.lastName || ""}`.trim());
    }
    return [{ value: "all", label: "All Employees" }, ...[...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }))];
  }, [data]);

  const statusOptions = useMemo(() => {
    const present = new Set(data.map((it) => statusKey(it.status)));
    const keys = STATUS_ORDER.filter((k) => present.has(k));
    return [{ value: "all", label: "All Statuses" }, ...keys.map((k) => ({ value: k, label: STATUS_STYLE[k]?.label || k }))];
  }, [data]);

  // Department is filtered on the server too; this keeps old payloads consistent
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((item) => {
      if (selectedDepartment !== "all") {
        const targetDept = departments.find((d) => String(d.id) === String(selectedDepartment));
        const targetTitle = (targetDept?.title || targetDept?.name || "").toLowerCase();
        const matchesId = String(item.departmentId || "") === String(selectedDepartment);
        const matchesTitle = Boolean(targetTitle && String(item.department || "").toLowerCase() === targetTitle);
        if (!matchesId && !matchesTitle) return false;
      }
      if (employeeFilter !== "all" && String(item.employeeId ?? item.id) !== employeeFilter) return false;
      if (statusFilter !== "all" && statusKey(item.status) !== statusFilter) return false;
      if (!q) return true;
      return [item.name, item.title, item.email, item.department, item.employeeCode, item.entity]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [data, searchQuery, selectedDepartment, departments, employeeFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, selectedDate, selectedLocation, selectedDepartment, selectedEntity, employeeFilter, statusFilter, searchQuery]);

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, total);
  const pageRows = filteredData.slice(startIndex, endIndex);

  // Active filter chips (same behaviour as Attendance)
  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string; clear: () => void }[] = [];
    if (selectedDepartment !== "all") {
      const d = departments.find((x) => String(x.id) === String(selectedDepartment));
      tags.push({ key: "department", label: d?.title || d?.name || "Department", clear: () => setParam("department", "all") });
    }
    if (String(selectedLocation).toLowerCase() !== "all") {
      const l = locations.find((x) => String(x.id) === String(selectedLocation));
      tags.push({ key: "location", label: l?.name || "Location", clear: () => handleLocationChange("all") });
    }
    if (selectedEntity !== "all") {
      const e = entities.find((x) => String(x.id) === String(selectedEntity));
      tags.push({ key: "entity", label: e?.name || "Entity", clear: () => setParam("entity", "all") });
    }
    if (employeeFilter !== "all") {
      tags.push({ key: "employee", label: employeeOptions.find((o) => o.value === employeeFilter)?.label || "Employee", clear: () => setEmployeeFilter("all") });
    }
    if (statusFilter !== "all") {
      tags.push({ key: "status", label: STATUS_STYLE[statusFilter]?.label || statusFilter, clear: () => setStatusFilter("all") });
    }
    if (searchQuery.trim()) {
      tags.push({ key: "search", label: `“${searchQuery.trim()}”`, clear: () => setSearchQuery("") });
    }
    return tags;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedLocation, selectedEntity, employeeFilter, statusFilter, searchQuery, departments, locations, entities, employeeOptions]);

  const clearAllFilters = () => {
    setEmployeeFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("department");
      next.delete("entity");
      next.set("location", "all");
      return next;
    });
    localStorage.setItem("selectedLocation", "all");
    window.dispatchEvent(new CustomEvent("location-changed", { detail: "all" }));
  };

  // Get Category Icon & Theme
  const getCategoryTheme = () => {
    if (category === "late-tardy" || category === "late-today")
      return { icon: AlertTriangle, bg: "bg-amber-50 text-amber-600 border-amber-200", sub: "Employees who checked in after their scheduled start time" };
    if (category === "present-today")
      return { icon: UserCheck, bg: "bg-emerald-50 text-emerald-600 border-emerald-200", sub: "Employees who checked in on this day" };
    if (category === "absent-today")
      return { icon: UserX, bg: "bg-rose-50 text-rose-600 border-rose-200", sub: "Employees with no attendance record and not on approved leave" };
    if (category === "on-leave")
      return { icon: CalendarOff, bg: "bg-sky-50 text-sky-600 border-sky-200", sub: "Employees on approved leave on this day" };
    if (isOvertimeCategory)
      return { icon: Timer, bg: "bg-indigo-50 text-indigo-600 border-indigo-200", sub: "Overtime logs and requests submitted" };
    return { icon: Users, bg: "bg-blue-50 text-blue-600 border-blue-200", sub: `Everyone in scope with their attendance on this day` };
  };

  const theme = getCategoryTheme();
  const CategoryIcon = theme.icon;
  const selectedDateObj = parse(selectedDate, "yyyy-MM-dd", new Date());

  const StatusPill = ({ status }: { status: string }) => {
    const cfg = STATUS_STYLE[statusKey(status)] || STATUS_STYLE.absent;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cfg.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  };

  const EmployeeCell = ({ item }: { item: any }) => {
    const name = item.name || item.title || "N/A";
    const sub = [item.employeeCode, item.department && item.department !== "N/A" ? item.department : null].filter(Boolean).join(" · ");
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${avatarColor(name)}`}>
          {name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{name}</span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{sub || item.email || "—"}</span>
        </div>
      </div>
    );
  };

  const colCount = isOvertimeCategory ? 5 : isAttendanceCategory ? 7 : 4;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/")}
          className="size-9 rounded-xl shrink-0 border-gray-200 dark:border-gray-800"
          title="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${theme.bg}`}>
          <CategoryIcon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">{getTitle(category)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{theme.sub}</p>
        </div>
      </div>

      <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full gap-0">
        {/* ── Filters (same row as the Attendance page) ── */}
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800">
          <div className={`grid gap-2.5 grid-cols-2 ${canFilterOrg ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2"}`}>
            {canFilterOrg && (
              <>
                <SearchableSelect
                  className="w-full min-w-0 h-9 rounded-xl"
                  icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="Department"
                  searchPlaceholder="Search department..."
                  value={selectedDepartment}
                  onValueChange={(v) => setParam("department", v)}
                  options={[
                    { value: "all", label: "All Departments" },
                    ...departments.map((d) => ({ value: String(d.id), label: d.title || d.name })),
                  ]}
                />
                <SearchableSelect
                  className="w-full min-w-0 h-9 rounded-xl"
                  icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="Location"
                  searchPlaceholder="Search location..."
                  value={String(selectedLocation).toLowerCase() === "all" ? "all" : selectedLocation}
                  onValueChange={handleLocationChange}
                  options={[
                    { value: "all", label: "All Locations" },
                    ...locations.map((loc) => ({ value: String(loc.id), label: loc.name || loc.companyName || `Location #${loc.id}` })),
                  ]}
                />
                <SearchableSelect
                  className="w-full min-w-0 h-9 rounded-xl"
                  icon={<Globe className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="Entity"
                  searchPlaceholder="Search entity..."
                  value={selectedEntity}
                  onValueChange={(v) => {
                    setParam("entity", v);
                    setEmployeeFilter("all");
                  }}
                  options={[
                    { value: "all", label: "All Entities" },
                    ...entities.map((en) => ({ value: String(en.id), label: en.name })),
                    { value: "none", label: "No Entity" },
                  ]}
                />
                <SearchableSelect
                  className="w-full min-w-0 h-9 rounded-xl"
                  icon={<User className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="All Employees"
                  searchPlaceholder="Search employee..."
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                  options={employeeOptions}
                />
              </>
            )}
            <SearchableSelect
              className="w-full min-w-0 h-9 rounded-xl"
              icon={<Filter className="w-3.5 h-3.5 text-gray-400" />}
              placeholder="All Statuses"
              searchPlaceholder="Filter status..."
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={statusOptions}
            />
          </div>

          {activeFilterTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              {activeFilterTags.map((tag) => (
                <span
                  key={tag.key}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
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
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-3 sm:p-4 space-y-4">
          {/* Search left, date controls right (like the tabs row on Attendance) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search name, ID, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-0.5 bg-white dark:bg-gray-950 p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900 rounded-lg" onClick={() => shiftDate(-1)} title="Previous day">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                  onClick={() => shiftDate(1)}
                  disabled={isNextDisabled}
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <DatePicker
                size="sm"
                required
                align="end"
                side="bottom"
                lockSide
                value={selectedDate}
                max={todayStr}
                onValueChange={(v) => v && handleDateChange(v)}
              />
              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => handleDateChange(todayStr)}
                  className="text-xs font-semibold px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-xs"
                >
                  Today
                </button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchData(false)}
                disabled={refreshing}
                className="h-9 w-9 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                title="Refresh"
              >
                <RefreshCw className={`size-3.5 text-gray-600 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
            {/* Table toolbar: which day + how many rows */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{format(selectedDateObj, "EEEE, d MMMM yyyy")}</span>
                {selectedDate === todayStr && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Today</span>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {total} {isOvertimeCategory ? (total === 1 ? "request" : "requests") : total === 1 ? "employee" : "employees"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table className={isAttendanceCategory ? "min-w-[860px]" : "min-w-[640px]"}>
                <TableHeader className="bg-gray-50/80 dark:bg-gray-900/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`${th} pl-4`}>Employee</TableHead>
                    {isAttendanceCategory && (
                      <>
                        <TableHead className={th}>Check In</TableHead>
                        <TableHead className={th}>Check Out</TableHead>
                        <TableHead className={th}>Worked</TableHead>
                        <TableHead className={th}>Overtime</TableHead>
                        <TableHead className={th}>Status</TableHead>
                        <TableHead className={`${th} pr-4 text-right`}>Actions</TableHead>
                      </>
                    )}
                    {isOvertimeCategory && (
                      <>
                        <TableHead className={th}>Date</TableHead>
                        <TableHead className={th}>Hours</TableHead>
                        <TableHead className={th}>Reason</TableHead>
                        <TableHead className={`${th} pr-4`}>Status</TableHead>
                      </>
                    )}
                    {isTaskCategory && (
                      <>
                        <TableHead className={th}>Priority</TableHead>
                        <TableHead className={th}>Deadline</TableHead>
                        <TableHead className={`${th} pr-4`}>Status</TableHead>
                      </>
                    )}
                    {isProjectCategory && (
                      <>
                        <TableHead className={th}>Progress</TableHead>
                        <TableHead className={th}>Deadline</TableHead>
                        <TableHead className={`${th} pr-4`}>Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={colCount} className="py-16 text-center">
                        <RefreshCw className="size-6 animate-spin text-blue-600 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading...</p>
                      </TableCell>
                    </TableRow>
                  ) : pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                          <CalendarX className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                          <span className="text-sm font-medium">No records found</span>
                          <span className="text-xs text-gray-400">Try another date or clear the filters.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((item, idx) => {
                      const st = statusKey(item.status);
                      const isToday = selectedDate === todayStr;
                      return (
                        <TableRow key={`${item.id}-${idx}`} className="group hover:bg-blue-50/40 dark:hover:bg-gray-900/40 transition-colors">
                          <TableCell className="py-3 pl-4">
                            <EmployeeCell item={item} />
                          </TableCell>

                          {isAttendanceCategory && (
                            <>
                              {/* Check In */}
                              <TableCell className="py-3">
                                {item.checkInTime ? (
                                  <div className="flex flex-col">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {formatTime(item.checkInTime)}
                                    </span>
                                    {item.isLate && Number(item.lateMinutes) > 0 && (
                                      <span className="text-[11px] text-amber-600 dark:text-amber-400 pl-3">{formatMinutes(Number(item.lateMinutes))} late</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </TableCell>

                              {/* Check Out */}
                              <TableCell className="py-3">
                                {item.checkOutTime ? (
                                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {formatTime(item.checkOutTime)}
                                  </span>
                                ) : item.checkInTime && isToday ? (
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
                                  <span className={`text-sm font-semibold tabular-nums ${item.workedMinutes > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-300 dark:text-gray-600"}`}>
                                    {item.workedMinutes > 0 ? formatMinutes(item.workedMinutes) : "—"}
                                  </span>
                                  {item.shiftStartTime && item.shiftEndTime && (
                                    <span className="text-[11px] text-gray-400 tabular-nums">Shift {timeRange12h(item.shiftStartTime, item.shiftEndTime)}</span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Overtime */}
                              <TableCell className="py-3">
                                {item.overtimeMinutes > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                    +{formatMinutes(item.overtimeMinutes)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </TableCell>

                              {/* Status */}
                              <TableCell className="py-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <StatusPill status={item.status} />
                                  {st === "on_leave" && (item.leaveType || item.leaveDates) && (
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                      {[item.leaveType, item.leaveDates].filter(Boolean).join(" · ")}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="py-3 pr-4 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={() => handleViewClick(item)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </Button>
                              </TableCell>
                            </>
                          )}

                          {isOvertimeCategory && (
                            <>
                              <TableCell className="py-3 text-sm text-gray-700 dark:text-gray-300 tabular-nums">{item.date || "—"}</TableCell>
                              <TableCell className="py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                  {formatMinutes(Math.round(Number(item.hours || 0) * 60))}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[320px] truncate" title={item.reason}>
                                {item.reason && item.reason !== "N/A" ? item.reason : "—"}
                              </TableCell>
                              <TableCell className="py-3 pr-4">
                                <StatusPill status={item.status} />
                              </TableCell>
                            </>
                          )}

                          {isTaskCategory && (
                            <>
                              <TableCell className="py-3 text-xs font-medium text-gray-700 dark:text-gray-300">{item.priority || "—"}</TableCell>
                              <TableCell className="py-3 text-xs text-gray-600 dark:text-gray-400">{item.deadline || "—"}</TableCell>
                              <TableCell className="py-3 pr-4 text-xs font-semibold text-gray-700 dark:text-gray-300">{item.status || "—"}</TableCell>
                            </>
                          )}
                          {isProjectCategory && (
                            <>
                              <TableCell className="py-3 text-xs font-bold text-indigo-600">{item.progress}</TableCell>
                              <TableCell className="py-3 text-xs text-gray-600 dark:text-gray-400">{item.deadline || "—"}</TableCell>
                              <TableCell className="py-3 pr-4 text-xs font-semibold text-gray-700 dark:text-gray-300">{item.status || "—"}</TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer (same as Attendance) */}
            {total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Showing <strong className="text-gray-700 dark:text-gray-200">{startIndex + 1}</strong> to{" "}
                    <strong className="text-gray-700 dark:text-gray-200">{endIndex}</strong> of{" "}
                    <strong className="text-gray-700 dark:text-gray-200">{total}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="hidden sm:inline">Rows per page:</span>
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
                          <SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>
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
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Previous
                  </Button>
                  {getPaginationRange(validPage, totalPages).map((p, i) =>
                    p === "..." ? (
                      <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">...</span>
                    ) : (
                      <Button
                        key={`p-${p}`}
                        variant={p === validPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(Number(p))}
                        className={`h-8 w-8 p-0 text-xs font-semibold rounded-lg ${
                          p === validPage
                            ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        }`}
                      >
                        {p}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={validPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Employee Activity Timeline Dialog (Centered Modal) ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl w-[95vw] max-h-[88vh] overflow-hidden p-0 gap-0 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
          {selectedEmployee && (
            <div className="flex flex-col h-full max-h-[88vh]">
              {/* Dialog Header Banner */}
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 pt-6 pb-5 pr-12">
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-full font-semibold text-base flex items-center justify-center shrink-0 ${avatarColor(selectedEmployee.name || "")}`}>
                    {selectedEmployee.name
                      ? selectedEmployee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {selectedEmployee.name || "Employee Details"}
                      </DialogTitle>
                      {(() => {
                        const st = (selectedEmployee.status || "").toLowerCase();
                        if (st === "present" || st === "working") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Present
                            </span>
                          );
                        } else if (st === "late") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="size-1.5 rounded-full bg-amber-500" />
                              {selectedEmployee.late || "Late"}
                            </span>
                          );
                        } else if (st === "break") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                              <span className="size-1.5 rounded-full bg-orange-500" />
                              On Break
                            </span>
                          );
                        } else if (st === "on_leave" || st === "leave") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <span className="size-1.5 rounded-full bg-purple-500" />
                              On Leave
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="size-1.5 rounded-full bg-rose-500" />
                              Absent
                            </span>
                          );
                        }
                      })()}
                    </div>
                    <DialogDescription className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3.5 text-gray-400" />
                        <span className="font-semibold text-gray-700">{selectedEmployee.department || "No Department"}</span>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon className="size-3.5 text-gray-400" />
                        <span>{selectedDate}</span>
                      </span>
                      {selectedEmployee.email && selectedEmployee.email !== "N/A" && (
                        <>
                          <span>•</span>
                          <span className="text-gray-400 truncate max-w-[200px]">{selectedEmployee.email}</span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {/* Clock In */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Clock in</span>
                      <div className="size-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <LogIn className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 truncate">
                      {selectedEmployee.clockIn || "—"}
                    </p>
                  </div>

                  {/* Clock Out */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Clock out</span>
                      <div className="size-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <LogOut className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 truncate">
                      {selectedEmployee.clockOut || "—"}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Status</span>
                      <div className="size-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <UserCheck className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">
                      {selectedEmployee.status || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity Timeline Scrollable Section */}
              <div className="px-6 py-5 overflow-y-auto flex-1 bg-white dark:bg-gray-950">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Clock className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity timeline</h3>
                  </div>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs font-semibold px-2.5 py-0.5">
                    {selectedEmployee.activities?.length || 0} Entries
                  </Badge>
                </div>

                {selectedEmployee.activities?.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-3">
                    {selectedEmployee.activities.map((act: any, idx: number) => {
                      const isTask = act.type === "task";
                      const startTimeFormatted = formatTime(act.startTime);
                      const endTimeFormatted = act.endTime ? formatTime(act.endTime) : null;

                      return (
                        <div key={act.id || idx} className="relative group">
                          {/* Timeline Dot */}
                          <div
                            className={`absolute -left-[31px] top-1.5 size-4 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                              isTask ? "bg-indigo-600" : "bg-amber-500"
                            }`}
                          />

                          {/* Card Content */}
                          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:border-blue-200 rounded-xl p-3.5 transition-colors">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`size-6 rounded-lg flex items-center justify-center ${
                                    isTask ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                                  }`}
                                >
                                  {isTask ? <PlayCircle className="size-3.5" /> : <Coffee className="size-3.5" />}
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-gray-900 capitalize">
                                  {act.type || "Activity"}
                                </span>
                              </div>

                              <span className="text-xs font-medium tabular-nums text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-md">
                                {startTimeFormatted} {endTimeFormatted && `→ ${endTimeFormatted}`}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 pt-1.5 border-t border-gray-200/60 mt-2">
                              <span className="flex items-center gap-1 font-medium">
                                <span>Duration:</span>
                                <span className="font-bold text-gray-800">
                                  {calculateDuration(act.startTime, act.endTime)}
                                </span>
                              </span>

                              {act.taskId && (
                                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                                  Task #{act.taskId}
                                </span>
                              )}
                            </div>

                            {act.idleDetected && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
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
                  <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 my-2">
                    <div className="size-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2.5">
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
        </DialogContent>
      </Dialog>
    </div>
  );
};