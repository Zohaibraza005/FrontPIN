// EmployeeDetail.tsx
//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { mockEmployees } from '../services/mockData'; // Assume this has employee data
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { Edit, Save, Plus, Trash2, Eye, Lock, Calendar, FileText, Briefcase, Clock, UserX, User, MapPin, Upload, ArrowLeft, Mail, Phone, Building2, Check, Shield, AlertCircle, Loader2, Banknote, Coins } from 'lucide-react';
import { useParams, Link } from 'react-router';
import { API_URL, employeeAPI, scheduleAPI, locationAPI, departmentAPI, roleAPI } from '../services/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { avatarColor } from '../utils/avatar';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import moment from 'moment';

import { to12h, timeRange12h } from "../utils/time";
const ALL_WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const documentTypes = ['CNIC', 'Contract', 'Degree', 'Experience Letter', 'Other'];
const separationTypes = ['Resignation', 'Termination', 'End of Contract', 'Retirement'];
const separationReasons = ['Better Opportunity', 'Personal Reasons', 'Performance', 'Misconduct', 'Other'];
// ── Mock data / constants ────────────────────────────────────────────────
const ALL_PRIVILEGES = [
  { id: 'EMPLOYEE', label: 'Employee' },
  { id: 'ATTENDANCE', label: 'Attendance' },
  { id: 'LEAVE', label: 'Leave' },
  { id: 'PROJECT', label: 'Project' },
  { id: 'TASK', label: 'Task' },
  { id: 'INVOICE', label: 'Invoice' },
  { id: 'REPORT', label: 'Report (Own Team)' },
  { id: 'OVERTIME', label: 'Overtime' },
  { id: 'ENABLE_GPS', label: 'GPS Tracking' },
  { id: 'SCHEDULE', label: 'Schedule' },
];

const mockDocuments = [
  { id: 1, type: 'CNIC', fileName: 'cnic_front.jpg', uploadedAt: '2025-01-10' },
  { id: 2, type: 'Contract', fileName: 'employment_contract.pdf', uploadedAt: '2025-02-05' },
];





export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // const employee = mockEmployees.find((e) => e.id === id);
  // const { id } = useParams<{ id: string }>();
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [showSeparationModal, setShowSeparationModal] = useState(false);
  

  const [employee, setEmployee] = useState<any>(null);
  

  // Edit states
  const [editPersonal, setEditPersonal] = useState(false);
  const [editJob, setEditJob] = useState(false);
  const [editPayroll, setEditPayroll] = useState(false);
  const [editSchedule, setEditSchedule] = useState(false);

  
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);

  // Form states
  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    employeeId: '',
    biometricId: '',
    roleId: '',
  });

  const [rolesList, setRolesList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [supervisorsList, setSupervisorsList] = useState<any[]>([]);

  const [job, setJob] = useState({
    locationId: '',
    location: '',
    departmentId: '',
    department: '',
    supervisorId: '',
    supervisor: '',
    hiringDate: '',
    employmentStatus: 'Active',
    workMode: 'On-site',
  });

  const [payroll, setPayroll] = useState({
    currency: 'PKR',
    rateType: 'monthly',
    rate: 0,
    overtimeRate: 0,
    cycleDate: 1,
    annualLeaves: 17,
    casualLeaves: 10,
    suddenLeaves: 12,
    monthlyLeaves: 3,
    maxExtraHours: 0,
  });

  const [schedule, setSchedule] = useState<any>({
    id: null,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    shiftStart: '09:00',
    shiftEnd: '18:00',
    earlyInMargin: 15,
    earlyOutMargin: 15,
    overtimeAllowed: true,
    overtimeMinutes: 30,
    allowHalfDay: false,
    halfDayMinutes: 240,
    numBreaks: 2,
    breakMinutes: 15,
  });
  const [daySchedules, setDaySchedules] = useState<Record<string, { startTime: string; endTime: string }>>({
    Mon: { startTime: '09:00', endTime: '18:00' },
    Tue: { startTime: '09:00', endTime: '18:00' },
    Wed: { startTime: '09:00', endTime: '18:00' },
    Thu: { startTime: '09:00', endTime: '18:00' },
    Fri: { startTime: '09:00', endTime: '18:00' },
    Sat: { startTime: '09:00', endTime: '18:00' },
    Sun: { startTime: '09:00', endTime: '18:00' },
  });
  const [selectedDay, setSelectedDay] = useState<string>('Mon');
  const [privileges, setPrivileges] = useState<any[]>([]);
  const [separation, setSeparation] = useState<any>(null); // null = not separated

  const toggleWorkingDay = (day: string) => {
    setSchedule((prev: any) => {
      const isWorking = prev.workingDays.includes(day);
      const updatedDays = isWorking
        ? prev.workingDays.filter((d: string) => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: updatedDays };
    });
  };

  const handleUpdateDayTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' }),
        [field]: value,
      },
    }));
  };

  const handleApplyTimeAllDays = (sourceDay: string) => {
    const source = daySchedules[sourceDay] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };
    const updated: Record<string, { startTime: string; endTime: string }> = {};
    ALL_WEEK_DAYS.forEach((d) => {
      updated[d] = { ...source };
    });
    setDaySchedules(updated);
    setSchedule((prev: any) => ({
      ...prev,
      shiftStart: source.startTime,
      shiftEnd: source.endTime,
    }));
    toast.success(`Applied ${FULL_DAY_NAMES[sourceDay] || sourceDay} timing (${timeRange12h(source.startTime, source.endTime)}) to all days`);
  };

  const [loading, setLoading] = useState(true);

  // Increment modal state
  const [incrementType, setIncrementType] = useState<'percentage' | 'amount'>('percentage');
  const [incrementValue, setIncrementValue] = useState(0);
  const [incrementDate, setIncrementDate] = useState('');

  // Separation form
  const [separationType, setSeparationType] = useState('');
  const [separationReason, setSeparationReason] = useState('');
  const [separationComments, setSeparationComments] = useState('');
  const [separationDate, setSeparationDate] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');
// Document upload
    const [docType, setDocType] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);

  const fetchEmployee = async () => {
    try {
      const res = await employeeAPI.getDetail(id!);
      const emp = res.data;
      setEmployee(emp);

      // Populate forms
      setPersonal({
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        phone: emp.phoneNumber || emp.phone || '',
        username: emp.username || '',
        employeeId: emp.employeeId || '',
        biometricId: emp.biometricId || '',
        roleId: emp.roleId ? String(emp.roleId) : (emp.appRole?.id ? String(emp.appRole.id) : ''),
      });

      setJob({
        locationId: emp.companyId ? String(emp.companyId) : (emp.company?.id ? String(emp.company.id) : ''),
        location: emp.company?.name || emp.location?.name || '',
        departmentId: emp.departmentId ? String(emp.departmentId) : (emp.department?.id ? String(emp.department.id) : ''),
        department: emp.department?.title || '',
        supervisorId: emp.supervisorId ? String(emp.supervisorId) : (emp.supervisor?.id ? String(emp.supervisor.id) : ''),
        supervisor: emp.supervisor
          ? `${emp.supervisor.firstName} ${emp.supervisor.lastName}`
          : '',
        hiringDate: emp.hiringDate ? emp.hiringDate.split('T')[0] : (emp.jobInfo?.hiringDate ? emp.jobInfo.hiringDate.split('T')[0] : ''),
        employmentStatus: emp.employmentStatus || emp.jobInfo?.employmentStatus || 'Active',
        workMode: emp.workMode || emp.jobInfo?.workMode || 'On-site',
      });

      let extraHoursVal = 0;
      if (emp.jobInfo?.maxExtraHours !== null && emp.jobInfo?.maxExtraHours !== undefined) {
        extraHoursVal = Number(emp.jobInfo.maxExtraHours);
      } else if (emp.Schedule) {
        const schedList = Array.isArray(emp.Schedule) ? emp.Schedule : [emp.Schedule];
        const aSched = schedList.find((s: any) => s && !s.deletedAt) || schedList[0];
        if (aSched?.overtimeMinutes) {
          extraHoursVal = Math.round(Number(aSched.overtimeMinutes) / 60);
        } else if (aSched?.overtimeAllowed) {
          extraHoursVal = 2;
        }
      } else if (emp.jobInfo?.allowExtraHours) {
        extraHoursVal = 2;
      }

      setPayroll({
        currency: emp.payroll?.currency || 'PKR',
        rateType: emp.payroll?.payoutType || 'monthly',
        rate: emp.payroll?.rate || 0,
        overtimeRate: emp.payroll?.overtimeRate || 0,
        cycleDate: emp.payroll?.cycleDate || 1,
        annualLeaves: emp.payroll?.annualLeaves ?? 17,
        casualLeaves: emp.payroll?.casualLeaves ?? 10,
        suddenLeaves: emp.payroll?.suddenLeaves ?? 12,
        monthlyLeaves: emp.payroll?.monthlyLeaves ?? 3,
        maxExtraHours: extraHoursVal,
      });

      // Populate schedule from emp.Schedule
      if (emp?.Schedule) {
        const scheduleList = Array.isArray(emp.Schedule) ? emp.Schedule : [emp.Schedule];
        const activeSched = scheduleList.find((s: any) => s && !s.deletedAt) || scheduleList[0];
        if (activeSched) {
          const defaultStart = activeSched.startTime || '09:00';
          const defaultEnd = activeSched.endTime || '18:00';

          let daysArr: string[] = [];
          const newDaySchedules: Record<string, { startTime: string; endTime: string }> = {};

          ALL_WEEK_DAYS.forEach((d) => {
            newDaySchedules[d] = {
              startTime: defaultStart,
              endTime: defaultEnd,
            };
          });

          if (Array.isArray(activeSched.days) && activeSched.days.length > 0) {
            const dayMap: Record<string, string> = {
              mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
              monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
            };

            activeSched.days.forEach((d: any) => {
              let rawName = "";
              let sTime = defaultStart;
              let eTime = defaultEnd;

              if (typeof d === "object" && d !== null) {
                rawName = d.dayFull || d.day || d.name || d.short || "";
                if (d.startTime) sTime = d.startTime;
                if (d.endTime) eTime = d.endTime;
              } else {
                rawName = String(d || "").trim();
              }

              const key = rawName.toLowerCase();
              const shortDay = dayMap[key] || rawName;

              if (shortDay && !daysArr.includes(shortDay)) {
                daysArr.push(shortDay);
                newDaySchedules[shortDay] = { startTime: sTime, endTime: eTime };
              }
            });
          } else {
            daysArr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          }

          const isHalfDayAllowed = Boolean(
            activeSched.allowHalfDay ?? activeSched.allow_half_day ?? activeSched.halfDayAllowed ?? activeSched.half_day_allowed ?? false
          );
          const halfDayMins = Number(
            activeSched.halfDayMinutes ?? activeSched.half_day_minutes ?? 240
          );

          const isOtAllowed = Boolean(activeSched.overtimeAllowed ?? activeSched.overtime_allowed ?? false);
          const otMins = Number(activeSched.overtimeMinutes ?? activeSched.overtime_minutes ?? 30);

          const breaksArr = Array.isArray(activeSched.breakDurations) ? activeSched.breakDurations : [];
          const hasBreaks = Boolean(activeSched.breaksAllowed || breaksArr.length > 0);

          setDaySchedules(newDaySchedules);

          setSchedule({
            id: activeSched.id,
            workingDays: daysArr,
            shiftStart: defaultStart,
            shiftEnd: defaultEnd,
            earlyInMargin: activeSched.earlyInMargin ?? activeSched.early_in_margin ?? 15,
            earlyOutMargin: activeSched.earlyOutMargin ?? activeSched.early_out_margin ?? 15,
            overtimeAllowed: isOtAllowed,
            overtimeMinutes: otMins,
            allowHalfDay: isHalfDayAllowed,
            halfDayMinutes: halfDayMins,
            numBreaks: hasBreaks ? (breaksArr.length || 1) : 0,
            breakMinutes: breaksArr[0] || 15,
          });
        }
      }
      
      if (emp.privileges) {
        setPrivileges(emp.privileges.map((p: any) => ({
          module: p.module,
          canCreate: p.canCreate || false,
          canRead: p.canRead ?? true,
          canUpdate: p.canUpdate || false,
          canDelete: p.canDelete || false,
          ownTeamOnly: p.ownTeamOnly || false,
        })));
      } else {
        setPrivileges([]);
      }

      setLoading(false);
    } catch (err) {
      toast.error('Failed to load employee details');
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [locRes, depRes, empRes, rolesRes] = await Promise.all([
          locationAPI.getLocations(),
          departmentAPI.getDepartments(),
          employeeAPI.getActiveEmployees ? employeeAPI.getActiveEmployees() : employeeAPI.getEmployees(),
          roleAPI.getRoles ? roleAPI.getRoles() : Promise.resolve({ data: [] }),
        ]);
        if (locRes?.data) setLocationsList(locRes.data);
        if (depRes?.data) setDepartmentsList(depRes.data);
        if (empRes?.data) setSupervisorsList(empRes.data);
        if (rolesRes?.data) setRolesList(rolesRes.data);
      } catch (err) {
        console.error("Metadata error:", err);
      }
    };

    fetchEmployee();
    fetchMetadata();

    const handleRealTimeSync = () => {
      fetchEmployee();
    };

    window.addEventListener('schedule-updated', handleRealTimeSync);
    window.addEventListener('employee-updated', handleRealTimeSync);
    window.addEventListener('focus', handleRealTimeSync);

    return () => {
      window.removeEventListener('schedule-updated', handleRealTimeSync);
      window.removeEventListener('employee-updated', handleRealTimeSync);
      window.removeEventListener('focus', handleRealTimeSync);
    };
  }, [id]);

    // Documents list (from API or mock)
    const [documents, setDocuments] = useState<any[]>([]);
 

  const handleAddIncrement = async () => {
    try {
      await employeeAPI.addIncrement(id, {
        type: incrementType,
        value: incrementValue,
        effectiveDate: incrementDate
      });
  
      toast.success("Increment applied");
      setShowIncrementModal(false);
      fetchEmployee();
    } catch {
      toast.error("Failed to apply increment");
    }
  };
  

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSavePersonal = async () => {
    try {
      await employeeAPI.updateEmployee(Number(id), {
        firstName: personal.firstName,
        lastName: personal.lastName,
        email: personal.email,
        phoneNumber: personal.phone,
        username: personal.username,
        employeeId: personal.employeeId,
        biometricId: personal.biometricId,
        roleId: personal.roleId && personal.roleId !== 'none' ? Number(personal.roleId) : null,
      });
      toast.success('Personal information updated');
      setEditPersonal(false);
      fetchEmployee();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update personal information');
    }
  };

  const handleSaveJob = async () => {
    try {
      const payload: any = {};
      if (job.locationId) payload.companyId = Number(job.locationId);
      if (job.departmentId) payload.departmentId = Number(job.departmentId);
      if (job.supervisorId) payload.supervisorId = Number(job.supervisorId);
      if (job.hiringDate) payload.hiringDate = job.hiringDate;
      if (job.employmentStatus) payload.employmentStatus = job.employmentStatus;
      if (job.workMode) payload.workMode = job.workMode;

      await employeeAPI.updateEmployee(Number(id), payload);
      toast.success('Job information updated');
      setEditJob(false);

      const res = await employeeAPI.getDetail(id!);
      if (res?.data) {
        setEmployee(res.data);
        setJob({
          locationId: res.data.companyId ? String(res.data.companyId) : '',
          location: res.data.company?.name || res.data.location?.name || '',
          departmentId: res.data.departmentId ? String(res.data.departmentId) : '',
          department: res.data.department?.title || '',
          supervisorId: res.data.supervisorId ? String(res.data.supervisorId) : '',
          supervisor: res.data.supervisor ? `${res.data.supervisor.firstName} ${res.data.supervisor.lastName}` : '',
          hiringDate: res.data.hiringDate ? res.data.hiringDate.split('T')[0] : (res.data.jobInfo?.hiringDate ? res.data.jobInfo.hiringDate.split('T')[0] : ''),
          employmentStatus: res.data.employmentStatus || res.data.jobInfo?.employmentStatus || 'Active',
          workMode: res.data.workMode || res.data.jobInfo?.workMode || 'On-site',
        });
      }
    } catch (err: any) {
      console.error("Save Job Error:", err);
      toast.error(err?.message || 'Failed to update job information');
    }
  };

  const handleSavePayroll = async () => {
    try {
      const extraHrs = Math.max(0, Number(payroll.maxExtraHours) || 0);
      await employeeAPI.updateEmployee(Number(id), {
        payroll: {
          currency: payroll.currency,
          payoutType: payroll.rateType,
          rate: Number(payroll.rate),
          overtimeRate: Number(payroll.overtimeRate),
          cycleDate: Number(payroll.cycleDate),
          annualLeaves: Number(payroll.annualLeaves),
          casualLeaves: Number(payroll.casualLeaves),
          suddenLeaves: Number(payroll.suddenLeaves),
          monthlyLeaves: Number(payroll.monthlyLeaves),
          maxExtraHours: extraHrs,
          allowExtraHours: extraHrs > 0,
        },
      });
      toast.success('Payroll information updated successfully');
      setIsEditingPayroll(false);
      window.dispatchEvent(new CustomEvent('employee-updated', { detail: { employeeId: id } }));
      window.dispatchEvent(new CustomEvent('schedule-updated', { detail: { employeeId: id } }));
      fetchEmployee();
    } catch (err: any) {
      console.error("Save Payroll Error:", err);
      toast.error(err?.message || 'Failed to update payroll information');
    }
  };

  const handleSaveSchedule = async () => {
    try {
      if (schedule.id) {
        const daysPayload = schedule.workingDays.map((dayName: string) => {
          const timeObj = daySchedules[dayName] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };
          const fullDayName = FULL_DAY_NAMES[dayName] || dayName;
          return {
            day: dayName,
            dayFull: fullDayName,
            startTime: timeObj.startTime,
            endTime: timeObj.endTime,
          };
        });

        const firstWorkingDayTime = schedule.workingDays.length > 0 && daySchedules[schedule.workingDays[0]]
          ? daySchedules[schedule.workingDays[0]]
          : { startTime: schedule.shiftStart, endTime: schedule.shiftEnd };

        await scheduleAPI.updateSchedule(schedule.id, {
          days: daysPayload,
          startTime: firstWorkingDayTime.startTime || schedule.shiftStart,
          endTime: firstWorkingDayTime.endTime || schedule.shiftEnd,
          allowEarlyIn: true,
          earlyInMinutes: schedule.earlyInMargin,
          allowEarlyOut: true,
          earlyOutMinutes: schedule.earlyOutMargin,
          overtimeAllowed: schedule.overtimeAllowed,
          overtimeMinutes: schedule.overtimeMinutes,
          allowHalfDay: schedule.allowHalfDay,
          halfDayMinutes: schedule.allowHalfDay ? schedule.halfDayMinutes : null,
          breaksAllowed: schedule.numBreaks > 0,
          breakDurations: schedule.numBreaks > 0 ? [schedule.breakMinutes] : [],
        });
      }
      toast.success('Schedule updated successfully');
      setIsEditingSchedule(false);
      window.dispatchEvent(new CustomEvent('schedule-updated', { detail: { scheduleId: schedule.id, employeeId: id } }));
      window.dispatchEvent(new CustomEvent('employee-updated', { detail: { employeeId: id } }));
      fetchEmployee();
    } catch (err) {
      toast.error('Failed to update schedule');
    }
  };

  const handleMarkSeparation = () => {
    if (!separationType || !separationDate) {
      toast.error('Please fill required fields');
      return;
    }
    setSeparation({
      type: separationType,
      reason: separationReason,
      comments: separationComments,
      date: separationDate,
      clearanceDate,
    });
    toast.success('Separation marked');
    setShowSeparationModal(false);
  };

  const handleUploadDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate API upload
      toast.success(`Document "${file.name}" uploaded`);
    }
  };

  const handleDeleteDocument = (docId: number) => {
    // API delete
    toast.success('Document deleted');
  };
  if (!employee) return <div className="p-8 text-center">Employee not found</div>;

  // ── Render ──────────────────────────────────────────────────────────────
  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  const roleName =
    rolesList.find((r: any) => String(r.id) === String(personal.roleId))?.name ||
    employee.appRole?.name ||
    (employee.role === "SUPERVISOR" ? "Supervisor" : employee.role === "ADMIN" ? "Admin" : "User");
  const fieldInput = "mt-1.5 h-10 rounded-lg text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20";
  const fieldLabel = "text-xs font-medium text-gray-600 dark:text-gray-400";
  const cardCls = "gap-0 shadow-sm border border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-950";
  const cardHeaderCls = "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800";
  const subCardCls = "rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-4";
  const subTitleCls = "text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2";
  const editBtnCls = "h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950";
  const cancelBtnCls = "h-9 px-3.5 text-xs font-semibold rounded-xl";
  const saveBtnCls = "h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white";
  const th = "h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

  // Read-only label/value pair used by every tab in view mode
  const ViewItem = ({ label, value, children, className = "" }: any) => (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
        {children ?? (value !== undefined && value !== null && value !== '' ? value : <span className="font-normal text-gray-400">—</span>)}
      </dd>
    </div>
  );
  const StatTile = ({ label, value, sub, accent = "" }: any) => (
    <div className={`rounded-xl border px-4 py-3 ${accent || "border-gray-200 dark:border-gray-800"}`}>
      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{value}</span>
      {sub && <span className="block text-[11px] text-gray-500 dark:text-gray-400">{sub}</span>}
    </div>
  );
  const statusPill = (raw: string) => {
    const s = String(raw || '').toUpperCase();
    const cls =
      s === "APPROVED" || s === "ACTIVE"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
        : s === "REJECTED" || s === "SEPARATED"
        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
        : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    const dot = s === "APPROVED" || s === "ACTIVE" ? "bg-emerald-500" : s === "REJECTED" || s === "SEPARATED" ? "bg-rose-500" : "bg-amber-500";
    return { cls, dot };
  };
  const empStatus = employee.employmentStatus || employee.jobInfo?.employmentStatus || job.employmentStatus || 'Active';
  const rateSuffix = payroll.rateType === 'hourly' ? '/ hr' : payroll.rateType === 'daily' ? '/ day' : '/ mo';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2">
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/employees" className="inline-flex items-center gap-1.5 hover:text-blue-600 font-medium transition-colors">
          <ArrowLeft className="size-4" />
          <span>Employees</span>
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">{fullName}</span>
      </div>

      {/* ── Profile Header ────────────────────────────────────────── */}
      <Card className={cardCls}>
        <CardContent className="p-5 sm:p-6 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-950 dark:to-gray-900">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <div className={`relative size-20 sm:size-24 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-gray-950 shadow-sm shrink-0 ${avatarColor(fullName)}`}>
              {employee.profileImage ? (
                <img src={API_URL + employee.profileImage} alt="Employee" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold tracking-wide">
                  {`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || 'E'}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{fullName}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusPill(empStatus === 'Active' ? 'ACTIVE' : empStatus === 'Separated' ? 'SEPARATED' : 'PENDING').cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusPill(empStatus === 'Active' ? 'ACTIVE' : empStatus === 'Separated' ? 'SEPARATED' : 'PENDING').dot}`} />
                  {empStatus}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {employee.designation || employee.jobInfo?.designation || 'Employee'}
                {job.department ? <span className="text-gray-400"> · {job.department}</span> : null}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(employee.employeeId || employee.id) && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-lg">
                    <span className="text-gray-400">ID</span>
                    <span className="font-semibold tabular-nums">{employee.employeeId || `#${employee.id}`}</span>
                  </span>
                )}
                {employee.biometricId && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 px-2.5 py-1 rounded-lg">
                    <span className="opacity-70">Bio ID</span>
                    <span className="font-semibold tabular-nums">{employee.biometricId}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-lg">
                  <Shield className="size-3.5 text-gray-400" />
                  {roleName}
                </span>
                {employee.hiringDate && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-lg">
                    <Briefcase className="size-3.5 text-gray-400" />
                    Hired {moment(employee.hiringDate).format('DD MMM YYYY')}
                  </span>
                )}
                {(employee?.company?.name || employee?.location?.name) && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-lg">
                    <MapPin className="size-3.5 text-gray-400" />
                    {employee?.company?.name || employee?.location?.name}
                  </span>
                )}
                {employee.email && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-lg max-w-full">
                    <Mail className="size-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="personal" className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto w-max gap-1 p-1 bg-gray-100/80 dark:bg-gray-900 rounded-xl">
            {[
              ["personal", "Personal", User],
              ["job", "Job", Briefcase],
              ["documents", "Documents", FileText],
              ["schedule", "Schedule", Clock],
              ["payroll", "Payroll", Banknote],
              ["approvals", "Approvals", Check],
              ["password-separation", "Password / Separation", Lock],
            ].map(([value, label, Icon]: any) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold gap-1.5 text-gray-600 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 data-[state=active]:shadow-sm transition-all"
              >
                <Icon className="size-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── PERSONAL ───────────────────────────────────────────── */}
        <TabsContent value="personal">
          <Card className={cardCls}>
            <CardHeader className={cardHeaderCls}>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Personal Information</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Contact details and identity information</p>
              </div>
              {editPersonal ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditPersonal(false)} className={cancelBtnCls}>Cancel</Button>
                  <Button size="sm" onClick={handleSavePersonal} className={saveBtnCls}><Save className="size-3.5" /> Save Changes</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditPersonal(true)} className={editBtnCls}>
                  <Edit className="size-3.5" /> Edit
                </Button>
              )}
            </CardHeader>

            {editPersonal ? (
              <CardContent className="p-5 sm:p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <Label className={fieldLabel}>First Name</Label>
                  <Input value={personal.firstName} onChange={e => setPersonal({ ...personal, firstName: e.target.value })} className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Last Name</Label>
                  <Input value={personal.lastName} onChange={e => setPersonal({ ...personal, lastName: e.target.value })} className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Email</Label>
                  <Input type="email" value={personal.email} onChange={e => setPersonal({ ...personal, email: e.target.value })} className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Phone</Label>
                  <Input value={personal.phone} onChange={e => setPersonal({ ...personal, phone: e.target.value })} className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Employee ID (Code)</Label>
                  <Input value={personal.employeeId} onChange={e => setPersonal({ ...personal, employeeId: e.target.value })} placeholder="e.g. 1919" className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Biometric ID (Device ID)</Label>
                  <Input value={personal.biometricId} onChange={e => setPersonal({ ...personal, biometricId: e.target.value })} placeholder="e.g. 1001" className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Username</Label>
                  <Input value={personal.username} onChange={e => setPersonal({ ...personal, username: e.target.value })} className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Role</Label>
                  <Select
                    value={personal.roleId || "none"}
                    onValueChange={(val) => setPersonal({ ...personal, roleId: val === "none" ? "" : val })}
                  >
                    <SelectTrigger className={`${fieldInput} w-full`}>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Role Assigned</SelectItem>
                      {rolesList.map((r: any) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-5 sm:p-6">
                <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                  <ViewItem label="First name" value={personal.firstName} />
                  <ViewItem label="Last name" value={personal.lastName} />
                  <ViewItem label="Email" value={personal.email} />
                  <ViewItem label="Phone" value={personal.phone} />
                  <ViewItem label="Employee ID" value={personal.employeeId} />
                  <ViewItem label="Biometric ID" value={personal.biometricId} />
                  <ViewItem label="Username" value={personal.username} />
                  <ViewItem label="Role" value={roleName} />
                </dl>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ── JOB ───────────────────────────────────────────── */}
        <TabsContent value="job">
          <Card className={cardCls}>
            <CardHeader className={cardHeaderCls}>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Job Information</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Location, department, supervisor and employment details</p>
              </div>
              {editJob ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditJob(false)} className={cancelBtnCls}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveJob} className={saveBtnCls}><Save className="size-3.5" /> Save Changes</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditJob(true)} className={editBtnCls}>
                  <Edit className="size-3.5" /> Edit
                </Button>
              )}
            </CardHeader>

            {editJob ? (
              <CardContent className="p-5 sm:p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <Label className={fieldLabel}>Location</Label>
                  <SearchableSelect
                    className="w-full mt-1.5 h-10 border-gray-300 dark:border-gray-700"
                    placeholder="Select Location"
                    searchPlaceholder="Search location..."
                    value={job.locationId}
                    onValueChange={(val) => {
                      const found = locationsList.find((l) => String(l.id) === String(val));
                      setJob({ ...job, locationId: val, location: found?.name || "" });
                    }}
                    options={locationsList.map((l) => ({ value: String(l.id), label: l.name }))}
                  />
                </div>
                <div>
                  <Label className={fieldLabel}>Department</Label>
                  <SearchableSelect
                    className="w-full mt-1.5 h-10 border-gray-300 dark:border-gray-700"
                    placeholder="Select Department"
                    searchPlaceholder="Search department..."
                    value={job.departmentId}
                    onValueChange={(val) => {
                      const found = departmentsList.find((d) => String(d.id) === String(val));
                      setJob({ ...job, departmentId: val, department: found?.title || "" });
                    }}
                    options={departmentsList.map((d) => ({ value: String(d.id), label: d.title }))}
                  />
                </div>
                <div>
                  <Label className={fieldLabel}>Supervisor</Label>
                  <SearchableSelect
                    className="w-full mt-1.5 h-10 border-gray-300 dark:border-gray-700"
                    placeholder="Select Supervisor"
                    searchPlaceholder="Search supervisor..."
                    value={job.supervisorId}
                    onValueChange={(val) => {
                      const found = supervisorsList.find((s) => String(s.id) === String(val));
                      setJob({ ...job, supervisorId: val, supervisor: found ? `${found.firstName} ${found.lastName}` : "" });
                    }}
                    options={supervisorsList.map((s) => ({ value: String(s.id), label: `${s.firstName} ${s.lastName || ""}`.trim() }))}
                  />
                </div>
                <div>
                  <Label className={fieldLabel}>Hiring Date</Label>
                  <Input type="date" value={job.hiringDate} onChange={e => setJob({ ...job, hiringDate: e.target.value })} className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Employment Status</Label>
                  <Select value={job.employmentStatus} onValueChange={v => setJob({ ...job, employmentStatus: v })}>
                    <SelectTrigger className={`${fieldInput} w-full`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Separated">Separated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={fieldLabel}>Work Mode</Label>
                  <Select value={job.workMode} onValueChange={v => setJob({ ...job, workMode: v })}>
                    <SelectTrigger className={`${fieldInput} w-full`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="On-site">On-site</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-5 sm:p-6">
                <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                  <ViewItem label="Location" value={job.location} />
                  <ViewItem label="Department" value={job.department} />
                  <ViewItem label="Supervisor" value={job.supervisor} />
                  <ViewItem label="Hiring date" value={job.hiringDate ? moment(job.hiringDate).format('DD MMM YYYY') : ''} />
                  <ViewItem label="Employment status">
                    {job.employmentStatus ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusPill(job.employmentStatus === 'Active' ? 'ACTIVE' : job.employmentStatus === 'Separated' ? 'SEPARATED' : 'PENDING').cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusPill(job.employmentStatus === 'Active' ? 'ACTIVE' : job.employmentStatus === 'Separated' ? 'SEPARATED' : 'PENDING').dot}`} />
                        {job.employmentStatus}
                      </span>
                    ) : undefined}
                  </ViewItem>
                  <ViewItem label="Work mode" value={job.workMode} />
                </dl>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ── DOCUMENTS ──────────────────────────────────────────── */}
        <TabsContent value="documents">
          <Card className={cardCls}>
            <CardHeader className={cardHeaderCls}>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Documents</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">CNIC, contracts, degrees and other files</p>
              </div>
              <Dialog open={showUploadDocModal} onOpenChange={setShowUploadDocModal}>
                <DialogTrigger asChild>
                  <Button size="sm" className={saveBtnCls}>
                    <Upload className="size-3.5" /> Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[92vw] sm:max-w-[440px] rounded-2xl p-6 shadow-2xl">
                  <DialogHeader className="text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Upload document</DialogTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Choose the document type and file</p>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label className={fieldLabel}>Document Type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className={`${fieldInput} w-full`}><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {documentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className={fieldLabel}>File</Label>
                      <Input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} className={fieldInput} />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="h-10 rounded-lg" onClick={() => setShowUploadDocModal(false)}>Cancel</Button>
                    <Button className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={handleUploadDocument}>Upload</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-50/80">
                      <TableHead className={`${th} pl-4`}>Type</TableHead>
                      <TableHead className={th}>File</TableHead>
                      <TableHead className={th}>Uploaded</TableHead>
                      <TableHead className={`${th} text-right pr-4`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-900/40">
                        <TableCell className="py-3 pl-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{doc.type}</span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-gray-800 dark:text-gray-200">
                          <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5 text-gray-400" />{doc.fileName || doc.url?.split('/').pop()}</span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-400 tabular-nums">{moment(doc.uploadedAt).format('DD MMM YYYY')}</TableCell>
                        <TableCell className="py-3 pr-4">
                          <div className="flex gap-1.5 justify-end">
                            <Button variant="outline" size="icon" className="size-8 rounded-lg border-gray-200 dark:border-gray-800">
                              <Eye className="size-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" className="size-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900" onClick={() => handleDeleteDocument(doc.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {documents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-14 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            <span className="text-sm font-medium">No documents uploaded yet</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SCHEDULE ───────────────────────────────────────────── */}
        <TabsContent value="schedule">
          <Card className={cardCls}>
            <CardHeader className={cardHeaderCls}>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Schedule & Shift Configuration</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Working days, shift hours, grace periods, overtime and breaks</p>
              </div>
              {isEditingSchedule ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingSchedule(false)} className={cancelBtnCls}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveSchedule} className={saveBtnCls}><Save className="size-3.5" /> Save Schedule</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingSchedule(true)} className={editBtnCls}>
                  <Edit className="size-3.5" /> Edit Schedule
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              {!isEditingSchedule ? (
                <>
                  {/* View: weekly table */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <span className={subTitleCls}><Clock className="w-4 h-4 text-blue-600" /> Weekly shift pattern</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{schedule.workingDays.length}</span> working · {7 - schedule.workingDays.length} off
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-50/80">
                          <TableHead className={`${th} pl-4`}>Day</TableHead>
                          <TableHead className={th}>Status</TableHead>
                          <TableHead className={th}>Start</TableHead>
                          <TableHead className={th}>End</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ALL_WEEK_DAYS.map((dayKey) => {
                          const isWorking = schedule.workingDays.includes(dayKey);
                          const dayTime = daySchedules[dayKey] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };
                          return (
                            <TableRow key={dayKey} className={isWorking ? "" : "bg-gray-50/50 dark:bg-gray-900/30"}>
                              <TableCell className="py-2.5 pl-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{FULL_DAY_NAMES[dayKey] || dayKey}</TableCell>
                              <TableCell className="py-2.5">
                                {isWorking ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Working
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Off day
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-2.5 text-sm tabular-nums text-gray-800 dark:text-gray-200">{isWorking ? to12h(dayTime.startTime) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="py-2.5 text-sm tabular-nums text-gray-800 dark:text-gray-200">{isWorking ? to12h(dayTime.endTime) : <span className="text-gray-300">—</span>}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* View: policy tiles */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatTile label="Early in margin" value={`${schedule.earlyInMargin || 0} min`} />
                    <StatTile label="Early out margin" value={`${schedule.earlyOutMargin || 0} min`} />
                    <StatTile
                      label="Half day"
                      value={schedule.allowHalfDay ? "Allowed" : "Disabled"}
                      sub={schedule.allowHalfDay ? `${Math.floor(schedule.halfDayMinutes / 60)}h ${schedule.halfDayMinutes % 60}m threshold` : undefined}
                    />
                    <StatTile
                      label="Overtime"
                      value={schedule.overtimeAllowed ? "Allowed" : "Disabled"}
                      sub={schedule.overtimeAllowed ? `Max ${schedule.overtimeMinutes} min (${(schedule.overtimeMinutes / 60).toFixed(1)} h)` : undefined}
                      accent={schedule.overtimeAllowed ? "border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30" : ""}
                    />
                    <StatTile label="Breaks" value={schedule.numBreaks || 0} sub={`${schedule.breakMinutes || 0} min each`} />
                  </div>
                </>
              ) : (
                <>
                  {/* Edit: per-day editor */}
                  <div className={subCardCls}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                      <div>
                        <span className={subTitleCls}><Clock className="w-4 h-4 text-blue-600" /> Daily shift timings</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Check working days and set start and end times for each day.</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-semibold">
                        {schedule.workingDays.length} working / {7 - schedule.workingDays.length} off
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 mr-1">Quick presets:</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }))} className="text-xs h-8 rounded-lg">Mon – Fri</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }))} className="text-xs h-8 rounded-lg">Mon – Sat</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ALL_WEEK_DAYS }))} className="text-xs h-8 rounded-lg">All days</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: [] }))} className="text-xs h-8 rounded-lg text-red-600 border-red-200 hover:bg-red-50">Clear</Button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      {ALL_WEEK_DAYS.map((dayKey) => {
                        const isWorking = schedule.workingDays.includes(dayKey);
                        const dayName = FULL_DAY_NAMES[dayKey] || dayKey;
                        const dayTime = daySchedules[dayKey] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };
                        return (
                          <div key={dayKey} className={`grid grid-cols-1 sm:grid-cols-[180px_1fr_1fr_auto] items-center gap-3 px-4 py-3 ${isWorking ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/60 dark:bg-gray-900/40'}`}>
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isWorking} onCheckedChange={() => toggleWorkingDay(dayKey)} id={`day-check-${dayKey}`} />
                              <Label htmlFor={`day-check-${dayKey}`} className="font-semibold text-sm text-gray-900 dark:text-gray-100 cursor-pointer">{dayName}</Label>
                            </div>
                            {isWorking ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-10 shrink-0">Start</span>
                                  <Input type="time" value={dayTime.startTime} onChange={(e) => handleUpdateDayTime(dayKey, 'startTime', e.target.value)} className="h-9 rounded-lg text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-10 shrink-0">End</span>
                                  <Input type="time" value={dayTime.endTime} onChange={(e) => handleUpdateDayTime(dayKey, 'endTime', e.target.value)} className="h-9 rounded-lg text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleApplyTimeAllDays(dayKey)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline justify-self-start sm:justify-self-end"
                                  title="Copy this timing to all days"
                                >
                                  Apply to all
                                </button>
                              </>
                            ) : (
                              <span className="sm:col-span-3 text-xs text-gray-400 italic">Off day — no shift timing</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edit: margins */}
                  <div className={subCardCls}>
                    <span className={subTitleCls}><Shield className="w-4 h-4 text-blue-600" /> Punctuality & grace margins</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className={fieldLabel}>Early in margin (minutes)</Label>
                        <Input type="number" min={0} value={schedule.earlyInMargin} onChange={(e) => setSchedule({ ...schedule, earlyInMargin: Number(e.target.value) })} className={fieldInput} />
                        <p className="text-[11px] text-gray-400 mt-1">Buffer allowed before shift start time for early check-in.</p>
                      </div>
                      <div>
                        <Label className={fieldLabel}>Early out margin (minutes)</Label>
                        <Input type="number" min={0} value={schedule.earlyOutMargin} onChange={(e) => setSchedule({ ...schedule, earlyOutMargin: Number(e.target.value) })} className={fieldInput} />
                        <p className="text-[11px] text-gray-400 mt-1">Buffer allowed before shift end time without marking early departure.</p>
                      </div>
                    </div>
                  </div>

                  {/* Edit: half day & overtime */}
                  <div className={subCardCls}>
                    <span className={subTitleCls}><AlertCircle className="w-4 h-4 text-amber-600" /> Half-day & overtime rules</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Half day allowed</Label>
                          <Switch checked={schedule.allowHalfDay} onCheckedChange={(val) => setSchedule({ ...schedule, allowHalfDay: val })} />
                        </div>
                        {schedule.allowHalfDay && (
                          <div>
                            <Label className={fieldLabel}>Half day threshold (minutes)</Label>
                            <Input type="number" min={0} value={schedule.halfDayMinutes} onChange={(e) => setSchedule({ ...schedule, halfDayMinutes: Number(e.target.value) })} className={fieldInput} />
                            <p className="text-[11px] text-gray-500 mt-1 tabular-nums">{Math.floor(schedule.halfDayMinutes / 60)}h {schedule.halfDayMinutes % 60}m shift threshold required</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Overtime allowed</Label>
                          <Switch checked={schedule.overtimeAllowed} onCheckedChange={(val) => setSchedule({ ...schedule, overtimeAllowed: val })} />
                        </div>
                        {schedule.overtimeAllowed && (
                          <div>
                            <Label className={fieldLabel}>Overtime allowed (minutes)</Label>
                            <Input type="number" min={0} value={schedule.overtimeMinutes} onChange={(e) => setSchedule({ ...schedule, overtimeMinutes: Number(e.target.value) })} className={fieldInput} />
                            <p className="text-[11px] text-gray-500 mt-1 tabular-nums">Max {schedule.overtimeMinutes} mins ({(schedule.overtimeMinutes / 60).toFixed(1)} hrs) extra time allowed</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit: breaks */}
                  <div className={subCardCls}>
                    <span className={subTitleCls}><Clock className="w-4 h-4 text-emerald-600" /> Breaks policy</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className={fieldLabel}>Number of breaks</Label>
                        <Input type="number" min={0} value={schedule.numBreaks} onChange={(e) => setSchedule({ ...schedule, numBreaks: Number(e.target.value) })} className={fieldInput} />
                      </div>
                      <div>
                        <Label className={fieldLabel}>Break duration (minutes per break)</Label>
                        <Input type="number" min={0} value={schedule.breakMinutes} onChange={(e) => setSchedule({ ...schedule, breakMinutes: Number(e.target.value) })} className={fieldInput} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PAYROLL ────────────────────────────────────────────── */}
        <TabsContent value="payroll">
          <Card className={cardCls}>
            <CardHeader className={cardHeaderCls}>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Payroll Information</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Compensation rate, payout frequency, overtime and leave allocations</p>
              </div>
              {isEditingPayroll ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingPayroll(false)} className={cancelBtnCls}>Cancel</Button>
                  <Button size="sm" onClick={handleSavePayroll} className={saveBtnCls}><Save className="size-3.5" /> Save Changes</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowIncrementModal(true)}
                    className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                  >
                    <Plus className="size-3.5" /> Add Increment
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingPayroll(true)} className={editBtnCls}>
                    <Edit className="size-3.5" /> Edit Payroll
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              {!isEditingPayroll ? (
                <>
                  <div>
                    <span className={`${subTitleCls} mb-3`}><Coins className="w-4 h-4 text-blue-600" /> Compensation & pay structure</span>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                      <StatTile
                        label={payroll.rateType === 'hourly' ? 'Hourly rate' : payroll.rateType === 'daily' ? 'Daily rate' : 'Monthly salary'}
                        value={`${payroll.currency} ${Number(payroll.rate || 0).toLocaleString()}`}
                        sub={`${rateSuffix} · ${payroll.rateType} payout`}
                        accent="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30"
                      />
                      <StatTile label="Overtime rate" value={`${payroll.currency} ${Number(payroll.overtimeRate || 0).toLocaleString()}`} sub="/ hr" />
                      <StatTile label="Pay cycle date" value={`Day ${payroll.cycleDate || 1}`} sub="of every month" />
                      <StatTile label="Currency" value={payroll.currency} />
                      <StatTile label="Rate type" value={<span className="capitalize">{payroll.rateType}</span>} />
                      <StatTile
                        label="Max extra time"
                        value={Number(payroll.maxExtraHours) > 0 ? `${payroll.maxExtraHours} h` : 'None'}
                        sub={Number(payroll.maxExtraHours) > 0 ? `${Number(payroll.maxExtraHours) * 60} min per shift` : undefined}
                      />
                    </div>
                  </div>
                  <div>
                    <span className={subTitleCls}><Calendar className="w-4 h-4 text-indigo-600" /> Leave quota allocations</span>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                      <StatTile label="Annual" value={`${payroll.annualLeaves || 0} days`} />
                      <StatTile label="Casual" value={`${payroll.casualLeaves || 0} days`} />
                      <StatTile label="Sudden" value={`${payroll.suddenLeaves || 0} days`} />
                      <StatTile label="Monthly" value={`${payroll.monthlyLeaves || 0} days`} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={subCardCls}>
                    <span className={subTitleCls}><Coins className="w-4 h-4 text-blue-600" /> Compensation & pay structure</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className={fieldLabel}>Currency</Label>
                        <Select value={payroll.currency} onValueChange={(v) => setPayroll({ ...payroll, currency: v })}>
                          <SelectTrigger className={`${fieldInput} w-full`}><SelectValue placeholder="Select Currency" /></SelectTrigger>
                          <SelectContent>
                            {['PKR', 'USD', 'EUR', 'GBP'].map((curr) => (
                              <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className={fieldLabel}>Rate type</Label>
                        <div className="mt-1.5 grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg h-10 items-center">
                          {(['hourly', 'daily', 'monthly'] as const).map((type) => {
                            const isSelected = payroll.rateType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setPayroll({ ...payroll, rateType: type })}
                                className={`h-8 rounded-md text-xs font-semibold capitalize transition-all ${
                                  isSelected ? 'bg-white dark:bg-gray-950 text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                {type}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <Label className={fieldLabel}>
                          {payroll.rateType === 'hourly' ? 'Salary hourly rate' : payroll.rateType === 'daily' ? 'Salary daily rate' : 'Salary monthly rate'}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs font-semibold text-gray-500 select-none">{payroll.currency}</span>
                          <Input type="number" min={0} value={payroll.rate} onChange={(e) => setPayroll({ ...payroll, rate: Number(e.target.value) })} placeholder="0" className={`${fieldInput} pl-12 pr-14`} />
                          <span className="absolute right-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs text-gray-400 select-none">{rateSuffix}</span>
                        </div>
                      </div>
                      <div>
                        <Label className={fieldLabel}>Overtime rate</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs font-semibold text-gray-500 select-none">{payroll.currency}</span>
                          <Input type="number" min={0} value={payroll.overtimeRate} onChange={(e) => setPayroll({ ...payroll, overtimeRate: Number(e.target.value) })} placeholder="0" className={`${fieldInput} pl-12 pr-12`} />
                          <span className="absolute right-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs text-gray-400 select-none">/ hr</span>
                        </div>
                      </div>
                      <div>
                        <Label className={fieldLabel}>Pay cycle date</Label>
                        <div className="relative">
                          <Input type="number" min={1} max={31} value={payroll.cycleDate} onChange={(e) => setPayroll({ ...payroll, cycleDate: Number(e.target.value) })} placeholder="1" className={`${fieldInput} pr-24`} />
                          <span className="absolute right-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs text-gray-400 select-none">day of month</span>
                        </div>
                      </div>
                      <div>
                        <Label className={fieldLabel}>Max extra time allowed</Label>
                        <div className="relative">
                          <Input type="number" min={0} value={payroll.maxExtraHours ?? 0} onChange={(e) => setPayroll({ ...payroll, maxExtraHours: Number(e.target.value) })} placeholder="2" className={`${fieldInput} pr-20`} />
                          <span className="absolute right-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs text-gray-400 select-none">hrs / shift</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={subCardCls}>
                    <span className={subTitleCls}><Calendar className="w-4 h-4 text-indigo-600" /> Leave quota allocations</span>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        ["Annual leaves", "annualLeaves"],
                        ["Casual leaves", "casualLeaves"],
                        ["Sudden leaves", "suddenLeaves"],
                        ["Monthly leaves", "monthlyLeaves"],
                      ].map(([label, key]) => (
                        <div key={key}>
                          <Label className={fieldLabel}>{label}</Label>
                          <div className="relative">
                            <Input type="number" min={0} value={payroll[key]} onChange={(e) => setPayroll({ ...payroll, [key]: Number(e.target.value) })} className={`${fieldInput} pr-12`} />
                            <span className="absolute right-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs text-gray-400 select-none">days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Increment Modal */}
          <Dialog open={showIncrementModal} onOpenChange={setShowIncrementModal}>
            <DialogContent className="w-[92vw] sm:max-w-[440px] rounded-2xl p-6 shadow-2xl">
              <DialogHeader className="text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Add salary increment</DialogTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Raise by a percentage or a fixed amount</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className={fieldLabel}>Increment type</Label>
                  <Select value={incrementType} onValueChange={(v) => setIncrementType(v as any)}>
                    <SelectTrigger className={`${fieldInput} w-full`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed Amount ({payroll.currency})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={fieldLabel}>
                    {incrementType === 'percentage' ? 'Percentage value (%)' : `Amount value (${payroll.currency})`}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder={incrementType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
                    value={incrementValue || ''}
                    onChange={(e) => setIncrementValue(Number(e.target.value))}
                    className={fieldInput}
                  />
                </div>
                <div>
                  <Label className={fieldLabel}>Effective date</Label>
                  <Input type="date" value={incrementDate} onChange={(e) => setIncrementDate(e.target.value)} className={fieldInput} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowIncrementModal(false)} className="h-10 rounded-lg">Cancel</Button>
                <Button onClick={handleAddIncrement} className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Apply Increment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── APPROVALS ──────────────────────────────────────────── */}
        <TabsContent value="approvals">
          <Card className={cardCls}>
            <CardHeader className={cardHeaderCls}>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Leave & Approval Requests</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Leave and overtime requests of this employee</p>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-50/80">
                      <TableHead className={`${th} pl-4`}>Request</TableHead>
                      <TableHead className={th}>Apply Date</TableHead>
                      <TableHead className={th}>Duration</TableHead>
                      <TableHead className={th}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const leaves = (employee?.leaveRequests || []).map((l: any) => ({
                        id: `leave-${l.id}`,
                        applyDate: l.createdAt ? moment(l.createdAt).format("YYYY-MM-DD") : (l.startDate ? moment(l.startDate).format("YYYY-MM-DD") : "N/A"),
                        duration: `${l.days || 1} day${(l.days || 1) > 1 ? "s" : ""}`,
                        policy: l.leaveType?.name || "Leave Request",
                        isOvertime: false,
                        status: l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1).toLowerCase() : "Pending",
                        rawStatus: l.status?.toUpperCase() || "PENDING",
                      }));

                      const otRequests = (employee?.overtimes || []).map((o: any) => {
                        const mins = o.minutes || (o.hours ? Math.round(o.hours * 60) : 0);
                        const hrs = Math.floor(mins / 60);
                        const m = mins % 60;
                        return {
                          id: `ot-${o.id}`,
                          applyDate: o.createdAt ? moment(o.createdAt).format("YYYY-MM-DD") : (o.date ? moment(o.date).format("YYYY-MM-DD") : "N/A"),
                          duration: hrs > 0 ? `${hrs}h ${m}m` : `${mins} mins`,
                          policy: "Overtime Request",
                          isOvertime: true,
                          status: o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase() : "Pending",
                          rawStatus: o.status?.toUpperCase() || "PENDING",
                        };
                      });

                      const realApprovals = [...leaves, ...otRequests].sort(
                        (a, b) => new Date(b.applyDate).getTime() - new Date(a.applyDate).getTime()
                      );

                      if (realApprovals.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="py-14 text-center">
                              <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Check className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                <span className="text-sm font-medium">No leave or overtime requests for this employee</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return realApprovals.map((req) => {
                        const pill = statusPill(req.rawStatus);
                        return (
                          <TableRow key={req.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-900/40">
                            <TableCell className="py-3 pl-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${req.isOvertime ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'}`}>
                                {req.policy}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 text-sm tabular-nums text-gray-700 dark:text-gray-300">{req.applyDate}</TableCell>
                            <TableCell className="py-3 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{req.duration}</TableCell>
                            <TableCell className="py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${pill.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
                                {req.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PASSWORD / SEPARATION ──────────────────────────────── */}
        <TabsContent value="password-separation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cardCls}>
              <CardHeader className={cardHeaderCls}>
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Change Password</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Set a new login password for this employee</p>
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div>
                  <Label className={fieldLabel}>New Password</Label>
                  <Input type="password" placeholder="••••••••" className={fieldInput} />
                </div>
                <div>
                  <Label className={fieldLabel}>Confirm Password</Label>
                  <Input type="password" placeholder="••••••••" className={fieldInput} />
                </div>
                <Button className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5">
                  <Lock className="size-4" /> Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className={cardCls}>
              <CardHeader className={cardHeaderCls}>
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Separation</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Resignation, termination or end of contract</p>
                </div>
                {!separation ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSeparationModal(true)}
                    className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <UserX className="size-3.5" /> Mark Separation
                  </Button>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusPill('SEPARATED').cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusPill('SEPARATED').dot}`} /> Separated
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                {separation ? (
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                    <ViewItem label="Type" value={separation.type} />
                    <ViewItem label="Reason" value={separation.reason} />
                    <ViewItem label="Date" value={separation.date} />
                    <ViewItem label="Clearance date" value={separation.clearanceDate || 'N/A'} />
                    <ViewItem label="Comments" value={separation.comments || 'None'} className="sm:col-span-2" />
                  </dl>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-4 py-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">Employee is currently active.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Separation Modal */}
          <Dialog open={showSeparationModal} onOpenChange={setShowSeparationModal}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-left">
                <div className="flex items-start gap-3 pr-6">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center shrink-0">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Mark employee separation</DialogTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{fullName}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={fieldLabel}>Separation type *</Label>
                    <Select value={separationType} onValueChange={setSeparationType}>
                      <SelectTrigger className={`${fieldInput} w-full`}><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {separationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={fieldLabel}>Reason *</Label>
                    <Select value={separationReason} onValueChange={setSeparationReason}>
                      <SelectTrigger className={`${fieldInput} w-full`}><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        {separationReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={fieldLabel}>Separation date *</Label>
                    <Input type="date" value={separationDate} onChange={(e) => setSeparationDate(e.target.value)} className={fieldInput} />
                  </div>
                  <div>
                    <Label className={fieldLabel}>Clearance date</Label>
                    <Input type="date" value={clearanceDate} onChange={(e) => setClearanceDate(e.target.value)} className={fieldInput} />
                  </div>
                </div>
                <div>
                  <Label className={fieldLabel}>Comments</Label>
                  <Textarea rows={3} value={separationComments} onChange={(e) => setSeparationComments(e.target.value)} className="mt-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xs focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20" />
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 gap-2">
                <Button variant="outline" className="h-10 rounded-lg" onClick={() => setShowSeparationModal(false)}>Cancel</Button>
                <Button variant="destructive" className="h-10 px-5 rounded-lg font-semibold" onClick={handleMarkSeparation}>Confirm Separation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};
