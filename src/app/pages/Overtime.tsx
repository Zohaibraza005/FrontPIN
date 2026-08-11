import React, { useEffect, useState } from "react";
import { overtimeAPI, employeeAPI } from "../services/api";
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

  // 🔥 Open Modal for Adding
  const handleOpenAdd = () => {
    setEditing(null);
    setFormData({
      employeeId: "",
      date: new Date().toISOString().slice(0, 10),
      hours: "",
      rate: "1.5",
      reason: "",
    });
    setOpen(true);
  };

  // 🔥 Open Modal for Editing (Populates stored data in real-time)
  const handleEdit = (ot: any) => {
    setEditing(ot);
    setFormData({
      employeeId: String(ot.employeeId || ot.employee?.id || ""),
      date: ot.date ? ot.date.slice(0, 10) : "",
      hours: String(ot.hours ?? ""),
      rate: String(ot.rate ?? "1.5"),
      reason: ot.reason || "",
    });
    setOpen(true);
  };

  // 🔥 Submit (Create or Edit)
  const handleSubmit = async () => {
    if (!formData.employeeId) {
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

    const payload = {
      employeeId: Number(formData.employeeId),
      date: formData.date,
      hours: Number(formData.hours),
      rate: Number(formData.rate),
      reason: formData.reason,
      status: editing?.status || "PENDING",
    };

    try {
      if (editing) {
        await overtimeAPI.updateOvertime(editing.id, payload);
        toast.success("Overtime updated successfully");
      } else {
        await overtimeAPI.createOvertime(payload);
        toast.success("Overtime added successfully");
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
      toast.error(err?.message || "Error saving overtime");
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

  const filtered = overtimes.filter((ot) => {
    if (filterStatus !== "all" && ot.status !== filterStatus.toUpperCase())
      return false;
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

        {user?.role === "ADMIN" && (
          <Button onClick={handleOpenAdd} className="shadow-sm gap-2">
            <Plus className="size-4" />
            Add Overtime
          </Button>
        )}
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
                        <p className="text-xs text-gray-400">Click 'Add Overtime' to create a new overtime entry.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ot) => {
                    const empName = ot.employee
                      ? `${ot.employee.firstName} ${ot.employee.lastName || ""}`.trim()
                      : "N/A";

                    const displayAmount = ot.amount && ot.amount > 0
                      ? Number(ot.amount)
                      : (Number(ot.hours) || 0) * (Number(ot.rate) || 1);

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
                            {ot.status === "PENDING" && user?.role === "ADMIN" && (
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
                            {user?.role === "ADMIN" && (
                              <>
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
              {editing ? "Edit Overtime Record" : "Add Overtime Record"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Employee</label>
              <SearchableSelect
                className="w-full"
                placeholder="Select Employee"
                searchPlaceholder="Search employee..."
                value={formData.employeeId}
                onValueChange={(val) =>
                  setFormData({ ...formData, employeeId: val })
                }
                options={employees.map((emp) => ({
                  value: String(emp.id),
                  label: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                  sublabel: emp.employeeId ? `ID: ${emp.employeeId}` : undefined,
                }))}
              />
            </div>

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
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                />
              </div>
            </div>

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
              <Button onClick={handleSubmit}>
                {editing ? "Update Overtime" : "Save Overtime"}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>

          <p className="text-gray-600 text-sm">
            Are you sure you want to delete this overtime record? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setDeleteConfirm(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
