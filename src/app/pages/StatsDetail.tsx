import React, { useEffect, useState, useCallback } from "react";
import { dashboardAPI, locationAPI } from "../services/api";
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
  Sheet,
  SheetContent,
} from "../components/ui/sheet";
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
  Calendar as CalendarIcon,
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

  // Locations state
  const [locations, setLocations] = useState<any[]>([]);

  // Sheet state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedDate = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const selectedLocation = searchParams.get("location") || localStorage.getItem("selectedLocation") || "ALL";

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

  // Fetch stats details with silent refresh support
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!category) return;
      if (!isSilent) setLoading(true);
      setRefreshing(true);
      try {
        const response = await dashboardAPI.getStatsDetails(category, selectedDate, selectedLocation);
        setData(response.list || []);
      } catch (err) {
        console.error("Stats details load error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, selectedDate, selectedLocation]
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

  const handleDateChange = (newDate: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (newDate && newDate > todayStr) return;
    setSearchParams({ date: newDate, location: selectedLocation });
  };

  const handleLocationChange = (newLocation: string) => {
    localStorage.setItem("selectedLocation", newLocation);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: newLocation }));
    setSearchParams({ date: selectedDate, location: newLocation });
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
    setSheetOpen(true);
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

  // Filter list based on real-time search query
  const filteredData = data.filter((item) => {
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getTitle(category)}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">{theme.sub}</p>
            </div>
          </div>
        </div>

        {/* Right Controls: Date Picker, Location Dropdown, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700">
            <CalendarIcon className="size-4 text-gray-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-gray-900 cursor-pointer text-xs"
            />
          </div>

          <div className="flex items-center gap-2 min-w-[150px]">
            <Select 
              value={selectedLocation.toLowerCase() === "all" ? "all" : selectedLocation} 
              onValueChange={handleLocationChange}
            >
              <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-gray-50 border-gray-200">
                <MapPin className="size-3.5 text-gray-500 mr-1 shrink-0" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name || loc.companyName || `Location #${loc.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="h-9 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 border-gray-200 hover:bg-gray-50 bg-gray-50/50"
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
            <ScrollArea className="h-[520px]">
              <Table>
                <TableHeader className="bg-gray-50/80 sticky top-0 z-10 shadow-2xs">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 text-xs pl-6">Employee / Name</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Department</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Status</TableHead>
                    {isTaskCategory && (
                      <>
                        <TableHead className="font-bold text-gray-700 text-xs">Priority</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs">Deadline</TableHead>
                      </>
                    )}
                    {isProjectCategory && (
                      <TableHead className="font-bold text-gray-700 text-xs">Progress</TableHead>
                    )}
                    {isAttendanceCategory && (
                      <>
                        <TableHead className="font-bold text-gray-700 text-xs">Clock In</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs">Clock Out</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Action</TableHead>
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
                        className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        {/* Employee / Name Cell */}
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {item.name
                                ? item.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                                : "U"}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-900 leading-snug">
                                {item.name || item.title || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500 font-medium">{item.email || "No email"}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Department Cell */}
                        <TableCell className="py-3.5">
                          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 text-[11px] font-semibold">
                            {item.department || "N/A"}
                          </Badge>
                        </TableCell>

                        {/* Status Cell */}
                        <TableCell className="py-3.5">
                          {(() => {
                            if (st === "present" || st === "working") {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Present
                                </span>
                              );
                            }
                            if (st === "late" || isLateItem) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="size-3 text-amber-600" />
                                  {item.late || "Late"}
                                </span>
                              );
                            }
                            if (st === "break") {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                  Break
                                </span>
                              );
                            }
                            if (st === "on_leave" || st === "on leave" || st === "leave") {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  On Leave
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
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
                                <LogIn className="size-3.5 text-emerald-600 shrink-0" />
                                <span>{item.clockIn || "—"}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 font-mono text-xs font-semibold text-gray-800">
                              <div className="flex items-center gap-1.5">
                                <LogOut className="size-3.5 text-rose-600 shrink-0" />
                                <span>{item.clockOut || "—"}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 pr-6 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewClick(item);
                                }}
                                className="h-8 px-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 ml-auto"
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
        </CardContent>
      </Card>

      {/* ── Slide-Out Activity Timeline Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 overflow-y-auto bg-gray-50/50">
          {selectedEmployee && (
            <div className="flex flex-col min-h-full">
              {/* Sheet Banner Header */}
              <div className="bg-white border-b border-gray-100 p-6 shadow-2xs">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                    {selectedEmployee.name
                      ? selectedEmployee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate">
                      {selectedEmployee.name || "Employee Details"}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                      <span>{selectedEmployee.department || "No Department"}</span>
                      <span>•</span>
                      <span className="font-semibold text-gray-700">{selectedDate}</span>
                    </p>
                  </div>
                </div>

                {/* 3 Metric Cards inside Sheet */}
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
                      {selectedEmployee.clockIn || "—"}
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
                      {selectedEmployee.clockOut || "—"}
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
                        const st = (selectedEmployee.status || "").toLowerCase();
                        if (st === "present" || st === "working") {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              Present
                            </span>
                          );
                        } else if (st === "late") {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              {selectedEmployee.late || "Late"}
                            </span>
                          );
                        } else if (st === "break") {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
                              Break
                            </span>
                          );
                        } else if (st === "on_leave" || st === "leave") {
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
                    <h3 className="text-base font-bold text-gray-900">Activity Timeline</h3>
                  </div>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs font-semibold px-2.5 py-0.5">
                    {selectedEmployee.activities?.length || 0} Entries
                  </Badge>
                </div>

                {selectedEmployee.activities?.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-indigo-100 space-y-5">
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
                          <div className="bg-white border border-gray-200/80 hover:border-indigo-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`size-7 rounded-lg flex items-center justify-center ${
                                    isTask ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                                  }`}
                                >
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
    </div>
  );
};