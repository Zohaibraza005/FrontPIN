import React, { useEffect, useState, useCallback } from "react";
import { dashboardAPI, locationAPI, departmentAPI } from "../services/api";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useNavigate, useParams, useSearchParams } from "react-router";
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
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  Fingerprint,
  ArrowDownRight,
  ArrowUpRight,
  Pencil
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";

export const StatsDetails: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Locations & Departments state
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Modal Dialog state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedDate = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const selectedLocation = searchParams.get("location") || localStorage.getItem("selectedLocation") || "ALL";
  const selectedDepartment = searchParams.get("department") || "all";

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
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, [setSearchParams]);

  // Fetch location list
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await locationAPI.getAll();
        if (res.data || res.locations) {
          setLocations(res.data || res.locations || []);
        } else if (Array.isArray(res)) {
          setLocations(res);
        }
      } catch (err) {
        console.error("Locations fetch error:", err);
      }
    };
    fetchLocations();
  }, []);

  // Fetch department list
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await departmentAPI.getDepartments();
        if (res.data || res.departments) {
          setDepartments(res.data || res.departments || []);
        } else if (Array.isArray(res)) {
          setDepartments(res);
        }
      } catch (err) {
        console.error("Departments fetch error:", err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch stats details with silent refresh support
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!category) return;
      if (!isSilent) setLoading(true);
      setRefreshing(true);
      try {
        const response = await dashboardAPI.getStatsDetails(category, selectedDate, selectedLocation, selectedDepartment);
        setData(response.list || []);
      } catch (err) {
        console.error("Stats details load error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, selectedDate, selectedLocation, selectedDepartment]
  );

  // Initial load & parameter changes
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Real-time polling every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const todayStr = new Date().toISOString().split("T")[0];
  const isNextDisabled = selectedDate >= todayStr;

  const handleDateChange = (newDate: string) => {
    if (newDate && newDate > todayStr) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", newDate);
      return next;
    });
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const prevStr = format(d, "yyyy-MM-dd");
    handleDateChange(prevStr);
  };

  const handleNextDay = () => {
    if (isNextDisabled) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextStr = format(d, "yyyy-MM-dd");
    if (nextStr > todayStr) return;
    handleDateChange(nextStr);
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

  const handleDepartmentChange = (newDept: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!newDept || newDept === "all") {
        next.delete("department");
      } else {
        next.set("department", newDept);
      }
      return next;
    });
  };

  const getTitle = (cat?: string) => {
    if (!cat) return "Details";
    if (cat === "late-tardy" || cat === "late-today") return "Late / Tardy";
    if (cat === "present-today") return "Present Today";
    if (cat === "absent-today") return "Absent Today";
    if (cat === "on-leave") return "On Leave";
    if (cat === "total-employees") return "Total Employees";
    if (cat === "overtime-requests" || cat === "overtime") return "Overtime Requests";
    return cat
      .split("-")
      .map((word) => word.charAt(0)?.toUpperCase() + word.slice(1))
      .join(" ");
  };

  const isTaskCategory = category?.includes("task");
  const isProjectCategory = category?.includes("project");
  const isAttendanceCategory = !isTaskCategory && !isProjectCategory;

  const handleViewClick = (employee: any) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    return format(new Date(isoString), "hh:mm a");
  };

  const formatMinutes = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes <= 0) return "0h 0m";
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const convertTo12Hour = (time24: string) => {
    if (!time24) return "09:00 AM";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const PASTEL_AVATAR_PALETTE = [
    { bg: "bg-purple-100 text-purple-700" },
    { bg: "bg-rose-100 text-rose-700" },
    { bg: "bg-fuchsia-100 text-fuchsia-700" },
    { bg: "bg-blue-100 text-blue-700" },
    { bg: "bg-amber-100 text-amber-700" },
    { bg: "bg-cyan-100 text-cyan-800" },
    { bg: "bg-emerald-100 text-emerald-800" },
    { bg: "bg-indigo-100 text-indigo-700" },
  ];

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return "Ongoing";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 1000 / 60);
    return mins > 0 ? `${mins} min` : "<1 min";
  };

  const getEmployeePunches = (emp: any) => {
    if (!emp) return [];
    let punches: any[] = [];
    if (Array.isArray(emp.punches) && emp.punches.length > 0) {
      punches = [...emp.punches];
    } else if ((emp.clockIn && emp.clockIn !== "—") || (emp.clockOut && emp.clockOut !== "—")) {
      if (emp.clockIn && emp.clockIn !== "—") {
        punches.push({
          id: `cin-${emp.id}`,
          type: "CHECK_IN",
          punchTime: emp.checkInTime || null,
          displayTime: emp.clockIn,
          device: emp.checkInDevice || "Biometric Terminal",
          method: emp.checkInMethod || "Biometric",
          ip: emp.checkInIP || null,
        });
      }
      if (emp.clockOut && emp.clockOut !== "—") {
        punches.push({
          id: `cout-${emp.id}`,
          type: "CHECK_OUT",
          punchTime: emp.checkOutTime || null,
          displayTime: emp.clockOut,
          device: emp.checkInDevice || "Biometric Terminal",
          method: "Biometric",
          ip: null,
        });
      }
    }
    return punches;
  };

  const formatPunchTimestamp = (punch: any) => {
    if (punch.punchTime) {
      try {
        return format(new Date(punch.punchTime), "hh:mm:ss a");
      } catch {
        return punch.displayTime || "—";
      }
    }
    return punch.displayTime || "—";
  };

  const formatPunchDate = (punch: any) => {
    if (punch.punchTime) {
      try {
        return format(new Date(punch.punchTime), "MMM d, yyyy");
      } catch {
        return selectedDate;
      }
    }
    return selectedDate;
  };

  // Filter list based on real-time search query and department
  const filteredData = data.filter((item) => {
    if (selectedDepartment && selectedDepartment !== "all") {
      const targetDept = departments.find((d) => String(d.id) === String(selectedDepartment));
      const targetTitle = (targetDept?.title || targetDept?.name || "").toLowerCase();
      const itemDept = String(item.department || "").toLowerCase();
      const itemDeptId = String(item.departmentId || "");
      const matchesId = itemDeptId === String(selectedDepartment);
      const matchesTitle = Boolean(targetTitle && itemDept === targetTitle);
      if (!matchesId && !matchesTitle) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.name || item.title || "").toLowerCase();
    const email = (item.email || "").toLowerCase();
    const dept = (item.department || "").toLowerCase();
    const status = (item.status || "").toLowerCase();
    return name.includes(q) || email.includes(q) || dept.includes(q) || status.includes(q);
  });

  // Get Category Icon & Theme
  const getCategoryTheme = () => {
    if (category === "late-tardy" || category === "late-today") {
      return {
        icon: AlertTriangle,
        color: "amber",
        bg: "bg-amber-50 text-amber-600 border-amber-200",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
        sub: "Employees who checked in after scheduled start time",
      };
    }
    if (category === "present-today") {
      return {
        icon: UserCheck,
        color: "emerald",
        bg: "bg-emerald-50 text-emerald-600 border-emerald-200",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
        sub: "Employees currently checked in or present today",
      };
    }
    if (category === "absent-today") {
      return {
        icon: UserX,
        color: "rose",
        bg: "bg-rose-50 text-rose-600 border-rose-200",
        badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
        sub: "Employees with no attendance record and not on approved leave",
      };
    }
    if (category === "on-leave") {
      return {
        icon: CalendarOff,
        color: "purple",
        bg: "bg-purple-50 text-purple-600 border-purple-200",
        badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
        sub: "Employees on approved leave today",
      };
    }
    if (category === "overtime-requests" || category === "overtime") {
      return {
        icon: Timer,
        color: "indigo",
        bg: "bg-indigo-50 text-indigo-600 border-indigo-200",
        badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-200",
        sub: "Overtime logs and requests submitted",
      };
    }
    return {
      icon: Users,
      color: "blue",
      bg: "bg-blue-50 text-blue-600 border-blue-200",
      badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
      sub: `Detailed list breakdown for ${getTitle(category)}`,
    };
  };

  const theme = getCategoryTheme();
  const CategoryIcon = theme.icon;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Top Header & Action Controls (All in One Row) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
            className="size-10 rounded-xl hover:bg-gray-100 shrink-0 border-gray-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Button>

          <div className="flex items-center gap-3">
            <div className={`size-11 rounded-xl flex items-center justify-center border shrink-0 ${theme.bg}`}>
              <CategoryIcon className="size-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 whitespace-nowrap">{getTitle(category)}</h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">{theme.sub}</p>
            </div>
          </div>
        </div>

        {/* Right Controls: Date Navigation, Date Picker, Department, Location, Refresh (Styled same as Attendance Management) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Date Navigation */}
          <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-gray-200 shadow-2xs shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900 rounded-lg"
              onClick={handlePrevDay}
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
              onClick={handleNextDay}
              disabled={isNextDisabled}
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Date Picker Box */}
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs shrink-0 h-9">
            <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-gray-900 cursor-pointer text-xs"
            />
            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => handleDateChange(todayStr)}
                className="text-[11px] font-semibold px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-xs ml-0.5"
              >
                Today
              </button>
            )}
          </div>

          {/* Department SearchableSelect */}
          <SearchableSelect
            className="w-32 sm:w-36 shrink-0 h-9 rounded-xl border-gray-200 bg-white text-xs font-semibold shadow-2xs"
            icon={<Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            placeholder="Department"
            searchPlaceholder="Search department..."
            value={selectedDepartment}
            onValueChange={handleDepartmentChange}
            options={[
              { value: "all", label: "All Departments" },
              ...departments.map((d) => ({
                value: String(d.id),
                label: d.title || d.name,
              })),
            ]}
          />

          {/* Location SearchableSelect */}
          <SearchableSelect
            className="w-32 sm:w-36 shrink-0 h-9 rounded-xl border-gray-200 bg-white text-xs font-semibold shadow-2xs"
            icon={<MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            placeholder="Location"
            searchPlaceholder="Search location..."
            value={selectedLocation.toLowerCase() === "all" ? "all" : selectedLocation}
            onValueChange={handleLocationChange}
            options={[
              { value: "all", label: "All Locations" },
              ...locations.map((loc) => ({
                value: String(loc.id),
                label: loc.name || loc.companyName || `Location #${loc.id}`,
              })),
            ]}
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-gray-200 hover:bg-gray-50 bg-white text-gray-700 shadow-2xs"
          >
            <RefreshCw className={`size-3.5 text-gray-600 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Main Data Card with Search & Table ── */}
      <Card className="border border-gray-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>{getTitle(category)} List</span>
              <Badge variant="outline" className="bg-white border-gray-200 text-gray-700 text-xs">
                {filteredData.length} Records
              </Badge>
            </CardTitle>
          </div>

          {/* Real-Time Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-white border-gray-200 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <div className="size-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">Loading details...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-16 text-center px-4">
              <div className="size-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <CategoryIcon className="size-6" />
              </div>
              <h3 className="text-base font-bold text-gray-800">No Records Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No records matched your selected date ({selectedDate}), location filter, or search term.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[560px] w-full">
              <Table className="w-full text-xs">
                <TableHeader className="bg-gray-50/80 sticky top-0 z-10 shadow-2xs">
                  <TableRow>
                    {isAttendanceCategory ? (
                      <>
                        <TableHead className="pl-4 font-semibold text-[11px] text-gray-400 uppercase tracking-wider py-2.5">EMPLOYEE</TableHead>
                        <TableHead className="font-semibold text-[11px] text-gray-400 uppercase tracking-wider py-2.5 px-2">CHECK IN</TableHead>
                        <TableHead className="font-semibold text-[11px] text-gray-400 uppercase tracking-wider py-2.5 px-2">CHECK OUT</TableHead>
                        <TableHead className="font-semibold text-[11px] text-gray-400 uppercase tracking-wider py-2.5 px-2">WORKED</TableHead>
                        <TableHead className="font-semibold text-[11px] text-gray-400 uppercase tracking-wider py-2.5 px-2">OVERTIME</TableHead>
                        <TableHead className="font-semibold text-[11px] text-gray-400 uppercase tracking-wider py-2.5 px-2">STATUS</TableHead>
                        <TableHead className="pr-4 font-semibold text-[11px] text-gray-400 uppercase tracking-wider text-right py-2.5 whitespace-nowrap">ACTIONS</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="font-bold text-gray-700 text-xs pl-4 py-2.5">Employee / Name</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs py-2.5 px-2">Department</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs py-2.5 px-2">Status</TableHead>
                        {isTaskCategory && (
                          <>
                            <TableHead className="font-bold text-gray-700 text-xs py-2.5 px-2">Priority</TableHead>
                            <TableHead className="font-bold text-gray-700 text-xs py-2.5 px-2">Deadline</TableHead>
                          </>
                        )}
                        {isProjectCategory && (
                          <TableHead className="font-bold text-gray-700 text-xs py-2.5 px-2">Progress</TableHead>
                        )}
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => {
                    const st = (item.status || "").toLowerCase();
                    const isLateItem = item.isLate || st === "late" || (item.late && item.late !== "N/A" && item.late !== "On time");

                    if (isAttendanceCategory) {
                      const avatarSeed = Number(item.id) || (item.name || "").charCodeAt(0) || 0;
                      const avatarStyle = PASTEL_AVATAR_PALETTE[Math.abs(avatarSeed) % PASTEL_AVATAR_PALETTE.length];

                      const initials = item.name
                        ? item.name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                        : "U";

                      const empCode = item.empCode || item.employeeId || (item.id ? `US-${item.id}` : "");
                      const deptTitle = item.department && item.department !== "N/A" ? item.department : "";
                      const subtitle = [empCode, deptTitle].filter(Boolean).join(" · ") || (item.email !== "N/A" ? item.email : "");

                      return (
                        <TableRow
                          key={item.id || idx}
                          onClick={() => handleViewClick(item)}
                          className="hover:bg-gray-50/60 transition-colors border-b border-gray-100 cursor-pointer"
                        >
                          {/* EMPLOYEE */}
                          <TableCell className="pl-4 py-2.5 min-w-[170px]">
                            <div className="flex items-center gap-2.5">
                              <div className={`size-8 rounded-full ${avatarStyle.bg} flex items-center justify-center font-bold text-xs shrink-0 select-none`}>
                                {initials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight truncate">
                                  {item.name || "N/A"}
                                </span>
                                {subtitle && (
                                  <span className="text-[11px] text-gray-400 font-normal mt-0.5 truncate max-w-[160px]">
                                    {subtitle}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* CHECK IN */}
                          <TableCell className="py-2.5 px-2 whitespace-nowrap">
                            {item.clockIn && item.clockIn !== "—" ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{item.clockIn}</span>
                                </div>
                                {isLateItem && item.late && item.late !== "On time" ? (
                                  <span className="text-[10px] text-amber-600 font-medium pl-3 mt-0.5">
                                    {item.late}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-gray-400 pl-1.5">—</span>
                            )}
                          </TableCell>

                          {/* CHECK OUT */}
                          <TableCell className="py-2.5 px-2 whitespace-nowrap">
                            {item.clockOut && item.clockOut !== "—" ? (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span>{item.clockOut}</span>
                              </div>
                            ) : (item.clockIn && item.clockIn !== "—" && st !== "absent") ? (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>On shift</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 pl-1.5">—</span>
                            )}
                          </TableCell>

                          {/* WORKED */}
                          <TableCell className="py-2.5 px-2 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-gray-800 font-mono">
                                {item.totalWorkedMinutes > 0 ? formatMinutes(item.totalWorkedMinutes) : "0h 0m"}
                              </span>
                              <span className="text-[10px] text-gray-400 font-normal mt-0.5">
                                Shift {convertTo12Hour(item.shiftStartTime || "09:00")} – {convertTo12Hour(item.shiftEndTime || "18:00")}
                              </span>
                            </div>
                          </TableCell>

                          {/* OVERTIME */}
                          <TableCell className="py-2.5 px-2 whitespace-nowrap">
                            {item.overtimeMinutes > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                +{formatMinutes(item.overtimeMinutes)}
                              </span>
                            ) : (
                              <span className="text-gray-400 pl-1">—</span>
                            )}
                          </TableCell>

                          {/* STATUS */}
                          <TableCell className="py-2.5 px-2 whitespace-nowrap">
                            <div className="flex items-center">
                              {(() => {
                                let label = "Absent";
                                let dotColor = "bg-rose-500";
                                let badgeCls = "bg-rose-50 text-rose-700 border-rose-200/80";

                                if (st === "present" || st === "working") {
                                  label = "Present";
                                  dotColor = "bg-emerald-500";
                                  badgeCls = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
                                } else if (st === "tardy" || st === "late" || isLateItem) {
                                  label = "Tardy";
                                  dotColor = "bg-amber-500";
                                  badgeCls = "bg-amber-50 text-amber-700 border-amber-200/80";
                                } else if (st === "on_leave" || st === "on leave" || st === "leave") {
                                  label = "Leave";
                                  dotColor = "bg-sky-500";
                                  badgeCls = "bg-sky-50 text-sky-700 border-sky-200/80";
                                } else if (st === "off_day" || st === "off") {
                                  label = "Off Day";
                                  dotColor = "bg-slate-400";
                                  badgeCls = "bg-slate-50 text-slate-700 border-slate-200/80";
                                } else if (st === "upcoming" || st === "upcoming_day") {
                                  label = "Upcoming";
                                  dotColor = "bg-gray-400";
                                  badgeCls = "bg-gray-50 text-gray-600 border-gray-200/80";
                                } else if (st === "break") {
                                  label = "Break";
                                  dotColor = "bg-orange-500";
                                  badgeCls = "bg-orange-50 text-orange-700 border-orange-200/80";
                                }

                                return (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeCls}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                                    <span>{label}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </TableCell>

                          {/* ACTIONS */}
                          <TableCell className="py-2.5 text-right pr-4 pl-2 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-medium text-gray-700 hover:text-gray-900 border-gray-200 hover:bg-gray-50 rounded-md gap-1 shadow-2xs transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewClick(item);
                                }}
                              >
                                <Eye className="w-3 h-3 text-gray-400" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-medium text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50/60 rounded-md gap-1 shadow-2xs transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/attendance");
                                }}
                              >
                                <Pencil className="w-3 h-3 text-blue-500" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // Task or Project row
                    return (
                      <TableRow
                        key={item.id || idx}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        <TableCell className="pl-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {item.title
                                ? item.title.slice(0, 2).toUpperCase()
                                : "T"}
                            </div>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-gray-900 leading-snug">
                                {item.title || item.name || "N/A"}
                              </p>
                              {item.assignees && (
                                <p className="text-[11px] text-gray-500 font-medium">{item.assignees}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-2">
                          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 text-[10px] font-semibold">
                            {item.project || item.client || item.department || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 px-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {item.status || "Pending"}
                          </span>
                        </TableCell>
                        {isTaskCategory && (
                          <>
                            <TableCell className="py-2.5 px-2 font-medium text-xs text-gray-700">{item.priority || "N/A"}</TableCell>
                            <TableCell className="py-2.5 px-2 text-xs text-gray-600">
                              {item.deadline || "N/A"}
                            </TableCell>
                          </>
                        )}
                        {isProjectCategory && (
                          <TableCell className="py-2.5 px-2 text-xs font-bold text-indigo-600">{item.progress}</TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Employee Activity Timeline Dialog (Centered Modal) ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl w-[95vw] max-h-[88vh] overflow-hidden p-0 rounded-2xl bg-white border border-gray-100 shadow-2xl flex flex-col">
          {selectedEmployee && (
            <div className="flex flex-col h-full max-h-[88vh]">
              {/* Dialog Header Banner */}
              <div className="bg-gradient-to-b from-gray-50/90 to-white border-b border-gray-100 p-5 sm:p-6 pr-12">
                <div className="flex items-center gap-4">
                  <div className="size-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-base sm:text-lg flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                    {selectedEmployee.name
                      ? selectedEmployee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 truncate">
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
                        } else if (st === "tardy" || st === "late" || selectedEmployee.isLate) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="size-1.5 rounded-full bg-amber-500" />
                              {selectedEmployee.late || "Tardy"}
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
                        <Clock className="size-3.5 text-indigo-500" />
                        <span className="font-semibold text-indigo-700">
                          {convertTo12Hour(selectedEmployee.shiftStartTime || "09:00")} – {convertTo12Hour(selectedEmployee.shiftEndTime || "18:00")}
                        </span>
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

                {/* Metric Cards (Schedule, Clock In, Clock Out, Status) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  {/* Today's Schedule */}
                  <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Schedule</span>
                      <div className="size-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Clock className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold font-mono text-gray-900 truncate" title={`${convertTo12Hour(selectedEmployee.shiftStartTime || "09:00")} – ${convertTo12Hour(selectedEmployee.shiftEndTime || "18:00")}`}>
                      {convertTo12Hour(selectedEmployee.shiftStartTime || "09:00")} – {convertTo12Hour(selectedEmployee.shiftEndTime || "18:00")}
                    </p>
                  </div>

                  {/* Clock In */}
                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Clock In</span>
                      <div className="size-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <LogIn className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold font-mono text-gray-900 truncate">
                      {selectedEmployee.clockIn || "—"}
                    </p>
                  </div>

                  {/* Clock Out */}
                  <div className="bg-rose-50/70 border border-rose-200/60 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Clock Out</span>
                      <div className="size-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <LogOut className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold font-mono text-gray-900 truncate">
                      {selectedEmployee.clockOut && selectedEmployee.clockOut !== "—" ? (
                        selectedEmployee.clockOut
                      ) : selectedEmployee.clockIn && selectedEmployee.clockIn !== "—" && (selectedEmployee.status || "").toLowerCase() !== "absent" ? (
                        <span className="text-emerald-600 font-sans font-semibold text-xs">On shift</span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Status</span>
                      <div className="size-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <UserCheck className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 capitalize truncate">
                      {selectedEmployee.status || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Punch Logs & Activity Timeline Scrollable Section */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white space-y-6">
                {/* 🧾 Daily Attendance Punches */}
                {(() => {
                  const displayPunches = getEmployeePunches(selectedEmployee);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Fingerprint className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-gray-900">
                              Punch Logs ({displayPunches.length})
                            </h3>
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">
                          Real-time Device Logs
                        </span>
                      </div>

                      {displayPunches.length > 0 ? (
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                            {displayPunches.map((punch: any, idx: number) => {
                              const isCheckIn = punch.type === "CHECK_IN";
                              const isCheckOut = punch.type === "CHECK_OUT";

                              return (
                                <div
                                  key={punch.id || idx}
                                  className="p-3 hover:bg-gray-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                                >
                                  {/* Punch # and Direction */}
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                      #{idx + 1}
                                    </span>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider shrink-0 ${
                                            isCheckIn
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                              : isCheckOut
                                              ? "bg-blue-50 text-blue-700 border-blue-300"
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
                                        <span className="font-semibold text-gray-900 truncate">
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
                                    <div className="font-bold text-gray-900 font-mono text-xs">
                                      {formatPunchTimestamp(punch)}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-mono">
                                      {formatPunchDate(punch)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic py-4 text-center bg-gray-50/80 rounded-xl border border-dashed border-gray-200">
                          No raw biometric punches recorded for this date.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Activity Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Clock className="size-4" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900">Activity Timeline</h3>
                    </div>
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs font-semibold px-2.5 py-0.5">
                      {selectedEmployee.activities?.length || 0} Entries
                    </Badge>
                  </div>

                  {selectedEmployee.activities?.length > 0 ? (
                    <div className="relative pl-6 border-l-2 border-indigo-100 space-y-4">
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
                            <div className="bg-gray-50/50 hover:bg-white border border-gray-200/80 hover:border-indigo-200 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all">
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

                                <span className="text-xs font-semibold font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
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
                    <div className="text-center py-8 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 my-2">
                      <div className="size-10 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
                        <Clock className="size-5" />
                      </div>
                      <h4 className="text-xs font-bold text-gray-800">No Activity Logs</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs mx-auto">
                        No desktop task transitions or break logs recorded for this employee today.
                      </p>
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