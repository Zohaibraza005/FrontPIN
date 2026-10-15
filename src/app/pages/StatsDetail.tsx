import React, { useEffect, useState, useCallback } from "react";
import { dashboardAPI, locationAPI, departmentAPI } from "../services/api";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { avatarColor } from "../utils/avatar";
import { DatePicker } from "../components/ui/date-picker";
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
  Timer
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

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return "Ongoing";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 1000 / 60);
    return mins > 0 ? `${mins} min` : "<1 min";
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

      {/* ── Main Data Card with filters, search & table ── */}
      <Card className="gap-0 shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Filters: date, department, location, refresh */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Date Navigation */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-950 p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs shrink-0">
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
            <div className="inline-flex items-center gap-2 shrink-0">
              <DatePicker
                size="sm"
                required
                value={selectedDate}
                max={todayStr}
                onValueChange={(v) => {
                  if (v) handleDateChange(v);
                }}
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
              className="w-40 shrink-0 h-9 rounded-xl"
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
              className="w-40 shrink-0 h-9 rounded-xl"
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
              className="h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 shadow-2xs"
            >
              <RefreshCw className={`size-3.5 text-gray-600 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
            {/* Real-Time Search Bar */}
            <div className="relative w-full xl:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{getTitle(category)} List</CardTitle>
            <span className="px-1.5 py-0.5 rounded-md bg-gray-200/70 text-gray-600 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-bold tabular-nums">
              {filteredData.length}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="size-6 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading details...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-16 text-center px-4">
              <CategoryIcon className="size-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">No records found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No records matched your selected date ({selectedDate}), location filter, or search term.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[520px]">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <TableRow className="hover:bg-gray-50">
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pl-4">Employee</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Department</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</TableHead>
                    {isTaskCategory && (
                      <>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Priority</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Deadline</TableHead>
                      </>
                    )}
                    {isProjectCategory && (
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Progress</TableHead>
                    )}
                    {isAttendanceCategory && (
                      <>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clock In</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clock Out</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right pr-4">Action</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => {
                    const st = (item.status || "").toLowerCase();
                    const isLateItem = item.isLate || st === "late" || (item.late && item.late !== "N/A" && item.late !== "On time");

                    return (
                      <TableRow
                        key={item.id || idx}
                        onClick={() => isAttendanceCategory && handleViewClick(item)}
                        className="hover:bg-blue-50/40 dark:hover:bg-gray-900/40 transition-colors cursor-pointer"
                      >
                        {/* Employee / Name Cell */}
                        <TableCell className="pl-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`size-9 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 ${avatarColor(item.name || item.title || "")}`}>
                              {item.name
                                ? item.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                                : "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-snug">
                                {item.name || item.title || "N/A"}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.email || "No email"}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Department Cell */}
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{item.department || "—"}</span>
                        </TableCell>

                        {/* Status Cell */}
                        <TableCell className="py-3">
                          {(() => {
                            if (st === "present" || st === "working") {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Present
                                </span>
                              );
                            }
                            if (st === "late" || isLateItem) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                  <span className="size-1.5 rounded-full bg-amber-500" />
                                  {item.late || "Late"}
                                </span>
                              );
                            }
                            if (st === "break") {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800">
                                  <span className="size-1.5 rounded-full bg-orange-500" />
                                  Break
                                </span>
                              );
                            }
                            if (st === "on_leave" || st === "on leave" || st === "leave") {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                                  <span className="size-1.5 rounded-full bg-sky-500" />
                                  On Leave
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                <span className="size-1.5 rounded-full bg-rose-500" />
                                Absent
                              </span>
                            );
                          })()}
                        </TableCell>

                        {/* Task / Project specific columns */}
                        {isTaskCategory && (
                          <>
                            <TableCell className="py-3.5 font-medium text-xs text-gray-700">{item.priority || "N/A"}</TableCell>
                            <TableCell className="py-3.5 text-xs text-gray-600">
                              {item.deadline ? new Date(item.deadline).toLocaleDateString() : "N/A"}
                            </TableCell>
                          </>
                        )}
                        {isProjectCategory && (
                          <TableCell className="py-3.5 text-xs font-bold text-indigo-600">{item.progress}</TableCell>
                        )}

                        {/* Attendance Columns */}
                        {isAttendanceCategory && (
                          <>
                            <TableCell className="py-3.5 font-mono text-xs font-semibold text-gray-800">
                              <div className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>{item.clockIn || "—"}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 font-mono text-xs font-semibold text-gray-800">
                              <div className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span>{item.clockOut || "—"}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3 pr-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewClick(item);
                                }}
                                className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center ml-auto"
                              >
                                <Eye className="size-3.5" />
                                <span>Timeline</span>
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
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