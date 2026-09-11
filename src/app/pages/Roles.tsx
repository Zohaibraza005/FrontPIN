//@ts-nocheck
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Search, Plus, Edit, Trash2, Shield, Users, RefreshCw, CheckCircle2, 
  Lock, Sparkles, AlertTriangle, Eye, Check, X, Clock, Calendar, 
  CalendarDays, Timer, FolderKanban, CheckSquare, Receipt, BarChart3, MapPin 
} from "lucide-react";
import { toast } from "sonner";
import { roleAPI } from "../services/api";

export const privilegesList = [
  { id: "employee", label: "Employee", description: "Manage employee profiles, credentials and employment info" },
  { id: "attendance", label: "Attendance", description: "Clock in/out, view daily activity and punch logs" },
  { id: "schedule", label: "Schedule", description: "Manage and assign work shifts and rosters" },
  { id: "leave", label: "Leave", description: "Request, review and approve leave applications" },
  { id: "overtime", label: "Overtime", description: "Submit, verify and approve overtime logs" },
  { id: "project", label: "Project", description: "Create projects, milestones and team allocations" },
  { id: "task", label: "Task", description: "Create, assign and update project task statuses" },
  { id: "invoice", label: "Invoice", description: "Generate invoices, billing items and track payments" },
  { id: "report", label: "Report (Own Team)", description: "View analytics, export attendance and team reports" },
  { id: "enable_gps", label: "GPS Tracking", description: "Enforce location geofencing and mobile check-ins" },
];

const moduleConfig: Record<string, { icon: any; color: string; bg: string }> = {
  employee: { icon: Users, color: "text-blue-600", bg: "bg-blue-50 text-blue-600 border border-blue-200" },
  attendance: { icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-600 border border-emerald-200" },
  schedule: { icon: Calendar, color: "text-purple-600", bg: "bg-purple-50 text-purple-600 border border-purple-200" },
  leave: { icon: CalendarDays, color: "text-amber-600", bg: "bg-amber-50 text-amber-600 border border-amber-200" },
  overtime: { icon: Timer, color: "text-orange-600", bg: "bg-orange-50 text-orange-600 border border-orange-200" },
  project: { icon: FolderKanban, color: "text-sky-600", bg: "bg-sky-50 text-sky-600 border border-sky-200" },
  task: { icon: CheckSquare, color: "text-indigo-600", bg: "bg-indigo-50 text-indigo-600 border border-indigo-200" },
  invoice: { icon: Receipt, color: "text-teal-600", bg: "bg-teal-50 text-teal-600 border border-teal-200" },
  report: { icon: BarChart3, color: "text-rose-600", bg: "bg-rose-50 text-rose-600 border border-rose-200" },
  enable_gps: { icon: MapPin, color: "text-cyan-600", bg: "bg-cyan-50 text-cyan-600 border border-cyan-200" },
};

export interface RoleItem {
  id: number;
  name: string;
  description: string | null;
  privileges: any;
  organizationId: number;
  _count?: {
    employees: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const Roles: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);

  // Form State
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [rolePrivileges, setRolePrivileges] = useState<any[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await roleAPI.getRoles();
      if (res?.data) {
        setRoles(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    // Default: read-only on core modules
    setRolePrivileges(
      privilegesList.map((p) => ({
        module: p.id.toUpperCase(),
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        ownTeamOnly: false,
      }))
    );
    setDialogOpen(true);
  };

  const openEditDialog = (role: RoleItem) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    const existingPrivs = typeof role.privileges === "string" ? JSON.parse(role.privileges) : (role.privileges || []);
    setRolePrivileges(Array.isArray(existingPrivs) ? existingPrivs : []);
    setDialogOpen(true);
  };

  const mapKey = (key: string) => {
    if (key === "create") return "canCreate";
    if (key === "read") return "canRead";
    if (key === "update") return "canUpdate";
    if (key === "delete") return "canDelete";
    return key;
  };

  const isChecked = (modKey: string, key: string) => {
    const uppercaseMod = modKey.toUpperCase();
    const existing = rolePrivileges.find(
      (p) => typeof p === "object" && p?.module?.toUpperCase() === uppercaseMod
    );
    if (!existing) {
      return rolePrivileges.includes(modKey.toLowerCase());
    }
    return Boolean(existing[mapKey(key)]);
  };

  const togglePermission = (modKey: string, key: string) => {
    const uppercaseMod = modKey.toUpperCase();
    const propKey = mapKey(key);

    setRolePrivileges((prev) => {
      const existing = prev.find(
        (p) => typeof p === "object" && p?.module?.toUpperCase() === uppercaseMod
      );

      if (!existing) {
        return [
          ...prev.filter((p) => typeof p !== "object" || p?.module?.toUpperCase() !== uppercaseMod),
          {
            module: uppercaseMod,
            canCreate: propKey === "canCreate",
            canRead: propKey === "canRead",
            canUpdate: propKey === "canUpdate",
            canDelete: propKey === "canDelete",
            ownTeamOnly: propKey === "ownTeamOnly",
          },
        ];
      }

      return prev.map((p) => {
        if (typeof p === "object" && p?.module?.toUpperCase() === uppercaseMod) {
          return { ...p, [propKey]: !p[propKey] };
        }
        return p;
      });
    });
  };

  const selectAllPermissions = () => {
    setRolePrivileges(
      privilegesList.map((p) => ({
        module: p.id.toUpperCase(),
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        ownTeamOnly: p.id === "report",
      }))
    );
  };

  const selectReadOnly = () => {
    setRolePrivileges(
      privilegesList.map((p) => ({
        module: p.id.toUpperCase(),
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        ownTeamOnly: false,
      }))
    );
  };

  const clearAllPermissions = () => {
    setRolePrivileges([]);
  };

  const countActivePrivileges = () => {
    let count = 0;
    privilegesList.forEach((mod) => {
      if (isChecked(mod.id, "create")) count++;
      if (isChecked(mod.id, "read")) count++;
      if (isChecked(mod.id, "update")) count++;
      if (isChecked(mod.id, "delete")) count++;
      if (mod.id === "report" && isChecked(mod.id, "ownTeamOnly")) count++;
    });
    return count;
  };

  const toggleAllForRow = (modKey: string) => {
    const uppercaseMod = modKey.toUpperCase();
    const allSelected =
      isChecked(modKey, "create") &&
      isChecked(modKey, "read") &&
      isChecked(modKey, "update") &&
      isChecked(modKey, "delete");

    setRolePrivileges((prev) => {
      const withoutMod = prev.filter(
        (p) => typeof p !== "object" || p?.module?.toUpperCase() !== uppercaseMod
      );
      if (allSelected) {
        return withoutMod;
      } else {
        return [
          ...withoutMod,
          {
            module: uppercaseMod,
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: true,
            ownTeamOnly: modKey === "report",
          },
        ];
      }
    });
  };

  const toggleColumn = (action: "create" | "read" | "update" | "delete") => {
    const propKey = mapKey(action);
    const allSelected = privilegesList.every((mod) => isChecked(mod.id, action));

    setRolePrivileges((prev) => {
      return privilegesList.map((mod) => {
        const uppercaseMod = mod.id.toUpperCase();
        const existing = prev.find(
          (p) => typeof p === "object" && p?.module?.toUpperCase() === uppercaseMod
        ) || {
          module: uppercaseMod,
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false,
          ownTeamOnly: false,
        };
        return {
          ...existing,
          [propKey]: !allSelected,
        };
      });
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: roleName.trim(),
        description: roleDescription.trim() || null,
        privileges: rolePrivileges,
      };

      if (editingRole) {
        await roleAPI.updateRole(editingRole.id, payload);
        toast.success("Role updated successfully");
      } else {
        await roleAPI.createRole(payload);
        toast.success("Role created successfully");
      }

      setDialogOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      setSaving(true);
      await roleAPI.deleteRole(roleToDelete.id);
      toast.success("Role deleted successfully");
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete role");
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getModuleSummary = (role: RoleItem) => {
    const privs = typeof role.privileges === "string" ? JSON.parse(role.privileges) : (role.privileges || []);
    if (!Array.isArray(privs)) return [];
    return privs.filter((p: any) => p.canRead || p.canCreate || p.canUpdate || p.canDelete);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Role Management</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5">
              {roles.length} Roles
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Define system roles and configure module-level CRUD permissions before assigning them to employees.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRoles}
            disabled={loading}
            className="rounded-xl h-10 border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={openAddDialog}
            className="rounded-xl h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-gray-200/80 shadow-xs rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search roles by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-gray-50/50 border-gray-200 text-sm focus:bg-white"
              />
            </div>
            <div className="text-xs text-gray-500">
              Showing {filteredRoles.length} of {roles.length} roles
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card className="border-gray-200/80 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-gray-100 bg-gray-50/30">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-blue-600" />
            Configured System Roles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-blue-600" />
              <p className="text-sm font-medium">Loading system roles...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">No roles found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery ? "No roles matched your search criteria." : "Get started by creating your first system role with customizable permissions."}
              </p>
              {!searchQuery && (
                <Button onClick={openAddDialog} className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Role
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/70 border-b border-gray-200">
                  <TableRow>
                    <TableHead className="w-64 font-semibold text-gray-700">Role Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Description</TableHead>
                    <TableHead className="font-semibold text-gray-700">Permissions Enabled</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">Assigned Employees</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {filteredRoles.map((role) => {
                    const activeModules = getModuleSummary(role);
                    const employeeCount = role._count?.employees || 0;

                    return (
                      <TableRow key={role.id} className="hover:bg-blue-50/20 transition-colors">
                        <TableCell className="font-semibold text-gray-900 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                              {role.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{role.name}</div>
                              <span className="text-[11px] text-gray-400 font-normal">
                                Created {new Date(role.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 py-4 max-w-xs truncate">
                          {role.description || <span className="text-gray-400 italic">No description</span>}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                            {activeModules.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">No permissions granted</span>
                            ) : (
                              <>
                                {activeModules.slice(0, 4).map((p: any) => (
                                  <Badge
                                    key={p.module}
                                    variant="secondary"
                                    className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-medium px-2 py-0.5 rounded-lg"
                                  >
                                    {p.module}
                                  </Badge>
                                ))}
                                {activeModules.length > 4 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-600 border-gray-200 text-[11px] px-1.5 py-0.5 rounded-lg"
                                  >
                                    +{activeModules.length - 4} more
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                            <Users className="w-3.5 h-3.5 text-gray-500" />
                            <span>{employeeCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(role)}
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit Role"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRoleToDelete(role);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete Role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full p-0 overflow-hidden rounded-2xl border border-gray-200 shadow-2xl bg-white flex flex-col max-h-[92vh]">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gray-50/50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg font-bold text-gray-900">
                  {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Define role identity and configure modular CRUD permissions for employees.
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveRole} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Role Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/80">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Role Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="e.g. Operations Manager, Accountant, Team Lead"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="h-11 pl-10 bg-white rounded-xl border-gray-300 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Description (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. Full attendance oversight and team management"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="h-11 px-3.5 bg-white rounded-xl border-gray-300 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50/70 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">Module Permissions & CRUD Access</h4>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold px-2 py-0.5">
                          {countActivePrivileges()} active
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Grant or restrict actions for each module. Click column headers to toggle all.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllPermissions}
                      className="text-xs h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 rounded-lg font-medium"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectReadOnly}
                      className="text-xs h-8 px-3 text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-lg font-medium"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Read Only
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllPermissions}
                      className="text-xs h-8 px-3 text-gray-600 border-gray-200 hover:bg-gray-100 rounded-lg font-medium"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100/70 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3 px-4 min-w-[240px]">Module Name</th>
                        <th
                          onClick={() => toggleColumn("create")}
                          className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 hover:text-blue-700 transition-colors select-none group"
                          title="Click to toggle Create across all modules"
                        >
                          <span className="group-hover:underline">Create</span>
                        </th>
                        <th
                          onClick={() => toggleColumn("read")}
                          className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 hover:text-blue-700 transition-colors select-none group"
                          title="Click to toggle Read across all modules"
                        >
                          <span className="group-hover:underline">Read</span>
                        </th>
                        <th
                          onClick={() => toggleColumn("update")}
                          className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 hover:text-blue-700 transition-colors select-none group"
                          title="Click to toggle Update across all modules"
                        >
                          <span className="group-hover:underline">Update</span>
                        </th>
                        <th
                          onClick={() => toggleColumn("delete")}
                          className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 hover:text-blue-700 transition-colors select-none group"
                          title="Click to toggle Delete across all modules"
                        >
                          <span className="group-hover:underline">Delete</span>
                        </th>
                        <th className="py-3 px-3 text-center min-w-[90px]">Own Team</th>
                        <th className="py-3 px-3 text-center w-20">Row</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {privilegesList.map((mod, index) => {
                        const IconComponent = moduleConfig[mod.id]?.icon || Shield;
                        const isAllRowSelected =
                          isChecked(mod.id, "create") &&
                          isChecked(mod.id, "read") &&
                          isChecked(mod.id, "update") &&
                          isChecked(mod.id, "delete");

                        return (
                          <tr
                            key={mod.id}
                            className={`hover:bg-blue-50/30 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    moduleConfig[mod.id]?.bg || "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 text-sm">{mod.label}</div>
                                  <div className="text-xs text-gray-500 font-normal">{mod.description}</div>
                                </div>
                              </div>
                            </td>

                            <td
                              onClick={() => togglePermission(mod.id, "create")}
                              className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 transition-colors select-none"
                              title={`Toggle Create for ${mod.label}`}
                            >
                              <div className="flex justify-center items-center">
                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    isChecked(mod.id, "create")
                                      ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                                      : "bg-white border-gray-300 hover:border-blue-400"
                                  }`}
                                >
                                  {isChecked(mod.id, "create") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            </td>

                            <td
                              onClick={() => togglePermission(mod.id, "read")}
                              className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 transition-colors select-none"
                              title={`Toggle Read for ${mod.label}`}
                            >
                              <div className="flex justify-center items-center">
                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    isChecked(mod.id, "read")
                                      ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                                      : "bg-white border-gray-300 hover:border-blue-400"
                                  }`}
                                >
                                  {isChecked(mod.id, "read") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            </td>

                            <td
                              onClick={() => togglePermission(mod.id, "update")}
                              className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 transition-colors select-none"
                              title={`Toggle Update for ${mod.label}`}
                            >
                              <div className="flex justify-center items-center">
                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    isChecked(mod.id, "update")
                                      ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                                      : "bg-white border-gray-300 hover:border-blue-400"
                                  }`}
                                >
                                  {isChecked(mod.id, "update") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            </td>

                            <td
                              onClick={() => togglePermission(mod.id, "delete")}
                              className="py-3 px-3 text-center cursor-pointer hover:bg-blue-50/70 transition-colors select-none"
                              title={`Toggle Delete for ${mod.label}`}
                            >
                              <div className="flex justify-center items-center">
                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    isChecked(mod.id, "delete")
                                      ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                                      : "bg-white border-gray-300 hover:border-blue-400"
                                  }`}
                                >
                                  {isChecked(mod.id, "delete") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="flex justify-center items-center">
                                {mod.id === "report" ? (
                                  <div
                                    onClick={() => togglePermission(mod.id, "ownTeamOnly")}
                                    className="cursor-pointer hover:bg-blue-50/70 p-1 rounded-md transition-colors select-none"
                                    title="Toggle Own Team Only for Report"
                                  >
                                    <div
                                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                        isChecked(mod.id, "ownTeamOnly")
                                          ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                                          : "bg-white border-gray-300 hover:border-blue-400"
                                      }`}
                                    >
                                      {isChecked(mod.id, "ownTeamOnly") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 select-none font-light">—</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAllForRow(mod.id)}
                                className={`h-7 px-2 text-xs rounded-md transition-colors ${
                                  isAllRowSelected
                                    ? "bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                                    : "text-gray-500 hover:bg-gray-100"
                                }`}
                                title={isAllRowSelected ? "Clear this row" : "Select all for this row"}
                              >
                                {isAllRowSelected ? "Full" : "All"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-gray-200 bg-gray-50/60 flex flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-gray-500 hidden sm:flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Permissions apply immediately to all employees assigned to this role.</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl h-11 px-5 border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 shadow-xs"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingRole ? (
                    "Update Role"
                  ) : (
                    "Create Role"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900">Delete Role</DialogTitle>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to delete <span className="font-semibold text-gray-800">"{roleToDelete?.name}"</span>?
            </p>
          </DialogHeader>

          {roleToDelete?._count?.employees ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <span className="font-semibold">{roleToDelete._count.employees} employee(s)</span> are currently assigned to this role. Deleting this role will unassign them from it.
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl h-10 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={saving}
              className="rounded-xl h-10 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {saving ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;