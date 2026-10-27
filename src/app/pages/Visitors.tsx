//@ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  UserCheck,
  Plus,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Mail,
  CreditCard,
  LogOut,
  LogIn,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Edit,
  Printer,
  Car,
  FileText,
  Cpu,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { visitorAPI, employeeAPI, locationAPI, departmentAPI } from '../services/api';
import { deviceService } from '../services/device.service';
import { DatePicker } from '../components/ui/date-picker';

const getPaginationRange = (current: number, total: number) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const delta = 1;
  const range: (number | string)[] = [];

  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }

  if (current - delta > 2) range.unshift("...");
  if (current + delta < total - 1) range.push("...");

  range.unshift(1);
  range.push(total);
  return range;
};

export const Visitors: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [visitors, setVisitors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, checkedIn: 0, expected: 0, checkedOut: 0, today: 0 });
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [customDate, setCustomDate] = useState('');

  // Layout & Pagination
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [visitorToDelete, setVisitorToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Machine sync state
  const [isPushingMachine, setIsPushingMachine] = useState(false);
  const [pushingId, setPushingId] = useState<number | null>(null);

  const handlePushToMachine = async (visitorId?: number, visitorName?: string) => {
    try {
      if (visitorId) {
        setPushingId(visitorId);
      } else {
        setIsPushingMachine(true);
      }

      const res = await deviceService.pushVisitors(visitorId);
      if (res && res.success) {
        toast.success(res.message || `${visitorName || 'Visitors'} pushed to biometric machine successfully!`);
        fetchVisitors(true);
      } else {
        toast.error(res?.message || 'Failed to push visitor(s) to machine');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to push to biometric machine');
    } finally {
      setIsPushingMachine(false);
      setPushingId(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterLocation, filterDepartment, filterDate, customDate]);

  useEffect(() => {
    fetchVisitors();
    fetchStats();
    fetchLocations();
    fetchDepartments();
    fetchEmployees();

    // 🔄 Real-time polling every 5 seconds for live visitor updates
    const pollInterval = setInterval(() => {
      fetchVisitors(true);
      fetchStats();
    }, 5000);

    const handleUpdate = () => {
      fetchVisitors(true);
      fetchStats();
    };

    window.addEventListener("visitor-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("visitor-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  const fetchVisitors = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await visitorAPI.getVisitors();
      if (res && res.success) {
        setVisitors(res.data || []);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load visitors');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await visitorAPI.getStats();
      if (res && res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await locationAPI.getLocations();
      setLocations(res.data || []);
    } catch (err) {}
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getDepartments();
      setDepartments(res.data || []);
    } catch (err) {}
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getEmployees();
      setEmployees((res.data || []).filter((e: any) => e.role !== 'ADMIN' && e.role !== 'admin'));
    } catch (err) {}
  };

  // 1-Click Check Out
  const handleCheckOut = async (id: number, name: string) => {
    try {
      const res = await visitorAPI.checkOutVisitor(id);
      if (res && res.success) {
        toast.success(res.message || `${name} checked out successfully!`);
        fetchVisitors(true);
        fetchStats();
        window.dispatchEvent(new CustomEvent("visitor-updated"));
      } else {
        toast.error(res?.message || 'Failed to check out visitor');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error checking out visitor');
    }
  };

  // 1-Click Check In
  const handleCheckIn = async (id: number, name: string) => {
    try {
      const res = await visitorAPI.checkInVisitor(id);
      if (res && res.success) {
        toast.success(res.message || `${name} checked in successfully!`);
        fetchVisitors(true);
        fetchStats();
        window.dispatchEvent(new CustomEvent("visitor-updated"));
      } else {
        toast.error(res?.message || 'Failed to check in visitor');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error checking in visitor');
    }
  };

  // Delete
  const handleDeleteVisitor = async () => {
    if (!visitorToDelete) return;
    try {
      setIsDeleting(true);
      await visitorAPI.deleteVisitor(visitorToDelete.id);
      toast.success('Visitor record deleted successfully');
      setDeleteModalOpen(false);
      setVisitorToDelete(null);
      fetchVisitors();
      fetchStats();
      window.dispatchEvent(new CustomEvent("visitor-updated"));
    } catch (err) {
      toast.error('Failed to delete visitor');
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit save
  const handleSaveEdit = async () => {
    if (!editData?.id) return;
    try {
      setIsUpdating(true);
      const res = await visitorAPI.updateVisitor(editData.id, editData);
      if (res && res.success) {
        toast.success('Visitor updated successfully!');
        setEditModalOpen(false);
        fetchVisitors(true);
        fetchStats();
        window.dispatchEvent(new CustomEvent("visitor-updated"));
      } else {
        toast.error(res?.message || 'Failed to update visitor');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating visitor');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter Visitors
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const hostName = `${v.host?.firstName || ''} ${v.host?.lastName || ''}`.toLowerCase();

      const matchesSearch =
        !q ||
        (v.fullName && v.fullName.toLowerCase().includes(q)) ||
        (v.phone && v.phone.toLowerCase().includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.nationalId && v.nationalId.toLowerCase().includes(q)) ||
        (v.visitorCompany && v.visitorCompany.toLowerCase().includes(q)) ||
        (v.purpose && v.purpose.toLowerCase().includes(q)) ||
        (v.badgeNumber && v.badgeNumber.toLowerCase().includes(q)) ||
        hostName.includes(q);

      if (!matchesSearch) return false;

      // Status
      const matchesStatus =
        filterStatus === 'all' ||
        (v.status && v.status.toUpperCase() === filterStatus.toUpperCase());

      // Location
      const matchesLocation =
        filterLocation === 'all' ||
        !filterLocation ||
        String(v.companyId || '') === String(filterLocation);

      // Department
      const matchesDept =
        filterDepartment === 'all' ||
        !filterDepartment ||
        String(v.departmentId || '') === String(filterDepartment);

      // Date
      let matchesDate = true;
      if (customDate) {
        // Specific custom date (previous day or any selected date)
        const cDate = customDate; // format: "YYYY-MM-DD"
        const createdDate = v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '';
        const checkInDate = v.checkInTime ? new Date(v.checkInTime).toISOString().slice(0, 10) : '';
        const startDateStr = v.startDate ? new Date(v.startDate).toISOString().slice(0, 10) : '';
        matchesDate = cDate === createdDate || cDate === checkInDate || cDate === startDateStr;
      } else if (filterDate === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const vDateStr = v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '';
        const checkInStr = v.checkInTime ? new Date(v.checkInTime).toISOString().slice(0, 10) : '';
        matchesDate = todayStr === vDateStr || todayStr === checkInStr;
      } else if (filterDate === 'yesterday') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = yest.toISOString().slice(0, 10);
        const vDateStr = v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '';
        const checkInStr = v.checkInTime ? new Date(v.checkInTime).toISOString().slice(0, 10) : '';
        matchesDate = yestStr === vDateStr || yestStr === checkInStr;
      } else if (filterDate === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = v.createdAt && new Date(v.createdAt) >= weekAgo;
      } else if (filterDate === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        matchesDate = v.createdAt && new Date(v.createdAt) >= monthAgo;
      }

      return matchesStatus && matchesLocation && matchesDept && matchesDate;
    });
  }, [visitors, searchQuery, filterStatus, filterLocation, filterDepartment, filterDate, customDate]);

  // Pagination calculations
  const totalVisitors = filteredVisitors.length;
  const totalPages = Math.max(1, Math.ceil(totalVisitors / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const currentVisitors = filteredVisitors.slice(startIndex, startIndex + itemsPerPage);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return '—';
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Checked In
          </span>
        );
      case 'EXPECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="size-3 text-amber-600" />
            Expected
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="size-3 text-slate-500" />
            Checked Out
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="size-3 text-rose-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'V';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-2xs">
              <UserCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Visitor Management</h2>
                <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200 font-semibold px-2.5 py-0.5 text-xs">
                  {filteredVisitors.length} {filteredVisitors.length === visitors.length ? 'Visitors' : `of ${visitors.length} Visitors`}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Monitor office guests, manage scheduled meetings, print passes and track real-time security check-ins
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchVisitors();
              fetchStats();
            }}
            className="h-10 w-10 text-gray-600 hover:text-gray-900 border-gray-200 rounded-xl"
            title="Refresh visitors"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            onClick={() => handlePushToMachine()}
            disabled={isPushingMachine}
            className="w-full sm:w-auto border-sky-200 text-sky-700 bg-sky-50/80 hover:bg-sky-100 hover:text-sky-800 font-semibold shadow-2xs rounded-xl h-10 px-3.5 flex items-center gap-2"
            title="Push all active visitors to biometric machines"
          >
            <Cpu className={`size-4 ${isPushingMachine ? 'animate-spin text-sky-600' : 'text-sky-600'}`} />
            <span>{isPushingMachine ? 'Pushing...' : 'Push to Machine'}</span>
          </Button>

          <Button
            asChild
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-medium px-4 flex items-center gap-2"
          >
            <Link to="/visitors/add">
              <Plus className="size-4" />
              <span>Add Visitor</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stat KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Visitors */}
        <Card className="border border-gray-200/80 shadow-2xs rounded-2xl bg-white hover:border-gray-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Visitors</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total || visitors.length}</h3>
              <p className="text-xs text-gray-400 mt-0.5">All registered entries</p>
            </div>
            <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Today Present */}
        <Card className="border border-emerald-200/80 shadow-2xs rounded-2xl bg-emerald-50/20 hover:border-emerald-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Today Present</p>
              </div>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{stats.checkedIn ?? stats.today ?? 0}</h3>
              <p className="text-xs text-emerald-600 mt-0.5">Present in company today</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <LogIn className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        {/* Row 1: Search Bar + Table/Grid Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by visitor name, phone, CNIC, host, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 rounded-xl border-gray-200 bg-gray-50/40 text-xs sm:text-sm focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 self-end sm:self-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <List className="size-3.5 mr-1" /> Table
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="size-3.5 mr-1" /> Grid
            </Button>
          </div>
        </div>

        {/* Row 2: Filter Dropdowns & Date Picker */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-gray-100">
          {/* Status Filter */}
          <SearchableSelect
            className="w-[140px] h-9 rounded-xl border-gray-200 text-xs bg-gray-50/40 hover:bg-white"
            placeholder="All Visitors"
            searchPlaceholder="Filter visitors..."
            value={filterStatus}
            onValueChange={setFilterStatus}
            options={[
              { value: 'all', label: 'Total Visitors' },
              { value: 'CHECKED_IN', label: 'Today Present' },
            ]}
          />

          {/* Location Filter */}
          {locations.length > 0 && (
            <SearchableSelect
              className="w-[140px] h-9 rounded-xl border-gray-200 text-xs bg-gray-50/40 hover:bg-white"
              icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
              placeholder="All Locations"
              searchPlaceholder="Search location..."
              value={filterLocation}
              onValueChange={setFilterLocation}
              options={[
                { value: 'all', label: 'All Locations' },
                ...locations.map((loc) => ({
                  value: String(loc.id),
                  label: loc.name || `Location #${loc.id}`,
                })),
              ]}
            />
          )}

          {/* Department Filter */}
          {departments.length > 0 && (
            <SearchableSelect
              className="w-[140px] h-9 rounded-xl border-gray-200 text-xs bg-gray-50/40 hover:bg-white"
              icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
              placeholder="All Departments"
              searchPlaceholder="Search dept..."
              value={filterDepartment}
              onValueChange={setFilterDepartment}
              options={[
                { value: 'all', label: 'All Departments' },
                ...departments.map((dept) => ({
                  value: String(dept.id),
                  label: dept.title || dept.name || `Dept #${dept.id}`,
                })),
              ]}
            />
          )}

          {/* Date Presets Filter */}
          <SearchableSelect
            className="w-[130px] h-9 rounded-xl border-gray-200 text-xs bg-gray-50/40 hover:bg-white"
            icon={<Calendar className="w-3.5 h-3.5 text-gray-400" />}
            placeholder="All Time"
            searchPlaceholder="Filter date..."
            value={filterDate}
            onValueChange={(val) => {
              setFilterDate(val);
              if (val !== 'custom') setCustomDate('');
            }}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'week', label: 'Past 7 Days' },
              { value: 'month', label: 'Past 30 Days' },
            ]}
          />

          {/* Specific Date Filter (Previous Day / Custom Date Picker) */}
          <DatePicker
            size="sm"
            value={customDate}
            onValueChange={(val) => {
              setCustomDate(val);
              if (val) setFilterDate('all');
            }}
            placeholder="Pick Date"
            clearable
            className="w-[145px] rounded-xl border-gray-200 bg-gray-50/40 hover:bg-white text-xs"
          />

          {/* Reset Filters button */}
          {(searchQuery || filterStatus !== 'all' || filterLocation !== 'all' || filterDepartment !== 'all' || filterDate !== 'all' || customDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterLocation('all');
                setFilterDepartment('all');
                setFilterDate('all');
                setCustomDate('');
              }}
              className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-medium"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Data View (Table / Grid) ─────────────────────────── */}
      {loading && visitors.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <RefreshCw className="size-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Loading visitors real-time database...</p>
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="size-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <UserCheck className="size-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No visitors found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'all' || filterLocation !== 'all'
              ? 'No visitors match the selected filters. Try clearing your search or filters.'
              : 'No company visitors have been registered yet. Click "Add Visitor" to record your first guest.'}
          </p>
          <Button
            asChild
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Link to="/visitors/add">
              <Plus className="size-4 mr-1.5" /> Add Visitor
            </Link>
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/80">
              <TableRow className="border-b border-gray-100">
                <TableHead className="w-[240px] text-xs font-semibold text-gray-600 uppercase tracking-wider py-3.5">
                  Visitor Details
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact & ID
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Host & Dept
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Check-In
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Check-Out
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {currentVisitors.map((v) => {
                const hostName = v.host ? `${v.host.firstName} ${v.host.lastName || ''}`.trim() : 'General Visit';
                return (
                  <TableRow key={v.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Visitor Details */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        {v.photo ? (
                          <img
                            src={v.photo.startsWith('http') ? v.photo : `/${v.photo}`}
                            alt={v.fullName}
                            className="size-10 rounded-xl object-cover border border-gray-200"
                            onError={(e: any) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                            {getInitials(v.fullName)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{v.fullName}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="size-3 text-gray-400" />
                            {v.visitorCompany || 'Independent'}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact & CNIC */}
                    <TableCell>
                      <p className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
                        <Phone className="size-3 text-gray-400" />
                        {v.phone}
                      </p>
                      {v.nationalId && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <CreditCard className="size-3 text-gray-400" />
                          CNIC: {v.nationalId}
                        </p>
                      )}
                      {v.email && (
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Mail className="size-3 text-gray-400" />
                          {v.email}
                        </p>
                      )}
                    </TableCell>

                    {/* Host & Dept */}
                    <TableCell>
                      <p className="text-xs font-semibold text-gray-800">{hostName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {v.department?.title || v.department?.name || v.company?.name || 'All Staff'}
                      </p>
                    </TableCell>

                    {/* Check-In */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-gray-900 font-mono">
                          {formatTime(v.checkInTime || v.createdAt)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Check-Out */}
                    <TableCell>
                      {v.checkOutTime ? (
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-slate-400 shrink-0" />
                          <span className="text-xs font-semibold text-gray-900 font-mono">
                            {formatTime(v.checkOutTime)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-semibold text-sm pl-2">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1-Click Check Out */}
                        {v.status === 'CHECKED_IN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckOut(v.id, v.fullName)}
                            className="h-8 text-xs font-medium text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-lg px-2.5"
                            title="Check Out Visitor"
                          >
                            <LogOut className="size-3 mr-1" /> Check Out
                          </Button>
                        )}

                        {/* 1-Click Check In for Expected */}
                        {v.status === 'EXPECTED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckIn(v.id, v.fullName)}
                            className="h-8 text-xs font-medium text-blue-700 border-blue-200 hover:bg-blue-50 rounded-lg px-2.5"
                            title="Check In Visitor"
                          >
                            <LogIn className="size-3 mr-1" /> Check In
                          </Button>
                        )}

                        {/* Push to Machine */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePushToMachine(v.id, v.fullName)}
                                disabled={isPushingMachine || pushingId === v.id}
                                className="h-8 w-8 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg"
                                title="Push to Machine"
                              >
                                <Cpu className={`size-4 ${pushingId === v.id ? 'animate-spin text-sky-600' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Push to Machine</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* View Pass / Details */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedVisitor(v);
                            setViewModalOpen(true);
                          }}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600 rounded-lg"
                          title="View Visitor Pass & Details"
                        >
                          <Eye className="size-4" />
                        </Button>

                        {/* Edit */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditData({ ...v });
                            setEditModalOpen(true);
                          }}
                          className="h-8 w-8 text-gray-500 hover:text-indigo-600 rounded-lg"
                          title="Edit Visitor"
                        >
                          <Edit className="size-4" />
                        </Button>

                        {/* Delete */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setVisitorToDelete(v);
                            setDeleteModalOpen(true);
                          }}
                          className="h-8 w-8 text-gray-500 hover:text-rose-600 rounded-lg"
                          title="Delete Visitor Record"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination Bar */}
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalVisitors)} of {totalVisitors} entries</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-7 text-xs border-gray-200 rounded-lg bg-gray-50 text-gray-700 px-1.5 ml-2"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 rounded-lg border-gray-200 text-xs"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Previous
              </Button>

              {getPaginationRange(currentPage, totalPages).map((p, idx) =>
                typeof p === 'number' ? (
                  <Button
                    key={idx}
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(p)}
                    className={`h-8 w-8 rounded-lg text-xs p-0 ${
                      p === currentPage ? 'bg-blue-600 text-white' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {p}
                  </Button>
                ) : (
                  <span key={idx} className="px-1 text-gray-400">...</span>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 rounded-lg border-gray-200 text-xs"
              >
                Next <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {currentVisitors.map((v) => {
            const hostName = v.host ? `${v.host.firstName} ${v.host.lastName || ''}`.trim() : 'General Visit';
            return (
              <Card
                key={v.id}
                className="border border-gray-200/90 hover:border-blue-300 hover:shadow-md transition-all rounded-2xl bg-white p-5 flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  {/* Card Header: Avatar, Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {v.photo ? (
                        <img
                          src={v.photo.startsWith('http') ? v.photo : `/${v.photo}`}
                          alt={v.fullName}
                          className="size-12 rounded-2xl object-cover border border-gray-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs">
                          {getInitials(v.fullName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 text-base leading-tight truncate">{v.fullName}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
                          <Building2 className="size-3 text-gray-400 shrink-0" />
                          <span>{v.company?.name || v.department?.name || 'Main Office'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(v.status)}</div>
                  </div>

                  {/* Information Details Box */}
                  <div className="mt-4 bg-gray-50/70 rounded-xl p-3.5 space-y-2 border border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Phone className="size-3.5 text-gray-400" /> Phone:
                      </span>
                      <span className="font-semibold text-gray-800 font-mono">{v.phone}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Users className="size-3.5 text-gray-400" /> Host:
                      </span>
                      <span className="font-semibold text-gray-800 truncate max-w-[160px]">{hostName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <FileText className="size-3.5 text-gray-400" /> Purpose:
                      </span>
                      <Badge variant="secondary" className="text-xs bg-white border border-gray-200/80 font-normal truncate max-w-[150px]">
                        {v.purpose || 'Meeting'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-gray-400" /> Checked In:
                      </span>
                      <span className="font-medium text-gray-700">{formatDateTime(v.checkInTime || v.createdAt)}</span>
                    </div>

                    {v.startDate && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-blue-500" /> Since Date:
                        </span>
                        <span className="font-medium text-blue-600">
                          {new Date(v.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                  {/* Secondary Action Icons */}
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handlePushToMachine(v.id, v.fullName)}
                            disabled={isPushingMachine || pushingId === v.id}
                            className="h-8 w-8 text-sky-700 hover:text-sky-800 hover:bg-sky-50 border-gray-200 rounded-xl"
                          >
                            <Cpu className={`size-3.5 ${pushingId === v.id ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Push to Machine</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              setSelectedVisitor(v);
                              setViewModalOpen(true);
                            }}
                            className="h-8 w-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 border-gray-200 rounded-xl"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">View Pass</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              setEditData({ ...v });
                              setEditModalOpen(true);
                            }}
                            className="h-8 w-8 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border-gray-200 rounded-xl"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Edit Visitor</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              setVisitorToDelete(v);
                              setDeleteModalOpen(true);
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border-gray-200 rounded-xl"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Delete Record</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Primary Status Action Button */}
                  {v.status === 'CHECKED_IN' ? (
                    <Button
                      size="sm"
                      onClick={() => handleCheckOut(v.id, v.fullName)}
                      className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs flex items-center gap-1.5"
                    >
                      <LogOut className="size-3.5" />
                      <span>Check Out</span>
                    </Button>
                  ) : v.status === 'EXPECTED' ? (
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(v.id, v.fullName)}
                      className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs flex items-center gap-1.5"
                    >
                      <LogIn className="size-3.5" />
                      <span>Check In</span>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-500 bg-gray-50 border-gray-200 px-2.5 py-1 rounded-lg font-medium">
                      Checked Out
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── VISITOR PASS MODAL ────────────────────────────────────── */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[88vh] flex flex-col rounded-2xl p-0 overflow-hidden shadow-2xl border-0 [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-4 [&>button]:right-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 sm:p-6 text-white text-center relative shrink-0">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold tracking-wider uppercase mb-2">
              Official Visitor Pass
            </span>
            <h3 className="text-2xl font-bold tracking-tight">{selectedVisitor?.fullName}</h3>
            <p className="text-sm text-blue-100 mt-0.5">{selectedVisitor?.visitorCompany || 'Visiting Guest'}</p>

            {selectedVisitor?.badgeNumber && (
              <div className="mt-3 inline-block px-4 py-1 bg-white text-blue-800 rounded-xl font-mono font-bold text-sm shadow-xs">
                PASS #{selectedVisitor.badgeNumber}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 text-sm overscroll-contain">
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block font-medium">Status</span>
                <div className="mt-1">{getStatusBadge(selectedVisitor?.status)}</div>
              </div>

              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block font-medium">Purpose</span>
                <span className="font-semibold text-gray-800 mt-1 block truncate" title={selectedVisitor?.purpose}>
                  {selectedVisitor?.purpose || 'Meeting'}
                </span>
              </div>

              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block font-medium">Host Person</span>
                <span className="font-semibold text-gray-800 mt-1 block truncate">
                  {selectedVisitor?.host ? `${selectedVisitor.host.firstName} ${selectedVisitor.host.lastName || ''}`.trim() : 'General Host'}
                </span>
              </div>

              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block font-medium">Department</span>
                <span className="font-semibold text-gray-800 mt-1 block truncate">
                  {selectedVisitor?.department?.title || 'Main Office'}
                </span>
              </div>

              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block font-medium">Phone</span>
                <span className="font-semibold text-gray-800 mt-1 block font-mono">{selectedVisitor?.phone}</span>
              </div>

              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block font-medium">CNIC / ID</span>
                <span className="font-semibold text-gray-800 mt-1 block font-mono">{selectedVisitor?.nationalId || 'N/A'}</span>
              </div>

              {selectedVisitor?.startDate && (
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                  <span className="text-gray-400 block font-medium">Visiting Since / Joining Date</span>
                  <span className="font-semibold text-blue-700 mt-1 block">
                    {new Date(selectedVisitor.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                <span className="text-gray-400 block font-medium">Check-In Time</span>
                <span className="font-medium text-gray-800 mt-1 block">
                  {formatDateTime(selectedVisitor?.checkInTime || selectedVisitor?.createdAt)}
                </span>
              </div>

              {selectedVisitor?.checkOutTime && (
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                  <span className="text-gray-400 block font-medium">Check-Out Time</span>
                  <span className="font-medium text-gray-800 mt-1 block">
                    {formatDateTime(selectedVisitor?.checkOutTime)}
                  </span>
                </div>
              )}

              {selectedVisitor?.vehicleNumber && (
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                  <span className="text-gray-400 block font-medium">Vehicle Plate</span>
                  <span className="font-mono font-semibold text-gray-800 mt-1 block">
                    {selectedVisitor.vehicleNumber}
                  </span>
                </div>
              )}

              {selectedVisitor?.notes && (
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                  <span className="text-gray-400 block font-medium">Notes / Remarks</span>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{selectedVisitor.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs rounded-xl h-9"
            >
              <Printer className="size-3.5 mr-1.5" /> Print Pass
            </Button>

            <Button
              size="sm"
              onClick={() => setViewModalOpen(false)}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs h-9 px-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── EDIT VISITOR MODAL ────────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[88vh] flex flex-col rounded-2xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 shrink-0">
            <DialogTitle className="text-lg font-bold">Edit Visitor Information</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-5 overflow-y-auto flex-1 text-sm overscroll-contain">
            <div>
              <Label className="text-xs text-gray-500 font-medium">Full Name</Label>
              <Input
                value={editData?.fullName || ''}
                onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                className="mt-1 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 font-medium">Phone</Label>
                <Input
                  value={editData?.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-medium">Purpose</Label>
                <Input
                  value={editData?.purpose || ''}
                  onChange={(e) => setEditData({ ...editData, purpose: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 font-medium">Visit Start Date / Joining Date</Label>
              <Input
                type="date"
                value={editData?.startDate ? editData.startDate.slice(0, 10) : ''}
                onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                className="mt-1 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-500 font-medium">Status</Label>
              <select
                value={editData?.status || 'CHECKED_IN'}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                className="mt-1 w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm"
              >
                <option value="CHECKED_IN">Checked In</option>
                <option value="EXPECTED">Expected</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 font-medium">Notes</Label>
              <Textarea
                rows={2}
                value={editData?.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="mt-1 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">Delete Visitor Record</DialogTitle>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete visitor entry for <strong>{visitorToDelete?.fullName}</strong>?
                This action cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVisitor}
              disabled={isDeleting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
