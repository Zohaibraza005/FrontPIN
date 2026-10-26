import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Search, Plus, Edit, Trash2, Users, Eye, Building2, MapPin, Calendar, Clock, Briefcase, Shuffle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { departmentAPI, locationAPI } from '../services/api';
import { MoveDepartmentEmployeesDialog } from '../components/departments/MoveDepartmentEmployeesDialog';

// Mock departments data
const mockDepartments = [
  { id: 'dept1', title: 'Sales', location: 'Head Office', status: 'active' },
  { id: 'dept2', title: 'Marketing', location: 'Branch A', status: 'active' },
  { id: 'dept3', title: 'IT', location: 'Head Office', status: 'inactive' },
  { id: 'dept4', title: 'HR', location: 'Branch B', status: 'active' },
  { id: 'dept5', title: 'Finance', location: 'Head Office', status: 'active' },
];



export const Departments: React.FC = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDept, setViewingDept] = useState<any>(null);

  // Form states
  const [deptTitle, setDeptTitle] = useState('');
  const [deptLocation, setDeptLocation] = useState('');
  const [deptStatus, setDeptStatus] = useState('active');

  const filteredDepartments = departments.filter((dept) => {
    if (searchQuery && !dept.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus !== 'all' && dept.status !== filterStatus) return false;
    return true;
  });
  useEffect(() => {
    fetchDepartments();
    fetchLocations();
  }, []);
  
  const fetchDepartments = async () => {
    const res = await departmentAPI.getDepartments();
    setDepartments(res.data);
  };
  
  const fetchLocations = async () => {
    const res = await locationAPI.getLocations();
    setLocations(res.data);
  };
  
  const openViewDialog = (dept: any) => {
    setViewingDept(dept);
    setViewDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingDept(null);
    setDeptTitle('');
    setDeptLocation('');
    setDeptStatus('active');
    setDialogOpen(true);
  };

  const openEditDialog = (dept: any) => {
    setEditingDept(dept);
    setDeptTitle(dept.title);
    setDeptLocation(dept.companyId ? String(dept.companyId) : dept.location ? String(dept.location) : '');
    setDeptStatus(dept.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!deptTitle || !deptLocation) {
      toast.error("Please fill all required fields");
      return;
    }
  
    if (editingDept) {
      await departmentAPI.updateDepartment(editingDept.id, {
        title: deptTitle,
        companyId: deptLocation,
        status: deptStatus,
      });
      toast.success("Department updated");
    } else {
      await departmentAPI.createDepartment({
        title: deptTitle,
        companyId: deptLocation,
        status: deptStatus,
      });
      toast.success("Department created");
    }
  
    setDialogOpen(false);
    fetchDepartments();
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this department?")) return;
  
    await departmentAPI.deleteDepartment(id);
    toast.success("Department deleted");
    fetchDepartments();
  };

  const getStatusBadge = (status: string) => {
    return <Badge className={status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Department Management</h2>
          <p className="text-gray-600">Manage departments and their details</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchDepartments}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setMoveOpen(true)} disabled={departments.length < 2}>
            <Shuffle className="mr-2 size-4" />
            Move Employees
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 size-4" />
            Add Department
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Active Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.title}</TableCell>
                    <TableCell>{dept?.company?.name || "—"}</TableCell>
                    <TableCell>
                      <Link
                        to={`/departments/${dept.id}/employees`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold tabular-nums bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900 cursor-pointer"
                        title="View active employees"
                      >
                        <Users className="size-3.5" />
                        {dept.activeEmployees ?? 0}
                      </Link>
                    </TableCell>
                    <TableCell>{getStatusBadge(dept.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" title="View Department" onClick={() => openViewDialog(dept)}>
                          <Eye className="size-4 text-gray-600 hover:text-gray-900" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Edit Department" onClick={() => openEditDialog(dept)}>
                          <Edit className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Delete Department" onClick={() => handleDelete(dept.id)}>
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Department Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
          <DialogHeader className="pb-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Briefcase className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Department Details
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Department structure and team allocation
                </p>
              </div>
            </div>
          </DialogHeader>

          {viewingDept && (
            <div className="space-y-4 py-2">
              {/* Department Banner */}
              <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs tracking-wider shrink-0 uppercase">
                      {viewingDept.title ? viewingDept.title.slice(0, 3) : "DEP"}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {viewingDept.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          {viewingDept?.company?.name || viewingDept.location || "Organization-wide"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(viewingDept.status)}
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <MapPin className="size-3.5 text-slate-400" />
                    Location / Branch
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {viewingDept?.company?.name || viewingDept.location || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Users className="size-3.5 text-slate-400" />
                    Active Employees
                  </div>
                  <div>
                    <Link
                      to={`/departments/${viewingDept.id}/employees`}
                      onClick={() => setViewDialogOpen(false)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                      title="View active employees in this department"
                    >
                      <Users className="size-3" />
                      {viewingDept.activeEmployees ?? 0} Employees
                    </Link>
                  </div>
                </div>
              </div>

              {/* Dates if available */}
              {(viewingDept.createdAt || viewingDept.updatedAt) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  {viewingDept.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3 text-slate-400" />
                      <span>Created:</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(viewingDept.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {viewingDept.updatedAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 text-slate-400" />
                      <span>Updated:</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(viewingDept.updatedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs h-9 px-4"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                const dept = viewingDept;
                setViewDialogOpen(false);
                if (dept) openEditDialog(dept);
              }}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm flex items-center gap-1.5"
            >
              <Edit className="size-3.5" />
              Edit Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Title *</Label>
              <Input value={deptTitle} onChange={(e) => setDeptTitle(e.target.value)} placeholder="Enter department title" />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select value={deptLocation} onValueChange={setDeptLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={deptStatus} onValueChange={setDeptStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingDept ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MoveDepartmentEmployeesDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        departments={departments}
        onMoved={fetchDepartments}
      />
    </div>
  );
};