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
import { DollarSign, Download, Plus, Wallet, CreditCard, Users, TrendingUp, Eye, Pencil, Trash2, Calendar, AlertTriangle, PieChart as PieChartIcon, Calculator, CheckCircle2, Loader2, Search, X } from 'lucide-react';
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
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [type, setType] = useState<'INDIVIDUAL' | 'DEPARTMENT' | 'LOCATION'>('INDIVIDUAL');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);
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
  // Mock data (replace with API)
  const [employees,setEmployees] = useState([]);

  const [departments,setDepartments] = useState([]);

  const [locations,setLocations] = useState([]);

  const toggleSelection = (id: number, list: number[], setList: any) => {
    if (list.includes(id)) {
      setList(list?.filter(i => i !== id));
    } else {
      setList([...list, id]);
    }
  };

  const [payrolls, setPayrolls] = useState([]);
  const now = moment();

  const [filterMonth, setFilterMonth] = useState<number>(now.month() + 1);
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
  const [updating, setUpdating] = useState(false);

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
        month: filterMonth || undefined,
        year: filterYear || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
      setPayrolls(res.data);
      setSummary(res.summary);

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
        month: filterMonth || undefined,
        year: filterYear || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
      setPayrolls(res.data);
      setSummary(res.summary);

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

  // const filteredPayrolls = payrolls?.filter((payroll) => {
  //   if (filterMonth !== 'all' && payroll.month !== filterMonth) return false;
  //   if (filterStatus !== 'all' && payroll.status !== filterStatus) return false;
  //   return true;
  // });
  const loadAnalytics = async () => {
    try {
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
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
        }),
        payrollAPI.getTrend(),
        payrollAPI.getOvertimeTrend(),
        payrollAPI.getDepartmentBreakdown({
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
        }),
        payrollAPI.getHeadcount(),
        payrollAPI.getAttendanceImpact({
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
        }),
        payrollAPI.getRiskAlerts({
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
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
  
  const loadPayrolls = async () => {
    try {
      const res = await payrollAPI.getAll({
        month: filterMonth || undefined,
        year: filterYear || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
  
      setPayrolls(res.data);
      setSummary(res.summary);
    } catch {
      toast.error("Failed to load payrolls");
    }
  };
  
  const loadInfo = async ()=>{
    const res = await employeeAPI.getActiveEmployees();
    setEmployees(res.data)
    const res1 = await departmentAPI.getDepartments();
    setDepartments(res1.data)
    const res2 = await locationAPI.getLocations();
    setLocations(res2.data)
  }
  useEffect(() => {
    loadPayrolls();
    loadAnalytics();
  }, [filterMonth, filterYear, filterStatus]);
  useEffect(() => {
    loadInfo();
    
  }, []);

  const totalPayroll = summary?.totalPayroll || 0;
const totalPaid = summary?.totalPaid || 0;

  const handleDelete = async (id: number) => {
    try {
      await payrollAPI.delete(id);
  
      // UI se immediately remove karo
      setPayrolls(prev => prev?.filter(p => p.id !== id));
  
      toast.success("Payroll deleted successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };
  const handleGeneratePayroll = async () => {

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
      }
      const res = await payrollAPI.generateBulk(payload);
      setProgress(100);
      setSummary(res);
      toast.success("Payroll generated successfully");
      setGenerateOpen(false);

    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Generation failed");
    }finally {
      setLoading(false);
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

        <Button onClick={() => setGenerateOpen(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs shadow-xs px-4">
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
            {summary && (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Payroll Generation Complete
                </p>
                <div className="flex items-center gap-4 text-emerald-800 pt-1">
                  <span>Generated Records: <strong>{summary.generated || 0}</strong></span>
                  <span>Skipped Duplicates: <strong>{summary.skipped || 0}</strong></span>
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
                onValueChange={(v) => setFilterMonth(Number(v))}
                options={months.map((m) => ({
                  value: m.value.toString(),
                  label: m.label,
                }))}
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

              <Button variant="outline" size="sm" className="h-9 px-3 text-xs rounded-xl font-medium border-gray-200 hover:bg-gray-50">
                <Download className="mr-1.5 size-3.5 text-gray-600" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="font-bold text-gray-700 text-xs pl-6">Employee</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Base Salary</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Overtime</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Bonus</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Deductions</TableHead>
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
                      {/* Employee Avatar + Info Cell */}
                      <TableCell className="pl-6 py-3.5">
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

                      {/* Bonus Cell */}
                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-100">
                          +Rs. {payroll.bonus?.toLocaleString() || 0}
                        </span>
                      </TableCell>

                      {/* Deductions Cell */}
                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-100">
                          -Rs. {payroll.grossDeductions?.toLocaleString() || 0}
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
                        <Select
                          value={payroll.status}
                          onValueChange={async (value) => {
                            try {
                              await payrollAPI.updateStatus(payroll.id, { status: value });
                              toast.success("Status updated");
                              loadPayrolls();
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || "Update failed");
                            }
                          }}
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
                            disabled={payroll.locked}
                            className="h-8 px-2.5 text-xs font-semibold text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 rounded-lg flex items-center gap-1"
                          >
                            <Pencil className="size-3.5 text-amber-600" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(payroll.id)}
                            className="h-8 px-2.5 text-xs font-semibold text-rose-600 border-gray-200 hover:bg-rose-50 hover:border-rose-200 rounded-lg flex items-center gap-1"
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
    </div>
  );
};
