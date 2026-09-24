import React, { useEffect, useState } from "react";
import { overtimeAPI, employeeAPI, locationAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Calendar, Clock, Check, X, Pencil, Trash2 } from "lucide-react";

import {
  Card, CardContent, CardHeader, CardTitle
} from "../components/ui/card";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "../components/ui/select";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import {
  Dialog, DialogContent,
  DialogHeader, DialogTitle
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export const Overtime: React.FC = () => {
  const { user } = useAuth();

  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const getInitialOtLoc = () => {
    const loc = localStorage.getItem("selectedLocation") || localStorage.getItem("dashboard-selected-location") || "all";
    return loc.toLowerCase() === "all" ? "all" : loc;
  };
  const [selectedLocation, setSelectedLocation] = useState(getInitialOtLoc);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    locationAPI.getLocations().then((res) => setLocations(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const loc = e.detail || localStorage.getItem("selectedLocation") || "all";
      setSelectedLocation(loc.toLowerCase() === "all" ? "all" : loc);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const [formData, setFormData] = useState({
    employeeId: "",
    date: "",
    hours: "",
    rate: "1.5",
    reason: "",
  });

  const [punchVerification, setPunchVerification] = useState<{
    loading: boolean;
    checked: boolean;
    hasAttendance: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    overtimeMinutes: number;
    overtimeHours: number;
    isVerified: boolean;
    canRequest: boolean;
    message: string;
  }>({
    loading: false,
    checked: false,
    hasAttendance: false,
    checkInTime: null,
    checkOutTime: null,
    overtimeMinutes: 0,
    overtimeHours: 0,
    isVerified: false,
    canRequest: true,
    message: "",
  });

  // 🔥 Load Data
  const loadData = async () => {
    try {
      const data = await overtimeAPI.getOvertimes();
      setOvertimes(data.overtimes || []);

      const emp = await employeeAPI.getActiveEmployees();
      setEmployees(emp.data || emp.employees || emp || []);
    } catch (err) {
      toast.error("Failed to load overtime data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🔍 Verify Biometric Punch on employee or date change
  useEffect(() => {
    if (!open) {
      setPunchVerification({
        loading: false,
        checked: false,
        hasAttendance: false,
        checkInTime: null,
        checkOutTime: null,
        overtimeMinutes: 0,
        overtimeHours: 0,
        isVerified: false,
        canRequest: true,
        message: "",
      });
      return;
    }

    const targetEmpId = user?.role === "ADMIN" ? formData.employeeId : (user?.id || formData.employeeId);
    if (!targetEmpId || !formData.date) return;

    let isMounted = true;
    setPunchVerification((prev) => ({ ...prev, loading: true }));

    overtimeAPI.verifyPunch(Number(targetEmpId), formData.date)
      .then((res: any) => {
        if (!isMounted) return;
        setPunchVerification({
          loading: false,
          checked: true,
          hasAttendance: Boolean(res.hasAttendance),
          checkInTime: res.checkInTime || null,
          checkOutTime: res.checkOutTime || null,
          overtimeMinutes: Number(res.overtimeMinutes) || 0,
          overtimeHours: Number(res.overtimeHours) || 0,
          isVerified: Boolean(res.isVerified),
          canRequest: Boolean(res.canRequest),
          message: res.message || "",
        });

        // Auto-suggest hours from verified punch if hours is empty and not editing
        if (!editing && res.isVerified && res.overtimeHours > 0) {
          setFormData((prev) => {
            if (!prev.hours || Number(prev.hours) === 0) {
              return { ...prev, hours: String(res.overtimeHours) };
            }
            return prev;
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setPunchVerification((prev) => ({ ...prev, loading: false, checked: true }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, formData.employeeId, formData.date]);

  // Calculate employee hourly rate based on 9hr shift
  const calculateEmpHourlyRate = (emp: any) => {
    if (!emp || !emp.payroll || !emp.payroll.rate) return 0;
    const baseWage = Number(emp.payroll.rate) || 0;
    const payoutType = String(emp.payroll.payoutType || "monthly").toLowerCase();
    const shiftHours = 9; // Standard 9-hour shift
    if (emp.payroll.overtimeRate && Number(emp.payroll.overtimeRate) > 10) {
      return Number(emp.payroll.overtimeRate);
    }
    if (payoutType === "hourly") return baseWage;
    if (payoutType === "daily") return baseWage / shiftHours;
    return baseWage / (26 * shiftHours);
  };

  // 🔥 Open Modal for Adding
  const handleOpenAdd = () => {
    setEditing(null);
    const targetId = user?.role === "ADMIN" ? "" : String(user?.id || "");
    const targetEmp = employees.find((e) => String(e.id) === String(targetId));
    const empOtRate = targetEmp?.payroll?.overtimeRate;
    const defaultRate = empOtRate && Number(empOtRate) > 0 ? String(empOtRate) : "1.5";
    setFormData({
      employeeId: targetId,
      date: new Date().toISOString().slice(0, 10),
      hours: "",
      rate: defaultRate,
      reason: "",
    });
    setOpen(true);
  };

  // 🔥 Open Modal for Editing (Populates stored data in real-time)
  const handleEdit = (ot: any) => {
    setEditing(ot);
    const empOtRate = ot.employee?.payroll?.overtimeRate;
    setFormData({
      employeeId: String(ot.employeeId || ot.employee?.id || ""),
      date: ot.date ? ot.date.slice(0, 10) : "",
      hours: String(ot.hours ?? ""),
      rate: String(ot.rate ?? empOtRate ?? "1.5"),
      reason: ot.reason || "",
    });
    setOpen(true);
  };

  // 🔥 Submit (Create or Edit)
  const handleSubmit = async () => {
    const targetEmployeeId = user?.role === "ADMIN"
      ? formData.employeeId
      : String(user?.id || formData.employeeId || "");

    if (!targetEmployeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!formData.date) {
      toast.error("Please select a date");
      return;
    }
    if (!formData.hours || isNaN(Number(formData.hours)) || Number(formData.hours) <= 0) {
      toast.error("Please enter valid hours (> 0)");
      return;
    }
    if (!formData.rate || isNaN(Number(formData.rate)) || Number(formData.rate) <= 0) {
      toast.error("Please enter a valid rate multiplier (> 0)");
      return;
    }

    if (user?.role === "USER") {
      if (punchVerification.checked && !punchVerification.canRequest) {
        toast.error(punchVerification.message || "Cannot submit overtime: Verified check-out punch required.");
        return;
      }
      if (punchVerification.checked && punchVerification.overtimeHours > 0 && Number(formData.hours) > punchVerification.overtimeHours + 0.1) {
        toast.error(`Requested hours (${formData.hours}h) cannot exceed your actual logged extra punch time (${punchVerification.overtimeHours}h).`);
        return;
      }
    }

    const payload = {
      employeeId: Number(targetEmployeeId),
      date: formData.date,
      hours: Number(formData.hours),
      rate: Number(formData.rate),
      reason: formData.reason,
      status: user?.role === "ADMIN" ? (editing?.status || "PENDING") : "PENDING",
    };

    try {
      if (editing) {
        await overtimeAPI.updateOvertime(editing.id, payload);
        toast.success("Overtime updated successfully");
      } else {
        await overtimeAPI.createOvertime(payload);
        toast.success(user?.role === "ADMIN" ? "Overtime added successfully" : "Overtime request submitted successfully");
      }

      setOpen(false);
      setEditing(null);
      setFormData({
        employeeId: "",
        date: "",
        hours: "",
        rate: "1.5",
        reason: "",
      });

      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Error saving overtime");
    }
  };

  // 🔥 Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await overtimeAPI.deleteOvertime(deleteConfirm.id);
      toast.success("Overtime deleted successfully");
      setDeleteConfirm(null);
      loadData();
    } catch {
      toast.error("Delete failed");
    }
  };

  // 🔥 Approve / Reject
  const handleStatus = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      await overtimeAPI.updateStatus(id, status);
      toast.success(`Overtime request ${status.toLowerCase()} successfully`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.data?.message || err?.message || "Failed to update status");
    }
  };

  const currentTargetId = user?.role === "ADMIN" ? formData.employeeId : (user?.id || formData.employeeId);
  const selectedEmp = employees.find((e) => String(e.id) === String(currentTargetId));
  const currentHourlyRate = calculateEmpHourlyRate(selectedEmp);
  const currentHours = Number(formData.hours) || 0;
  const currentMultiplier = Number(formData.rate) || 1.5;
  const calculatedEstimatedAmount = currentHours > 0 && currentHourlyRate > 0
    ? currentHours * currentHourlyRate * currentMultiplier
    : 0;

  const filtered = overtimes.filter((ot) => {
    if (filterStatus !== "all" && ot.status !== filterStatus.toUpperCase())
      return false;
    // Location filter only applies to ADMIN and SUPERVISOR
    if ((user?.role === "ADMIN" || user?.role === "SUPERVISOR") && selectedLocation !== "all") {
      const empCompId = String(ot.employee?.companyId || ot.employee?.company?.id || ot.employee?.locationId || "");
      if (empCompId !== String(selectedLocation)) return false;
    }
    return true;
  });

  const badgeColor = (status: string) => {
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overtime Management</h2>
          <p className="text-gray-500 text-sm">Track, review, approve, and audit employee overtime records</p>
        </div>

        <Button onClick={handleOpenAdd} className="shadow-sm gap-2">
          <Plus className="size-4" />
          {user?.role === "ADMIN" ? "Add Overtime" : "Request Overtime"}
        </Button>
      </div>

      {/* Redesigned Overtime Records Card & Table */}
      <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Overtime Records</CardTitle>
                <Badge variant="secondary" className="font-semibold text-xs rounded-full px-2.5">
                  {filtered?.length || 0} Total
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Overview of employee overtime hours, multipliers, rate calculations, and approval status
              </p>
            </div>

            <div className="flex items-center gap-2">
              {locations.length > 0 && (user?.role === "ADMIN" || user?.role === "SUPERVISOR") && (
                <SearchableSelect
                  className="w-[160px] h-9 text-sm bg-white dark:bg-gray-950"
                  placeholder="Location"
                  searchPlaceholder="Search location..."
                  value={selectedLocation}
                  onValueChange={(val) => {
                    const norm = val.toLowerCase() === "all" ? "all" : val;
                    setSelectedLocation(norm);
                    localStorage.setItem("selectedLocation", norm);
                    localStorage.setItem("dashboard-selected-location", norm);
                    window.dispatchEvent(new CustomEvent("location-changed", { detail: norm }));
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

              <SearchableSelect
                className="w-[160px] h-9 text-sm bg-white dark:bg-gray-950"
                placeholder="Filter by Status"
                searchPlaceholder="Search status..."
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70 dark:bg-gray-900/70 hover:bg-gray-50/70">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Employee</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Date</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Hours</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Rate</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Reason</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No overtime records found</p>
                        <p className="text-xs text-gray-400">Click {user?.role === "ADMIN" ? "'Add Overtime'" : "'Request Overtime'"} to create a new overtime entry.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ot) => {
                    const empName = ot.employee
                      ? `${ot.employee.firstName} ${ot.employee.lastName || ""}`.trim()
                      : "N/A";

                    const displayAmount = ot.amount && Number(ot.amount) > 0
                      ? Number(ot.amount)
                      : (() => {
                          const hRate = calculateEmpHourlyRate(ot.employee);
                          return (Number(ot.hours) || 0) * (hRate > 0 ? hRate : 1) * (Number(ot.rate) || 1.5);
                        })();

                    return (
                      <TableRow key={ot.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors">
                        <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                              {ot.employee?.firstName?.charAt(0)}{(ot.employee?.lastName || "").charAt(0)}
                            </div>
                            <span>{empName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200/80 dark:bg-gray-900 dark:border-gray-800">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {ot.date ? ot.date.slice(0, 10) : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold font-mono">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                            {ot.hours} hrs
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          <Badge variant="outline" className="bg-indigo-50/80 text-indigo-700 border-indigo-200 font-mono">
                            {ot.rate}x
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">
                          Rs. {displayAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-gray-600 dark:text-gray-400" title={ot.reason || ""}>
                          {ot.reason || "-"}
                        </TableCell>
                        <TableCell>{badgeColor(ot.status)}</TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {user?.role === "ADMIN" ? (
                              <>
                                {ot.status === "PENDING" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                                      onClick={() => handleStatus(ot.id, "APPROVED")}
                                      title="Approve Overtime"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                      onClick={() => handleStatus(ot.id, "REJECTED")}
                                      title="Reject Overtime"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                                  onClick={() => handleEdit(ot)}
                                  title="Edit Overtime"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                  onClick={() => setDeleteConfirm(ot)}
                                  title="Delete Overtime"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              ot.status === "PENDING" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                                    onClick={() => handleEdit(ot)}
                                    title="Edit Request"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                    onClick={() => setDeleteConfirm(ot)}
                                    title="Cancel Request"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 font-medium mr-2">-</span>
                              )
                            )}
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

      {/* Add/Edit Modal */}
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) setEditing(null);
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {user?.role === "ADMIN"
                ? (editing ? "Edit Overtime Record" : "Add Overtime Record")
                : (editing ? "Edit Overtime Request" : "Request Overtime")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {user?.role === "ADMIN" && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Employee</label>
                <SearchableSelect
                  className="w-full"
                  placeholder="Select Employee"
                  searchPlaceholder="Search employee..."
                  value={formData.employeeId}
                  onValueChange={(val) => {
                    const selEmp = employees.find((e) => String(e.id) === String(val));
                    const empOtRate = selEmp?.payroll?.overtimeRate;
                    const defaultRate = empOtRate && Number(empOtRate) > 0 ? String(empOtRate) : "1.5";
                    setFormData((prev) => ({
                      ...prev,
                      employeeId: val,
                      rate: defaultRate,
                    }));
                  }}
                  options={employees.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                    sublabel: emp.employeeId ? `ID: ${emp.employeeId}` : undefined,
                  }))}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            {/* Punch Verification Alert Card */}
            {punchVerification.loading ? (
              <div className="rounded-xl p-3 bg-gray-50 border border-gray-200 text-gray-500 text-xs flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Checking biometric punch & attendance records for this date...</span>
              </div>
            ) : punchVerification.checked && (
              <div className={`rounded-xl p-3 border text-xs space-y-1.5 transition-all ${
                punchVerification.isVerified
                  ? "bg-emerald-50/80 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60"
                  : punchVerification.hasAttendance
                    ? "bg-amber-50/80 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60"
                    : "bg-rose-50/80 text-rose-900 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/60"
              }`}>
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    {punchVerification.isVerified ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                    {punchVerification.isVerified
                      ? "Biometric Punch Verified (30m+ Threshold Met)"
                      : punchVerification.hasAttendance
                        ? "Punch Found (Under 30m Threshold)"
                        : "No Biometric Check-Out Punch Found"}
                  </span>
                  {punchVerification.isVerified && (
                    <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 font-mono text-[10px]">
                      {punchVerification.overtimeHours} hrs logged
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] opacity-90">
                  {punchVerification.checkInTime && (
                    <span>Check-In: <strong>{punchVerification.checkInTime}</strong></span>
                  )}
                  {punchVerification.checkOutTime && (
                    <span>Check-Out: <strong>{punchVerification.checkOutTime}</strong></span>
                  )}
                  {punchVerification.overtimeMinutes > 0 && (
                    <span>Logged Extra: <strong>{punchVerification.overtimeMinutes} mins</strong></span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed opacity-85">
                  {punchVerification.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Hours</label>
                <Input
                  type="number"
                  placeholder="Hours (e.g. 2)"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Rate Multiplier</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Rate (e.g. 1.5)"
                  disabled={user?.role !== "ADMIN"}
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                />
              </div>
            </div>

            {selectedEmp && (
              <div className="rounded-xl p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/90 dark:border-blue-800/60 space-y-1.5 transition-all">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Hourly Rate (9hr Shift):
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                    Rs. {currentHourlyRate.toFixed(2)} / hr
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Calculation:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 text-[11px]">
                    {currentHours > 0 ? currentHours : 0} hrs × Rs. {currentHourlyRate.toFixed(2)} × {currentMultiplier}x
                  </span>
                </div>
                <div className="pt-2 border-t border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-100">
                    Calculated Overtime Pay:
                  </span>
                  <span className="text-base font-extrabold text-blue-700 dark:text-blue-300 font-mono">
                    Rs. {calculatedEstimatedAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Reason</label>
              <Textarea
                placeholder="Reason for overtime..."
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={user?.role === "USER" && punchVerification.checked && !punchVerification.canRequest}
              >
                {user?.role === "ADMIN"
                  ? (editing ? "Update Overtime" : "Save Overtime")
                  : (editing ? "Update Request" : "Submit Request")}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{user?.role === "ADMIN" ? "Confirm Delete" : "Cancel Overtime Request"}</DialogTitle>
          </DialogHeader>

          <p className="text-gray-600 text-sm">
            {user?.role === "ADMIN"
              ? "Are you sure you want to delete this overtime record? This action cannot be undone."
              : "Are you sure you want to cancel this overtime request?"}
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setDeleteConfirm(null)} variant="outline">
              Close
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              {user?.role === "ADMIN" ? "Delete" : "Cancel Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
