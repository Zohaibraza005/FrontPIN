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
  User,
  Info,
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
  X,
  UserPlus,
  Briefcase,
  DollarSign,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { visitorAPI, employeeAPI, locationAPI, departmentAPI } from '../services/api';
import { deviceService } from '../services/device.service';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

const DatePickerCustomInput = React.forwardRef<HTMLButtonElement, any>(({ value, onClick }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs font-semibold text-gray-800 transition-all cursor-pointer h-9 shrink-0"
  >
    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
    <span>{value || "Pick Date"}</span>
  </button>
));
DatePickerCustomInput.displayName = 'DatePickerCustomInput';

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

const visitPurposes = [
  'Meeting',
  'Visitor Employee',
  'Job Interview',
  'Client Visit',
  'Vendor / Supplier',
  'Delivery / Courier',
  'Maintenance / IT Support',
  'Contractor / Work',
  'Personal Visit',
  'Other',
];

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  // Punch Logs Modal
  const [punchLogsModalOpen, setPunchLogsModalOpen] = useState(false);
  const [punchLogs, setPunchLogs] = useState<any[]>([]);
  const [loadingPunchLogs, setLoadingPunchLogs] = useState(false);
  const [punchLogsSearch, setPunchLogsSearch] = useState('');
  const [selectedVisitorLogs, setSelectedVisitorLogs] = useState<any[]>([]);
  const [loadingSelectedVisitorLogs, setLoadingSelectedVisitorLogs] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Convert to Employee Modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingVisitor, setConvertingVisitor] = useState<any>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertStep, setConvertStep] = useState<1 | 2>(1);
  const [convertForm, setConvertForm] = useState<any>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    nationalId: '',
    password: '',
    pin: '',
    employeeId: '',
    biometricId: '',
    companyId: '',
    departmentId: '',
    supervisorId: '',
    role: 'USER',
    designation: '',
    employmentStatus: 'Permanent',
    joiningDate: new Date().toISOString().split('T')[0],
    workMode: 'On-site',
    payoutType: 'monthly',
    rate: 50000,
    currency: 'PKR',
    cycleDate: 1,
    allowExtraHours: true,
    maxExtraHours: 2,
  });

  // Machine sync state
  const [isPushingMachine, setIsPushingMachine] = useState(false);
  const [pushingId, setPushingId] = useState<number | null>(null);
  const [isSyncingMachine, setIsSyncingMachine] = useState(false);

  const selectedDateRef = React.useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const handleSyncVisitors = async () => {
    try {
      setIsSyncingMachine(true);
      const targetDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
      const res = await visitorAPI.syncVisitorPunches(targetDateStr);
      if (res && res.success) {
        if (res.count > 0) {
          toast.success(res.message || `Synced ${res.count} visitor punch(es) from machine!`);
        } else {
          toast.info(res.message || "Biometric machine checked: No new visitor punches found.");
        }
      } else {
        toast.error(res?.message || "Failed to sync visitor punches from machine");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error connecting to biometric machine");
    } finally {
      setIsSyncingMachine(false);
      fetchVisitors(true, selectedDate);
      fetchStats(selectedDate);
      window.dispatchEvent(new CustomEvent("visitor-updated"));
    }
  };

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
        fetchVisitors(true, selectedDate);
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
  }, [searchQuery, filterStatus, filterLocation, filterDepartment, selectedDate]);

  useEffect(() => {
    fetchVisitors(false, selectedDate);
    fetchStats(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    fetchVisitors(false, selectedDate);
    fetchStats(selectedDate);
    fetchLocations();
    fetchDepartments();
    fetchEmployees();

    // 🔄 Real-time polling every 5 seconds for live visitor updates
    const pollInterval = setInterval(() => {
      fetchVisitors(true, selectedDateRef.current);
      fetchStats(selectedDateRef.current);
    }, 5000);

    const handleUpdate = () => {
      fetchVisitors(true, selectedDateRef.current);
      fetchStats(selectedDateRef.current);
    };

    window.addEventListener("visitor-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("visitor-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  const fetchVisitors = async (silent = false, dateToUse?: Date | null) => {
    try {
      if (!silent) setLoading(true);
      const d = dateToUse !== undefined ? dateToUse : selectedDate;
      const params: any = {};
      if (d) {
        params.date = format(d, 'yyyy-MM-dd');
      }
      const res = await visitorAPI.getVisitors(params);
      if (res && res.success) {
        setVisitors(res.data || []);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load visitors');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async (dateToUse?: Date | null) => {
    try {
      const d = dateToUse !== undefined ? dateToUse : selectedDate;
      const params: any = {};
      if (d) {
        params.date = format(d, 'yyyy-MM-dd');
      }
      const res = await visitorAPI.getStats(params);
      if (res && res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      // ignore
    }
  };

  const openPunchLogsModal = async (vId?: number) => {
    setPunchLogsModalOpen(true);
    fetchPunchLogs(vId);
  };

  const fetchPunchLogs = async (vId?: number) => {
    try {
      setLoadingPunchLogs(true);
      const params: any = {};
      if (selectedDate) {
        params.date = format(selectedDate, 'yyyy-MM-dd');
      }
      if (vId) {
        params.visitorId = vId;
      }
      const res = await visitorAPI.getVisitorLogs(params);
      if (res && res.success) {
        setPunchLogs(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load visitor punch logs');
    } finally {
      setLoadingPunchLogs(false);
    }
  };

  const fetchVisitorHistory = async (visitorId: number) => {
    try {
      setLoadingSelectedVisitorLogs(true);
      const res = await visitorAPI.getVisitorLogs({ visitorId });
      if (res && res.success) {
        setSelectedVisitorLogs(res.data || []);
      }
    } catch (e) {
      setSelectedVisitorLogs([]);
    } finally {
      setLoadingSelectedVisitorLogs(false);
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
      const res = await visitorAPI.deleteVisitor(visitorToDelete.id);
      toast.success(res?.message || 'Visitor record deleted and removed from biometric machines');
      setDeleteModalOpen(false);
      setVisitorToDelete(null);
      fetchVisitors(false, selectedDate);
      fetchStats(selectedDate);
      window.dispatchEvent(new CustomEvent("visitor-updated"));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete visitor');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit Modal with full pre-filled and formatted details
  const openEditModal = (v: any) => {
    const toDateInput = (d?: string | Date | null) => {
      if (!d) return '';
      try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
      } catch {
        return '';
      }
    };

    const toDateTimeLocal = (d?: string | Date | null) => {
      if (!d) return '';
      try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        const year = dateObj.getFullYear();
        const month = pad(dateObj.getMonth() + 1);
        const day = pad(dateObj.getDate());
        const hours = pad(dateObj.getHours());
        const minutes = pad(dateObj.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch {
        return '';
      }
    };

    setEditData({
      ...v,
      fullName: v.fullName || '',
      phone: v.phone || '',
      email: v.email || '',
      nationalId: v.nationalId || '',
      visitorCompany: v.visitorCompany || '',
      purpose: v.purpose || 'Meeting',
      badgeNumber: v.badgeNumber || '',
      vehicleNumber: v.vehicleNumber || '',
      notes: v.notes || '',
      status: v.status || 'CHECKED_IN',
      companyId: v.companyId ? String(v.companyId) : '',
      departmentId: v.departmentId ? String(v.departmentId) : '',
      hostId: v.hostId ? String(v.hostId) : '',
      startDate: toDateInput(v.startDate),
      expectedDate: toDateInput(v.expectedDate),
      checkInTime: toDateTimeLocal(v.checkInTime),
      checkOutTime: toDateTimeLocal(v.checkOutTime),
    });
    setEditModalOpen(true);
  };

  // Edit save
  const handleSaveEdit = async () => {
    if (!editData?.id) return;
    if (!editData?.fullName?.trim()) {
      toast.error('Visitor full name is required');
      return;
    }
    if (!editData?.phone?.trim()) {
      toast.error('Visitor phone number is required');
      return;
    }

    try {
      setIsUpdating(true);
      const payload: any = {
        fullName: editData.fullName.trim(),
        phone: editData.phone.trim(),
        email: editData.email ? editData.email.trim() : null,
        nationalId: editData.nationalId ? editData.nationalId.trim() : null,
        visitorCompany: editData.visitorCompany ? editData.visitorCompany.trim() : null,
        purpose: editData.purpose ? editData.purpose.trim() : 'Meeting',
        badgeNumber: editData.badgeNumber ? editData.badgeNumber.trim() : null,
        vehicleNumber: editData.vehicleNumber ? editData.vehicleNumber.trim() : null,
        notes: editData.notes ? editData.notes.trim() : null,
        status: editData.status || 'CHECKED_IN',
        companyId: editData.companyId && !isNaN(parseInt(editData.companyId)) ? parseInt(editData.companyId) : null,
        departmentId: editData.departmentId && !isNaN(parseInt(editData.departmentId)) ? parseInt(editData.departmentId) : null,
        hostId: editData.hostId && !isNaN(parseInt(editData.hostId)) ? parseInt(editData.hostId) : null,
        startDate: editData.startDate ? new Date(editData.startDate).toISOString() : null,
        expectedDate: editData.expectedDate ? new Date(editData.expectedDate).toISOString() : null,
        checkInTime: editData.checkInTime ? new Date(editData.checkInTime).toISOString() : null,
        checkOutTime: editData.checkOutTime ? new Date(editData.checkOutTime).toISOString() : null,
      };

      const res = await visitorAPI.updateVisitor(editData.id, payload);
      if (res && res.success) {
        toast.success(res.message || 'Visitor details updated successfully!');
        setEditModalOpen(false);
        fetchVisitors(true);
        fetchStats();
        window.dispatchEvent(new CustomEvent("visitor-updated"));
      } else {
        toast.error(res?.message || 'Failed to update visitor');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Error updating visitor');
    } finally {
      setIsUpdating(false);
    }
  };

  const openConvertModal = (v: any) => {
    const parts = (v.fullName || '').trim().split(/\s+/);
    const fName = parts[0] || '';
    const lName = parts.slice(1).join(' ') || '';
    const baseUser = v.email ? v.email.split('@')[0] : `${fName.toLowerCase()}${Math.floor(100 + Math.random() * 900)}`;
    const suggestedUsername = baseUser.replace(/[^a-zA-Z0-9_]/g, '');
    const suggestedEmpId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    setConvertingVisitor(v);
    setConvertStep(1);
    setConvertForm({
      firstName: fName,
      lastName: lName,
      username: suggestedUsername,
      email: v.email || '',
      phoneNumber: v.phone || '',
      nationalId: v.nationalId || '',
      password: '',
      pin: '',
      employeeId: suggestedEmpId,
      biometricId: v.badgeNumber || '',
      companyId: v.companyId ? String(v.companyId) : (locations[0]?.id ? String(locations[0].id) : ''),
      departmentId: v.departmentId ? String(v.departmentId) : '',
      supervisorId: v.hostId ? String(v.hostId) : '',
      role: 'USER',
      designation: v.purpose && v.purpose !== 'Meeting' ? v.purpose : 'Staff Member',
      employmentStatus: 'Permanent',
      joiningDate: new Date().toISOString().split('T')[0],
      workMode: 'On-site',
      payoutType: 'monthly',
      rate: 50000,
      currency: 'PKR',
      cycleDate: 1,
      allowExtraHours: true,
      maxExtraHours: 2,
    });
    setConvertModalOpen(true);
  };

  const handleConvertVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingVisitor) return;

    if (!convertForm.username) {
      toast.error('Please enter a username');
      return;
    }
    if (!convertForm.email) {
      toast.error('Please enter an email address for employee login');
      return;
    }
    if (!convertForm.password) {
      toast.error('Please set an initial login password for the employee');
      return;
    }
    if (!convertForm.designation) {
      toast.error('Please specify a designation / job title');
      return;
    }
    if (!convertForm.companyId) {
      toast.error('Please select an office / branch location');
      return;
    }

    try {
      setIsConverting(true);
      const res = await visitorAPI.convertToEmployee(convertingVisitor.id, convertForm);
      if (res && res.success) {
        toast.success(res.message || `${convertingVisitor.fullName} successfully converted to Employee!`);
        setConvertModalOpen(false);
        setConvertingVisitor(null);
        fetchVisitors(true);
        fetchStats();
        window.dispatchEvent(new CustomEvent('visitor-updated'));
      } else {
        toast.error(res?.message || 'Failed to convert visitor to employee');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Error occurred while converting visitor');
    } finally {
      setIsConverting(false);
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

      return matchesStatus && matchesLocation && matchesDept;
    });
  }, [visitors, searchQuery, filterStatus, filterLocation, filterDepartment]);

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
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <UserCheck className="size-3 text-purple-600" />
            Converted to Employee
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
            onClick={handleSyncVisitors}
            disabled={isSyncingMachine}
            className="h-10 w-10 text-gray-600 hover:text-gray-900 border-gray-200 rounded-xl"
            title="Fetch latest visitor punches from biometric machines & refresh"
          >
            <RefreshCw className={`size-4 ${isSyncingMachine ? 'animate-spin text-blue-600' : ''}`} />
          </Button>

          <Button
            variant="outline"
            onClick={() => openPunchLogsModal()}
            className="w-full sm:w-auto border-indigo-200 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-800 font-semibold shadow-2xs rounded-xl h-10 px-3.5 flex items-center gap-2"
            title="View Real-Time Biometric Punch Logs for Visitors"
          >
            <Clock className="size-4 text-indigo-600" />
            <span>Visitor Logs</span>
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
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  {selectedDate ? `Present on ${format(selectedDate, 'dd MMM yyyy')}` : 'Today Present'}
                </p>
              </div>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{stats.checkedIn ?? 0}</h3>
              <p className="text-xs text-emerald-600 mt-0.5">
                {stats.checkedOut ? `${stats.checkedOut} checked out` : (selectedDate ? `Checked in on ${format(selectedDate, 'dd MMM')}` : 'Present in company today')}
              </p>
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
              { value: 'all', label: 'All Visitors' },
              { value: 'CHECKED_IN', label: 'Checked In' },
              { value: 'EXPECTED', label: 'Expected' },
              { value: 'CHECKED_OUT', label: 'Checked Out' },
              { value: 'CONVERTED', label: 'Converted to Employee' },
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

          {/* Date Picker (Default All Visitors, or Pick Date for Specific Day Attendance - Future dates disabled) */}
          <div className="flex items-center gap-1.5">
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date)}
              maxDate={new Date()}
              dateFormat="dd MMM yyyy"
              customInput={<DatePickerCustomInput />}
            />

            {selectedDate ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl flex items-center gap-1 font-medium shadow-2xs transition-all"
                  title="Show all visitors across all dates"
                >
                  <X className="size-3.5" />
                  <span>All Visitors</span>
                </Button>

                {format(selectedDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                    className="h-9 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl font-medium"
                    title="Show today's visitors"
                  >
                    Today
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="h-9 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl font-medium"
                title="Filter by today's visitors"
              >
                Today
              </Button>
            )}
          </div>

          {/* Reset Filters button */}
          {(searchQuery || filterStatus !== 'all' || filterLocation !== 'all' || filterDepartment !== 'all' || selectedDate !== null) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterLocation('all');
                setFilterDepartment('all');
                setSelectedDate(null);
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
                      {v.checkInTime ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs font-semibold text-gray-900 font-mono">
                              {formatTime(v.checkInTime)}
                            </span>
                          </div>
                          {v.punches && v.punches.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openPunchLogsModal(v.id)}
                              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                              title="Click to view real-time punch logs"
                            >
                              <Clock className="size-2.5" />
                              <span>{v.punches.length} punch{v.punches.length > 1 ? 'es' : ''}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-gray-400 font-medium text-xs">Not Checked In</span>
                        </div>
                      )}
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
                        <span className="text-gray-400 font-medium text-xs pl-2">—</span>
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
                            fetchVisitorHistory(v.id);
                            setViewModalOpen(true);
                          }}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600 rounded-lg"
                          title="View Visitor Pass & Details"
                        >
                          <Eye className="size-4" />
                        </Button>

                        {/* Convert to Employee */}
                        {v.status !== 'CONVERTED' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openConvertModal(v)}
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                  title="Convert to Employee"
                                >
                                  <UserPlus className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Convert to Employee</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Edit */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditModal(v)}
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
                              fetchVisitorHistory(v.id);
                              setViewModalOpen(true);
                            }}
                            className="h-8 w-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 border-gray-200 rounded-xl"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">View Pass</TooltipContent>
                      </Tooltip>

                      {/* Convert to Employee */}
                      {v.status !== 'CONVERTED' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => openConvertModal(v)}
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 rounded-xl"
                            >
                              <UserPlus className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Convert to Employee</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEditModal(v)}
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
                  ) : v.status === 'CONVERTED' ? (
                    <Badge variant="outline" className="text-xs text-purple-700 bg-purple-50 border-purple-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                      <UserCheck className="size-3" /> Converted
                    </Badge>
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

              {/* Real-Time Visitor Biometric Punch History */}
              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-semibold text-xs flex items-center gap-1.5">
                    <Clock className="size-3.5 text-blue-600" />
                    Real-Time Biometric Punch Logs ({selectedVisitorLogs.length})
                  </span>
                  {selectedVisitorLogs.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      Live Machine Logs
                    </Badge>
                  )}
                </div>

                {loadingSelectedVisitorLogs ? (
                  <div className="py-3 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 className="size-3.5 animate-spin text-blue-600" />
                    <span>Loading punch history...</span>
                  </div>
                ) : selectedVisitorLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1 italic">
                    No biometric machine punches recorded yet for this visitor.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white shadow-2xs">
                    {selectedVisitorLogs.map((log: any) => (
                      <div key={log.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              log.punchType === 'CHECK_IN' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <div>
                            <span className="font-semibold text-gray-800">
                              {log.punchType === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                            </span>
                            <span className="text-[10px] text-gray-500 ml-2 font-mono">
                              {formatDateTime(log.punchTime)}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg">
                          {log.device || 'Gate Terminal'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
            <div>
              {selectedVisitor?.status !== 'CONVERTED' && (
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    const v = selectedVisitor;
                    setViewModalOpen(false);
                    openConvertModal(v);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-3.5 flex items-center gap-1.5"
                >
                  <UserPlus className="size-3.5" />
                  <span>Convert to Employee</span>
                </Button>
              )}
            </div>
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
        <DialogContent className="sm:max-w-4xl w-[96vw] max-h-[92vh] flex flex-col rounded-3xl p-0 overflow-hidden shadow-2xl border border-gray-100 [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-5 [&>button]:right-5">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-5 sm:p-6 text-white shrink-0 relative flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg text-white shadow-inner">
                {editData?.fullName ? editData.fullName.slice(0, 2).toUpperCase() : 'VI'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold tracking-tight text-white">{editData?.fullName || 'Edit Visitor'}</h3>
                  {editData?.badgeNumber && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/25 text-blue-200 border border-blue-400/30 font-mono text-xs font-semibold">
                      Pass #{editData.badgeNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  {editData?.visitorCompany || 'Visitor'} • Comprehensive Visitor Information & Biometrics
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/10 text-white/90 border border-white/15">
                Record #{editData?.id}
              </span>
            </div>
          </div>

          {/* Form Body */}
          <div className="space-y-5 p-5 sm:p-6 overflow-y-auto flex-1 bg-gray-50/60 text-sm overscroll-contain">
            {/* Section 1: Personal & Identity Profile */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User className="size-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Personal & Contact Profile</h4>
                  <p className="text-[11px] text-gray-400">Visitor identity, phone number, email and company</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Full Name <span className="text-rose-500">*</span></Label>
                  <Input
                    value={editData?.fullName || ''}
                    onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 font-medium"
                    placeholder="e.g. Jaffar Raza Khan"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Phone Number <span className="text-rose-500">*</span></Label>
                  <Input
                    value={editData?.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 font-mono"
                    placeholder="e.g. 03214960020"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    value={editData?.email || ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200"
                    placeholder="e.g. visitor@company.com"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">National ID / CNIC</Label>
                  <Input
                    value={editData?.nationalId || ''}
                    onChange={(e) => setEditData({ ...editData, nationalId: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 font-mono"
                    placeholder="e.g. 42101-1234567-1"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs text-gray-600 font-semibold">Visitor's Company / Organization</Label>
                  <Input
                    value={editData?.visitorCompany || ''}
                    onChange={(e) => setEditData({ ...editData, visitorCompany: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200"
                    placeholder="e.g. Independent Guest / ABC Corporation"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Visit Assignment & Host */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <div className="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Visit Assignment & Host Details</h4>
                  <p className="text-[11px] text-gray-400">Host employee, office location, department and purpose</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Purpose of Visit</Label>
                  <select
                    value={visitPurposes.includes(editData?.purpose) ? editData.purpose : 'Other'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditData({ ...editData, purpose: val === 'Other' ? (editData.purpose || '') : val });
                    }}
                    className="mt-1 w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {visitPurposes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {(!visitPurposes.includes(editData?.purpose) || editData?.purpose === 'Other') && (
                    <Input
                      value={editData?.purpose === 'Other' ? '' : (editData?.purpose || '')}
                      onChange={(e) => setEditData({ ...editData, purpose: e.target.value })}
                      placeholder="Specify custom purpose..."
                      className="mt-2 rounded-xl h-9 text-xs"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Host Employee</Label>
                  <select
                    value={editData?.hostId || ''}
                    onChange={(e) => setEditData({ ...editData, hostId: e.target.value })}
                    className="mt-1 w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No specific host (General visit)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName || ''} {emp.employeeId ? `(${emp.employeeId})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Location / Office Branch</Label>
                  <select
                    value={editData?.companyId || ''}
                    onChange={(e) => setEditData({ ...editData, companyId: e.target.value })}
                    className="mt-1 w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Default Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Department</Label>
                  <select
                    value={editData?.departmentId || ''}
                    onChange={(e) => setEditData({ ...editData, departmentId: e.target.value })}
                    className="mt-1 w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.title || dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs text-gray-600 font-semibold">Vehicle / License Plate #</Label>
                  <Input
                    value={editData?.vehicleNumber || ''}
                    onChange={(e) => setEditData({ ...editData, vehicleNumber: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 font-mono"
                    placeholder="e.g. LE-1234 / BLA-550"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Biometric Access, Status & Timing */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Cpu className="size-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Biometric Access & Presence Schedule</h4>
                  <p className="text-[11px] text-gray-400">Machine recognition badge, visit status, check-in and check-out</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Biometric Badge / Pass #</Label>
                  <Input
                    value={editData?.badgeNumber || ''}
                    onChange={(e) => setEditData({ ...editData, badgeNumber: e.target.value })}
                    className="mt-1 rounded-xl h-10 font-mono font-bold text-blue-700 bg-blue-50/40 border-blue-200"
                    placeholder="e.g. 90002"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Unique badge/ID synced to biometric terminals</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Visit Status</Label>
                  <select
                    value={editData?.status || 'CHECKED_IN'}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="mt-1 w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CHECKED_IN">🟢 Checked In (Present on premises)</option>
                    <option value="EXPECTED">🟡 Expected (Upcoming appointment)</option>
                    <option value="CHECKED_OUT">⚪ Checked Out (Departed)</option>
                    <option value="CANCELLED">🔴 Cancelled</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Controls visitor visibility in Today's list</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Visit Start Date / Joining Date</Label>
                  <Input
                    type="date"
                    value={editData?.startDate || ''}
                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 font-medium"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Expected Date / Valid Until</Label>
                  <Input
                    type="date"
                    value={editData?.expectedDate || ''}
                    onChange={(e) => setEditData({ ...editData, expectedDate: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 font-medium"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Check-In Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={editData?.checkInTime || ''}
                    onChange={(e) => setEditData({ ...editData, checkInTime: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Check-Out Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={editData?.checkOutTime || ''}
                    onChange={(e) => setEditData({ ...editData, checkOutTime: e.target.value })}
                    className="mt-1 rounded-xl h-10 border-gray-200 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Notes & Security Remarks */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileText className="size-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Notes & Security Remarks</h4>
                  <p className="text-[11px] text-gray-400">Additional instructions, equipment carried or security clearance</p>
                </div>
              </div>

              <Textarea
                rows={3}
                value={editData?.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="rounded-xl border-gray-200 text-sm"
                placeholder="Write any additional notes, remarks, belongings or security clearances..."
              />
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 sm:p-5 border-t border-gray-100 bg-white shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="size-4 text-blue-600 shrink-0" />
              <span>Badge and name updates will automatically synchronize with biometric terminals.</span>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 h-10 px-5 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl h-10 px-6 text-xs font-semibold shadow-md shadow-blue-500/20"
              >
                {isUpdating ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="size-3.5 animate-spin" /> Saving Changes...
                  </span>
                ) : (
                  'Save All Changes'
                )}
              </Button>
            </div>
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
                This will also automatically remove this visitor and their access rights from all biometric machines.
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

      {/* ── CONVERT VISITOR TO EMPLOYEE MODAL ───────────────────────── */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="sm:max-w-3xl w-[96vw] max-h-[92vh] flex flex-col rounded-3xl p-0 overflow-hidden shadow-2xl border border-gray-100 [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-5 [&>button]:right-5">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-indigo-900 p-5 sm:p-6 text-white shrink-0 relative flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold tracking-wide uppercase mb-1.5">
                <Briefcase className="size-3" /> Move Visitor to Permanent Employee
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Convert {convertingVisitor?.fullName}
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                Complete employee credentials & job details to activate permanent staff profile.
              </p>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/70 px-6 py-2.5 gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setConvertStep(1)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                convertStep === 1
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>Account & Personal Info</span>
            </button>
            <button
              type="button"
              onClick={() => setConvertStep(2)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                convertStep === 2
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>Job, Branch & Compensation</span>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleConvertVisitor} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[58vh]">
              {convertStep === 1 && (
                <div className="space-y-4">
                  {/* Visitor Info Banner */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center shrink-0">
                      {convertingVisitor?.photo ? (
                        <img
                          src={convertingVisitor.photo}
                          alt={convertingVisitor.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="size-6 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-gray-900 text-sm">{convertingVisitor?.fullName}</p>
                      <p className="text-gray-600 mt-0.5">
                        Phone: {convertingVisitor?.phone || 'N/A'} • CNIC: {convertingVisitor?.nationalId || 'N/A'}
                      </p>
                      <p className="text-emerald-700 font-medium text-[11px] mt-0.5">
                        ✓ Photo & visitor logs will be preserved and linked to new employee record
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">First Name *</Label>
                      <Input
                        required
                        value={convertForm.firstName}
                        onChange={(e) => setConvertForm({ ...convertForm, firstName: e.target.value })}
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Last Name</Label>
                      <Input
                        value={convertForm.lastName}
                        onChange={(e) => setConvertForm({ ...convertForm, lastName: e.target.value })}
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Username *</Label>
                      <Input
                        required
                        value={convertForm.username}
                        onChange={(e) => setConvertForm({ ...convertForm, username: e.target.value })}
                        placeholder="e.g. zohaib123"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Email Address *</Label>
                      <Input
                        type="email"
                        required
                        value={convertForm.email}
                        onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
                        placeholder="employee@company.com"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Phone Number</Label>
                      <Input
                        value={convertForm.phoneNumber}
                        onChange={(e) => setConvertForm({ ...convertForm, phoneNumber: e.target.value })}
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">National ID / CNIC</Label>
                      <Input
                        value={convertForm.nationalId}
                        onChange={(e) => setConvertForm({ ...convertForm, nationalId: e.target.value })}
                        placeholder="e.g. 42101-xxxxxxx-x"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Login Password *</Label>
                      <Input
                        type="text"
                        required
                        value={convertForm.password}
                        onChange={(e) => setConvertForm({ ...convertForm, password: e.target.value })}
                        placeholder="Set employee password"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Attendance PIN (Optional)</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        value={convertForm.pin}
                        onChange={(e) => setConvertForm({ ...convertForm, pin: e.target.value })}
                        placeholder="e.g. 1234"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Employee ID / Code</Label>
                      <Input
                        value={convertForm.employeeId}
                        onChange={(e) => setConvertForm({ ...convertForm, employeeId: e.target.value })}
                        placeholder="e.g. EMP-105"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Biometric / Badge ID</Label>
                      <Input
                        value={convertForm.biometricId}
                        onChange={(e) => setConvertForm({ ...convertForm, biometricId: e.target.value })}
                        placeholder="Machine enrollment ID"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">System Role</Label>
                      <select
                        value={convertForm.role}
                        onChange={(e) => setConvertForm({ ...convertForm, role: e.target.value })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        <option value="USER">User (Standard Employee)</option>
                        <option value="SUPERVISOR">Supervisor / Manager</option>
                        <option value="ADMIN">System Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {convertStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Office / Branch Location *</Label>
                      <select
                        required
                        value={convertForm.companyId}
                        onChange={(e) => setConvertForm({ ...convertForm, companyId: e.target.value })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        <option value="">Select Branch</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Department</Label>
                      <select
                        value={convertForm.departmentId}
                        onChange={(e) => setConvertForm({ ...convertForm, departmentId: e.target.value })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Designation / Job Title *</Label>
                      <Input
                        required
                        value={convertForm.designation}
                        onChange={(e) => setConvertForm({ ...convertForm, designation: e.target.value })}
                        placeholder="e.g. Sales Executive / Support Agent"
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Reporting Supervisor</Label>
                      <select
                        value={convertForm.supervisorId}
                        onChange={(e) => setConvertForm({ ...convertForm, supervisorId: e.target.value })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        <option value="">No Supervisor (Direct)</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeId || emp.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Employment Status</Label>
                      <select
                        value={convertForm.employmentStatus}
                        onChange={(e) => setConvertForm({ ...convertForm, employmentStatus: e.target.value })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Probation">Probation</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Work Mode</Label>
                      <select
                        value={convertForm.workMode}
                        onChange={(e) => setConvertForm({ ...convertForm, workMode: e.target.value })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        <option value="On-site">On-site</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Joining Date</Label>
                      <Input
                        type="date"
                        value={convertForm.joiningDate}
                        onChange={(e) => setConvertForm({ ...convertForm, joiningDate: e.target.value })}
                        className="mt-1 h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Base Salary / Rate</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          value={convertForm.rate}
                          onChange={(e) => setConvertForm({ ...convertForm, rate: Number(e.target.value) })}
                          className="h-9 rounded-xl text-xs flex-1"
                        />
                        <select
                          value={convertForm.currency}
                          onChange={(e) => setConvertForm({ ...convertForm, currency: e.target.value })}
                          className="w-24 h-9 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-800"
                        >
                          <option value="PKR">PKR</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Payout Frequency</Label>
                      <select
                        value={convertForm.payoutType}
                        onChange={(e) => setConvertForm({ ...convertForm, payoutType: e.target.value })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Salary Cycle Day</Label>
                      <select
                        value={convertForm.cycleDate}
                        onChange={(e) => setConvertForm({ ...convertForm, cycleDate: Number(e.target.value) })}
                        className="mt-1 w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-800"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d} of every month
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConvertModalOpen(false)}
                className="rounded-xl text-xs h-9 px-4"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {convertStep === 1 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (!convertForm.username) {
                        toast.error('Please enter a username');
                        return;
                      }
                      if (!convertForm.email) {
                        toast.error('Please enter an email address');
                        return;
                      }
                      if (!convertForm.password) {
                        toast.error('Please enter a password');
                        return;
                      }
                      setConvertStep(2);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-4"
                  >
                    Next: Job & Salary ➜
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConvertStep(1)}
                      className="rounded-xl text-xs h-9 px-3"
                    >
                      ← Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isConverting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5"
                    >
                      {isConverting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Converting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          <span>Complete Conversion</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── REAL-TIME VISITOR PUNCH LOGS DIALOG ──────────────────── */}
      <Dialog open={punchLogsModalOpen} onOpenChange={setPunchLogsModalOpen}>
        <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden shadow-2xl border-0">
          <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
                <Clock className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Visitor Biometric Punch Logs</h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  {selectedDate ? `Real-time punches recorded on ${format(selectedDate, 'dd MMMM yyyy')}` : 'All real-time visitor machine punches'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchPunchLogs()}
              disabled={loadingPunchLogs}
              className="h-8 text-xs text-white hover:bg-white/20 rounded-xl border border-white/20 flex items-center gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loadingPunchLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Search bar inside logs modal */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search logs by visitor name, badge #, or device..."
                value={punchLogsSearch}
                onChange={(e) => setPunchLogsSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl border-gray-200 bg-white text-xs"
              />
            </div>
            {selectedDate && (
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 py-1.5 px-3 rounded-xl shrink-0">
                {format(selectedDate, 'dd MMM yyyy')}
              </Badge>
            )}
          </div>

          {/* Logs List / Table */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingPunchLogs ? (
              <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <p className="text-xs font-medium">Fetching real-time visitor punches...</p>
              </div>
            ) : (() => {
              const q = punchLogsSearch.toLowerCase().trim();
              const filtered = punchLogs.filter((log) => {
                if (!q) return true;
                const vName = (log.visitorName || '').toLowerCase();
                const bNo = (log.badgeNumber || '').toLowerCase();
                const dev = (log.device || '').toLowerCase();
                const type = (log.punchType || '').toLowerCase();
                return vName.includes(q) || bNo.includes(q) || dev.includes(q) || type.includes(q);
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-16 text-center text-gray-400">
                    <Clock className="size-10 mx-auto text-gray-300 stroke-1" />
                    <p className="mt-3 text-sm font-semibold text-gray-600">No Visitor Punches Found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      {selectedDate
                        ? `No biometric or manual punches were logged for ${format(selectedDate, 'dd MMM yyyy')}.`
                        : 'No visitor machine events have been recorded yet.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <Table>
                    <TableHeader className="bg-gray-50/80">
                      <TableRow className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                        <TableHead className="py-3 font-semibold">Punch Time</TableHead>
                        <TableHead className="font-semibold">Visitor</TableHead>
                        <TableHead className="font-semibold">Badge #</TableHead>
                        <TableHead className="font-semibold">Action</TableHead>
                        <TableHead className="font-semibold">Device / Gate</TableHead>
                        <TableHead className="font-semibold">Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 text-xs">
                      {filtered.map((log) => (
                        <TableRow key={log.id} className="hover:bg-blue-50/20">
                          <TableCell className="font-mono font-semibold text-gray-900 py-3">
                            {formatDateTime(log.punchTime)}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-800">
                            {log.visitorName}
                          </TableCell>
                          <TableCell className="font-mono text-gray-600">
                            {log.badgeNumber || '—'}
                          </TableCell>
                          <TableCell>
                            {log.punchType === 'CHECK_IN' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                                Check In
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold">
                                Check Out
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 font-medium">
                            {log.device || 'Gate'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600">
                              {log.method || 'Biometric'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium pl-2">
              Showing {punchLogs.length} punch log(s)
            </span>
            <Button
              size="sm"
              onClick={() => setPunchLogsModalOpen(false)}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs h-8 px-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
