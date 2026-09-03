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
import { Plus, Check, X, Eye, Trash2, Pencil, Calendar } from "lucide-react";

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
        filterStartStr = customStartDate;
        filterEndStr = customEndDate;
      }

      if (filterStartStr && lEndStr < filterStartStr) return false;
      if (filterEndStr && lStartStr > filterEndStr) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header + Request Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leave Management</h2>
          <p className="text-gray-500 text-sm">
            Track, review, approve, and manage employee leave requests
          </p>
        </div>

        <Dialog open={newLeaveOpen} onOpenChange={setNewLeaveOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm gap-2">
              <Plus className="size-4" />
              Request Leave
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
            </DialogHeader>
            {employeeSummary && (
              <div className="grid grid-cols-3 gap-4 text-center mt-3">
                <div className="p-3 bg-gray-100 rounded">
                  <p className="font-bold">{employeeSummary.total}</p>
                  <p>Total</p>
                </div>
                <div className="p-3 bg-green-100 rounded">
                  <p className="font-bold">{employeeSummary.approved}</p>
                  <p>Approved</p>
                </div>
                <div className="p-3 bg-red-100 rounded">
                  <p className="font-bold">{employeeSummary.rejected}</p>
                  <p>Rejected</p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <SearchableSelect
                  className="w-full"
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

              <div>
                <Label>Leave Type</Label>
                <SearchableSelect
                  className="w-full"
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

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />
              </div>

              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Redesigned Leave Requests Card & Table */}
      <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Leave Requests</CardTitle>
                <Badge variant="secondary" className="font-semibold text-xs rounded-full px-2.5">
                  {filteredLeaves?.length || 0} Total
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Overview of active employee leave applications, date ranges, and approval status
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[165px] min-w-[165px] h-9 text-sm bg-white dark:bg-gray-950 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
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
                <div className="flex items-center gap-2 bg-white dark:bg-gray-950 px-2.5 h-9 border border-gray-200 dark:border-gray-800 rounded-md shadow-xs shrink-0">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-7 w-[125px] text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-gray-700 dark:text-gray-200"
                  />
                  <span className="text-xs text-gray-400 font-medium">to</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-7 w-[125px] text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-gray-700 dark:text-gray-200"
                  />
                </div>
              )}

              {locations.length > 0 && (
                <SearchableSelect
                  className="w-[160px] h-9 text-sm bg-white dark:bg-gray-950 shrink-0"
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

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70 dark:bg-gray-900/70 hover:bg-gray-50/70">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Employee</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Leave Type</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Start Date</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">End Date</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                  {(user?.role === "ADMIN" || user?.role === "SUPERVISOR") && (
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right pr-6">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLeaves?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No leave requests found</p>
                        <p className="text-xs text-gray-400">Click 'Request Leave' to create a new leave application.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeaves?.map((leave) => (
                    <TableRow key={leave.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors">
                      <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {leave.employee?.firstName?.charAt(0)}{(leave.employee?.lastName || "").charAt(0)}
                          </div>
                          <span>{leave.employee?.firstName} {leave.employee?.lastName || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-medium text-xs">
                          {leave.leaveType?.name || "General Leave"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200/80 dark:bg-gray-900 dark:border-gray-800">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {leave.startDate?.slice(0, 10)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200/80 dark:bg-gray-900 dark:border-gray-800">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {leave.endDate?.slice(0, 10)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>

                      {(user?.role === "ADMIN" || user?.role === "SUPERVISOR") && (
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                              onClick={() => openApproveModal(leave.id)}
                              title="Approve Leave"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                              onClick={() => openRejectModal(leave.id)}
                              title="Reject Leave"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                              onClick={() => openViewModal(leave)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                              onClick={() => openEditModal(leave)}
                              title="Edit Leave Request"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                              onClick={() => setDeleteConfirm(leave)}
                              title="Delete Leave Request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Delete Leave Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this leave request? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {actionType === "APPROVED"
          ? "Approve Leave"
          : "Reject Leave"}
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">

      {/* APPROVE SECTION */}
      {actionType === "APPROVED" && (
        <div>
          <Label>Mark as Paid Leave?</Label>

          <Select
            value={payType}
            onValueChange={(val: any) => setPayType(val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* REJECT CONFIRMATION */}
      {actionType === "REJECTED" && (
        <p className="text-sm text-gray-600">
          Are you sure you want to reject this leave request?
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setActionModalOpen(false)}
        >
          Cancel
        </Button>

        <Button
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
          Confirm
        </Button>
      </div>

    </div>
  </DialogContent>
</Dialog>
<Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Leave Details</DialogTitle>
    </DialogHeader>

    {selectedLeave && (
      <div className="space-y-4">

        <div>
          <Label>Employee</Label>
          <p className="font-medium">
            {selectedLeave.employee?.firstName}{" "}
            {selectedLeave.employee?.lastName}
          </p>
        </div>

        <div>
          <Label>Leave Type</Label>
          <p>{selectedLeave.leaveType?.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <p>{selectedLeave.startDate.slice(0, 10)}</p>
          </div>
          <div>
            <Label>End Date</Label>
            <p>{selectedLeave.endDate.slice(0, 10)}</p>
          </div>
        </div>

        <div>
          <Label>Total Days</Label>
          <p className="font-semibold text-blue-600">
            {calculateDays(
              selectedLeave.startDate,
              selectedLeave.endDate
            )} days
          </p>
        </div>

        <div>
          <Label>Status</Label>
          {getStatusBadge(selectedLeave.status)}
        </div>

        {selectedLeave.status === "APPROVED" && (
          <div>
            <Label>Pay Type</Label>
            <p>{selectedLeave.payType || "—"}</p>
          </div>
        )}

        <div>
          <Label>Reason</Label>
          <p className="text-gray-600">
            {selectedLeave.reason || "No reason provided"}
          </p>
        </div>

        {/* 🔴 Delete Button */}
        {(user?.role === "ADMIN" ||
          user?.role === "SUPERVISOR" ||
          (user?.id === selectedLeave.employeeId &&
            selectedLeave.status === "PENDING")) && (
          <div className="flex justify-end gap-3">
            {
              user?.role === 'ADMIN' &&
              <>
               <Button
                        size="sm"
                        variant="default"
                        onClick={() => openApproveModal(selectedLeave.id)}
                      >
                        Approved
                      </Button>

                      <Button
                        // size="sm"
                        variant="secondary"
                        onClick={() => openRejectModal(selectedLeave.id)}
                      >
                        Rejected
                      </Button>
                      </>
            }
            <Button
              variant="destructive"
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
              Delete Leave
            </Button>
          </div>
        )}

      </div>
    )}
  </DialogContent>
</Dialog>

      {/* Edit Leave Request Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Leave Type</Label>
              <SearchableSelect
                className="w-full"
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

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Reason</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
