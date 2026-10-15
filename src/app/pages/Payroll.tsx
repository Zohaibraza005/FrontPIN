import React, { useEffect, useState } from 'react';
import { mockPayrolls, mockEmployees } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import moment from 'moment'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { DollarSign, Download, Plus, Wallet, CreditCard, Users, TrendingUp, Eye, Pencil, Trash2, Calendar, AlertTriangle, PieChart as PieChartIcon, Calculator, CheckCircle2, Loader2, Search, X, Lock, LockOpen } from 'lucide-react';
import { toast } from 'sonner';
import {   DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger, } from "../components/ui/dropdown-menu";
  import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
  } from "recharts";
  import { PieChart, Pie, Cell, Legend } from "recharts";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { departmentAPI, employeeAPI, locationAPI, payrollAPI } from '../services/api';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { useNavigate } from 'react-router';
const EARNINGS_TITLES = [
  "KPIs",
  "PPC Bounty",
  "Monthly Bounty",
  "Special Bounty",
  "Current Month Commission",
  "Minus One Month Commission",
  "Minus Two Month Commission",
  "Overtime",
  "Allowance",
  "Arrears",
  "Bonus",
  "Other Earning",
];

const DEDUCTIONS_TITLES = [
  "Tardies",
  "Unpaid Days",
  "Tax",
  "Advance",
  "Food Deduction",
  "CT Deduction",
  "GYM Deduction",
  "Late Deduction",
  "Other Deduction",
];

export const Payroll: React.FC = () => {
  const [generateOpen, setGenerateOpen] = useState(false);
  const navigate = useNavigate();
  const now = moment();

  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState<number | null>(now.year());
  const [type, setType] = useState<'INDIVIDUAL' | 'DEPARTMENT' | 'LOCATION'>('INDIVIDUAL');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generateResult, setGenerateResult] = useState<any>(null);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [targetSearch, setTargetSearch] = useState('');

  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<number[]>(() => {
    const loc = localStorage.getItem("selectedLocation");
    if (!loc || loc.toLowerCase() === "all") return [];
    return !isNaN(Number(loc)) ? [Number(loc)] : [];
  });

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const loc = e.detail || localStorage.getItem("selectedLocation") || "all";
      if (!loc || loc.toLowerCase() === "all") {
        setSelectedLocations([]);
      } else if (!isNaN(Number(loc))) {
        setSelectedLocations([Number(loc)]);
      }
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);
  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [overtimeTrend, setOvertimeTrend] = useState<any[]>([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState<any[]>([]);
  const [headcount, setHeadcount] = useState<any>(null);
  const [attendanceImpact, setAttendanceImpact] = useState<any>(null);
  const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const months = moment.months().map((m, i) => ({
    label: m,
    value: i + 1
  }));

  const filterMonths = [
    { label: "All Months", value: "all" },
    ...months.map((m) => ({
      label: m.label,
      value: m.value.toString()
    }))
  ];
  // Mock data (replace with API)
  const [employees,setEmployees] = useState<any[]>([]);

  const [departments,setDepartments] = useState<any[]>([]);

  const [locations,setLocations] = useState<any[]>([]);

  const toggleSelection = (id: number, list: number[], setList: any) => {
    if (list.includes(id)) {
      setList(list?.filter((i: number) => i !== id));
    } else {
      setList([...list, id]);
    }
  };

  const [payrolls, setPayrolls] = useState<any[]>([]);

  const [filterMonth, setFilterMonth] = useState<number | string>(now.month() + 1);
  const [filterYear, setFilterYear] = useState<number>(now.year());
  const [filterStatus, setFilterStatus] = useState('all');

  // Edit Payroll Modal States
  const [editOpen, setEditOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
  const [editRate, setEditRate] = useState<number | string>('');
  const [editOvertime, setEditOvertime] = useState<number | string>('');
  const [editBonus, setEditBonus] = useState<number | string>('');
  const [editDeductions, setEditDeductions] = useState<number | string>('');
  const [editStatus, setEditStatus] = useState<string>('GENERATED');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [editTransactionRef, setEditTransactionRef] = useState<string>('');
  const [editPaidAt, setEditPaidAt] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  // Export states
  const [exporting, setExporting] = useState(false);

  // Bulk Selection States
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<number[]>([]);
  const [bulkPayModalOpen, setBulkPayModalOpen] = useState(false);
  const [bulkLockModalOpen, setBulkLockModalOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Single Pay Modal States
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payrollToPay, setPayrollToPay] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paidDate, setPaidDate] = useState<string>(moment().format('YYYY-MM-DD'));
  const [paying, setPaying] = useState(false);

  // Lock Confirmation Modal States
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [payrollToLock, setPayrollToLock] = useState<any>(null);
  const [locking, setLocking] = useState(false);

  // Incomplete Month Warning Confirmation Modal
  const [incompleteWarningOpen, setIncompleteWarningOpen] = useState(false);

  // Adjustment Modal States
  const [openAdjust, setOpenAdjust] = useState(false);
  const [adjustType, setAdjustType] = useState<'INCREMENT' | 'DEDUCTION'>('INCREMENT');
  const [adjustTitle, setAdjustTitle] = useState(EARNINGS_TITLES[0]);
  const [adjustCustomTitle, setAdjustCustomTitle] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number | string>('');
  const [editingComponentId, setEditingComponentId] = useState<number | null>(null);
  const [addingAdjustment, setAddingAdjustment] = useState(false);

  const handleTypeChange = (type: 'INCREMENT' | 'DEDUCTION') => {
    setAdjustType(type);
    if (type === 'INCREMENT') {
      setAdjustTitle(EARNINGS_TITLES[0]);
    } else {
      setAdjustTitle(DEDUCTIONS_TITLES[0]);
    }
  };

  const handleOpenAddAdjustment = () => {
    setEditingComponentId(null);
    setAdjustType('INCREMENT');
    setAdjustTitle(EARNINGS_TITLES[0]);
    setAdjustCustomTitle('');
    setAdjustAmount('');
    setOpenAdjust(true);
  };

  const handleOpenEditAdjustment = (comp: any) => {
    setEditingComponentId(comp.id);
    const isEarning = ["BASIC","ALLOWANCE","BONUS","COMMISSION","OVERTIME","INCREMENT","KPIS","BOUNTY","ARREARS"].includes(String(comp.type || "").toUpperCase());
    const typeVal = isEarning ? 'INCREMENT' : 'DEDUCTION';
    setAdjustType(typeVal);

    const titlesList = isEarning ? EARNINGS_TITLES : DEDUCTIONS_TITLES;
    const matchesPreset = titlesList.includes(comp.title);

    if (matchesPreset) {
      setAdjustTitle(comp.title);
      setAdjustCustomTitle('');
    } else {
      setAdjustTitle(isEarning ? "Other Earning" : "Other Deduction");
      setAdjustCustomTitle(comp.title || '');
    }

    setAdjustAmount(comp.amount || '');
    setOpenAdjust(true);
  };

  const handleAddAdjustment = async () => {
    if (!editingPayroll) return;

    const finalTitle = (adjustTitle === "Other Earning" || adjustTitle === "Other Deduction")
      ? (adjustCustomTitle.trim() || adjustTitle)
      : (adjustTitle || (adjustType === "INCREMENT" ? EARNINGS_TITLES[0] : DEDUCTIONS_TITLES[0]));

    if (!finalTitle.trim() || !adjustAmount || Number(adjustAmount) <= 0) {
      toast.error('Title and positive amount required');
      return;
    }

    try {
      setAddingAdjustment(true);
      const payloadType = adjustType === "INCREMENT" ? "BONUS" : "DEDUCTION";
      if (editingComponentId) {
        await payrollAPI.updateComponent(editingComponentId, {
          type: payloadType,
          title: finalTitle,
          amount: Number(adjustAmount),
        });
        toast.success('Adjustment updated successfully');
      } else {
        await payrollAPI.addComponent(editingPayroll.id, {
          type: payloadType,
          title: finalTitle,
          amount: Number(adjustAmount),
        });
        toast.success('Adjustment added successfully');
      }

      setOpenAdjust(false);
      setEditingComponentId(null);
      setAdjustTitle(EARNINGS_TITLES[0]);
      setAdjustCustomTitle('');
      setAdjustAmount('');
      
      const res = await payrollAPI.getAll({
        month: filterMonth !== "all" ? Number(filterMonth) : undefined,
        year: filterYear || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
      setPayrolls(res.data || []);
      setPayrollSummary(res.summary);

      const updatedPayroll = res.data?.find((p: any) => p.id === editingPayroll.id);
      if (updatedPayroll) {
        setEditingPayroll(updatedPayroll);
        setEditBonus(updatedPayroll.bonus ?? 0);
        setEditDeductions(updatedPayroll.grossDeductions ?? 0);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save adjustment');
    } finally {
      setAddingAdjustment(false);
    }
  };

  const handleDeleteAdjustment = async (compId: number) => {
    if (!editingPayroll) return;
    try {
      await payrollAPI.deleteComponent(compId);
      toast.success('Adjustment deleted');

      const res = await payrollAPI.getAll({
        month: filterMonth !== "all" ? Number(filterMonth) : undefined,
        year: filterYear || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
      setPayrolls(res.data || []);
      setPayrollSummary(res.summary);

      const updatedPayroll = res.data?.find((p: any) => p.id === editingPayroll.id);
      if (updatedPayroll) {
        setEditingPayroll(updatedPayroll);
        setEditBonus(updatedPayroll.bonus ?? 0);
        setEditDeductions(updatedPayroll.grossDeductions ?? 0);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete adjustment');
    }
  };

  const handleOpenEdit = (payroll: any) => {
    setEditingPayroll(payroll);
    setEditRate(payroll?.rate ?? payroll?.grossSalary ?? 0);
    setEditOvertime(payroll?.overtimeAmount ?? 0);
    setEditBonus(payroll?.bonus ?? 0);
    setEditDeductions(payroll?.grossDeductions ?? 0);
    setEditStatus(payroll?.status || 'GENERATED');
    setEditPaymentMethod(payroll?.paymentMethod || 'BANK_TRANSFER');
    setEditTransactionRef(payroll?.transactionRef || '');
    setEditPaidAt(payroll?.paidAt ? moment(payroll.paidAt).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPayroll) return;
    try {
      setUpdating(true);
      await payrollAPI.update(editingPayroll.id, {
        rate: Number(editRate),
        overtimeAmount: Number(editOvertime),
        bonus: Number(editBonus),
        grossDeductions: Number(editDeductions),
        status: editStatus,
        paymentMethod: editStatus === "PAID" ? editPaymentMethod : null,
        transactionRef: editStatus === "PAID" ? (editTransactionRef.trim() || null) : null,
        paidAt: editStatus === "PAID" ? (editPaidAt ? new Date(editPaidAt) : new Date()) : null,
      });
      toast.success('Payroll updated successfully');
      setEditOpen(false);
      setEditingPayroll(null);
      loadPayrolls();
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update payroll');
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = async (format: "xlsx" | "csv" = "xlsx", specificIds?: number[]) => {
    try {
      setExporting(true);
      await payrollAPI.exportPayroll({
        month: filterMonth !== "all" ? Number(filterMonth) : undefined,
        year: filterYear || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        ids: specificIds && specificIds.length > 0 ? specificIds : undefined,
        format,
      });
      toast.success(`Payroll report exported successfully as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export payroll report");
    } finally {
      setExporting(false);
    }
  };

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = (payrolls || []).map((p: any) => p.id);
      setSelectedPayrollIds(allIds);
    } else {
      setSelectedPayrollIds([]);
    }
  };

  const handleToggleRowSelect = (id: number) => {
    setSelectedPayrollIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleStatusSelectChange = (payroll: any, newStatus: string) => {
    if (newStatus === "PAID") {
      setPayrollToPay(payroll);
      setPaymentMethod(payroll.paymentMethod || "BANK_TRANSFER");
      setTransactionRef(payroll.transactionRef || "");
      setPaidDate(payroll.paidAt ? moment(payroll.paidAt).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"));
      setPayModalOpen(true);
    } else {
      handleDirectStatusChange(payroll.id, newStatus as any);
    }
  };

  const handleDirectStatusChange = async (id: number, status: "GENERATED" | "DRAFT") => {
    try {
      await payrollAPI.updateStatus(id, { status });
      toast.success(`Status updated to ${status}`);
      loadPayrolls();
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  const handleConfirmSinglePay = async () => {
    if (!payrollToPay) return;
    try {
      setPaying(true);
      await payrollAPI.updateStatus(payrollToPay.id, {
        status: "PAID",
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        paidAt: paidDate || new Date(),
      });
      toast.success(`Payroll for ${payrollToPay?.employee?.firstName || 'employee'} marked as PAID`);
      setPayModalOpen(false);
      setPayrollToPay(null);
      loadPayrolls();
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update payment");
    } finally {
      setPaying(false);
    }
  };

  const handleBulkPayConfirm = async () => {
    if (selectedPayrollIds.length === 0) return;
    try {
      setBulkProcessing(true);
      await payrollAPI.bulkUpdateStatus({
        ids: selectedPayrollIds,
        status: "PAID",
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        paidAt: paidDate || new Date(),
      });
      toast.success(`${selectedPayrollIds.length} payroll(s) marked as PAID`);
      setBulkPayModalOpen(false);
      setSelectedPayrollIds([]);
      loadPayrolls();
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update bulk status");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkLockConfirm = async () => {
    if (selectedPayrollIds.length === 0) return;
    try {
      setBulkProcessing(true);
      await payrollAPI.bulkLock({
        ids: selectedPayrollIds,
      });
      toast.success(`${selectedPayrollIds.length} payroll(s) locked`);
      setBulkLockModalOpen(false);
      setSelectedPayrollIds([]);
      loadPayrolls();
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to lock selected payrolls");
    } finally {
      setBulkProcessing(false);
    }
  };

  // const filteredPayrolls = payrolls?.filter((payroll) => {
  //   if (filterMonth !== 'all' && payroll.month !== filterMonth) return false;
  //   if (filterStatus !== 'all' && payroll.status !== filterStatus) return false;
  //   return true;
  // });
  const loadAnalytics = async (m = filterMonth, y = filterYear) => {
    try {
      const monthParam = m !== "all" ? Number(m) : undefined;
      const yearParam = y ? Number(y) : undefined;

      const [
        statsRes,
        trendRes,
        overtimeRes,
        deptRes,
        headcountRes,
        attendanceRes,
        riskRes
      ] = await Promise.all([
        payrollAPI.getStats({
          month: monthParam,
          year: yearParam
        }),
        payrollAPI.getTrend(),
        payrollAPI.getOvertimeTrend(),
        payrollAPI.getDepartmentBreakdown({
          month: monthParam,
          year: yearParam
        }),
        payrollAPI.getHeadcount(),
        payrollAPI.getAttendanceImpact({
          month: monthParam,
          year: yearParam
        }),
        payrollAPI.getRiskAlerts({
          month: monthParam,
          year: yearParam
        }),
      ]);
  
      setStats(statsRes);
      setTrend(trendRes);
      setOvertimeTrend(overtimeRes);
      setDepartmentBreakdown(deptRes);
      setHeadcount(headcountRes);
      setAttendanceImpact(attendanceRes);
      setRiskAlerts(riskRes);
  
    } catch {
      toast.error("Failed to load analytics");
    }
  };
  
  const loadPayrolls = async (m = filterMonth, y = filterYear, s = filterStatus) => {
    try {
      const res = await payrollAPI.getAll({
        month: m !== "all" ? Number(m) : undefined,
        year: y ? Number(y) : undefined,
        status: s !== "all" ? s : undefined
      });
  
      setPayrolls(res.data || []);
      setPayrollSummary(res.summary);
    } catch {
      toast.error("Failed to load payrolls");
    }
  };
  
  const loadInfo = async () => {
    try {
      const res = await employeeAPI.getActiveEmployees();
      setEmployees(res.data || []);
      const res1 = await departmentAPI.getDepartments();
      setDepartments(res1.data || []);
      const res2 = await locationAPI.getLocations();
      setLocations(res2.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPayrolls(filterMonth, filterYear, filterStatus);
    loadAnalytics(filterMonth, filterYear);
  }, [filterMonth, filterYear, filterStatus]);

  useEffect(() => {
    loadInfo();
  }, []);

  const totalPayroll = payrollSummary?.totalPayroll || 0;
  const totalPaid = payrollSummary?.totalPaid || 0;

  const handleDelete = async (id: number) => {
    try {
      await payrollAPI.delete(id);
      setPayrolls(prev => prev?.filter(p => p.id !== id));
      toast.success("Payroll deleted successfully");
      loadAnalytics(filterMonth, filterYear);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const handleOpenGenerate = () => {
    setSelectedMonth(filterMonth !== "all" ? Number(filterMonth) : (now.month() + 1));
    setSelectedYear(Number(filterYear) || now.year());
    setGenerateResult(null);
    setProgress(0);
    setGenerateOpen(true);
  };

  // Check if selected period is incomplete (current running month or future)
  const isPeriodIncomplete = (m: number | null, y: number | null) => {
    if (!m || !y) return false;
    const currentMoment = moment();
    const periodEnd = moment({ year: y, month: m - 1 }).endOf("month");
    return periodEnd.isAfter(currentMoment);
  };

  const handleGeneratePayroll = () => {
    if (!selectedMonth || !selectedYear) {
      return toast.error("Select month and year");
    } 

    if (
      (type === "INDIVIDUAL" && selectedEmployees.length === 0) ||
      (type === "DEPARTMENT" && selectedDepartments.length === 0) ||
      (type === "LOCATION" && selectedLocations.length === 0)
    ) {
      return toast.error("Please select at least one option");
    }

    // If month is not completed yet, show warning dialog to confirm
    if (isPeriodIncomplete(selectedMonth, selectedYear)) {
      setIncompleteWarningOpen(true);
      return;
    }

    executePayrollGeneration();
  };

  const executePayrollGeneration = async () => {
    try {
      setLoading(true);
      setProgress(30);
      const payload = {
        month: selectedMonth,
        year: selectedYear,
        type,
        employeeIds: selectedEmployees,
        departmentIds: selectedDepartments,
        locationIds: selectedLocations
      };

      const res = await payrollAPI.generateBulk(payload);
      setProgress(100);
      setGenerateResult(res);

      const generatedCount = res?.generated ?? 0;
      const skippedCount = res?.skipped ?? 0;

      if (generatedCount > 0) {
        toast.success(`Successfully generated ${generatedCount} payroll record${generatedCount > 1 ? "s" : ""}!`);
      } else if (skippedCount > 0) {
        toast.info(`Payroll already generated for ${skippedCount} employee${skippedCount > 1 ? "s" : ""}.`);
      } else {
        toast.info("No payroll records were generated.");
      }

      setIncompleteWarningOpen(false);
      setGenerateOpen(false);

      // Instantly switch view to the generated month & year and reload realtime
      setFilterMonth(selectedMonth!);
      setFilterYear(selectedYear!);
      await loadPayrolls(selectedMonth!, selectedYear!, filterStatus);
      await loadAnalytics(selectedMonth!, selectedYear!);

    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLockConfirm = (payroll: any) => {
    setPayrollToLock(payroll);
    setLockModalOpen(true);
  };

  const handleConfirmLock = async () => {
    if (!payrollToLock) return;
    try {
      setLocking(true);
      await payrollAPI.LockPayroll(payrollToLock.id);
      toast.success(`Payroll record for ${payrollToLock?.employee?.firstName || 'employee'} locked successfully`);
      setLockModalOpen(false);
      setPayrollToLock(null);
      await loadPayrolls(filterMonth, filterYear, filterStatus);
      await loadAnalytics(filterMonth, filterYear);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to lock payroll");
    } finally {
      setLocking(false);
    }
  };

  const handleSelectAllTargets = () => {
    if (type === "INDIVIDUAL") {
      if (selectedEmployees.length === employees.length) {
        setSelectedEmployees([]);
      } else {
        setSelectedEmployees(employees.map(e => e.id));
      }
    } else if (type === "DEPARTMENT") {
      if (selectedDepartments.length === departments.length) {
        setSelectedDepartments([]);
      } else {
        setSelectedDepartments(departments.map(d => d.id));
      }
    } else if (type === "LOCATION") {
      if (selectedLocations.length === locations.length) {
        setSelectedLocations([]);
      } else {
        setSelectedLocations(locations.map(l => l.id));
      }
    }
  };

  const getSelectAllLabel = () => {
    if (type === "INDIVIDUAL") return (employees.length > 0 && selectedEmployees.length === employees.length) ? "Deselect All" : "Select All";
    if (type === "DEPARTMENT") return (departments.length > 0 && selectedDepartments.length === departments.length) ? "Deselect All" : "Select All";
    if (type === "LOCATION") return (locations.length > 0 && selectedLocations.length === locations.length) ? "Deselect All" : "Select All";
    return "Select All";
  };

  const filteredEmployees = employees.filter((emp) =>
    `${emp.firstName || ''} ${emp.lastName || ''} ${emp.email || ''}`.toLowerCase().includes(targetSearch.toLowerCase())
  );

  const filteredDepartments = departments.filter((dep) =>
    (dep.title || dep.name || '').toLowerCase().includes(targetSearch.toLowerCase())
  );

  const filteredLocations = locations.filter((loc) =>
    (loc.name || loc.title || '').toLowerCase().includes(targetSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Payroll Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage and generate monthly employee salary records.</p>
        </div>

        <Button onClick={handleOpenGenerate} className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs shadow-xs px-4">
          <Plus className="mr-1.5 size-4" />
          Generate Payroll
        </Button>
      </div>

      {/* GENERATE DIALOG */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden shadow-2xl border border-gray-200 bg-white">
          {/* Modal Header */}
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 flex-shrink-0">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Generate Payroll
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Select period and select target employees or departments to process salary records.
            </p>
          </DialogHeader>

          {/* Modal Scrollable Body */}
          <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
            {/* Progress indicator */}
            {loading && (
              <div className="space-y-2 p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80">
                <div className="flex justify-between text-xs font-semibold text-blue-800 mb-1">
                  <span>Processing Payroll...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-blue-200/70 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary notification */}
            {generateResult && (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Payroll Generation Complete
                </p>
                <div className="flex items-center gap-4 text-emerald-800 pt-1">
                  <span>Generated Records: <strong>{generateResult.generated || 0}</strong></span>
                  <span>Skipped Duplicates: <strong>{generateResult.skipped || 0}</strong></span>
                </div>
              </div>
            )}

            {/* Period Selection (Month & Year Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-800">Select Month</Label>
                <Select value={selectedMonth ? String(selectedMonth) : undefined} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-300 bg-white text-xs font-medium">
                    <SelectValue placeholder="Choose Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months?.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-800">Select Year</Label>
                <Select value={selectedYear ? String(selectedYear) : undefined} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-300 bg-white text-xs font-medium">
                    <SelectValue placeholder="Choose Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years?.map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Incomplete Period Notice */}
            {isPeriodIncomplete(selectedMonth, selectedYear) && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Incomplete Cycle Notice:</span> This month is currently in progress or in the future. Full attendance data is not complete yet.
                </div>
              </div>
            )}

            {/* Scope Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-800">Generate For</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="h-10 rounded-xl border-gray-300 bg-white text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL" className="text-xs">Individual Employees</SelectItem>
                  <SelectItem value="DEPARTMENT" className="text-xs">Whole Department</SelectItem>
                  <SelectItem value="LOCATION" className="text-xs">Location / Office Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Multi-Select Card */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">
                  {type === "INDIVIDUAL" && `Employees (${selectedEmployees.length} selected)`}
                  {type === "DEPARTMENT" && `Departments (${selectedDepartments.length} selected)`}
                  {type === "LOCATION" && `Locations (${selectedLocations.length} selected)`}
                </span>

                <button
                  type="button"
                  onClick={handleSelectAllTargets}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {getSelectAllLabel()}
                </button>
              </div>

              {/* Search Filter Input */}
              <div className="p-2.5 bg-gray-50/50 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    placeholder={
                      type === "INDIVIDUAL" ? "Search employee by name or email..." :
                      type === "DEPARTMENT" ? "Search department..." :
                      "Search location..."
                    }
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {targetSearch && (
                    <button
                      type="button"
                      onClick={() => setTargetSearch('')}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 max-h-52 overflow-y-auto space-y-1 custom-scrollbar">
                {type === "INDIVIDUAL" && (
                  filteredEmployees.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 italic">
                      {targetSearch ? "No matching employees found" : "No active employees found"}
                    </p>
                  ) : (
                    filteredEmployees.map(emp => (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                          selectedEmployees.includes(emp.id)
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-medium'
                            : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedEmployees.includes(emp.id)}
                            onCheckedChange={() =>
                              toggleSelection(emp.id, selectedEmployees, setSelectedEmployees)
                            }
                          />
                          <div className="size-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </label>
                    ))
                  )
                )}

                {type === "DEPARTMENT" && (
                  filteredDepartments.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 italic">
                      {targetSearch ? "No matching departments found" : "No departments found"}
                    </p>
                  ) : (
                    filteredDepartments.map(dep => (
                      <label
                        key={dep.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          selectedDepartments.includes(dep.id)
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-medium'
                            : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Checkbox
                          checked={selectedDepartments.includes(dep.id)}
                          onCheckedChange={() =>
                            toggleSelection(dep.id, selectedDepartments, setSelectedDepartments)
                          }
                        />
                        <span className="text-xs font-semibold">{dep.title}</span>
                      </label>
                    ))
                  )
                )}

                {type === "LOCATION" && (
                  filteredLocations.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 italic">
                      {targetSearch ? "No matching locations found" : "No locations found"}
                    </p>
                  ) : (
                    filteredLocations.map(loc => (
                      <label
                        key={loc.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          selectedLocations.includes(loc.id)
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-medium'
                            : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Checkbox
                          checked={selectedLocations.includes(loc.id)}
                          onCheckedChange={() =>
                            toggleSelection(loc.id, selectedLocations, setSelectedLocations)
                          }
                        />
                        <span className="text-xs font-semibold">{loc.name}</span>
                      </label>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGenerateOpen(false)}
              className="rounded-xl border-gray-300 hover:bg-white text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleGeneratePayroll}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs px-5 shadow-xs text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Payroll"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INCOMPLETE MONTH CONFIRMATION DIALOG */}
      <Dialog open={incompleteWarningOpen} onOpenChange={setIncompleteWarningOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-white shadow-2xl border border-gray-200">
          <div className="flex items-start gap-3.5">
            <div className="size-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                Incomplete Month Warning
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                The selected payroll period (<strong>{moment.months()[Number(selectedMonth) - 1]} {selectedYear}</strong>) is not yet complete. If you generate payroll now, calculations will only be based on attendance records up to today.
              </p>
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-3">
                Are you sure you want to proceed with generating payroll for this period?
              </p>
            </div>
          </div>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setIncompleteWarningOpen(false)}
              className="rounded-xl border-gray-300 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={executePayrollGeneration}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 font-bold text-xs px-4 text-white shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed Anyway"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* TOTAL GROSS */}
        <Card className="shadow-xs border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Total Gross</h3>
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Wallet className="size-5.5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none">
                  Rs. {stats?.totalGross?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0}
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-1">Gross Earnings</p>
              </div>
            </div>
          </div>
        </Card>

        {/* TOTAL NET */}
        <Card className="shadow-xs border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Total Net</h3>
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <CreditCard className="size-5.5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none">
                  Rs. {stats?.totalNet?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0}
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-1">Take Home Total</p>
              </div>
            </div>
          </div>
        </Card>

        {/* HEADCOUNT */}
        <Card className="shadow-xs border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Headcount</h3>
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Users className="size-5.5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none">
                  {stats?.headcount || 0}
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-1">Paid Employees</p>
              </div>
            </div>
          </div>
        </Card>

        {/* AVG COST */}
        <Card className="shadow-xs border border-gray-200/80 rounded-2xl overflow-hidden bg-white p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Avg Cost / Employee</h3>
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <TrendingUp className="size-5.5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none">
                  Rs. {stats?.averageCostPerEmployee?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0}
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-1">Average Expenditure</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <Card className="border border-gray-200/80 shadow-xs rounded-2xl overflow-hidden bg-white mt-6">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-gray-900">Payroll Records</CardTitle>
              <Badge variant="outline" className="bg-white border-gray-200 text-gray-700 text-xs font-semibold">
                {payrolls?.length || 0} Records
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SearchableSelect
                className="w-[140px] text-xs"
                placeholder="Month"
                searchPlaceholder="Search month..."
                value={filterMonth.toString()}
                onValueChange={(v) => setFilterMonth(v === "all" ? "all" : Number(v))}
                options={filterMonths}
              />

              <SearchableSelect
                className="w-[110px] text-xs"
                placeholder="Year"
                searchPlaceholder="Search year..."
                value={filterYear.toString()}
                onValueChange={(v) => setFilterYear(Number(v))}
                options={years.map((y) => ({
                  value: y.toString(),
                  label: y.toString(),
                }))}
              />

              <SearchableSelect
                className="w-[140px] text-xs"
                placeholder="Status"
                searchPlaceholder="Search status..."
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "GENERATED", label: "Generated" },
                  { value: "PAID", label: "Paid" },
                ]}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exporting || (payrolls || []).length === 0}
                    className="h-9 px-3 text-xs rounded-xl font-bold border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 text-gray-700 shadow-2xs"
                  >
                    {exporting ? (
                      <Loader2 className="size-3.5 animate-spin text-blue-600" />
                    ) : (
                      <Download className="size-3.5 text-blue-600" />
                    )}
                    <span>Export All</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => handleExport("xlsx")}
                    className="text-xs font-semibold cursor-pointer flex items-center gap-2 py-2"
                  >
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span>Excel Spreadsheet (.xlsx)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("csv")}
                    className="text-xs font-semibold cursor-pointer flex items-center gap-2 py-2"
                  >
                    <div className="size-2 rounded-full bg-blue-500" />
                    <span>CSV Document (.csv)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* BULK ACTIONS TOOLBAR */}
          {selectedPayrollIds.length > 0 && (
            <div className="m-4 p-3.5 bg-indigo-50/90 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <Badge className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-lg">
                  {selectedPayrollIds.length} Selected
                </Badge>
                <span className="text-xs font-bold text-indigo-950">
                  Bulk actions for selected employees
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setPaymentMethod("BANK_TRANSFER");
                    setTransactionRef("");
                    setPaidDate(moment().format("YYYY-MM-DD"));
                    setBulkPayModalOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <DollarSign className="size-3.5" />
                  <span>Mark Selected as Paid</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkLockModalOpen(true)}
                  className="h-8 px-3 text-xs font-bold bg-white text-slate-800 border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="size-3.5 text-slate-600" />
                  <span>Lock Selected</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("xlsx", selectedPayrollIds)}
                  disabled={exporting}
                  className="h-8 px-3 text-xs font-bold bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="size-3.5 text-indigo-600" />
                  <span>Export Selected</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPayrollIds([])}
                  className="h-8 px-2.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-white/80 rounded-xl cursor-pointer"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="w-[45px] pl-6">
                    <Checkbox
                      checked={(payrolls || []).length > 0 && selectedPayrollIds.length === (payrolls || []).length}
                      onCheckedChange={(checked) => handleSelectAllRows(!!checked)}
                      aria-label="Select all payroll records"
                    />
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Employee</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Base Salary</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Overtime</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Net Pay</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Status</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls?.map((payroll) => {
                  const empName = payroll?.employee
                    ? `${payroll.employee.firstName || ""} ${payroll.employee.lastName || ""}`.trim()
                    : "Unknown Employee";
                  const deptTitle = payroll?.employee?.department?.title || payroll?.employee?.email || "Staff";
                  const initials = empName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  const baseSalary = Number(payroll?.rate ?? payroll?.grossSalary ?? 0);
                  const overtime = Number(payroll?.overtimeAmount ?? 0);
                  const bonus = Number(payroll?.bonus ?? 0);
                  const deductions = Number(payroll?.grossDeductions ?? payroll?.deductions ?? 0);
                  const netPay = payroll.netSalary !== undefined && payroll.netSalary !== null
                    ? Number(payroll.netSalary)
                    : Math.max(0, baseSalary + overtime + bonus - deductions);

                  return (
                    <TableRow key={payroll.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Checkbox Cell */}
                      <TableCell className="pl-6 py-3.5">
                        <Checkbox
                          checked={selectedPayrollIds.includes(payroll.id)}
                          onCheckedChange={() => handleToggleRowSelect(payroll.id)}
                          aria-label={`Select ${empName}`}
                        />
                      </TableCell>

                      {/* Employee Avatar + Info Cell */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials || "U"}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 leading-snug">{empName}</p>
                            <p className="text-xs text-gray-500 font-medium">{deptTitle}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Base Salary Cell */}
                      <TableCell className="py-3.5">
                        <span className="font-bold font-mono text-xs text-gray-900">
                          Rs. {payroll?.rate?.toLocaleString() || 0}
                        </span>
                      </TableCell>

                      {/* Overtime Cell */}
                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-100">
                          +Rs. {payroll.overtimeAmount?.toLocaleString() || 0}
                        </span>
                      </TableCell>

                      {/* Net Pay Cell */}
                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-100">
                          Rs. {netPay.toLocaleString()}
                        </span>
                      </TableCell>

                      {/* Status Dropdown Cell */}
                      <TableCell className="py-3.5">
                        <div className="space-y-1">
                          <Select
                            value={payroll.status}
                            onValueChange={(val) => handleStatusSelectChange(payroll, val)}
                            disabled={payroll.locked}
                          >
                            <SelectTrigger className="w-[125px] h-8 text-xs font-semibold rounded-xl bg-gray-50 border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GENERATED">Generated</SelectItem>
                              <SelectItem value="PAID">Paid</SelectItem>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                            </SelectContent>
                          </Select>

                          {payroll.status === "PAID" && payroll.paymentMethod && (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {payroll.paymentMethod.replace(/_/g, " ")}
                              </span>
                              {payroll.transactionRef && (
                                <span className="text-[10px] text-gray-500 font-mono truncate max-w-[80px]" title={payroll.transactionRef}>
                                  #{payroll.transactionRef}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions Cell */}
                      <TableCell className="py-3.5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/payroll/view/${payroll.id}`)}
                            className="h-8 px-2.5 text-xs font-semibold text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg flex items-center gap-1"
                          >
                            <Eye className="size-3.5 text-indigo-600" />
                            <span>View</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(payroll)}
                            disabled={payroll.locked || payroll.status === "PAID"}
                            title={payroll.locked ? "Locked record cannot be edited" : payroll.status === "PAID" ? "Paid record cannot be edited" : "Edit Payroll"}
                            className="h-8 px-2.5 text-xs font-semibold text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Pencil className="size-3.5 text-amber-600" />
                            <span>Edit</span>
                          </Button>

                          {/* Lock Action Button */}
                          {payroll.locked ? (
                            <span className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg cursor-default select-none">
                              <Lock className="size-3.5 text-slate-500" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenLockConfirm(payroll)}
                              title="Lock payroll to prevent further edits"
                              className="h-8 px-2.5 text-xs font-semibold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1"
                            >
                              <LockOpen className="size-3.5 text-slate-500" />
                              <span>Lock</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(payroll.id)}
                            disabled={payroll.locked || payroll.status === "PAID"}
                            title={payroll.locked ? "Locked record cannot be deleted" : payroll.status === "PAID" ? "Paid record cannot be deleted" : "Delete Payroll"}
                            className="h-8 px-2.5 text-xs font-semibold text-rose-600 border-gray-200 hover:bg-rose-50 hover:border-rose-200 rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* RISK ALERTS */}
      {riskAlerts.length > 0 && (
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="size-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                Risk Alerts
                <Badge className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold border-none">
                  {riskAlerts.length} Warning{riskAlerts.length > 1 ? "s" : ""}
                </Badge>
              </h3>
              <p className="text-xs text-rose-700 font-medium">Anomalies detected in current payroll calculation</p>
            </div>
          </div>
          <div className="space-y-2 pl-1 sm:pl-10">
            {riskAlerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-2.5 text-xs font-semibold text-rose-900 bg-white/90 p-3 rounded-xl border border-rose-100 shadow-2xs">
                <AlertTriangle className="size-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHARTS GRID */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* PAYROLL TREND CHART */}
        <Card className="border border-gray-200/80 shadow-xs rounded-2xl overflow-hidden bg-white p-5">
          <CardHeader className="p-0 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <TrendingUp className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900">Payroll Trend</CardTitle>
                <p className="text-xs text-gray-400 font-medium">Last 6 Months Expenditure</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Total Cost']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6, fill: '#1D4ED8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* DEPARTMENT COST DISTRIBUTION CHART */}
        <Card className="border border-gray-200/80 shadow-xs rounded-2xl overflow-hidden bg-white p-5">
          <CardHeader className="p-0 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <PieChartIcon className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900">Department Cost Distribution</CardTitle>
                <p className="text-xs text-gray-400 font-medium">Expense Breakdown</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentBreakdown}
                  dataKey="total"
                  nameKey="department"
                  cx="50%"
                  cy="48%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1, stroke: '#9CA3AF' }}
                >
                  {(departmentBreakdown || []).map((entry: any, index: number) => {
                    const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#6366F1"];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Cost']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
     
      {/* EDIT PAYROLL DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-amber-600" />
              Edit Payroll - {editingPayroll?.employee ? `${editingPayroll.employee.firstName || ""} ${editingPayroll.employee.lastName || ""}`.trim() : "Employee"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-xs text-gray-500 font-medium pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Period: {editingPayroll ? moment(editingPayroll.periodStart).format("MMM YYYY") : ""}</span>
              <Badge variant="outline" className="text-[11px] font-semibold">{editStatus}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Base Salary (Rate)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">Rs.</span>
                  <Input
                    type="number"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    placeholder="Base Salary"
                    className="pl-10 h-9 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Overtime Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-emerald-600 font-mono">+Rs.</span>
                  <Input
                    type="number"
                    value={editOvertime}
                    onChange={(e) => setEditOvertime(e.target.value)}
                    placeholder="Overtime"
                    className="pl-11 h-9 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="col-span-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Adjustments</h4>
                    <p className="text-[11px] text-gray-500">Manage earnings & deductions for this payroll.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenAddAdjustment}
                    className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Adjustment</span>
                  </Button>
                </div>

                {editingPayroll?.components && editingPayroll.components.length > 0 ? (
                  <div className="space-y-1.5 pt-1 border-t border-blue-100/80 max-h-36 overflow-y-auto custom-scrollbar">
                    {editingPayroll.components.map((comp: any) => {
                      const isEarning = ["BASIC","ALLOWANCE","BONUS","COMMISSION","OVERTIME","INCREMENT","KPIS","BOUNTY","ARREARS"].includes(String(comp.type || "").toUpperCase());
                      return (
                        <div key={comp.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200/80 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0.2 ${isEarning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                              {isEarning ? 'EARNING' : 'DEDUCTION'}
                            </Badge>
                            <span className="font-semibold text-gray-800">{comp.title || comp.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${isEarning ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isEarning ? '+' : '-'}Rs. {Number(comp.amount || 0).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditAdjustment(comp)}
                              className="text-amber-600 hover:text-amber-800 p-1 cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdjustment(comp.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic pt-1">No custom adjustments added yet.</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Payroll Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERATED">Generated</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PAYMENT DETAILS IF PAID */}
            {editStatus === "PAID" && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CreditCard className="size-3.5" />
                  <span>Payment Details</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-700">Payment Method</Label>
                    <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                      <SelectTrigger className="h-8 text-xs font-semibold bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="ONLINE">Online / Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-700">Transaction / Cheque #</Label>
                    <Input
                      type="text"
                      placeholder="e.g. TXN-89210"
                      value={editTransactionRef}
                      onChange={(e) => setEditTransactionRef(e.target.value)}
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] font-bold text-gray-700">Payment Date</Label>
                    <Input
                      type="date"
                      value={editPaidAt}
                      onChange={(e) => setEditPaidAt(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* COMPUTED PREVIEW */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-600">Calculated Net Salary:</span>
              <span className="font-mono text-sm font-bold text-emerald-600">
                Rs. {Math.max(0, (Number(editRate) || 0) + (Number(editOvertime) || 0) + (Number(editBonus) || 0) - (Number(editDeductions) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updating} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD / EDIT ADJUSTMENT DIALOG */}
      <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="size-4 text-blue-600" />
              {editingComponentId ? 'Edit Adjustment' : 'Add Adjustment'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Type</Label>
              <Select value={adjustType} onValueChange={(v: 'INCREMENT' | 'DEDUCTION') => handleTypeChange(v)}>
                <SelectTrigger className="bg-white border-gray-300 h-9 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCREMENT" className="text-xs font-semibold text-emerald-700">EARNINGS</SelectItem>
                  <SelectItem value="DEDUCTION" className="text-xs font-semibold text-rose-700">DEDUCTIONS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                {adjustType === 'INCREMENT' ? 'Earnings Title' : 'Deductions Title'}
              </Label>
              <Select value={adjustTitle} onValueChange={(v) => setAdjustTitle(v)}>
                <SelectTrigger className="bg-white border-gray-300 h-9 text-xs font-medium">
                  <SelectValue placeholder="Select Title..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {(adjustType === 'INCREMENT' ? EARNINGS_TITLES : DEDUCTIONS_TITLES).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(adjustTitle === "Other Earning" || adjustTitle === "Other Deduction") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Custom Title</Label>
                <Input
                  placeholder="Enter custom title"
                  value={adjustCustomTitle}
                  onChange={(e) => setAdjustCustomTitle(e.target.value)}
                  className="bg-white border-gray-300 h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Amount (PKR)</Label>
              <Input
                type="number"
                placeholder="Enter amount (e.g. 5000)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="bg-white border-gray-300 h-9 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpenAdjust(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={addingAdjustment}
              onClick={handleAddAdjustment}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {addingAdjustment ? "Saving..." : (editingComponentId ? 'Save Changes' : 'Add Adjustment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOCK CONFIRMATION DIALOG */}
      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-white shadow-2xl border border-gray-200">
          <div className="flex items-start gap-3.5">
            <div className="size-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Lock className="size-5.5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                Lock Payroll Record
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to lock the payroll for <strong>{payrollToLock?.employee ? `${payrollToLock.employee.firstName} ${payrollToLock.employee.lastName || ''}` : 'this employee'}</strong>?
              </p>
              <div className="text-xs text-amber-800 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 mt-3 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                  Irreversible Action Notice:
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Once locked, this salary record <strong>cannot be edited or deleted</strong>. All earnings and deductions will be finalized.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              disabled={locking}
              onClick={() => {
                setLockModalOpen(false);
                setPayrollToLock(null);
              }}
              className="rounded-xl border-gray-300 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={locking}
              onClick={handleConfirmLock}
              className="rounded-xl bg-gray-900 hover:bg-black font-bold text-xs px-4 text-white shadow-xs flex items-center gap-1.5"
            >
              {locking ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="size-3.5" />
                  Confirm & Lock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SINGLE EMPLOYEE MARK AS PAID DIALOG */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-white shadow-2xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-800">
              <CreditCard className="size-5 text-emerald-600" />
              Mark as Paid - {payrollToPay?.employee ? `${payrollToPay.employee.firstName} ${payrollToPay.employee.lastName || ''}` : 'Employee'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-900">Net Salary Payable:</span>
              <span className="font-mono text-sm font-bold text-emerald-700">
                Rs. {Number(payrollToPay?.netSalary || payrollToPay?.rate || 0).toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="ONLINE">Online Transfer / Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Transaction Reference / Cheque #</Label>
                <Input
                  type="text"
                  placeholder="e.g. TXN-89210 or Cheque #1024"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Payment Date</Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              disabled={paying}
              onClick={() => {
                setPayModalOpen(false);
                setPayrollToPay(null);
              }}
              className="rounded-xl border-gray-300 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={paying}
              onClick={handleConfirmSinglePay}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs px-4 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {paying ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Confirm & Mark Paid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK MARK AS PAID DIALOG */}
      <Dialog open={bulkPayModalOpen} onOpenChange={setBulkPayModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-white shadow-2xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-800">
              <CreditCard className="size-5 text-emerald-600" />
              Bulk Mark as Paid ({selectedPayrollIds.length} Employees)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-600 leading-relaxed">
              You are about to mark <strong>{selectedPayrollIds.length}</strong> payroll records as <strong>PAID</strong>. Specify the batch payment details below:
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer (Bulk)</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="ONLINE">Online Transfer / Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Batch Transaction / Reference # (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g. BATCH-SALARY-OCT26"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Payment Date</Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              disabled={bulkProcessing}
              onClick={() => setBulkPayModalOpen(false)}
              className="rounded-xl border-gray-300 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={bulkProcessing}
              onClick={handleBulkPayConfirm}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs px-4 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {bulkProcessing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Confirm Bulk Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK LOCK CONFIRMATION DIALOG */}
      <Dialog open={bulkLockModalOpen} onOpenChange={setBulkLockModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-white shadow-2xl border border-gray-200">
          <div className="flex items-start gap-3.5">
            <div className="size-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Lock className="size-5.5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                Lock Selected Payrolls ({selectedPayrollIds.length})
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to lock all <strong>{selectedPayrollIds.length}</strong> selected payroll records?
              </p>
              <div className="text-xs text-amber-800 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 mt-3 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                  Irreversible Action Notice:
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Locked records <strong>cannot be edited or deleted</strong>. All earnings and deductions for these employees will be finalized.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              disabled={bulkProcessing}
              onClick={() => setBulkLockModalOpen(false)}
              className="rounded-xl border-gray-300 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={bulkProcessing}
              onClick={handleBulkLockConfirm}
              className="rounded-xl bg-gray-900 hover:bg-black font-bold text-xs px-4 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {bulkProcessing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="size-3.5" />
                  Confirm Bulk Lock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
