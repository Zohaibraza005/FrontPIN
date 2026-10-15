//@ts-nocheck

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { avatarColor } from '../utils/avatar';
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
  Globe,
  CheckCircle2,
  XCircle,
  Calendar,
  X,
  RotateCcw,
  Cpu,
  FileSpreadsheet,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, departmentAPI, employeeAPI, entityAPI, locationAPI } from '../services/api';
import { EMPLOYMENT_STATUSES, normalizeStatus } from '../utils/employmentStatus';
import { deviceService } from '../services/device.service';

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

export const Employees: React.FC = () => {
  const { user } = useAuth();
  const canViewEmployees = user?.role === "ADMIN" || Boolean(user?.privileges?.some((p: any) => p.module === "EMPLOYEE" && p.canRead));
  if (!canViewEmployees) {
    return <Navigate to="/" replace />;
  }

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);

  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterLogin, setFilterLogin] = useState('all');
  // 'active' = everyone except separated (default)
  const [filterStatus, setFilterStatus] = useState('active');

  // Pagination state for Employees
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDepartment, filterEntity, filterRole, filterLocation, filterLogin, filterStatus]);

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
  const [isPushingMachine, setIsPushingMachine] = useState(false);

  // Employee Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedNames, setPastedNames] = useState<string>('');
  const [importRole, setImportRole] = useState<'USER' | 'SUPERVISOR'>('USER');
  const [isImportingEmployees, setIsImportingEmployees] = useState(false);

  const handlePushToMachine = async (employeeId?: number) => {
    try {
      setIsPushingMachine(true);
      const res = await deviceService.pushUsers(employeeId);
      if (res && res.success) {
        toast.success(res.message || 'Pushed employee(s) to biometric machine successfully!');
      } else {
        toast.error(res?.message || 'Failed to push employee(s) to machine');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to push to biometric machine');
    } finally {
      setIsPushingMachine(false);
    }
  };

  const handleImportEmployees = async () => {
    if (!selectedFile && !pastedNames.trim()) {
      toast.error('Please select an Excel/CSV file or paste employee names');
      return;
    }

    try {
      setIsImportingEmployees(true);
      let res: any;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('role', importRole);
        if (pastedNames.trim()) {
          formData.append('employees', pastedNames);
        }
        res = await employeeAPI.importEmployees(formData);
      } else {
        const namesArray = pastedNames
          .split(/\n|,/)
          .map((n) => n.trim())
          .filter((n) => n.length > 2);
        res = await employeeAPI.importEmployees({ employees: namesArray, role: importRole });
      }

      if (res && res.success) {
        toast.success(res.message || 'Employees imported successfully!');
        setImportModalOpen(false);
        setSelectedFile(null);
        setPastedNames('');
        fetchEmployees();
      } else {
        toast.error(res?.message || 'Failed to import employees');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to import employees');
    } finally {
      setIsImportingEmployees(false);
    }
  };


  useEffect(() => {

    fetchEmployees();
    fetchLocations();
    fetchDepartments();
    fetchEntities();

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

  const fetchEntities = async () => {
    try {
      const res = await entityAPI.getEntities();
      setEntities(res.data || []);
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
    const username = emp.username || '';
    const phone = emp.phoneNumber || '';
    const designation = emp.jobInfo?.designation || emp.designation || '';
    const empCode = emp.employeeId || emp.id?.toString() || '';
    const biometricId = emp.biometricId ? String(emp.biometricId) : '';
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      fullName.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      username.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query) ||
      designation.toLowerCase().includes(query) ||
      empCode.toLowerCase().includes(query) ||
      biometricId.toLowerCase().includes(query);

    // If query was typed but this employee doesn't match the search, skip
    if (!matchesSearch) return false;

    // When a user explicitly searches for an employee by name, ID, username, phone or email,
    // show them immediately across all branches and departments so they are never hidden
    if (query) {
      return true;
    }

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

    const matchesRole = filterRole === 'all' || emp.role?.toLowerCase() === filterRole?.toLowerCase();

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

    const empEntityId = String(emp.entityId ?? emp.entity?.id ?? '');
    const matchesEntity =
      filterEntity === 'all' ||
      (filterEntity === 'none' ? !empEntityId : empEntityId === filterEntity);

    const empStatus = normalizeStatus(emp.jobInfo?.employmentStatus);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' ? empStatus !== 'Separated' : empStatus === filterStatus);

    return matchesDept && matchesEntity && matchesRole && matchesLocation && matchesLogin && matchesStatus;
  });

  // Pagination calculations
  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEmployees);
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, startIndex, endIndex]);

  const isFiltered =
    searchQuery !== '' ||
    filterDepartment !== 'all' ||
    filterEntity !== 'all' ||
    filterRole !== 'all' ||
    filterLocation !== 'all' ||
    filterLogin !== 'all' ||
    filterStatus !== 'active';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterDepartment('all');
    setFilterEntity('all');
    setFilterRole('all');
    setFilterLocation('all');
    setFilterLogin('all');
    setFilterStatus('active');
    setCurrentPage(1);
  };

  // Dropdown options
  const statusOptions = [
    { value: 'active', label: 'Active Staff' },
    { value: 'all', label: 'All Statuses' },
    ...EMPLOYMENT_STATUSES.map((st) => ({ value: st, label: st })),
    { value: 'Separated', label: 'Separated' },
  ];

  const entityOptions = [
    { value: 'all', label: 'All Entities' },
    ...entities.map((en: any) => ({ value: String(en.id), label: en.name || `Entity #${en.id}` })),
    { value: 'none', label: 'No Entity' },
  ];

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
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Employee Management</h2>
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 font-semibold px-2 py-0.5 text-xs rounded-md tabular-nums">
              {filteredEmployees.length} {filteredEmployees.length === employees.length ? 'Staff' : `of ${employees.length} Staff`}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage employee profiles, role permissions, access credentials, and payroll configurations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchEmployees}
            className="h-9 w-9 text-gray-600 hover:text-gray-900 border-gray-200 dark:border-gray-800 rounded-xl"
            title="Refresh employees"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            onClick={() => handlePushToMachine()}
            disabled={isPushingMachine}
            className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 shadow-2xs rounded-xl flex items-center"
            title="Push all active employees to biometric machines"
          >
            <Cpu className={`size-3.5 ${isPushingMachine ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>{isPushingMachine ? 'Syncing...' : 'Sync'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/40 shadow-2xs rounded-xl flex items-center"
            title="Import Employees / Supervisors from Excel / CSV file"
          >
            <FileSpreadsheet className="size-3.5 text-indigo-600" />
            <span>Import</span>
          </Button>

          <Link to={'/employees/add'}>
            <Button className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs rounded-xl">
              <Plus className="size-3.5" />
              Add
            </Button>
          </Link>
        </div>

      </div>

      {/* ── Single Line Unified Toolbar & Content Container ────────────────────────────── */}
      <Card className="gap-0 shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Filters + Search Bar on the Left/Center */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Department Filter */}
              <SearchableSelect
                className="w-[165px] h-9 rounded-xl"
                icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
                placeholder="Department"
                searchPlaceholder="Search dept..."
                value={filterDepartment}
                onValueChange={setFilterDepartment}
                options={departmentOptions}
              />

              {/* Entity Filter */}
              <SearchableSelect
                className="w-[160px] h-9 rounded-xl"
                icon={<Globe className="w-3.5 h-3.5 text-gray-400" />}
                placeholder="Entity"
                searchPlaceholder="Search entity..."
                value={filterEntity}
                onValueChange={setFilterEntity}
                options={entityOptions}
              />

              {/* Status Filter */}
              <SearchableSelect
                className="w-[150px] h-9 rounded-xl"
                icon={<UserCheck className="w-3.5 h-3.5 text-gray-400" />}
                placeholder="Status"
                searchPlaceholder="Search status..."
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={statusOptions}
              />

              {/* Role Filter */}
              <SearchableSelect
                className="w-[145px] h-9 rounded-xl"
                icon={<ShieldCheck className="w-3.5 h-3.5 text-gray-400" />}
                placeholder="Role"
                searchPlaceholder="Search role..."
                value={filterRole}
                onValueChange={setFilterRole}
                options={roleOptions}
              />

              {/* Location Filter */}
              {locationOptions.length > 1 && (
                <SearchableSelect
                  className="w-[165px] h-9 rounded-xl"
                  icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
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
                className="w-[145px] h-9 rounded-xl"
                icon={<Key className="w-3.5 h-3.5 text-gray-400" />}
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
                  className="pl-9 pr-8 h-9 text-sm bg-white dark:bg-gray-950 rounded-xl"
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
                  className="h-9 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl"
                  title="Clear all filters"
                >
                  <RotateCcw className="mr-1 size-3.5" />
                  Reset
                </Button>
              )}
            </div>

            {/* View Switcher (Table vs Grid Toggle) Aligned Right */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-950 text-blue-600 shadow-2xs font-semibold'
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
                    ? 'bg-white dark:bg-gray-950 text-blue-600 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
          {/* ── Table View ────────────────────────────────────────── */}
          {viewMode === 'table' ? (
            <div>
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-50/80">
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pl-4">Employee</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Department & Location</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Position</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Join Date</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Login Access</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right pr-4">Actions</TableHead>
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
                    paginatedEmployees.map((emp) => {
                      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Unnamed';
                      const deptName = emp.department?.title || emp.department?.name || emp.department || 'Unassigned';
                      const compObj = emp.company || locations.find((l) => String(l.id) === String(emp.companyId));
                      const locName = compObj?.name || compObj?.title || 'Head Office';
                      const position = emp.jobInfo?.designation || emp.designation || 'Staff Member';
                      const joinDate = emp.jobInfo?.hiringDate?.split('T')[0] || emp.hiringDate?.split('T')[0] || 'N/A';
                      const empCode = emp.employeeId || `#${emp.id}`;

                      return (
                        <TableRow key={emp.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-900/40 transition-colors">
                          {/* Employee Name & Profile */}
                          <TableCell className="pl-4 py-3">
                            <div className="flex items-center gap-3">
                              {emp.profileImage ? (
                                <img
                                  src={
                                    emp.profileImage.startsWith('http')
                                      ? emp.profileImage
                                      : `${API_URL}${emp.profileImage}`
                                  }
                                  alt={empName}
                                  className="size-9 rounded-full border border-gray-200 object-cover shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    if ((e.target as HTMLElement).nextElementSibling) {
                                      ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`size-9 rounded-full font-semibold text-xs items-center justify-center shrink-0 ${avatarColor(empName)} ${
                                  emp.profileImage ? 'hidden' : 'flex'
                                }`}
                              >
                                {getInitials(emp)}
                              </div>

                              <div>
                                <Link
                                  to={`/employees/${emp.id}`}
                                  className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors leading-snug block"
                                >
                                  {empName}
                                </Link>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {empCode}
                                </span>
                                {normalizeStatus(emp.jobInfo?.employmentStatus) === 'Separated' && (
                                  <span className="ml-1.5 inline-flex items-center px-1.5 py-px rounded-full border text-[10px] font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                    Separated
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Department & Location */}
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200 font-medium">
                                <Building2 className="size-3.5 text-gray-400 shrink-0" />
                                <span>{deptName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <MapPin className="size-3 text-gray-400 shrink-0" />
                                <span>{locName}</span>
                              </div>
                              {(emp.entity?.name || entities.find((en: any) => String(en.id) === String(emp.entityId))?.name) && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Globe className="size-3 text-gray-400 shrink-0" />
                                  <span>{emp.entity?.name || entities.find((en: any) => String(en.id) === String(emp.entityId))?.name}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Position */}
                          <TableCell className="py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              {position}
                            </span>
                          </TableCell>

                          {/* Join Date */}
                          <TableCell className="py-3">
                            <div className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                              <span>{joinDate}</span>
                            </div>
                          </TableCell>

                          {/* Login Access */}
                          <TableCell className="py-3">
                            {emp.canLogin ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Can login
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                No access
                              </span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="pr-4 py-3 text-right">
                            <TooltipProvider>
                              <div className="flex items-center justify-end gap-1.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link to={`/employees/${emp.id}`}>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                                      >
                                        <Eye className="size-3.5" />
                                        View
                                      </Button>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">View Profile</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handlePushToMachine(emp.id)}
                                      disabled={isPushingMachine}
                                      className="size-8 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:border-gray-800"
                                    >
                                      <Cpu className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">Push {emp.firstName} to Machine</p>
                                  </TooltipContent>
                                </Tooltip>

                                {emp.canLogin && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenPinModal(emp)}
                                        className="size-8 rounded-lg border border-amber-200 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:border-amber-900"
                                      >
                                        <Key className="size-3.5" />
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
                                      className="size-8 rounded-lg border border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 dark:border-red-900"
                                    >
                                      <Trash2 className="size-3.5" />
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
                  {paginatedEmployees.map((emp) => {
                    const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Unnamed';
                    const deptName = emp.department?.title || emp.department?.name || emp.department || 'Unassigned';
                    const compObj = emp.company || locations.find((l) => String(l.id) === String(emp.companyId));
                    const locName = compObj?.name || compObj?.title || 'Head Office';
                    const position = emp.jobInfo?.designation || emp.designation || 'Staff Member';
                    const empCode = emp.employeeId || `#${emp.id}`;

                    return (
                      <div
                        key={emp.id}
                        className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-gray-300 transition-all p-4 flex flex-col justify-between"
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
                                className="size-16 rounded-full border-2 border-white ring-1 ring-gray-200 object-cover mb-2"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                  if ((e.target as HTMLElement).nextElementSibling) {
                                    ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className={`size-16 rounded-full font-semibold text-lg items-center justify-center mb-2 ${avatarColor(empName)} ${
                                emp.profileImage ? 'hidden' : 'flex'
                              }`}
                            >
                              {getInitials(emp)}
                            </div>

                            <Link
                              to={`/employees/${emp.id}`}
                              className="text-base font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors"
                            >
                              {empName}
                            </Link>
                            <p className="text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded-md mt-1">
                              {position}
                            </p>
                            <span className="text-[11px] text-gray-500 mt-1">{empCode}</span>
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
                              className="w-full text-xs font-semibold border-gray-200 hover:bg-gray-50 h-8 rounded-lg"
                            >
                              <Eye className="mr-1.5 size-3.5" /> View
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePushToMachine(emp.id)}
                            disabled={isPushingMachine}
                            className="text-xs text-gray-600 border-gray-200 hover:text-blue-600 hover:bg-blue-50 h-8 rounded-lg"
                            title={`Push ${emp.firstName} to Machine`}
                          >
                            <Cpu className="size-3.5" />
                          </Button>

                          {emp.canLogin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPinModal(emp)}
                              className="text-xs text-amber-600 border-amber-200 hover:bg-amber-50 h-8 rounded-lg"
                              title="Update PIN"
                            >
                              <Key className="size-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(emp)}
                            className="text-xs text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
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

          {/* Pagination Footer */}
          {totalEmployees > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Showing <strong className="text-gray-700 dark:text-gray-200">{startIndex + 1}</strong> to{" "}
                  <strong className="text-gray-700 dark:text-gray-200">{endIndex}</strong> of{" "}
                  <strong className="text-gray-700 dark:text-gray-200">{totalEmployees}</strong> employees
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

      {/* ── Set PIN Dialog ────────────────────────────────────────── */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="size-10 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 flex items-center justify-center">
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

            <div className="space-y-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-center">
              <Label className="text-xs font-semibold text-gray-700">New 4-Digit PIN</Label>
              <Input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="text-2xl tracking-widest text-center font-mono h-12 bg-white dark:bg-gray-950 rounded-xl"
              />
              <p className="text-[11px] text-gray-400">Only numeric digits are allowed.</p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setPinDialogOpen(false)}
                className="h-10 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetPin}
                disabled={isUpdatingPin || newPin.length !== 4}
                className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
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
            <DialogTitle className="text-base font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="size-10 rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 flex items-center justify-center">
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
                className="h-10 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Employees Dialog ────────────────────────────── */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="size-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 flex items-center justify-center">
                <FileSpreadsheet className="size-4" />
              </div>
              Import Employees via Excel / CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-500">
              Select your Excel sheet (<code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">.xlsx, .csv</code>) containing employee names. New employees will be created in system and auto-matched with their real biometric IDs on the Hikvision terminal!
            </p>

            {/* Role Selection Option */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-gray-700">Assign Role to Imported Users:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setImportRole('USER')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${importRole === 'USER' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                >
                  Employee (User)
                </button>
                <button
                  type="button"
                  onClick={() => setImportRole('SUPERVISOR')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${importRole === 'SUPERVISOR' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                >
                  Supervisor
                </button>
              </div>
            </div>

            {/* File Upload Drop Zone */}
            <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors p-5 rounded-2xl text-center space-y-2">
              <input
                type="file"
                id="employee-file-upload"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="employee-file-upload" className="cursor-pointer space-y-1 block">
                <Upload className="size-8 text-indigo-500 mx-auto" />
                <span className="text-xs font-semibold text-indigo-700 block">
                  {selectedFile ? selectedFile.name : 'Click to Browse or Select Excel File'}
                </span>
                <span className="text-[11px] text-gray-400 block">
                  Supports Excel (.xlsx, .xls) and CSV (.csv) files
                </span>
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 underline font-medium pt-1 block mx-auto"
                >
                  Remove selected file
                </button>
              )}
            </div>

            {/* Optional Paste Text Area */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Or Paste Employee Names (One per line)
              </Label>
              <textarea
                rows={4}
                placeholder="Faraz Farooqi&#10;Waleed Ali Naweed&#10;Mujahid Rafiq&#10;Zargham Irtiza"
                value={pastedNames}
                onChange={(e) => setPastedNames(e.target.value)}
                className="w-full text-xs font-mono p-3 bg-white rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">
                Target Role: <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">{importRole}</Badge>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportModalOpen(false);
                    setSelectedFile(null);
                    setPastedNames('');
                  }}
                  className="h-10 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportEmployees}
                  disabled={isImportingEmployees || (!selectedFile && !pastedNames.trim())}
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="size-3.5" />
                  {isImportingEmployees ? 'Importing...' : 'Import Employees'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};