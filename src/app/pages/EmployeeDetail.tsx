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
import { Edit, Save, Plus, Trash2, Eye, Lock, Calendar, FileText, Briefcase, Clock, UserX, User, MapPin, Upload, ArrowLeft, Mail, Phone, Building2, Check, Shield, AlertCircle, Loader2, Banknote, Coins, RotateCcw, History, CreditCard, CheckSquare, ArrowRightLeft, ArrowRight, TrendingUp, ShieldCheck, UserCheck, Filter, Sparkles } from 'lucide-react';
import { useParams, Link } from 'react-router';
import { API_URL, employeeAPI, scheduleAPI, locationAPI, departmentAPI, roleAPI, entityAPI } from '../services/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import moment from 'moment';

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

const formatTimeTo12h = (timeStr?: string) => {
  if (!timeStr) return '—';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const mins = parts[1].padStart(2, '0');
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
  }
  return timeStr;
};

const documentTypes = ['CNIC', 'Contract', 'Degree', 'Experience Letter', 'Other'];
const separationTypes = ['Resignation', 'Termination', 'End of Contract', 'Retirement', 'Redundancy', 'Other'];
const separationReasons = ['Better Opportunity', 'Personal Reasons', 'Performance', 'Misconduct', 'Relocation', 'Mutual Agreement', 'Other'];
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





export interface EmployeeAuditLog {
  id: string;
  type: 'TRANSFER' | 'ENTITY_TRANSFER' | 'LOCATION' | 'SUPERVISOR' | 'ROLE' | 'STATUS' | 'SCHEDULE' | 'PAYROLL' | 'INCREMENT' | 'SEPARATION' | 'NOTE' | 'ONBOARDING' | 'SYSTEM';
  category: 'Transfers' | 'Job & Role' | 'Schedule' | 'Payroll' | 'System';
  title: string;
  fromValue?: string;
  toValue?: string;
  description: string;
  date: string;
  actor?: string;
}

const getStoredAuditLogs = (empId: string | number): EmployeeAuditLog[] => {
  try {
    const raw = localStorage.getItem(`frontpin_audit_logs_${empId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read audit logs:", e);
  }
  return [];
};

const saveAuditLogs = (empId: string | number, logs: EmployeeAuditLog[]) => {
  try {
    localStorage.setItem(`frontpin_audit_logs_${empId}`, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save audit logs:", e);
  }
};

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

  // History & Audit Log states
  const [auditLogs, setAuditLogs] = useState<EmployeeAuditLog[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [manualLogType, setManualLogType] = useState<string>('TRANSFER');
  const [manualLogFrom, setManualLogFrom] = useState<string>('');
  const [manualLogTo, setManualLogTo] = useState<string>('');
  const [manualLogNote, setManualLogNote] = useState<string>('');

  const appendAuditLog = (entry: Omit<EmployeeAuditLog, 'id' | 'date'> & { date?: string }) => {
    const newEntry: EmployeeAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: entry.date || new Date().toISOString(),
      ...entry,
    };
    setAuditLogs((prev) => {
      const next = [newEntry, ...prev];
      if (id) saveAuditLogs(id, next);
      return next;
    });
  };

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
  const [entitiesList, setEntitiesList] = useState<any[]>([]);

  const [job, setJob] = useState({
    entityId: '',
    entity: '',
    locationId: '',
    location: '',
    departmentId: '',
    department: '',
    supervisorId: '',
    supervisor: '',
    hiringDate: '',
    employmentStatus: 'Permanent',
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
    toast.success(`Applied ${FULL_DAY_NAMES[sourceDay] || sourceDay} timing (${source.startTime} - ${source.endTime}) to all days`);
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
        entityId: emp.entityId ? String(emp.entityId) : (emp.entity?.id ? String(emp.entity.id) : ''),
        entity: emp.entity?.name || emp.company?.name || emp.entity || '',
        locationId: emp.companyId ? String(emp.companyId) : (emp.company?.id ? String(emp.company.id) : ''),
        location: emp.company?.name || emp.location?.name || '',
        departmentId: emp.departmentId ? String(emp.departmentId) : (emp.department?.id ? String(emp.department.id) : ''),
        department: emp.department?.title || '',
        supervisorId: emp.supervisorId ? String(emp.supervisorId) : (emp.supervisor?.id ? String(emp.supervisor.id) : ''),
        supervisor: emp.supervisor
          ? `${emp.supervisor.firstName} ${emp.supervisor.lastName}`
          : '',
        hiringDate: emp.hiringDate ? emp.hiringDate.split('T')[0] : (emp.jobInfo?.hiringDate ? emp.jobInfo.hiringDate.split('T')[0] : ''),
        employmentStatus: emp.employmentStatus || emp.jobInfo?.employmentStatus || 'Permanent',
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

      // Check separation status
      const savedSep = localStorage.getItem(`emp_separation_${emp.id || id}`);
      if (savedSep) {
        try {
          const parsed = JSON.parse(savedSep);
          setSeparation(parsed);
          setSeparationType(parsed.type || '');
          setSeparationReason(parsed.reason || '');
          setSeparationDate(parsed.date || '');
          setClearanceDate(parsed.clearanceDate || '');
          setSeparationComments(parsed.comments || '');
        } catch (e) {
          setSeparation({
            type: 'Separation',
            reason: 'Offboarded',
            date: emp.jobInfo?.updatedAt ? emp.jobInfo.updatedAt.split('T')[0] : 'Recorded',
            comments: '',
          });
        }
      } else if (emp.jobInfo?.employmentStatus === 'Separated' || emp.employmentStatus === 'Separated' || emp.canLogin === false) {
        const fallbackSep = {
          type: 'Separation',
          reason: 'Offboarded',
          date: emp.updatedAt ? emp.updatedAt.split('T')[0] : (emp.jobInfo?.updatedAt ? emp.jobInfo.updatedAt.split('T')[0] : 'Recorded'),
          clearanceDate: '',
          comments: 'Employee account marked as separated in system.',
        };
        setSeparation(fallbackSep);
      } else {
        setSeparation(null);
      }

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

      // Load or initialize audit logs
      // Load or initialize audit logs
      let currentLogs = getStoredAuditLogs(emp.id || id!);
      const initialLogs: EmployeeAuditLog[] = [];

      // If employee has increments from DB, seed them
      if (emp.increments && Array.isArray(emp.increments)) {
        emp.increments.forEach((inc: any) => {
          initialLogs.push({
            id: `inc_${inc.id}`,
            type: 'INCREMENT',
            category: 'Payroll',
            title: `Salary Increment Applied (${inc.type === 'PERCENTAGE' || inc.type === 'percentage' ? `${inc.value}%` : `${Number(inc.value).toLocaleString()} PKR`})`,
            fromValue: inc.previousSalary ? `${Number(inc.previousSalary).toLocaleString()} PKR` : undefined,
            toValue: inc.type === 'PERCENTAGE' || inc.type === 'percentage' ? `+${inc.value}%` : `+${Number(inc.value).toLocaleString()} PKR`,
            description: `Salary increment recorded in payroll system. Effective date: ${inc.effectiveDate ? moment(inc.effectiveDate).format('DD MMM YYYY') : 'Applied'}.`,
            date: inc.effectiveDate || inc.createdAt || new Date().toISOString(),
            actor: 'Finance Dept',
          });
        });
      }

      // Job & Department placement milestone
      if (emp.department?.title || emp.company?.name) {
        initialLogs.push({
          id: `init_dept_${emp.id}`,
          type: 'TRANSFER',
          category: 'Transfers',
          title: `Assigned to ${emp.department?.title || 'General'} Department`,
          fromValue: 'Onboarding',
          toValue: emp.department?.title || 'General',
          description: `Employee placed in ${emp.department?.title || 'General'} department at ${emp.company?.name || emp.location?.name || 'Johar Town Lahore'}. Employment status: ${emp.employmentStatus || emp.jobInfo?.employmentStatus || 'Permanent'}.`,
          date: emp.jobInfo?.hiringDate || emp.hiringDate || emp.createdAt || new Date().toISOString(),
          actor: 'HR Admin',
        });
      }

      // Location assignment milestone
      if (emp.company?.name || emp.location?.name) {
        initialLogs.push({
          id: `init_loc_${emp.id}`,
          type: 'LOCATION',
          category: 'Transfers',
          title: `Branch Assignment: ${emp.company?.name || emp.location?.name || 'Johar Town Branch'}`,
          fromValue: 'Initial Placement',
          toValue: emp.company?.name || emp.location?.name || 'Johar Town Branch',
          description: `Stationed at ${emp.company?.name || emp.location?.name || 'Johar Town Branch'} with work mode: ${emp.workMode || emp.jobInfo?.workMode || 'On-site'}.`,
          date: emp.jobInfo?.hiringDate || emp.hiringDate || emp.createdAt || new Date().toISOString(),
          actor: 'HR Admin',
        });
      }

      // Schedule milestones & update logs from DB
      if (emp.Schedule) {
        const sList = Array.isArray(emp.Schedule) ? emp.Schedule : [emp.Schedule];
        const sortedScheds = [...sList].sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        sortedScheds.forEach((sc: any, idx: number) => {
          const daysStr = Array.isArray(sc.days)
            ? sc.days.map((d: any) => typeof d === 'string' ? d : (d.day || d.name || d.dayFull)).join(', ')
            : 'Mon - Fri';
          const prevSc = idx > 0 ? sortedScheds[idx - 1] : null;
          const prevDaysStr = prevSc && Array.isArray(prevSc.days)
            ? prevSc.days.map((d: any) => typeof d === 'string' ? d : (d.day || d.name || d.dayFull)).join(', ')
            : null;

          initialLogs.push({
            id: `sched_${sc.id || idx}`,
            type: 'SCHEDULE',
            category: 'Schedule',
            title: idx === 0 ? 'Initial Shift Schedule Assigned' : 'Shift Schedule & Timings Updated',
            fromValue: prevSc ? `${prevDaysStr} (${formatTimeTo12h(prevSc.startTime || '09:00')} - ${formatTimeTo12h(prevSc.endTime || '18:00')})` : 'Standard Shift Template',
            toValue: `${daysStr} (${formatTimeTo12h(sc.startTime || '09:00')} - ${formatTimeTo12h(sc.endTime || '18:00')})`,
            description: `Shift hours configured to ${formatTimeTo12h(sc.startTime || '09:00')} - ${formatTimeTo12h(sc.endTime || '18:00')} on [${daysStr}]. Overtime: ${sc.overtimeAllowed ? `${sc.overtimeMinutes}m` : 'No'}, Grace early-in: ${sc.earlyInMinutes || 15}m, early-out: ${sc.earlyOutMinutes || 15}m.`,
            date: sc.createdAt || sc.updatedAt || emp.createdAt || new Date().toISOString(),
            actor: idx === 0 ? 'System Onboarding' : 'HR Admin',
          });
        });
      }

      // Onboarding milestone
      initialLogs.push({
        id: `init_onboard_${emp.id}`,
        type: 'ONBOARDING',
        category: 'System',
        title: `Employee Account Onboarded`,
        fromValue: undefined,
        toValue: `ID: ${emp.employeeId || 'BIO-' + (emp.biometricId || emp.id)}`,
        description: `Employee profile registered into Frontpin HRMS with Biometric ID ${emp.biometricId || '—'} and official email ${emp.email || '—'}.`,
        date: emp.createdAt || emp.jobInfo?.hiringDate || new Date().toISOString(),
        actor: 'System Onboarding',
      });

      if (!currentLogs || currentLogs.length === 0) {
        currentLogs = initialLogs;
      } else {
        // Merge missing logs (especially schedule updates) from DB into currentLogs
        initialLogs.forEach((initLog) => {
          const alreadyExists = currentLogs.some(
            (existingLog) => existingLog.id === initLog.id || (existingLog.type === initLog.type && existingLog.date === initLog.date)
          );
          if (!alreadyExists) {
            currentLogs.push(initLog);
          }
        });
      }

      // Ensure current department is reflected in the audit logs
      if (emp.department?.title) {
        const hasCurrentDeptLog = currentLogs.some(
          (l) => (l.type === 'TRANSFER' || l.category === 'Transfers') &&
                 (l.toValue?.toLowerCase() === emp.department.title.toLowerCase() || l.title?.toLowerCase().includes(emp.department.title.toLowerCase()))
        );
        if (!hasCurrentDeptLog) {
          currentLogs.unshift({
            id: `dept_${Date.now()}_${emp.id}`,
            type: 'TRANSFER',
            category: 'Transfers',
            title: `Department Transfer: ${emp.department.title}`,
            fromValue: 'Previous Department',
            toValue: emp.department.title,
            description: `Employee placed/transferred to "${emp.department.title}" department.`,
            date: emp.updatedAt || new Date().toISOString(),
            actor: 'HR Admin',
          });
        }
      }

      // Ensure current entity is reflected in the audit logs
      if (emp.entity?.name) {
        const hasCurrentEntityLog = currentLogs.some(
          (l) => (l.type === 'TRANSFER' || l.category === 'Transfers') &&
                 (l.toValue?.toLowerCase() === emp.entity.name.toLowerCase() || l.title?.toLowerCase().includes(emp.entity.name.toLowerCase()))
        );
        if (!hasCurrentEntityLog) {
          currentLogs.unshift({
            id: `ent_${Date.now()}_${emp.id}`,
            type: 'ENTITY_TRANSFER',
            category: 'Transfers',
            title: `Entity Assignment: ${emp.entity.name}`,
            fromValue: 'Previous Entity',
            toValue: emp.entity.name,
            description: `Employee assigned to entity "${emp.entity.name}".`,
            date: emp.updatedAt || new Date().toISOString(),
            actor: 'HR Admin',
          });
        }
      }

      // Sort logs by date descending (latest first)
      currentLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAuditLogs(currentLogs);
      if (emp.id || id) saveAuditLogs(emp.id || id!, currentLogs);

      setLoading(false);
    } catch (err) {
      toast.error('Failed to load employee details');
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [locRes, depRes, empRes, rolesRes, entRes] = await Promise.all([
          locationAPI.getLocations(),
          departmentAPI.getDepartments(),
          employeeAPI.getActiveEmployees ? employeeAPI.getActiveEmployees() : employeeAPI.getEmployees(),
          roleAPI.getRoles ? roleAPI.getRoles() : Promise.resolve({ data: [] }),
          entityAPI.getEntities ? entityAPI.getEntities() : Promise.resolve({ data: [] }),
        ]);
        if (locRes?.data) setLocationsList(locRes.data);
        if (depRes?.data) setDepartmentsList(depRes.data);
        if (empRes?.data) setSupervisorsList(empRes.data);
        if (rolesRes?.data) setRolesList(rolesRes.data);
        if (entRes?.data) setEntitiesList(entRes.data);
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

      appendAuditLog({
        type: 'INCREMENT',
        category: 'Payroll',
        title: `Salary Increment Awarded`,
        fromValue: `${Number(payroll.rate).toLocaleString()} ${payroll.currency}`,
        toValue: incrementType === 'percentage' ? `+${incrementValue}%` : `+${Number(incrementValue).toLocaleString()} ${payroll.currency}`,
        description: `Applied ${incrementType === 'percentage' ? `${incrementValue}%` : `${Number(incrementValue).toLocaleString()} ${payroll.currency}`} increment effective from ${incrementDate ? moment(incrementDate).format('DD MMM YYYY') : 'Immediate'}.`,
        actor: 'HR / Finance',
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
      const prevRoleName = employee?.appRole?.name || employee?.role || 'User';
      const newRoleObj = rolesList.find((r) => String(r.id) === String(personal.roleId));
      const newRoleName = newRoleObj?.name || (personal.roleId && personal.roleId !== 'none' ? 'Custom Role' : 'No Role Assigned');

      if (String(employee?.roleId || employee?.appRole?.id || '') !== String(personal.roleId || '')) {
        appendAuditLog({
          type: 'ROLE',
          category: 'Job & Role',
          title: `System Role & Permissions Updated`,
          fromValue: prevRoleName,
          toValue: newRoleName,
          description: `User role permissions changed from "${prevRoleName}" to "${newRoleName}".`,
          actor: 'HR Admin',
        });
      }

      if (personal.biometricId && String(employee?.biometricId || '') !== String(personal.biometricId)) {
        appendAuditLog({
          type: 'SYSTEM',
          category: 'System',
          title: `Biometric Punch ID Changed`,
          fromValue: employee?.biometricId ? String(employee.biometricId) : 'None',
          toValue: String(personal.biometricId),
          description: `Employee punch biometric ID updated from ${employee?.biometricId || 'None'} to ${personal.biometricId}.`,
          actor: 'HR Admin',
        });
      }

      const prevFullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
      const newFullName = `${personal.firstName || ''} ${personal.lastName || ''}`.trim();
      if (prevFullName && newFullName && prevFullName !== newFullName) {
        appendAuditLog({
          type: 'STATUS',
          category: 'System',
          title: `Employee Name Changed`,
          fromValue: prevFullName,
          toValue: newFullName,
          description: `Employee name changed from "${prevFullName}" to "${newFullName}".`,
          actor: 'HR Admin',
        });
      }

      if (personal.email && employee?.email && employee.email !== personal.email) {
        appendAuditLog({
          type: 'SYSTEM',
          category: 'System',
          title: `Email Address Updated`,
          fromValue: employee.email,
          toValue: personal.email,
          description: `Employee email address changed from "${employee.email}" to "${personal.email}".`,
          actor: 'HR Admin',
        });
      }

      const prevPhone = employee?.phoneNumber || employee?.phone || '';
      if (personal.phone && prevPhone && prevPhone !== personal.phone) {
        appendAuditLog({
          type: 'SYSTEM',
          category: 'System',
          title: `Phone Number Updated`,
          fromValue: prevPhone,
          toValue: personal.phone,
          description: `Contact phone number changed from "${prevPhone}" to "${personal.phone}".`,
          actor: 'HR Admin',
        });
      }

      if (personal.employeeId && employee?.employeeId && employee.employeeId !== personal.employeeId) {
        appendAuditLog({
          type: 'SYSTEM',
          category: 'System',
          title: `Employee ID Code Changed`,
          fromValue: employee.employeeId,
          toValue: personal.employeeId,
          description: `Employee company code modified from "${employee.employeeId}" to "${personal.employeeId}".`,
          actor: 'HR Admin',
        });
      }

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
      if (job.entityId !== undefined && job.entityId !== '') payload.entityId = Number(job.entityId);
      if (job.locationId) payload.companyId = Number(job.locationId);
      if (job.departmentId) payload.departmentId = Number(job.departmentId);
      if (job.supervisorId) payload.supervisorId = Number(job.supervisorId);
      if (job.hiringDate) payload.hiringDate = job.hiringDate;
      if (job.employmentStatus) payload.employmentStatus = job.employmentStatus;
      if (job.workMode) payload.workMode = job.workMode;

      // 1. Track Department transfer
      const prevDeptId = employee?.departmentId ? String(employee.departmentId) : (employee?.department?.id ? String(employee.department.id) : '');
      const newDeptId = job.departmentId ? String(job.departmentId) : '';
      if (prevDeptId !== newDeptId) {
        const prevDeptObj = departmentsList.find((d) => String(d.id) === prevDeptId) || employee?.department;
        const newDeptObj = departmentsList.find((d) => String(d.id) === newDeptId);
        const prevDeptName = prevDeptObj?.title || employee?.department?.title || 'Unassigned';
        const newDeptName = newDeptObj?.title || job.department || (newDeptId ? 'New Department' : 'Unassigned');

        appendAuditLog({
          type: 'TRANSFER',
          category: 'Transfers',
          title: `Department Transfer: ${prevDeptName} → ${newDeptName}`,
          fromValue: prevDeptName,
          toValue: newDeptName,
          description: `Employee transferred from department "${prevDeptName}" to "${newDeptName}".`,
          actor: 'HR Admin',
        });
      }

      // 2. Track Entity transfer
      const prevEntId = employee?.entityId ? String(employee.entityId) : (employee?.entity?.id ? String(employee.entity.id) : '');
      const newEntId = job.entityId ? String(job.entityId) : '';
      if (prevEntId !== newEntId || (job.entity && job.entity !== (employee?.entity?.name || employee?.company?.name))) {
        const prevEntObj = entitiesList.find((e) => String(e.id) === prevEntId) || employee?.entity;
        const newEntObj = entitiesList.find((e) => String(e.id) === newEntId);
        const prevEntName = prevEntObj?.name || employee?.entity?.name || employee?.company?.name || 'Unassigned';
        const newEntName = newEntObj?.name || job.entity || 'Unassigned';

        if (prevEntName !== newEntName) {
          appendAuditLog({
            type: 'ENTITY_TRANSFER',
            category: 'Transfers',
            title: `Entity Transfer: ${prevEntName} → ${newEntName}`,
            fromValue: prevEntName,
            toValue: newEntName,
            description: `Employee moved to business entity "${newEntName}" from "${prevEntName}".`,
            actor: 'HR Admin',
          });
        }
      }

      // 3. Track Location transfer
      const prevLocId = employee?.companyId ? String(employee.companyId) : (employee?.company?.id ? String(employee.company.id) : '');
      const newLocId = job.locationId ? String(job.locationId) : '';
      if (prevLocId !== newLocId) {
        const prevLocObj = locationsList.find((l) => String(l.id) === prevLocId) || employee?.company || employee?.location;
        const newLocObj = locationsList.find((l) => String(l.id) === newLocId);
        const prevLocName = prevLocObj?.name || 'Unassigned';
        const newLocName = newLocObj?.name || job.location || 'Unassigned';

        appendAuditLog({
          type: 'LOCATION',
          category: 'Transfers',
          title: `Location Relocation: ${prevLocName} → ${newLocName}`,
          fromValue: prevLocName,
          toValue: newLocName,
          description: `Employee relocated from "${prevLocName}" to "${newLocName}".`,
          actor: 'HR Admin',
        });
      }

      // 4. Track Supervisor change
      const prevSupId = employee?.supervisorId ? String(employee.supervisorId) : (employee?.supervisor?.id ? String(employee.supervisor.id) : '');
      const newSupId = job.supervisorId ? String(job.supervisorId) : '';
      if (prevSupId !== newSupId) {
        const prevSupObj = employee?.supervisor || supervisorsList.find((s) => String(s.id) === prevSupId);
        const newSupObj = supervisorsList.find((s) => String(s.id) === newSupId);
        const prevSupName = prevSupObj ? `${prevSupObj.firstName} ${prevSupObj.lastName}` : 'Unassigned';
        const newSupName = newSupObj ? `${newSupObj.firstName} ${newSupObj.lastName}` : 'Unassigned';

        appendAuditLog({
          type: 'SUPERVISOR',
          category: 'Job & Role',
          title: `Reporting Supervisor Reassigned`,
          fromValue: prevSupName,
          toValue: newSupName,
          description: `Reporting supervisor changed from "${prevSupName}" to "${newSupName}".`,
          actor: 'HR Admin',
        });
      }

      // 5. Track Employment Status change
      const prevStatus = employee?.employmentStatus || employee?.jobInfo?.employmentStatus || 'Permanent';
      if (job.employmentStatus && prevStatus !== job.employmentStatus) {
        appendAuditLog({
          type: 'STATUS',
          category: 'Job & Role',
          title: `Employment Status Changed`,
          fromValue: prevStatus,
          toValue: job.employmentStatus,
          description: `Employment status updated from "${prevStatus}" to "${job.employmentStatus}".`,
          actor: 'HR Admin',
        });
      }

      // 6. Track Work Mode change
      const prevWorkMode = employee?.workMode || employee?.jobInfo?.workMode || 'On-site';
      if (job.workMode && prevWorkMode !== job.workMode) {
        appendAuditLog({
          type: 'STATUS',
          category: 'Job & Role',
          title: `Work Mode Updated`,
          fromValue: prevWorkMode,
          toValue: job.workMode,
          description: `Work arrangement shifted from "${prevWorkMode}" to "${job.workMode}".`,
          actor: 'HR Admin',
        });
      }

      // 7. Track Hiring Date change
      const prevHiring = employee?.hiringDate ? employee.hiringDate.split('T')[0] : (employee?.jobInfo?.hiringDate ? employee.jobInfo.hiringDate.split('T')[0] : '');
      if (job.hiringDate && prevHiring !== job.hiringDate) {
        appendAuditLog({
          type: 'STATUS',
          category: 'Job & Role',
          title: `Hiring Date Updated`,
          fromValue: prevHiring || 'None',
          toValue: job.hiringDate,
          description: `Official hiring date modified from "${prevHiring || 'None'}" to "${job.hiringDate}".`,
          actor: 'HR Admin',
        });
      }

      await employeeAPI.updateEmployee(Number(id), payload);
      toast.success('Job information updated');
      setEditJob(false);

      const res = await employeeAPI.getDetail(id!);
      if (res?.data) {
        setEmployee(res.data);
        setJob({
          entityId: res.data.entityId ? String(res.data.entityId) : (res.data.entity?.id ? String(res.data.entity.id) : ''),
          entity: res.data.entity?.name || res.data.company?.name || res.data.entity || '',
          locationId: res.data.companyId ? String(res.data.companyId) : '',
          location: res.data.company?.name || res.data.location?.name || '',
          departmentId: res.data.departmentId ? String(res.data.departmentId) : '',
          department: res.data.department?.title || '',
          supervisorId: res.data.supervisorId ? String(res.data.supervisorId) : '',
          supervisor: res.data.supervisor ? `${res.data.supervisor.firstName} ${res.data.supervisor.lastName}` : '',
          hiringDate: res.data.hiringDate ? res.data.hiringDate.split('T')[0] : (res.data.jobInfo?.hiringDate ? res.data.jobInfo.hiringDate.split('T')[0] : ''),
          employmentStatus: res.data.employmentStatus || res.data.jobInfo?.employmentStatus || 'Permanent',
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
      const prevSalary = employee?.payroll?.rate || 0;

      if (Number(prevSalary) !== Number(payroll.rate)) {
        appendAuditLog({
          type: 'PAYROLL',
          category: 'Payroll',
          title: `Base Compensation Adjusted`,
          fromValue: `${Number(prevSalary).toLocaleString()} ${payroll.currency}`,
          toValue: `${Number(payroll.rate).toLocaleString()} ${payroll.currency}`,
          description: `Base compensation adjusted from ${Number(prevSalary).toLocaleString()} to ${Number(payroll.rate).toLocaleString()} ${payroll.currency} (${payroll.rateType}), Cycle date: Day ${payroll.cycleDate}.`,
          actor: 'HR / Finance',
        });
      }

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

        const prevSchedStart = employee?.Schedule?.[0]?.startTime || '09:00';
        const prevSchedEnd = employee?.Schedule?.[0]?.endTime || '18:00';
        const prevDays = employee?.Schedule?.[0]?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const prevDaysStr = Array.isArray(prevDays) ? prevDays.map((d: any) => typeof d === 'string' ? d : (d.day || d.name)).join(', ') : 'Mon - Fri';
        const newDaysStr = schedule.workingDays.join(', ');

        appendAuditLog({
          type: 'SCHEDULE',
          category: 'Schedule',
          title: `Shift Schedule & Timings Updated`,
          fromValue: `${prevDaysStr} (${formatTimeTo12h(prevSchedStart)} - ${formatTimeTo12h(prevSchedEnd)})`,
          toValue: `${newDaysStr} (${formatTimeTo12h(schedule.shiftStart)} - ${formatTimeTo12h(schedule.shiftEnd)})`,
          description: `Working schedule updated to ${schedule.workingDays.length} working days (${newDaysStr}) with shift hours ${formatTimeTo12h(schedule.shiftStart)} - ${formatTimeTo12h(schedule.shiftEnd)}. Early-in: ${schedule.earlyInMargin}m, Early-out: ${schedule.earlyOutMargin}m, Overtime: ${schedule.overtimeAllowed ? `${schedule.overtimeMinutes}m` : 'No'}.`,
          actor: 'HR Admin',
        });

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

  const handleConfirmSeparation = async () => {
    if (!separationType) {
      toast.error('Please select separation type');
      return;
    }
    if (!separationReason) {
      toast.error('Please select separation reason');
      return;
    }
    if (!separationDate) {
      toast.error('Please select separation date');
      return;
    }

    const sepPayload = {
      type: separationType,
      reason: separationReason,
      comments: separationComments || '',
      date: separationDate,
      clearanceDate: clearanceDate || '',
    };

    try {
      await employeeAPI.updateEmployee(Number(id), {
        employmentStatus: 'Separated',
        canLogin: false,
        job: {
          employmentStatus: 'Separated',
        },
      });

      setSeparation(sepPayload);
      localStorage.setItem(`emp_separation_${id}`, JSON.stringify(sepPayload));

      appendAuditLog({
        type: 'SEPARATION',
        category: 'Job & Role',
        title: `Employment Separation Recorded (${separationType})`,
        fromValue: 'Active Good Standing',
        toValue: `Separated (${separationType})`,
        description: `Employee marked as separated. Reason: ${separationReason}. Effective Date: ${separationDate}. Clearance Date: ${clearanceDate || 'N/A'}. Comments: ${separationComments || 'None'}. All active operations, login, and clock-in are restricted. All historical attendance, payroll, and logs are preserved.`,
        actor: 'HR Admin',
      });

      setJob((prev) => ({ ...prev, employmentStatus: 'Separated' }));
      if (employee) {
        setEmployee((prev: any) => ({
          ...prev,
          canLogin: false,
          employmentStatus: 'Separated',
          jobInfo: {
            ...(prev?.jobInfo || {}),
            employmentStatus: 'Separated',
          },
        }));
      }

      toast.success('Separation confirmed. Employee activities restricted.');
      setShowSeparationModal(false);
      window.dispatchEvent(new CustomEvent('employee-updated', { detail: { employeeId: id } }));
      fetchEmployee();
    } catch (err: any) {
      console.error("Separation Error:", err);
      toast.error(err?.message || 'Failed to record separation');
    }
  };

  const handleReinstateEmployee = async () => {
    try {
      await employeeAPI.updateEmployee(Number(id), {
        employmentStatus: 'Permanent',
        canLogin: true,
        job: {
          employmentStatus: 'Permanent',
        },
      });

      setSeparation(null);
      localStorage.removeItem(`emp_separation_${id}`);

      appendAuditLog({
        type: 'STATUS',
        category: 'Job & Role',
        title: `Employee Reinstated to Active`,
        fromValue: 'Separated',
        toValue: 'Permanent',
        description: `Separation revoked. Employee account reinstated to active permanent status. Login and attendance clock-in permissions restored.`,
        actor: 'HR Admin',
      });

      setJob((prev) => ({ ...prev, employmentStatus: 'Permanent' }));
      if (employee) {
        setEmployee((prev: any) => ({
          ...prev,
          canLogin: true,
          employmentStatus: 'Permanent',
          jobInfo: {
            ...(prev?.jobInfo || {}),
            employmentStatus: 'Permanent',
          },
        }));
      }

      toast.success('Employee reinstated to active status');
      window.dispatchEvent(new CustomEvent('employee-updated', { detail: { employeeId: id } }));
      fetchEmployee();
    } catch (err: any) {
      console.error("Reinstate Error:", err);
      toast.error(err?.message || 'Failed to reinstate employee');
    }
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
  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ── Top Navigation / Breadcrumb ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
        <Link to="/employees" className="inline-flex items-center gap-1.5 hover:text-slate-900 font-medium transition-colors">
          <ArrowLeft className="size-4" />
          <span>Employees</span>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-semibold truncate">
          {employee.firstName} {employee.lastName}
        </span>
      </div>

      {/* ── Modern Profile Header Card ────────────────────────────────────────── */}
      <Card className="shadow-xs border-slate-200/80 rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start sm:items-center">
            {/* Photo Avatar */}
            <div className="relative size-20 sm:size-24 rounded-full bg-[#FAF5FF] text-[#A855F7] flex items-center justify-center overflow-hidden shrink-0">
              {employee.profileImage ? (
                <img src={API_URL + employee.profileImage} alt="Employee" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || 'W7'}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {employee.firstName} {employee.lastName}
                </h1>
                {separation || job.employmentStatus === 'Separated' || employee.employmentStatus === 'Separated' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <span className="size-1.5 rounded-full bg-red-500" />
                    Separated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]">
                    <span className="size-1.5 rounded-full bg-[#12B76A]" />
                    {job.employmentStatus || employee.employmentStatus || 'Permanent'}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 font-normal">
                {employee.designation || employee.jobInfo?.designation || 'Employee'}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {(employee.employeeId || employee.id) && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs text-slate-600">
                    <span className="text-slate-400 font-medium">ID</span>
                    <span className="font-semibold text-slate-800">{employee.employeeId || `BIO-${employee.biometricId || employee.id}`}</span>
                  </div>
                )}
                {employee.biometricId && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-purple-200 bg-purple-50/70 text-xs font-semibold text-purple-700">
                    <span className="text-purple-500 font-medium">Bio ID</span>
                    <span className="font-bold text-purple-700">{employee.biometricId}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700">
                  <Shield className="size-3.5 text-slate-400" />
                  <span>
                    {rolesList.find((r: any) => String(r.id) === String(personal.roleId))?.name ||
                      employee.appRole?.name ||
                      (employee.role === 'SUPERVISOR' ? 'Supervisor' : employee.role === 'ADMIN' ? 'Admin' : 'User')}
                  </span>
                </div>
                {(employee?.company?.name || employee?.location?.name || job.location) && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <MapPin className="size-3.5 text-slate-400" />
                    <span>{employee?.company?.name || employee?.location?.name || job.location}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <Mail className="size-3.5 text-slate-400" />
                    <span className="truncate max-w-[240px]">{employee.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Separation & Activity Restriction Notice Banner ───────────────────── */}
      {(separation || job.employmentStatus === 'Separated' || employee.employmentStatus === 'Separated') && (
        <div className="bg-red-50/90 border border-red-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 border border-red-200/60">
              <UserX className="size-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-red-950">Employee Account Separated & Restricted</h3>
                {separation?.type && (
                  <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md border border-red-200">
                    {separation.type}
                  </span>
                )}
              </div>
              <p className="text-xs text-red-800/90 mt-1 leading-relaxed">
                This employee has been separated. Login authentication and attendance punch/clock-in are restricted. All historical attendance logs, payroll calculations, and documents remain securely preserved.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReinstateEmployee}
            className="shrink-0 rounded-xl border-red-300 text-red-700 bg-white hover:bg-red-50 text-xs font-semibold px-4 h-9 shadow-xs"
          >
            Reinstate Employee
          </Button>
        </div>
      )}

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="personal" className="space-y-5">
        <div className="w-full overflow-x-auto scrollbar-none pb-1">
          <TabsList className="inline-flex items-center flex-nowrap h-auto justify-start gap-1 sm:gap-1.5 p-1 bg-transparent border-0 min-w-full sm:min-w-0">
            <TabsTrigger
              value="personal"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <User className="size-3.5 sm:size-4" /> Personal
            </TabsTrigger>
            <TabsTrigger
              value="job"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <Briefcase className="size-3.5 sm:size-4" /> Job
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <FileText className="size-3.5 sm:size-4" /> Documents
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <Clock className="size-3.5 sm:size-4" /> Schedule
            </TabsTrigger>
            <TabsTrigger
              value="payroll"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <CreditCard className="size-3.5 sm:size-4" /> Payroll
            </TabsTrigger>
            <TabsTrigger
              value="approvals"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <Check className="size-3.5 sm:size-4" /> Approvals
            </TabsTrigger>
            <TabsTrigger
              value="password-separation"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <Lock className="size-3.5 sm:size-4" /> Password / Separation
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/90"
            >
              <RotateCcw className="size-3.5 sm:size-4" /> History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── PERSONAL INFORMATION ──────────────────────────────────────── */}
        <TabsContent value="personal">
          <Card className="shadow-xs border-slate-200/80 rounded-2xl bg-white overflow-hidden">
            <div className="flex flex-row items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">Contact details and identity information</p>
              </div>
              {!editPersonal ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditPersonal(true)}
                  className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold px-3.5 py-1.5 h-9 flex items-center gap-1.5"
                >
                  <Edit className="size-3.5 text-blue-600" /> Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditPersonal(false)}
                    className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold px-4 h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePersonal}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 h-9 shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                </div>
              )}
            </div>

            <CardContent className="p-5 sm:p-6">
              {!editPersonal ? (
                /* ── View Mode: 4 columns ── */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-6">
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">First name</p>
                    <p className="text-sm font-bold text-slate-900">{personal.firstName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Last name</p>
                    <p className="text-sm font-bold text-slate-900">{personal.lastName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Email</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{personal.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Phone</p>
                    <p className="text-sm font-bold text-slate-900">{personal.phone || '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Employee ID</p>
                    <p className="text-sm font-bold text-slate-900">{personal.employeeId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Biometric ID</p>
                    <p className="text-sm font-bold text-slate-900">{personal.biometricId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Username</p>
                    <p className="text-sm font-bold text-slate-900">{personal.username || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Role</p>
                    <p className="text-sm font-bold text-slate-900">
                      {rolesList.find((r: any) => String(r.id) === String(personal.roleId))?.name ||
                        employee.appRole?.name ||
                        (employee.role === 'SUPERVISOR' ? 'Supervisor' : employee.role === 'ADMIN' ? 'Admin' : 'User')}
                    </p>
                  </div>
                </div>
              ) : (
                /* ── Edit Mode: 3 columns ── */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">First Name</Label>
                    <Input
                      value={personal.firstName}
                      onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Last Name</Label>
                    <Input
                      value={personal.lastName}
                      onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Email</Label>
                    <Input
                      type="email"
                      value={personal.email}
                      onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Phone</Label>
                    <Input
                      value={personal.phone}
                      onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Employee ID (Code)</Label>
                    <Input
                      value={personal.employeeId}
                      onChange={(e) => setPersonal({ ...personal, employeeId: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Biometric ID</Label>
                    <Input
                      value={personal.biometricId}
                      onChange={(e) => setPersonal({ ...personal, biometricId: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Username</Label>
                    <Input
                      value={personal.username}
                      onChange={(e) => setPersonal({ ...personal, username: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Role</Label>
                    <Select
                      value={personal.roleId || 'none'}
                      onValueChange={(val) => setPersonal({ ...personal, roleId: val === 'none' ? '' : val })}
                    >
                      <SelectTrigger className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500">
                        <SelectValue placeholder="No Role Assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Role Assigned</SelectItem>
                        {rolesList.map((r: any) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── JOB INFORMATION ───────────────────────────────────────────── */}
        <TabsContent value="job">
          <Card className="shadow-xs border-slate-200/80 rounded-2xl bg-white overflow-hidden">
            <div className="flex flex-row items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Job Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">Location, department, supervisor and employment details</p>
              </div>
              {!editJob ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditJob(true)}
                  className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold px-3.5 py-1.5 h-9 flex items-center gap-1.5"
                >
                  <Edit className="size-3.5 text-blue-600" /> Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditJob(false)}
                    className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold px-4 h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveJob}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 h-9 shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                </div>
              )}
            </div>

            <CardContent className="p-5 sm:p-6">
              {!editJob ? (
                /* ── View Mode: 3 columns ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-6">
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Entity</p>
                    <p className="text-sm font-bold text-slate-900">{job.entity || employee.company?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Location</p>
                    <p className="text-sm font-bold text-slate-900">{job.location || employee?.location?.name || 'Johar Town Lahore'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Department</p>
                    <p className="text-sm font-bold text-slate-900">{job.department || employee?.department?.title || '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Supervisor</p>
                    <p className="text-sm font-bold text-slate-900">{job.supervisor || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Hiring date</p>
                    <p className="text-sm font-bold text-slate-900">
                      {job.hiringDate ? moment(job.hiringDate).format('DD MMM YYYY') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Employment status</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]">
                      <span className="size-1.5 rounded-full bg-[#12B76A]" />
                      {job.employmentStatus || 'Permanent'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-normal text-slate-500 mb-1">Work mode</p>
                    <p className="text-sm font-bold text-slate-900">{job.workMode || 'On-site'}</p>
                  </div>
                </div>
              ) : (
                /* ── Edit Mode: 3 columns ── */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Entity</Label>
                    {entitiesList && entitiesList.length > 0 ? (
                      <SearchableSelect
                        className="w-full mt-1.5"
                        placeholder="Select Entity"
                        searchPlaceholder="Search entity..."
                        value={job.entityId}
                        onValueChange={(val) => {
                          const found = entitiesList.find((e) => String(e.id) === String(val));
                          setJob({
                            ...job,
                            entityId: val,
                            entity: found?.name || '',
                          });
                        }}
                        options={entitiesList.map((e) => ({
                          value: String(e.id),
                          label: e.code ? `${e.name} (${e.code})` : e.name,
                        }))}
                      />
                    ) : (
                      <Input
                        value={job.entity}
                        onChange={(e) => setJob({ ...job, entity: e.target.value })}
                        placeholder="e.g. Frontpin HQ"
                        className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Location</Label>
                    <SearchableSelect
                      className="w-full mt-1.5"
                      placeholder="Select Location"
                      searchPlaceholder="Search location..."
                      value={job.locationId}
                      onValueChange={(val) => {
                        const found = locationsList.find((l) => String(l.id) === String(val));
                        setJob({
                          ...job,
                          locationId: val,
                          location: found?.name || '',
                        });
                      }}
                      options={locationsList.map((l) => ({
                        value: String(l.id),
                        label: l.name,
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Department</Label>
                    <SearchableSelect
                      className="w-full mt-1.5"
                      placeholder="Select Department"
                      searchPlaceholder="Search department..."
                      value={job.departmentId}
                      onValueChange={(val) => {
                        const found = departmentsList.find((d) => String(d.id) === String(val));
                        setJob({
                          ...job,
                          departmentId: val,
                          department: found?.title || '',
                        });
                      }}
                      options={departmentsList.map((d) => ({
                        value: String(d.id),
                        label: d.title,
                      }))}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Supervisor</Label>
                    <SearchableSelect
                      className="w-full mt-1.5"
                      placeholder="Select Supervisor"
                      searchPlaceholder="Search supervisor..."
                      value={job.supervisorId}
                      onValueChange={(val) => {
                        const found = supervisorsList.find((s) => String(s.id) === String(val));
                        setJob({
                          ...job,
                          supervisorId: val,
                          supervisor: found ? `${found.firstName} ${found.lastName}` : '',
                        });
                      }}
                      options={supervisorsList.map((s) => ({
                        value: String(s.id),
                        label: `${s.firstName} ${s.lastName || ''}`.trim(),
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Hiring Date</Label>
                    <Input
                      type="date"
                      value={job.hiringDate}
                      onChange={(e) => setJob({ ...job, hiringDate: e.target.value })}
                      className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Employment Status</Label>
                    <Select
                      value={job.employmentStatus || 'Permanent'}
                      onValueChange={(v) => setJob({ ...job, employmentStatus: v })}
                    >
                      <SelectTrigger className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                        <SelectItem value="Probation">Probation</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                        <SelectItem value="Separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Work Mode</Label>
                    <Select value={job.workMode || 'On-site'} onValueChange={(v) => setJob({ ...job, workMode: v })}>
                      <SelectTrigger className="mt-1.5 h-10 rounded-xl border-slate-200 bg-white text-slate-900 font-medium text-sm focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="On-site">On-site</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ── DOCUMENTS ──────────────────────────────────────────────────── */}
        <TabsContent value="documents">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <div className="flex flex-row items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Employee Documents</h2>
                <p className="text-xs text-slate-500 mt-0.5">Identity proofs, contracts, and certificates</p>
              </div>
              <Dialog open={showUploadDocModal} onOpenChange={setShowUploadDocModal}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold px-3.5 py-1.5 h-9 flex items-center gap-1.5"
                  >
                    <Upload className="size-3.5" /> Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900">Upload Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Document Type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">File</Label>
                      <Input
                        type="file"
                        onChange={e => setDocFile(e.target.files?.[0] || null)}
                        className="rounded-xl border-slate-200 h-10 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setShowUploadDocModal(false)} className="rounded-xl border-slate-200 text-xs font-semibold h-9">
                      Cancel
                    </Button>
                    <Button onClick={handleUploadDocument} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9">
                      Upload
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50">
                    <TableHead className="font-semibold text-xs text-slate-500 py-3 pl-6">Type</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-500 py-3">File</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-500 py-3">Uploaded</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-500 py-3 pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => (
                    <TableRow key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="pl-6 font-semibold text-xs text-slate-800">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                          {doc.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">{doc.fileName || doc.url?.split('/').pop()}</TableCell>
                      <TableCell className="text-xs text-slate-500">{moment(doc.uploadedAt).format('DD MMM YYYY')}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-slate-100 text-slate-600">
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id)} className="size-8 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-10 text-xs">
                        No documents uploaded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SCHEDULE ───────────────────────────────────────────────────── */}
        <TabsContent value="schedule">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Schedule & Shift Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Working days, shift hours, grace periods, overtime and breaks
                </p>
              </div>

              {!isEditingSchedule ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingSchedule(true)}
                  className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold px-3.5 py-1.5 h-9 flex items-center gap-1.5"
                >
                  <Edit className="size-3.5 text-blue-600" /> Edit Schedule
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingSchedule(false)}
                    className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold px-4 h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveSchedule}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 h-9 shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                </div>
              )}
            </div>

            <CardContent className="p-5 sm:p-6 space-y-6">
              {!isEditingSchedule ? (
                /* ── View Mode: Weekly Shift Pattern + Metric Cards (Image 1) ── */
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-blue-600" />
                        <span className="font-bold text-sm text-slate-900">Weekly shift pattern</span>
                      </div>
                      <span className="text-xs font-medium text-slate-700">
                        {schedule.workingDays.length} working · {7 - schedule.workingDays.length} off
                      </span>
                    </div>

                    <div className="w-full">
                      <div className="grid grid-cols-4 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                        <div>DAY</div>
                        <div>STATUS</div>
                        <div>START</div>
                        <div>END</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {ALL_WEEK_DAYS.map((dayKey) => {
                          const isWorking = schedule.workingDays.includes(dayKey);
                          const dayName = FULL_DAY_NAMES[dayKey] || dayKey;
                          const dayTime = daySchedules[dayKey] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };

                          return (
                            <div key={dayKey} className="grid grid-cols-4 py-3.5 items-center text-sm">
                              <div className="font-bold text-slate-900">{dayName}</div>
                              <div>
                                {isWorking ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]">
                                    <span className="size-1.5 rounded-full bg-[#12B76A]" />
                                    Working
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    <span className="size-1.5 rounded-full bg-slate-400" />
                                    Off day
                                  </span>
                                )}
                              </div>
                              <div className={isWorking ? "text-slate-700 font-medium text-sm" : "text-slate-400 font-medium"}>
                                {isWorking ? formatTimeTo12h(dayTime.startTime) : "—"}
                              </div>
                              <div className={isWorking ? "text-slate-700 font-medium text-sm" : "text-slate-400 font-medium"}>
                                {isWorking ? formatTimeTo12h(dayTime.endTime) : "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metric Cards inside / below table (Exact Image 1) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                      {/* 1. Early in margin */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500 mb-1">Early in margin</p>
                        <p className="text-xl font-bold text-slate-900">{schedule.earlyInMargin || 15} min</p>
                      </div>

                      {/* 2. Early out margin */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500 mb-1">Early out margin</p>
                        <p className="text-xl font-bold text-slate-900">{schedule.earlyOutMargin || 15} min</p>
                      </div>

                      {/* 3. Half day */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500 mb-1">Half day</p>
                        <p className="text-xl font-bold text-slate-900">{schedule.allowHalfDay ? 'Allowed' : 'Disabled'}</p>
                      </div>

                      {/* 4. Overtime (purple border/tint) */}
                      <div className="rounded-2xl border border-purple-200 bg-[#FAFAFE] p-4">
                        <p className="text-xs font-medium text-slate-500 mb-1">Overtime</p>
                        <p className="text-xl font-bold text-slate-900">{schedule.overtimeAllowed ? 'Allowed' : 'Disabled'}</p>
                        {schedule.overtimeAllowed && (
                          <p className="text-xs text-slate-400 mt-1">
                            Max {schedule.overtimeMinutes || 30} min ({((schedule.overtimeMinutes || 30) / 60).toFixed(1)} h)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 5. Breaks (Row 2, 1 column width) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500 mb-1">Breaks</p>
                        <p className="text-xl font-bold text-slate-900">{schedule.numBreaks ?? 2}</p>
                        <p className="text-xs text-slate-400 mt-1">{schedule.breakMinutes ?? 15} min each</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Edit Mode: Daily Shift Timings + Edit Cards (Exact Image 2) ── */
                <div className="space-y-6">
                  {/* Daily Shift Timings Card */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-blue-600" />
                          <span className="font-bold text-sm text-slate-900">Daily shift timings</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Check working days and set start and end times for each day.
                        </p>
                      </div>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {schedule.workingDays.length} working / {7 - schedule.workingDays.length} off
                      </span>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-2 py-1">
                      <span className="text-xs font-semibold text-slate-500 mr-1">Quick presets:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }))}
                        className="h-8 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Mon – Fri
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }))}
                        className="h-8 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Mon – Sat
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: [...ALL_WEEK_DAYS] }))}
                        className="h-8 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        All days
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: [] }))}
                        className="h-8 px-3 rounded-lg border-red-200 text-red-600 bg-white hover:bg-red-50 text-xs font-semibold"
                      >
                        Clear
                      </Button>
                    </div>

                    {/* 7 Days List */}
                    <div className="space-y-2.5 pt-1">
                      {ALL_WEEK_DAYS.map((dayKey) => {
                        const isWorking = schedule.workingDays.includes(dayKey);
                        const dayName = FULL_DAY_NAMES[dayKey] || dayKey;
                        const dayTime = daySchedules[dayKey] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };

                        return (
                          <div
                            key={dayKey}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isWorking}
                                onCheckedChange={() => toggleWorkingDay(dayKey)}
                                id={`day-check-${dayKey}`}
                                className="size-4 rounded-md"
                              />
                              <Label htmlFor={`day-check-${dayKey}`} className="font-bold text-sm text-slate-900 cursor-pointer min-w-[90px]">
                                {dayName}
                              </Label>
                            </div>

                            {isWorking ? (
                              <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-400">Start</span>
                                  <Input
                                    type="time"
                                    value={dayTime.startTime}
                                    onChange={(e) => handleUpdateDayTime(dayKey, 'startTime', e.target.value)}
                                    className="h-10 w-36 rounded-xl border-slate-200 bg-white font-semibold text-xs px-3 text-slate-800 shadow-2xs focus:border-blue-500"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-400">End</span>
                                  <Input
                                    type="time"
                                    value={dayTime.endTime}
                                    onChange={(e) => handleUpdateDayTime(dayKey, 'endTime', e.target.value)}
                                    className="h-10 w-36 rounded-xl border-slate-200 bg-white font-semibold text-xs px-3 text-slate-800 shadow-2xs focus:border-blue-500"
                                  />
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApplyTimeAllDays(dayKey)}
                                  className="h-9 px-3 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold"
                                >
                                  Apply to all
                                </Button>
                              </div>
                            ) : (
                              <div className="sm:ml-auto py-1">
                                <span className="text-xs italic text-slate-400">Off day — no shift timing</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 1: Punctuality & grace margins (Exact Image 2) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-slate-900">Punctuality & grace margins</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Early in margin (minutes)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={schedule.earlyInMargin}
                          onChange={(e) => setSchedule({ ...schedule, earlyInMargin: Number(e.target.value) })}
                          className="bg-white border-slate-200 rounded-xl h-10 text-sm font-semibold focus:border-blue-500"
                        />
                        <p className="text-xs text-slate-400">Buffer allowed before shift start time for early check-in.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Early out margin (minutes)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={schedule.earlyOutMargin}
                          onChange={(e) => setSchedule({ ...schedule, earlyOutMargin: Number(e.target.value) })}
                          className="bg-white border-slate-200 rounded-xl h-10 text-sm font-semibold focus:border-blue-500"
                        />
                        <p className="text-xs text-slate-400">Buffer allowed before shift end time without marking early departure.</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Half-day & overtime rules (Exact Image 2) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-amber-500" />
                      <h4 className="text-sm font-bold text-slate-900">Half-day & overtime rules</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                      {/* Half day */}
                      <div className="space-y-3 p-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-slate-800">Half day allowed</Label>
                          <Switch
                            checked={schedule.allowHalfDay}
                            onCheckedChange={(val) => setSchedule({ ...schedule, allowHalfDay: val })}
                          />
                        </div>
                        {schedule.allowHalfDay && (
                          <div className="space-y-1.5 pt-2">
                            <Label className="text-xs font-medium text-slate-700">Half day threshold (minutes)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={schedule.halfDayMinutes}
                              onChange={(e) => setSchedule({ ...schedule, halfDayMinutes: Number(e.target.value) })}
                              className="bg-white border-slate-200 rounded-xl h-10 text-sm font-semibold"
                            />
                            <p className="text-xs text-slate-400">
                              {Math.floor(schedule.halfDayMinutes / 60)}h {schedule.halfDayMinutes % 60}m shift threshold required
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Overtime */}
                      <div className="space-y-3 p-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-slate-800">Overtime allowed</Label>
                          <Switch
                            checked={schedule.overtimeAllowed}
                            onCheckedChange={(val) => setSchedule({ ...schedule, overtimeAllowed: val })}
                          />
                        </div>

                        {schedule.overtimeAllowed && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-700">Overtime allowed (minutes)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={schedule.overtimeMinutes}
                              onChange={(e) => setSchedule({ ...schedule, overtimeMinutes: Number(e.target.value) })}
                              className="bg-white border-slate-200 rounded-xl h-10 text-sm font-semibold"
                            />
                            <p className="text-xs text-slate-400">
                              Max {schedule.overtimeMinutes} mins ({ (schedule.overtimeMinutes / 60).toFixed(1) } hrs) extra time allowed
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Breaks policy (Exact Image 2) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-emerald-600" />
                      <h4 className="text-sm font-bold text-slate-900">Breaks policy</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Number of breaks</Label>
                        <Input
                          type="number"
                          min={0}
                          value={schedule.numBreaks}
                          onChange={(e) => setSchedule({ ...schedule, numBreaks: Number(e.target.value) })}
                          className="bg-white border-slate-200 rounded-xl h-10 font-semibold text-sm focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Break duration (minutes per break)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={schedule.breakMinutes}
                          onChange={(e) => setSchedule({ ...schedule, breakMinutes: Number(e.target.value) })}
                          className="bg-white border-slate-200 rounded-xl h-10 font-semibold text-sm focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PAYROLL ────────────────────────────────────────────────────── */}
        <TabsContent value="payroll">
          <Card className="shadow-xs border-gray-200 rounded-2xl bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 p-5 sm:p-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                  <Banknote className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">Payroll Information</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Manage compensation rate, payout frequency, overtime, and leave allocations</p>
                </div>
              </div>
              {!isEditingPayroll ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowIncrementModal(true)}
                    className="rounded-xl border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold h-9 transition-all"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Increment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPayroll(true)}
                    className="rounded-xl border-gray-200 hover:bg-gray-50 text-xs font-semibold h-9 text-gray-700"
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> Edit Payroll
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPayroll(false)}
                    className="rounded-xl border-gray-200 hover:bg-white text-xs font-semibold text-gray-600 h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePayroll}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs h-9"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* Compensation & Salary Structure */}
              <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200/60 pb-3">
                  <Coins className="w-4 h-4 text-blue-600" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Compensation & Pay Structure</h4>
                    <p className="text-[11px] text-gray-500">Configure salary payout rate, currency, and cycle schedule</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                  {/* Currency */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Currency</Label>
                    <Select
                      disabled={!isEditingPayroll}
                      value={payroll.currency}
                      onValueChange={(v) => setPayroll({ ...payroll, currency: v })}
                    >
                      <SelectTrigger className={`h-10 rounded-xl font-semibold text-sm transition-all ${
                        !isEditingPayroll
                          ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                      }`}>
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {['PKR', 'USD', 'EUR', 'GBP'].map((curr) => (
                          <SelectItem key={curr} value={curr} className="font-semibold text-xs">
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rate Type Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-700">Rate Type</Label>
                      <span className="text-[10px] font-semibold text-blue-600 capitalize">
                        {payroll.rateType} payout
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-gray-200 shadow-2xs h-10 items-center">
                      {(['hourly', 'daily', 'monthly'] as const).map((type) => {
                        const isSelected = payroll.rateType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            disabled={!isEditingPayroll}
                            onClick={() => setPayroll({ ...payroll, rateType: type })}
                            className={`flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:hover:bg-transparent disabled:opacity-50'
                            }`}
                          >
                            <span className={`size-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-300'}`} />
                            <span className="capitalize">{type}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Salary Rate Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-900">
                        {payroll.rateType === 'hourly'
                          ? 'Salary Hourly Rate'
                          : payroll.rateType === 'daily'
                          ? 'Salary Daily Rate'
                          : 'Salary Monthly Rate'}
                      </Label>
                      <span className="text-[10px] font-semibold text-gray-500">
                        {payroll.rateType === 'hourly'
                          ? 'Per hour'
                          : payroll.rateType === 'daily'
                          ? 'Per day'
                          : 'Per month'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 select-none">
                        {payroll.currency}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        disabled={!isEditingPayroll}
                        value={payroll.rate}
                        onChange={(e) => setPayroll({ ...payroll, rate: Number(e.target.value) })}
                        placeholder="0"
                        className={`pl-14 pr-16 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        {payroll.rateType === 'hourly'
                          ? '/ hr'
                          : payroll.rateType === 'daily'
                          ? '/ day'
                          : '/ mo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-gray-200/60">
                  {/* Overtime Rate */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Overtime Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 select-none">
                        {payroll.currency}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        disabled={!isEditingPayroll}
                        value={payroll.overtimeRate}
                        onChange={(e) => setPayroll({ ...payroll, overtimeRate: Number(e.target.value) })}
                        placeholder="0"
                        className={`pl-14 pr-14 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        / hr
                      </span>
                    </div>
                  </div>

                  {/* Cycle Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pay Cycle Date</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        disabled={!isEditingPayroll}
                        value={payroll.cycleDate}
                        onChange={(e) => setPayroll({ ...payroll, cycleDate: Number(e.target.value) })}
                        placeholder="1"
                        className={`pr-24 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        day of month
                      </span>
                    </div>
                  </div>

                  {/* Max Extra Time Allowed */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-700">Max Extra Time Allowed</Label>
                      <span className="text-[10px] font-semibold text-blue-600">
                        {Number(payroll.maxExtraHours) > 0 ? `${Number(payroll.maxExtraHours) * 60} mins limit` : 'None'}
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        disabled={!isEditingPayroll}
                        value={payroll.maxExtraHours ?? 0}
                        onChange={(e) => setPayroll({ ...payroll, maxExtraHours: Number(e.target.value) })}
                        placeholder="2"
                        className={`pr-20 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        hrs / shift
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave Quota Allocations */}
              <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200/60 pb-3">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Leave Quota Allocations</h4>
                    <p className="text-[11px] text-gray-500">Allocated days for annual, casual, sudden, and monthly leaves</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Annual Leaves</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        disabled={!isEditingPayroll}
                        value={payroll.annualLeaves}
                        onChange={(e) => setPayroll({ ...payroll, annualLeaves: Number(e.target.value) })}
                        className={`pr-14 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        days
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Casual Leave</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        disabled={!isEditingPayroll}
                        value={payroll.casualLeaves}
                        onChange={(e) => setPayroll({ ...payroll, casualLeaves: Number(e.target.value) })}
                        className={`pr-14 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        days
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Sudden Leaves</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        disabled={!isEditingPayroll}
                        value={payroll.suddenLeaves}
                        onChange={(e) => setPayroll({ ...payroll, suddenLeaves: Number(e.target.value) })}
                        className={`pr-14 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        days
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Monthly Leaves</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        disabled={!isEditingPayroll}
                        value={payroll.monthlyLeaves}
                        onChange={(e) => setPayroll({ ...payroll, monthlyLeaves: Number(e.target.value) })}
                        className={`pr-14 h-10 rounded-xl font-bold text-sm transition-all ${
                          !isEditingPayroll
                            ? 'bg-white border-gray-200 text-gray-900 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                        days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Increment Modal */}
          <Dialog open={showIncrementModal} onOpenChange={setShowIncrementModal}>
            <DialogContent className="rounded-2xl sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-gray-900">Add Salary Increment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Increment Type</Label>
                  <Select value={incrementType} onValueChange={(v) => setIncrementType(v as any)}>
                    <SelectTrigger className="h-10 rounded-xl font-medium border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed Amount ({payroll.currency})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    {incrementType === 'percentage' ? 'Percentage Value (%)' : `Amount Value (${payroll.currency})`}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder={incrementType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
                    value={incrementValue || ''}
                    onChange={(e) => setIncrementValue(Number(e.target.value))}
                    className="h-10 rounded-xl font-semibold border-gray-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Effective Date</Label>
                  <Input
                    type="date"
                    value={incrementDate}
                    onChange={(e) => setIncrementDate(e.target.value)}
                    className="h-10 rounded-xl font-medium border-gray-300"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowIncrementModal(false)}
                  className="rounded-xl border-gray-200 text-xs font-semibold h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddIncrement}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs h-9"
                >
                  Apply Increment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── APPROVALS ──────────────────────────────────────────────────── */}
        <TabsContent value="approvals">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <div className="flex flex-row items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Leave & Approval Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">Leave applications and overtime authorization history</p>
              </div>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50">
                    <TableHead className="font-semibold text-xs text-slate-500 py-3 pl-6">Employee</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-500 py-3">Apply Date</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-500 py-3">Duration</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-500 py-3">Policy</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-500 py-3 pr-6 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const leaves = (employee?.leaveRequests || []).map((l: any) => ({
                      id: `leave-${l.id}`,
                      employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
                      applyDate: l.createdAt ? moment(l.createdAt).format("YYYY-MM-DD") : (l.startDate ? moment(l.startDate).format("YYYY-MM-DD") : "N/A"),
                      duration: `${l.days || 1} day${(l.days || 1) > 1 ? "s" : ""}`,
                      policy: l.leaveType?.name || "Leave Request",
                      status: l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1).toLowerCase() : "Pending",
                      rawStatus: l.status?.toUpperCase() || "PENDING",
                    }));

                    const otRequests = (employee?.overtimes || []).map((o: any) => {
                      const mins = o.minutes || (o.hours ? Math.round(o.hours * 60) : 0);
                      const hrs = Math.floor(mins / 60);
                      const m = mins % 60;
                      const durStr = hrs > 0 ? `${hrs}h ${m}m` : `${mins} mins`;

                      return {
                        id: `ot-${o.id}`,
                        employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
                        applyDate: o.createdAt ? moment(o.createdAt).format("YYYY-MM-DD") : (o.date ? moment(o.date).format("YYYY-MM-DD") : "N/A"),
                        duration: durStr,
                        policy: "Overtime Request",
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
                          <TableCell colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                            No leave or overtime approval requests found for this employee.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return realApprovals.map((req) => (
                      <TableRow key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="pl-6 font-bold text-xs text-slate-800">{req.employeeName}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{req.applyDate}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-700">{req.duration}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                            {req.policy}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              req.rawStatus === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : req.rawStatus === "REJECTED"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                req.rawStatus === "APPROVED"
                                  ? "bg-emerald-500"
                                  : req.rawStatus === "REJECTED"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {req.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PASSWORD / SEPARATION ─────────────────────────────────────── */}
        <TabsContent value="password-separation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Password */}
            <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <h2 className="text-base font-bold text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-500 mt-0.5">Reset authentication credentials for this user</p>
              </div>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">New Password</Label>
                  <Input type="password" placeholder="••••••••" className="rounded-xl border-slate-200 h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Confirm Password</Label>
                  <Input type="password" placeholder="••••••••" className="rounded-xl border-slate-200 h-10" />
                </div>
                <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 shadow-xs">
                  <Lock className="mr-2 size-4" /> Update Password
                </Button>
              </CardContent>
            </Card>

            {/* Separation */}
            <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
              <div className="flex flex-row items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Employment separation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Record resignation, termination or end of contract</p>
                </div>
                {!separation ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!separationDate) {
                        setSeparationDate(new Date().toISOString().split('T')[0]);
                      }
                      setShowSeparationModal(true);
                    }}
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold px-3.5 py-1.5 h-9 flex items-center gap-1.5"
                  >
                    <UserX className="size-3.5" /> Mark Separation
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      <span className="size-1.5 rounded-full bg-red-500" /> Separated
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReinstateEmployee}
                      className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 h-8"
                    >
                      Reinstate
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-5 sm:p-6">
                {separation ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-900 font-medium">
                      <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold text-red-950">Employee Activities Restricted:</strong>
                        <p className="text-red-800 mt-0.5 leading-relaxed">
                          This employee account is marked as separated. System login, biometric punch/clock-in, and all active duties are restricted. All historical data, attendance logs, and past payroll records remain preserved.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Separation Type</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{separation.type}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{separation.reason}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Separation Date</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{separation.date ? moment(separation.date).format('DD MMM YYYY') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Clearance Date</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{separation.clearanceDate ? moment(separation.clearanceDate).format('DD MMM YYYY') : 'N/A'}</p>
                      </div>
                    </div>

                    {separation.comments && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <span className="font-semibold text-slate-700">Comments / Clearance Notes:</span>
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap">{separation.comments}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs sm:text-sm font-medium text-emerald-800">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Employee is currently active.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Separation Modal matching Image */}
          <Dialog open={showSeparationModal} onOpenChange={setShowSeparationModal}>
            <DialogContent className="rounded-2xl sm:max-w-lg p-6 bg-white shadow-2xl border-slate-200/90">
              <DialogHeader className="space-y-0 text-left">
                <div className="flex items-start gap-3 pb-2">
                  <div className="size-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                    <UserX className="size-5 text-red-500" />
                  </div>
                  <div className="flex-1 pr-6">
                    <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                      Mark employee separation
                    </DialogTitle>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {employee?.firstName} {employee?.lastName}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Row 1: Separation type & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Separation type *</Label>
                    <Select value={separationType} onValueChange={setSeparationType}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm font-medium">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {separationTypes.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs sm:text-sm">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Reason *</Label>
                    <Select value={separationReason} onValueChange={setSeparationReason}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm font-medium">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {separationReasons.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs sm:text-sm">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Separation date & Clearance date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Separation date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-blue-500 pointer-events-none" />
                      <Input
                        type="date"
                        value={separationDate}
                        onChange={(e) => setSeparationDate(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Clearance date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-blue-500 pointer-events-none" />
                      <Input
                        type="date"
                        value={clearanceDate}
                        onChange={(e) => setClearanceDate(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Comments */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Comments</Label>
                  <Textarea
                    value={separationComments}
                    onChange={(e) => setSeparationComments(e.target.value)}
                    placeholder=""
                    className="rounded-xl border-slate-200 bg-white min-h-[90px] text-xs sm:text-sm resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSeparationModal(false)}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4 h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmSeparation}
                  className="rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold px-5 h-10 shadow-xs"
                >
                  Confirm Separation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── HISTORY & AUDIT LOG ────────────────────────────────────────── */}
        <TabsContent value="history">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">Activity & Transfer History</h2>
                  <Badge variant="outline" className="rounded-full bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5 text-xs">
                    {auditLogs.length} {auditLogs.length === 1 ? 'Record' : 'Records'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chronological audit trail of department transfers (e.g. Tech to Sales / GMB), location moves, role updates, schedule modifications, and salary increments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddLogModal(true)}
                  className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold px-3.5 py-1.5 h-9 flex items-center gap-1.5"
                >
                  <Plus className="size-3.5 text-blue-600" /> Record Transfer / Note
                </Button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="px-5 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1">
                <Filter className="size-3" /> Filter:
              </span>
              {[
                { id: 'all', label: 'All Activity', count: auditLogs.length },
                { id: 'transfers', label: 'Transfers', count: auditLogs.filter(l => l.category === 'Transfers' || l.type === 'TRANSFER' || l.type === 'LOCATION' || l.type === 'ENTITY_TRANSFER').length },
                { id: 'job', label: 'Job & Role', count: auditLogs.filter(l => l.category === 'Job & Role' || l.type === 'ROLE' || l.type === 'STATUS' || l.type === 'SUPERVISOR').length },
                { id: 'schedule', label: 'Schedule', count: auditLogs.filter(l => l.category === 'Schedule' || l.type === 'SCHEDULE').length },
                { id: 'payroll', label: 'Payroll & Increments', count: auditLogs.filter(l => l.category === 'Payroll' || l.type === 'PAYROLL' || l.type === 'INCREMENT').length },
                { id: 'system', label: 'System', count: auditLogs.filter(l => l.category === 'System' || l.type === 'SYSTEM' || l.type === 'ONBOARDING').length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    historyFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    historyFilter === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <CardContent className="p-5 sm:p-6">
              {(() => {
                const filtered = auditLogs.filter((log) => {
                  if (historyFilter === 'all') return true;
                  if (historyFilter === 'transfers') return log.category === 'Transfers' || log.type === 'TRANSFER' || log.type === 'LOCATION' || log.type === 'ENTITY_TRANSFER';
                  if (historyFilter === 'job') return log.category === 'Job & Role' || log.type === 'ROLE' || log.type === 'STATUS' || log.type === 'SUPERVISOR';
                  if (historyFilter === 'schedule') return log.category === 'Schedule' || log.type === 'SCHEDULE';
                  if (historyFilter === 'payroll') return log.category === 'Payroll' || log.type === 'PAYROLL' || log.type === 'INCREMENT';
                  if (historyFilter === 'system') return log.category === 'System' || log.type === 'SYSTEM' || log.type === 'ONBOARDING';
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <div className="size-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <RotateCcw className="size-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No activity logs in this category</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Any department transfers, supervisor updates, schedule changes, or salary increments will be automatically logged here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {filtered.map((log) => {
                      const isEntityTransfer =
                        log.type === 'ENTITY_TRANSFER' ||
                        Boolean(log.title && /entity transfer|entity assignment/i.test(log.title)) ||
                        Boolean(log.description && (/business entity/i.test(log.description) || /entity "/i.test(log.description)));

                      const isDeptTransfer =
                        !isEntityTransfer &&
                        (log.type === 'TRANSFER' ||
                         Boolean(log.title && /department transfer|assigned to.*department/i.test(log.title)) ||
                         Boolean(log.description && /department/i.test(log.description)));

                      const isLocationTransfer = log.type === 'LOCATION';
                      const isTransfer = isEntityTransfer || isDeptTransfer || isLocationTransfer;
                      const isSchedule = log.type === 'SCHEDULE';
                      const isPayroll = log.type === 'PAYROLL' || log.type === 'INCREMENT';
                      const isSeparation = log.type === 'SEPARATION';
                      const isRole = log.type === 'ROLE' || log.type === 'SUPERVISOR' || log.type === 'STATUS';
                      const isSystem = log.category === 'System' || log.type === 'SYSTEM' || log.type === 'ONBOARDING';

                      let dotBg = 'bg-blue-600';
                      let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                      let IconComponent = UserCheck;

                      if (isTransfer) {
                        dotBg = 'bg-blue-600';
                        badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                        IconComponent = ArrowRightLeft;
                      } else if (isSchedule) {
                        dotBg = 'bg-amber-500';
                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        IconComponent = Clock;
                      } else if (isPayroll) {
                        dotBg = 'bg-emerald-600';
                        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        IconComponent = TrendingUp;
                      } else if (isSeparation) {
                        dotBg = 'bg-red-600';
                        badgeColor = 'bg-red-50 text-red-700 border-red-200';
                        IconComponent = UserX;
                      } else if (isRole) {
                        dotBg = 'bg-purple-600';
                        badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                        IconComponent = ShieldCheck;
                      } else if (isSystem) {
                        dotBg = 'bg-sky-600';
                        badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
                        IconComponent = Sparkles;
                      }

                      const badgeLabel = isEntityTransfer
                        ? 'Entity Transfer'
                        : isDeptTransfer
                        ? 'Department Transfer'
                        : isLocationTransfer
                        ? 'Location Transfer'
                        : log.category;

                      return (
                        <div key={log.id} className="relative group">
                          {/* Dot on timeline */}
                          <div className={`absolute -left-6 sm:-left-8 top-1.5 size-4 rounded-full ${dotBg} border-4 border-white shadow-xs`} />
                          
                          <div className="bg-slate-50/70 hover:bg-slate-50/90 transition-all rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor}`}>
                                  <IconComponent className="size-3.5" />
                                  {badgeLabel}
                                </span>
                                <span className="font-bold text-sm text-slate-900">{log.title}</span>
                              </div>
                              <span className="text-[11px] font-medium text-slate-400">
                                {log.date ? moment(log.date).format('DD MMM YYYY, hh:mm A') : 'Recently'}
                              </span>
                            </div>

                            {/* Visual From -> To transfer pill */}
                            {log.fromValue && log.toValue && (
                              <div className="flex items-center gap-2 flex-wrap text-xs bg-white p-2.5 rounded-xl border border-slate-200/70">
                                <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Change:</span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                  {log.fromValue}
                                </span>
                                <ArrowRight className="size-3.5 text-slate-400" />
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                  {log.toValue}
                                </span>
                              </div>
                            )}

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {log.description}
                            </p>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                              <span>Logged by: <strong className="text-slate-600 font-semibold">{log.actor || 'System / Admin'}</strong></span>
                              <span className="text-slate-400 flex items-center gap-1">
                                <Check className="size-3 text-emerald-500" /> Recorded
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Record Transfer / Note Modal */}
          <Dialog open={showAddLogModal} onOpenChange={setShowAddLogModal}>
            <DialogContent className="rounded-2xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="size-4 text-blue-600" /> Record Department / Field Transfer
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Transfer Type *</Label>
                  <Select value={manualLogType} onValueChange={setManualLogType}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRANSFER">Department Transfer (e.g. Tech → Sales / GMB)</SelectItem>
                      <SelectItem value="ENTITY_TRANSFER">Business Entity Transfer</SelectItem>
                      <SelectItem value="LOCATION">Branch / Location Transfer</SelectItem>
                      <SelectItem value="ROLE">Role / Designation Change</SelectItem>
                      <SelectItem value="SCHEDULE">Schedule / Shift Timing Note</SelectItem>
                      <SelectItem value="NOTE">General Note / Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">From (Previous) *</Label>
                    <Input
                      placeholder="e.g. Tech"
                      value={manualLogFrom}
                      onChange={(e) => setManualLogFrom(e.target.value)}
                      className="rounded-xl border-slate-200 h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">To (New Field) *</Label>
                    <Input
                      placeholder="e.g. Sales / GMB"
                      value={manualLogTo}
                      onChange={(e) => setManualLogTo(e.target.value)}
                      className="rounded-xl border-slate-200 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Effective Date</Label>
                  <Input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    id="manual-log-date"
                    className="rounded-xl border-slate-200 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Remarks / Description</Label>
                  <Textarea
                    placeholder="e.g. Transferred to GMB team following internal restructuring."
                    value={manualLogNote}
                    onChange={(e) => setManualLogNote(e.target.value)}
                    className="rounded-xl border-slate-200 min-h-[75px]"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowAddLogModal(false)} className="rounded-xl border-slate-200 text-xs font-semibold h-9">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!manualLogFrom && !manualLogTo && !manualLogNote) {
                      toast.error('Please enter transfer details');
                      return;
                    }
                    const dateVal = (document.getElementById('manual-log-date') as HTMLInputElement)?.value;
                    const typeTitle = manualLogType === 'TRANSFER'
                      ? `Department Transfer: ${manualLogFrom || 'Previous'} → ${manualLogTo || 'New'}`
                      : manualLogType === 'ENTITY_TRANSFER'
                      ? `Entity Transfer: ${manualLogFrom || 'Previous'} → ${manualLogTo || 'New'}`
                      : manualLogType === 'LOCATION'
                      ? `Location Transfer: ${manualLogFrom || 'Previous'} → ${manualLogTo || 'New'}`
                      : manualLogType === 'ROLE'
                      ? `Role Change: ${manualLogFrom || 'Previous'} → ${manualLogTo || 'New'}`
                      : 'Employment Milestone Recorded';

                    const logDesc = manualLogNote || (
                      manualLogType === 'ENTITY_TRANSFER'
                        ? `Employee moved to business entity "${manualLogTo || 'new entity'}" from "${manualLogFrom || 'previous entity'}".`
                        : manualLogType === 'TRANSFER'
                        ? `Transferred from department "${manualLogFrom || 'previous department'}" to "${manualLogTo || 'new department'}".`
                        : `Transferred from ${manualLogFrom || 'previous'} to ${manualLogTo || 'new'}.`
                    );

                    appendAuditLog({
                      type: manualLogType as any,
                      category: manualLogType === 'TRANSFER' || manualLogType === 'ENTITY_TRANSFER' || manualLogType === 'LOCATION' ? 'Transfers' : 'Job & Role',
                      title: typeTitle,
                      fromValue: manualLogFrom || undefined,
                      toValue: manualLogTo || undefined,
                      description: logDesc,
                      date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
                      actor: 'HR Admin',
                    });
                    toast.success('Transfer log recorded successfully');
                    setShowAddLogModal(false);
                    setManualLogFrom('');
                    setManualLogTo('');
                    setManualLogNote('');
                  }}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9"
                >
                  Save Transfer Log
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};