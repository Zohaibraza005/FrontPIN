import React, { useEffect, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { leaveAPI, locationAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle
} from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "../components/ui/select";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Plus, Check, X, Eye, Trash2, Pencil, Calendar, ChevronLeft, ChevronRight, MapPin, Plane } from "lucide-react";
import { avatarColor } from "../utils/avatar";
import { DatePickerWithRange } from "../components/ui/date-range-picker";
import { toDate } from "../components/ui/date-picker";
import type { DateRange } from "react-day-picker";

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

export const Leave: React.FC = () => {
  const { user } = useAuth();

  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [newLeaveOpen, setNewLeaveOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const getInitialLeaveLoc = () => localStorage.getItem("selectedLocation") || "all";
  const [selectedLocation, setSelectedLocation] = useState(getInitialLeaveLoc);
  const [locations, setLocations] = useState<any[]>([]);

  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    locationAPI.getLocations().then((res) => setLocations(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const loc = e.detail || localStorage.getItem("selectedLocation") || "all";
      setSelectedLocation(loc);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);
const [selectedEmployee, setSelectedEmployee] = useState("");
const [employeeSummary, setEmployeeSummary] = useState<any>(null);
const [actionModalOpen, setActionModalOpen] = useState(false);
const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);
const [viewModalOpen, setViewModalOpen] = useState(false);
const [selectedLeave, setSelectedLeave] = useState<any>(null);

const [payType, setPayType] = useState<"PAID" | "UNPAID">("PAID");
const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
const [editModalOpen, setEditModalOpen] = useState(false);
const [editingLeave, setEditingLeave] = useState<any>(null);

const openEditModal = (leave: any) => {
  setEditingLeave(leave);
  setSelectedEmployee(String(leave.employeeId || leave.employee?.id || ""));
  setFormData({
    leaveTypeId: String(leave.leaveTypeId || leave.leaveType?.id || ""),
    startDate: leave.startDate ? leave.startDate.slice(0, 10) : "",
    endDate: leave.endDate ? leave.endDate.slice(0, 10) : "",
    reason: leave.reason || "",
  });
  setEditModalOpen(true);
};

const handleEditSubmit = async () => {
  if (!editingLeave) return;
  try {
    await leaveAPI.updateLeave(editingLeave.id, {
      leaveTypeId: Number(formData.leaveTypeId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
    });

    toast.success("Leave Request Updated Successfully");
    setEditModalOpen(false);
    setEditingLeave(null);
    loadLeaves();
  } catch (err: any) {
    toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Error updating leave request");
  }
};

const handleDelete = async () => {
  if (!deleteConfirm) return;
  try {
    await leaveAPI.deleteLeave(deleteConfirm.id);
    toast.success("Leave request deleted successfully");
    setDeleteConfirm(null);
    loadLeaves();
  } catch (err: any) {
    toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Failed to delete leave request");
  }
};
const openApproveModal = (id: number) => {
  setSelectedLeaveId(id);
  setActionType("APPROVED");
  setPayType("PAID");
  setActionModalOpen(true);
};

const openRejectModal = (id: number) => {
  setSelectedLeaveId(id);
  setActionType("REJECTED");
  setActionModalOpen(true);
};
const openViewModal = (leave: any) => {
  setSelectedLeave(leave);
  setViewModalOpen(true);
};
const calculateDays = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};


  const [formData, setFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // 🔹 Load leaves
  const loadLeaves = async () => {
    try {
      const data = await leaveAPI.getLeaves();
      setLeaves(data.leaves);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployees = async () => {
    const res = await leaveAPI.getEligibleEmployees();
    setEmployees(res.employees);
  };
  
  // 🔹 Load leave types
  const loadLeaveTypes = async () => {
    try {
      const data = await leaveAPI.getLeaveTypes({ all: true });
      setLeaveTypes(data.types);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLeaves();
    loadLeaveTypes();
    loadEmployees();
  }, []);
  const handleEmployeeSelect = async (id: string) => {
    setSelectedEmployee(id);
    const summary = await leaveAPI.getEmployeeLeaveSummary(Number(id));
    setEmployeeSummary(summary);
  };
  

  // 🔹 Approve
  const handleApprove = async (id: number) => {
    try {
      await leaveAPI.updateLeaveStatus(id, "APPROVED", "PAID");
      toast.success("Leave Approved");
      loadLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Error approving leave");
    }
  };

  // 🔹 Reject
  const handleReject = async (id: number) => {
    try {
      await leaveAPI.updateLeaveStatus(id, "REJECTED");
      toast.success("Leave Rejected");
      loadLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Error rejecting leave");
    }
  };

  // 🔹 Submit Leave
  const handleSubmit = async () => {
    try {
      await leaveAPI.createLeave({
        employeeId: Number(selectedEmployee),
        leaveTypeId: Number(formData.leaveTypeId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });

      toast.success("Leave Request Submitted");
      setNewLeaveOpen(false);
      setFormData({
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      loadLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Error submitting leave");
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      REJECTED: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    };
    return (
      <Badge variant="outline" className={`font-semibold text-xs rounded-full px-2.5 py-0.5 border ${map[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </Badge>
    );
  };

  const filteredLeaves = (leaves || []).filter((leave) => {
    if (selectedLocation !== "all") {
      const empCompId = String(leave.employee?.companyId || leave.employee?.company?.id || leave.employee?.locationId || "");
      if (empCompId !== String(selectedLocation)) return false;
    }

    if (dateFilter !== "all") {
      if (!leave.startDate || !leave.endDate) return false;
      const lStartStr = leave.startDate.slice(0, 10);
      const lEndStr = leave.endDate.slice(0, 10);
      const now = new Date();

      let filterStartStr = "";
      let filterEndStr = "";

      if (dateFilter === "this_week") {
        filterStartStr = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        filterEndStr = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      } else if (dateFilter === "this_month") {
        filterStartStr = format(startOfMonth(now), "yyyy-MM-dd");
        filterEndStr = format(endOfMonth(now), "yyyy-MM-dd");
      } else if (dateFilter === "this_year") {
        filterStartStr = format(startOfYear(now), "yyyy-MM-dd");
        filterEndStr = format(endOfYear(now), "yyyy-MM-dd");
      } else if (dateFilter === "custom") {
        if (dateRange?.from) {
          filterStartStr = format(dateRange.from, "yyyy-MM-dd");
          filterEndStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : filterStartStr;
        } else {
          filterStartStr = customStartDate;
          filterEndStr = customEndDate;
        }
      }

      if (filterStartStr && lEndStr < filterStartStr) return false;
      if (filterEndStr && lStartStr > filterEndStr) return false;
    }

    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, dateFilter, customStartDate, customEndDate, dateRange]);

  const totalItems = filteredLeaves.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

  const statusLabel: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };
  const statusDot: Record<string, string> = { PENDING: "bg-amber-500", APPROVED: "bg-emerald-500", REJECTED: "bg-rose-500" };
  const statusClass: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    REJECTED: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  };
  const StatusPill = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusClass[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status] || "bg-gray-400"}`} />
      {statusLabel[status] || status}
    </span>
  );
  const th = "h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
  const fieldLabel = "text-xs font-medium text-gray-600 dark:text-gray-400";
  const isManager = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
  const requestDays =
    formData.startDate && formData.endDate && formData.endDate >= formData.startDate
      ? calculateDays(formData.startDate, formData.endDate)
      : 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2">
      {/* Header + Request Button */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Leave Management</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Track, review, approve, and manage employee leave requests
          </p>
        </div>

        <Dialog open={newLeaveOpen} onOpenChange={setNewLeaveOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs rounded-xl">
              <Plus className="size-3.5" />
              Request Leave
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-start gap-3 pr-6">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">New leave request</DialogTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose the employee, leave type and dates</p>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-5 space-y-4">
              {employeeSummary && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Total</span>
                    <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">{employeeSummary.total}</span>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/40 px-3 py-2.5">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">Approved</span>
                    <span className="text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{employeeSummary.approved}</span>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/40 px-3 py-2.5">
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium block">Rejected</span>
                    <span className="text-base font-semibold tabular-nums text-rose-700 dark:text-rose-300">{employeeSummary.rejected}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className={fieldLabel}>Employee</Label>
                <SearchableSelect
                  className="w-full h-10"
                  placeholder="Select Employee"
                  searchPlaceholder="Search employee..."
                  value={selectedEmployee}
                  onValueChange={handleEmployeeSelect}
                  options={employees.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={fieldLabel}>Leave type</Label>
                <SearchableSelect
                  className="w-full h-10"
                  placeholder="Select Type"
                  searchPlaceholder="Search leave type..."
                  value={formData.leaveTypeId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, leaveTypeId: val })
                  }
                  options={leaveTypes?.map((type) => ({
                    value: String(type.id),
                    label: type.name,
                  })) || []}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={fieldLabel}>Leave dates</Label>
                <DatePickerWithRange
                  size="md"
                  align="start"
                  showPresets={false}
                  placeholder="Select start and end date"
                  date={formData.startDate ? { from: toDate(formData.startDate), to: toDate(formData.endDate) } : undefined}
                  setDate={(range) => {
                    const start = range?.from ? format(range.from, "yyyy-MM-dd") : "";
                    const end = range?.to ? format(range.to, "yyyy-MM-dd") : start;
                    setFormData({ ...formData, startDate: start, endDate: end });
                  }}
                />
              </div>
              {requestDays > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{requestDays} {requestDays === 1 ? "day" : "days"}</span> of leave
                </p>
              )}

              <div className="space-y-1.5">
                <Label className={fieldLabel}>Reason</Label>
                <Textarea
                  rows={3}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  placeholder="Reason for leave..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
              <Button variant="outline" className="h-10 rounded-lg" onClick={() => setNewLeaveOpen(false)}>
                Cancel
              </Button>
              <Button className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" onClick={handleSubmit}>
                Submit request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Requests Card & Table */}
      <Card className="gap-0 shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Leave Requests</CardTitle>
                <span className="px-1.5 py-0.5 rounded-md bg-gray-200/70 text-gray-600 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-bold tabular-nums">
                  {filteredLeaves?.length || 0}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Overview of active employee leave applications, date ranges, and approval status
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Select
                value={dateFilter}
                onValueChange={(val) => {
                  setDateFilter(val);
                  const now = new Date();
                  if (val === "this_week") {
                    setDateRange({
                      from: startOfWeek(now, { weekStartsOn: 1 }),
                      to: endOfWeek(now, { weekStartsOn: 1 }),
                    });
                  } else if (val === "this_month") {
                    setDateRange({
                      from: startOfMonth(now),
                      to: endOfMonth(now),
                    });
                  } else if (val === "this_year") {
                    setDateRange({
                      from: startOfYear(now),
                      to: endOfYear(now),
                    });
                  } else if (val === "all") {
                    setDateRange(undefined);
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }
                }}
              >
                <SelectTrigger className="w-[160px] min-w-[160px] h-9 text-sm rounded-xl bg-white dark:bg-gray-950 shrink-0 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20">
                  <div className="flex items-center gap-2 truncate">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <SelectValue placeholder="Filter Date" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === "custom" && (
                <DatePickerWithRange
                  date={dateRange}
                  setDate={(range) => {
                    setDateRange(range);
                    if (range?.from) {
                      setCustomStartDate(format(range.from, "yyyy-MM-dd"));
                      setCustomEndDate(range.to ? format(range.to, "yyyy-MM-dd") : format(range.from, "yyyy-MM-dd"));
                    } else {
                      setCustomStartDate("");
                      setCustomEndDate("");
                    }
                  }}
                  placeholder="Select custom date range..."
                  align="end"
                />
              )}

              {locations.length > 0 && (
                <SearchableSelect
                  className="w-[170px] h-9 rounded-xl shrink-0"
                  icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="Location"
                  searchPlaceholder="Search location..."
                  value={selectedLocation}
                  onValueChange={(val) => {
                    setSelectedLocation(val);
                    localStorage.setItem("selectedLocation", val);
                    localStorage.setItem("dashboard-selected-location", val);
                    window.dispatchEvent(new CustomEvent("location-changed", { detail: val }));
                  }}
                  options={[
                    { value: "all", label: "All Locations" },
                    ...locations.map((loc) => ({
                      value: String(loc.id),
                      label: loc.name,
                    })),
                  ]}
                />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-50/80">
                  <TableHead className={`${th} pl-4`}>Employee</TableHead>
                  <TableHead className={th}>Leave Type</TableHead>
                  <TableHead className={th}>Dates</TableHead>
                  <TableHead className={th}>Days</TableHead>
                  <TableHead className={th}>Status</TableHead>
                  {isManager && (
                    <TableHead className={`${th} text-right pr-4`}>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLeaves?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                        <Plane className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-medium">No leave requests found</p>
                        <p className="text-xs text-gray-400">Click 'Request Leave' to create a new leave application.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeaves?.map((leave) => {
                    const empName = `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`.trim();
                    const days = leave.startDate && leave.endDate ? calculateDays(leave.startDate, leave.endDate) : 0;
                    return (
                    <TableRow key={leave.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-900/40 transition-colors">
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${avatarColor(empName)}`}>
                            {leave.employee?.firstName?.charAt(0)}{(leave.employee?.lastName || "").charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{empName || "—"}</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{leave.employee?.employeeId || "—"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                          {leave.leaveType?.name || "General Leave"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">
                        {leave.startDate?.slice(0, 10)}
                        <span className="text-gray-300 dark:text-gray-600 mx-1.5">→</span>
                        {leave.endDate?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="py-3 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {days > 0 ? `${days}d` : "—"}
                      </TableCell>
                      <TableCell className="py-3"><StatusPill status={leave.status} /></TableCell>

                      {isManager && (
                        <TableCell className="py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-8 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                              onClick={() => openApproveModal(leave.id)}
                              title="Approve Leave"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-8 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                              onClick={() => openRejectModal(leave.id)}
                              title="Reject Leave"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                              onClick={() => openViewModal(leave)}
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950"
                              onClick={() => openEditModal(leave)}
                              title="Edit Leave Request"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                              onClick={() => setDeleteConfirm(leave)}
                              title="Delete Leave Request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Showing <strong className="text-gray-700 dark:text-gray-200">{startIndex + 1}</strong> to{" "}
                  <strong className="text-gray-700 dark:text-gray-200">{endIndex}</strong> of{" "}
                  <strong className="text-gray-700 dark:text-gray-200">{totalItems}</strong> leave requests
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
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[420px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete leave request</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Are you sure you want to delete this leave request? This action cannot be undone.
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" className="h-10 rounded-lg" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-10 rounded-lg" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject Modal */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="w-[92vw] sm:max-w-[440px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                actionType === "APPROVED"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
              }`}>
                {actionType === "APPROVED" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {actionType === "APPROVED" ? "Approve Leave" : "Reject Leave"}
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {actionType === "APPROVED"
                    ? "Choose whether this leave is paid or unpaid."
                    : "Are you sure you want to reject this leave request?"}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* APPROVE SECTION */}
          {actionType === "APPROVED" && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["PAID", "UNPAID"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPayType(opt)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    payType === opt
                      ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500 dark:bg-blue-950/40"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{opt === "PAID" ? "Paid" : "Unpaid"}</span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    {opt === "PAID" ? "Counts as paid leave" : "Deducted from salary"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              className="h-10 rounded-lg"
              onClick={() => setActionModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              className={`h-10 px-5 font-semibold rounded-lg text-white ${
                actionType === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
              onClick={async () => {
                try {
                  if (!selectedLeaveId) return;

                  await leaveAPI.updateLeaveStatus(
                    selectedLeaveId,
                    actionType!,
                    actionType === "APPROVED" ? payType : undefined
                  );

                  toast.success(
                    actionType === "APPROVED"
                      ? "Leave Approved Successfully"
                      : "Leave Rejected Successfully"
                  );

                  setActionModalOpen(false);
                  loadLeaves();

                } catch (error: any) {
                  toast.error(error?.response?.data?.message || error?.data?.message || error?.message || "Failed to update leave");
                }
              }}
            >
              {actionType === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
          {selectedLeave && (() => {
            const empName = `${selectedLeave.employee?.firstName || ""} ${selectedLeave.employee?.lastName || ""}`.trim();
            return (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-left">
                  <div className="flex items-start gap-3 pr-6">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${avatarColor(empName)}`}>
                      {selectedLeave.employee?.firstName?.charAt(0)}{(selectedLeave.employee?.lastName || "").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Leave details</DialogTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {empName || "Employee"}{selectedLeave.employee?.employeeId ? ` · ${selectedLeave.employee.employeeId}` : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <StatusPill status={selectedLeave.status} />
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                          {selectedLeave.leaveType?.name || "General Leave"}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Start</span>
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{selectedLeave.startDate.slice(0, 10)}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">End</span>
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{selectedLeave.endDate.slice(0, 10)}</span>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/40 px-3 py-2.5">
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block">Total</span>
                      <span className="text-sm font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                        {calculateDays(selectedLeave.startDate, selectedLeave.endDate)} days
                      </span>
                    </div>
                  </div>

                  {selectedLeave.status === "APPROVED" && (
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Pay type</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedLeave.payType || "—"}</span>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Reason</h4>
                    <div className="rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-900 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {selectedLeave.reason || "No reason provided"}
                    </div>
                  </div>
                </div>

                {(user?.role === "ADMIN" ||
                  user?.role === "SUPERVISOR" ||
                  (user?.id === selectedLeave.employeeId &&
                    selectedLeave.status === "PENDING")) && (
                  <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                    <Button
                      variant="outline"
                      className="h-10 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950 gap-1.5"
                      onClick={async () => {
                        try {
                          await leaveAPI.deleteLeave(selectedLeave.id);
                          toast.success("Leave Deleted");
                          setViewModalOpen(false);
                          loadLeaves();
                        } catch {
                          toast.error("Failed to delete leave");
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                    {user?.role === "ADMIN" && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="h-10 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950 gap-1.5"
                          onClick={() => openRejectModal(selectedLeave.id)}
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                        <Button
                          className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                          onClick={() => openApproveModal(selectedLeave.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Leave Request Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-left">
            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Edit leave request</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update the leave type, dates or reason</p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className={fieldLabel}>Leave type</Label>
              <SearchableSelect
                className="w-full h-10"
                placeholder="Select Type"
                searchPlaceholder="Search leave type..."
                value={formData.leaveTypeId}
                onValueChange={(val) =>
                  setFormData({ ...formData, leaveTypeId: val })
                }
                options={leaveTypes?.map((type) => ({
                  value: String(type.id),
                  label: type.name,
                })) || []}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={fieldLabel}>Leave dates</Label>
              <DatePickerWithRange
                size="md"
                align="start"
                showPresets={false}
                placeholder="Select start and end date"
                date={formData.startDate ? { from: toDate(formData.startDate), to: toDate(formData.endDate) } : undefined}
                setDate={(range) => {
                  const start = range?.from ? format(range.from, "yyyy-MM-dd") : "";
                  const end = range?.to ? format(range.to, "yyyy-MM-dd") : start;
                  setFormData({ ...formData, startDate: start, endDate: end });
                }}
              />
            </div>
            {requestDays > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{requestDays} {requestDays === 1 ? "day" : "days"}</span> of leave
              </p>
            )}

            <div className="space-y-1.5">
              <Label className={fieldLabel}>Reason</Label>
              <Textarea
                rows={3}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
            <Button variant="outline" className="h-10 rounded-lg" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" onClick={handleEditSubmit}>
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
