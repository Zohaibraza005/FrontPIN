//@ts-nocheck

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Plus,
  Search,
  Key,
  Trash2,
  Eye,
  RefreshCw,
  Users,
  ShieldCheck,
  Building2,
  UserCheck,
  LayoutGrid,
  List,
  MapPin,
  CheckCircle2,
  XCircle,
  Calendar,
  X,
  RotateCcw
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, departmentAPI, employeeAPI, locationAPI } from '../services/api';

export const Employees: React.FC = () => {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const getInitialEmpLoc = () => localStorage.getItem("selectedLocation") || 'all';
  const [filterLocation, setFilterLocation] = useState<string>(getInitialEmpLoc);
  const [filterLogin, setFilterLogin] = useState('all');

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const loc = e.detail || localStorage.getItem("selectedLocation") || 'all';
      setFilterLocation(loc);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);

  // Layout state: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [newPin, setNewPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchLocations();
    fetchDepartments();

    // 🔄 Real-time polling every 5 seconds for live employee updates from DB
    const pollInterval = setInterval(() => {
      fetchEmployees(true);
      fetchLocations();
      fetchDepartments();
    }, 5000);

    const handleUpdate = () => {
      fetchEmployees(true);
    };

    window.addEventListener("employee-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("employee-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  const fetchEmployees = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await employeeAPI.getEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      if (!silent) toast.error('Failed to load employees');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await locationAPI.getLocations();
      setLocations(res.data || []);
    } catch (err) {
      // ignore
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      // ignore
    }
  };

  const handleDeleteClick = (emp: any) => {
    setEmployeeToDelete(emp);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      setIsDeleting(true);
      await employeeAPI.deleteEmployee(employeeToDelete.id);
      toast.success('Employee deleted successfully');
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPinModal = (emp: any) => {
    setSelectedEmployee(emp);
    setNewPin('');
    setPinDialogOpen(true);
  };

  const handleSetPin = async () => {
    if (newPin.length !== 4) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    try {
      setIsUpdatingPin(true);
      if (employeeAPI.updatePin && selectedEmployee) {
        await employeeAPI.updatePin(selectedEmployee.id, { pin: newPin });
      }
      toast.success(`PIN updated successfully for ${selectedEmployee?.firstName || 'employee'}`);
      setNewPin('');
      setPinDialogOpen(false);
    } catch (err) {
      toast.error('Failed to update PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Filter employees logic
  const filteredEmployees = employees.filter((emp) => {
    if (emp.role === 'ADMIN' || emp.role === 'admin') return false;
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || '';
    const email = emp.email || '';
    const designation = emp.jobInfo?.designation || emp.designation || '';
    const empCode = emp.employeeId || emp.id?.toString() || '';
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      fullName.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      designation.toLowerCase().includes(query) ||
      empCode.toLowerCase().includes(query);

    const empDept = String(
      emp.departmentId ||
      emp.department?.id ||
      emp.department?.title ||
      emp.department?.name ||
      emp.department ||
      ''
    );
    const matchesDept =
      filterDepartment === 'all' ||
      empDept === filterDepartment ||
      (emp.department?.title && emp.department.title === filterDepartment);

    const matchesRole = filterRole === 'all' || emp.role === filterRole;

    const empCompId = String(emp.companyId || emp.company?.id || emp.locationId || '');
    const matchesLocation =
      filterLocation === 'all' ||
      filterLocation === 'ALL' ||
      !filterLocation ||
      empCompId === String(filterLocation);

    const matchesLogin =
      filterLogin === 'all' ||
      (filterLogin === 'yes' && Boolean(emp.canLogin)) ||
      (filterLogin === 'no' && !emp.canLogin);

    return matchesSearch && matchesDept && matchesRole && matchesLocation && matchesLogin;
  });

  const isFiltered =
    searchQuery !== '' ||
    filterDepartment !== 'all' ||
    filterRole !== 'all' ||
    filterLocation !== 'all' ||
    filterLogin !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterDepartment('all');
    setFilterRole('all');
    setFilterLocation('all');
    setFilterLogin('all');
  };

  // Dropdown options
  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...(departments && departments.length > 0
      ? departments.map((d: any) => ({
          value: String(d.id || d.title || d.name),
          label: d.title || d.name || `Department #${d.id}`,
        }))
      : Array.from(
          new Set(
            employees
              .map((e) => e.department?.title || e.department?.name || e.department)
              .filter(Boolean)
          )
        ).map((dept: any) => ({
          value: String(dept),
          label: String(dept),
        }))),
  ];

  const locationOptions = [
    { value: 'all', label: 'All Locations' },
    ...(locations && locations.length > 0
      ? locations.map((loc: any) => ({
          value: String(loc.id),
          label: loc.name || loc.title || `Location #${loc.id}`,
        }))
      : []),
  ];

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'user', label: 'User' },
  ];

  const loginOptions = [
    { value: 'all', label: 'All Access' },
    { value: 'yes', label: 'Can Login' },
    { value: 'no', label: 'No Access' },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 shadow-2xs">
            <ShieldCheck className="size-3 text-purple-600" />
            Admin
          </span>
        );
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
            <UserCheck className="size-3 text-blue-600" />
            Supervisor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            User
          </span>
        );
    }
  };

  const getInitials = (emp: any) => {
    const f = emp?.firstName?.[0] || emp?.name?.[0] || 'E';
    const l = emp?.lastName?.[0] || '';
    return (f + l).toUpperCase();
  };

  return (
    <div className="space-y-5">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Employee Management</h2>
            <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200 font-semibold px-2.5 py-0.5 text-xs">
              {filteredEmployees.length} {filteredEmployees.length === employees.length ? 'Staff' : `of ${employees.length} Staff`}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage employee profiles, role permissions, access credentials, and payroll configurations
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchEmployees}
            className="h-10 w-10 text-gray-600 hover:text-gray-900 border-gray-200 rounded-xl"
            title="Refresh employees"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Link to={'/employees/add'} className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-xs rounded-xl h-10 px-4">
              <Plus className="mr-2 size-4" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Single Line Unified Toolbar & Content Container ────────────────────────────── */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Filters + Search Bar on the Left/Center */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Department Filter */}
              <SearchableSelect
                className="w-[155px] h-9 text-xs sm:text-sm bg-white rounded-xl border-gray-200"
                placeholder="Department"
                searchPlaceholder="Search dept..."
                value={filterDepartment}
                onValueChange={setFilterDepartment}
                options={departmentOptions}
              />

              {/* Role Filter */}
              <SearchableSelect
                className="w-[135px] h-9 text-xs sm:text-sm bg-white rounded-xl border-gray-200"
                placeholder="Role"
                searchPlaceholder="Search role..."
                value={filterRole}
                onValueChange={setFilterRole}
                options={roleOptions}
              />

              {/* Location Filter */}
              {locationOptions.length > 1 && (
                <SearchableSelect
                  className="w-[145px] h-9 text-xs sm:text-sm bg-white rounded-xl border-gray-200"
                  placeholder="Location"
                  searchPlaceholder="Search location..."
                  value={filterLocation}
                  onValueChange={(val) => {
                    setFilterLocation(val);
                    localStorage.setItem("selectedLocation", val);
                    localStorage.setItem("dashboard-selected-location", val);
                    window.dispatchEvent(new CustomEvent("location-changed", { detail: val }));
                  }}
                  options={locationOptions}
                />
              )}

              {/* Login Access Filter */}
              <SearchableSelect
                className="w-[135px] h-9 text-xs sm:text-sm bg-white rounded-xl border-gray-200"
                placeholder="Access"
                searchPlaceholder="Search access..."
                value={filterLogin}
                onValueChange={setFilterLogin}
                options={loginOptions}
              />

              {/* Search Bar */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search name, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-white rounded-xl border-gray-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Reset Filters Button */}
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 px-2.5 text-xs text-sky-600 hover:text-sky-800 hover:bg-sky-50 font-medium"
                  title="Clear all filters"
                >
                  <RotateCcw className="mr-1 size-3.5" />
                  Reset
                </Button>
              )}
            </div>

            {/* View Switcher (Table vs Grid Toggle) Aligned Right */}
            <div className="flex items-center bg-gray-200/60 p-1 rounded-xl border border-gray-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-sky-600 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Table View"
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-sky-600 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* ── Table View ────────────────────────────────────────── */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/70 hover:bg-gray-50/70 border-b border-gray-200/80">
                    <TableHead className="font-semibold text-gray-700 py-3.5 pl-6">Employee</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3.5">Department & Location</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3.5">Position</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3.5">Join Date</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3.5">Login Access</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3.5 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="size-6 animate-spin text-sky-500" />
                          <span className="text-sm font-medium">Loading employee records...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Users className="size-9 text-gray-300 mb-1" />
                          <p className="text-sm font-semibold text-gray-700">No employees found</p>
                          <p className="text-xs text-gray-400">
                            {isFiltered
                              ? 'No employee matches your active search filters.'
                              : 'Click "Add Employee" to create your first employee record.'}
                          </p>
                          {isFiltered && (
                            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Unnamed';
                      const deptName = emp.department?.title || emp.department?.name || emp.department || 'Unassigned';
                      const compObj = emp.company || locations.find((l) => String(l.id) === String(emp.companyId));
                      const locName = compObj?.name || compObj?.title || 'Head Office';
                      const position = emp.jobInfo?.designation || emp.designation || 'Staff Member';
                      const joinDate = emp.jobInfo?.hiringDate?.split('T')[0] || emp.hiringDate?.split('T')[0] || 'N/A';
                      const empCode = emp.employeeId || `#${emp.id}`;

                      return (
                        <TableRow key={emp.id} className="hover:bg-gray-50/80 transition-colors">
                          {/* Employee Name & Profile */}
                          <TableCell className="pl-6 py-3">
                            <div className="flex items-center gap-3">
                              {emp.profileImage ? (
                                <img
                                  src={
                                    emp.profileImage.startsWith('http')
                                      ? emp.profileImage
                                      : `${API_URL}${emp.profileImage}`
                                  }
                                  alt={empName}
                                  className="size-10 rounded-full border border-gray-200 object-cover shrink-0 shadow-2xs"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    if ((e.target as HTMLElement).nextElementSibling) {
                                      ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`size-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-xs items-center justify-center shrink-0 shadow-2xs ${
                                  emp.profileImage ? 'hidden' : 'flex'
                                }`}
                              >
                                {getInitials(emp)}
                              </div>

                              <div>
                                <Link
                                  to={`/employees/${emp.id}`}
                                  className="text-sm font-bold text-gray-900 hover:text-sky-600 transition-colors leading-snug block"
                                >
                                  {empName}
                                </Link>
                                <span className="text-xs text-gray-400 font-mono">
                                  ID: {empCode}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Department & Location */}
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-gray-800 font-medium">
                                <Building2 className="size-3.5 text-sky-500 shrink-0" />
                                <span>{deptName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <MapPin className="size-3 text-gray-400 shrink-0" />
                                <span>{locName}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Position */}
                          <TableCell className="py-3">
                            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                              {position}
                            </span>
                          </TableCell>

                          {/* Join Date */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                              <Calendar className="size-3.5 text-gray-400" />
                              <span>{joinDate}</span>
                            </div>
                          </TableCell>

                          {/* Login Access */}
                          <TableCell className="py-3">
                            {emp.canLogin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                Can Login
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                <XCircle className="size-3 text-gray-400" />
                                No Access
                              </span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="pr-6 py-3 text-right">
                            <TooltipProvider>
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link to={`/employees/${emp.id}`}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg"
                                      >
                                        <Eye className="size-4" />
                                      </Button>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">View Profile</p>
                                  </TooltipContent>
                                </Tooltip>

                                {emp.canLogin && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenPinModal(emp)}
                                        className="h-8 w-8 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                      >
                                        <Key className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-xs">Update PIN Access</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteClick(emp)}
                                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">Delete Record</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* ── Grid View ──────────────────────────────────────────── */
            <div className="p-5">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-gray-500 gap-2">
                  <RefreshCw className="size-6 animate-spin text-sky-500" />
                  <span className="text-sm font-medium">Loading employee records...</span>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center gap-1.5 text-gray-500">
                  <Users className="size-9 text-gray-300 mb-1" />
                  <p className="text-sm font-semibold text-gray-700">No employees found</p>
                  <p className="text-xs text-gray-400">
                    {isFiltered ? 'Try clearing your filters to see more results.' : 'Click "Add Employee" to create one.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredEmployees.map((emp) => {
                    const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Unnamed';
                    const deptName = emp.department?.title || emp.department?.name || emp.department || 'Unassigned';
                    const compObj = emp.company || locations.find((l) => String(l.id) === String(emp.companyId));
                    const locName = compObj?.name || compObj?.title || 'Head Office';
                    const position = emp.jobInfo?.designation || emp.designation || 'Staff Member';
                    const empCode = emp.employeeId || `#${emp.id}`;

                    return (
                      <div
                        key={emp.id}
                        className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-gray-300 transition-all p-4 flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Top Row: Role & Access Badge */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            {getRoleBadge(emp.role)}
                            {emp.canLogin ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                Login Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                No Login
                              </span>
                            )}
                          </div>

                          {/* Profile Header */}
                          <div className="flex flex-col items-center text-center my-2">
                            {emp.profileImage ? (
                              <img
                                src={
                                  emp.profileImage.startsWith('http')
                                    ? emp.profileImage
                                    : `${API_URL}${emp.profileImage}`
                                }
                                alt={empName}
                                className="size-16 rounded-full border-2 border-sky-100 object-cover shadow-sm mb-2"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                  if ((e.target as HTMLElement).nextElementSibling) {
                                    ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className={`size-16 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-lg items-center justify-center shadow-sm mb-2 ${
                                emp.profileImage ? 'hidden' : 'flex'
                              }`}
                            >
                              {getInitials(emp)}
                            </div>

                            <Link
                              to={`/employees/${emp.id}`}
                              className="text-base font-bold text-gray-900 hover:text-sky-600 transition-colors"
                            >
                              {empName}
                            </Link>
                            <p className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100 mt-1">
                              {position}
                            </p>
                            <span className="text-[11px] text-gray-400 font-mono mt-1">ID: {empCode}</span>
                          </div>

                          {/* Details Summary */}
                          <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-600 mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 flex items-center gap-1">
                                <Building2 className="size-3.5 text-gray-400" /> Dept:
                              </span>
                              <span className="font-semibold text-gray-800">{deptName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 flex items-center gap-1">
                                <MapPin className="size-3.5 text-gray-400" /> Location:
                              </span>
                              <span className="font-semibold text-gray-800">{locName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-100">
                          <Link to={`/employees/${emp.id}`} className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs font-semibold border-gray-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 h-8 rounded-xl"
                            >
                              <Eye className="mr-1.5 size-3.5" /> View
                            </Button>
                          </Link>

                          {emp.canLogin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPinModal(emp)}
                              className="text-xs font-semibold border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 h-8 rounded-xl"
                              title="Update PIN"
                            >
                              <Key className="size-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(emp)}
                            className="text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 rounded-xl"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Set PIN Dialog ────────────────────────────────────────── */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Key className="size-4" />
              </div>
              Update Access PIN
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-500">
              Set a quick 4-digit authentication PIN for{' '}
              <strong className="text-gray-900 font-semibold">
                {selectedEmployee?.firstName || selectedEmployee?.name}
              </strong>
              .
            </p>

            <div className="space-y-2 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 text-center">
              <Label className="text-xs font-semibold text-gray-700">New 4-Digit PIN</Label>
              <Input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="text-2xl tracking-widest text-center font-mono h-12 bg-white rounded-xl border-gray-300 focus:border-sky-500 focus:ring-sky-500/20"
              />
              <p className="text-[11px] text-gray-400">Only numeric digits are allowed.</p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setPinDialogOpen(false)}
                className="rounded-xl border-gray-200 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetPin}
                disabled={isUpdatingPin || newPin.length !== 4}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold px-4"
              >
                {isUpdatingPin ? 'Updating...' : 'Update PIN'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <div className="size-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                <Trash2 className="size-4" />
              </div>
              Delete Employee Record
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete employee{' '}
              <strong className="text-gray-900">
                {employeeToDelete?.firstName} {employeeToDelete?.lastName}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border-gray-200 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold px-4"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};